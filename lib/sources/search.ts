/**
 * The one search entry point.
 *
 * The web UI, the REST API and the MCP server all call `searchJobs`, so a
 * result looks identical whether a human or an agent asked for it.
 */

import { containsTerm } from './normalize';
import { AGGREGATOR_SOURCES, defaultSources, fetchFromSources, getSource } from './registry';
import type {
    Attribution,
    EmploymentType,
    JobSource,
    NormalizedJob,
    Seniority,
} from './types';

export interface JobSearchFilters {
    /** Free text matched against title, company, tags and description. */
    query?: string;
    country?: string;
    remote?: boolean;
    seniority?: Seniority;
    employmentType?: EmploymentType;
    /** Every tag must be present (AND), matched case-insensitively. */
    tags?: string[];
    /**
     * Keep only postings that state sponsorship. Postings that say nothing are
     * excluded rather than assumed hostile — see NormalizedJob.visaSponsorship.
     */
    visaSponsorship?: boolean;
    /** Language the posting is written in, e.g. "German". */
    language?: string;
    /** Floor on the low end of the range, in the salary's own currency. */
    minSalary?: number;
    postedWithinDays?: number;
}

export interface JobSearchOptions extends JobSearchFilters {
    /**
     * Alternative terms, any one of which makes a job a match.
     *
     * This is what query expansion produces: searching "k8s" should also find
     * postings that only ever write "Kubernetes". Because the semantics are OR
     * — unlike `query`, where every term must appear — providers are asked for
     * their unfiltered feed and the matching happens here.
     */
    anyTerms?: string[];
    /** Source ids to query. Defaults to every aggregator. */
    sources?: string[];
    /** Board token, required when `sources` names an ATS. */
    board?: string;
    limit?: number;
    signal?: AbortSignal;
}

export interface SourceReport {
    id: string;
    name: string;
    count: number;
    durationMs: number;
    error?: string;
}

export interface JobSearchResponse {
    jobs: NormalizedJob[];
    /** Per-source outcome, including the ones that failed. */
    sources: SourceReport[];
    /** Matches after filtering, before `limit` was applied. */
    total: number;
    /** Credits the displaying surface is required to render. */
    attributions: Attribution[];
}

const DEFAULT_LIMIT = 50;

/** Campaign noise that says nothing about which posting a URL points at. */
const TRACKING_PARAMS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gh_src',
    'ref',
    'referrer',
    'source',
    'src',
]);

/**
 * Same posting, different URL decorations.
 *
 * Query parameters have to survive this: Greenhouse boards hosted on a
 * company's own domain identify the posting purely by `?gh_jid=`, so dropping
 * the query string would collapse an entire careers page into one job.
 */
export function canonicalUrl(url: string): string {
    try {
        const parsed = new URL(url);
        const host = parsed.host.toLowerCase().replace(/^www\./, '');
        const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();

        const params = [...parsed.searchParams.entries()]
            .filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        return params ? `${host}${path}?${params}` : `${host}${path}`;
    } catch {
        return url.toLowerCase();
    }
}

/**
 * Fallback identity for the same role listed on two different boards.
 *
 * Country is part of the key so that a role genuinely open in Dublin *and*
 * Seattle stays two rows rather than silently losing one.
 */
function identityKey(job: NormalizedJob): string {
    const title = job.title.toLowerCase().replace(/\s+/g, ' ').trim();
    return `${job.company.toLowerCase().trim()}::${title}::${job.country ?? ''}`;
}

function withinDays(postedAt: string | undefined, days: number): boolean {
    if (!postedAt) return false;
    const posted = Date.parse(postedAt);
    if (Number.isNaN(posted)) return false;
    return Date.now() - posted <= days * 86_400_000;
}

export function matchesFilters(job: NormalizedJob, filters: JobSearchFilters): boolean {
    if (filters.country && job.country !== filters.country) return false;
    if (filters.remote !== undefined && job.remote !== filters.remote) return false;
    if (filters.seniority && job.seniority !== filters.seniority) return false;
    if (filters.employmentType && job.employmentType !== filters.employmentType) return false;

    if (filters.visaSponsorship !== undefined && job.visaSponsorship !== filters.visaSponsorship) {
        return false;
    }
    if (filters.language && job.language !== filters.language) return false;

    if (filters.tags?.length) {
        const owned = job.tags.map((tag) => tag.toLowerCase());
        const hasEvery = filters.tags.every((tag) => owned.includes(tag.toLowerCase()));
        if (!hasEvery) return false;
    }

    if (filters.minSalary !== undefined) {
        // A job that never states a salary cannot be shown to clear a floor.
        if (job.salary?.min === undefined) return false;
        if (job.salary.min < filters.minSalary) return false;
    }

    if (filters.postedWithinDays !== undefined && !withinDays(job.postedAt, filters.postedWithinDays)) {
        return false;
    }

    return true;
}

/**
 * Relevance score for a query.
 *
 * Weighted by where the term landed: a title hit says far more about a role
 * than the same word buried in a benefits paragraph.
 */
export function scoreJob(job: NormalizedJob, terms: string[]): number {
    if (terms.length === 0) return 0;

    const title = job.title.toLowerCase();
    const company = job.company.toLowerCase();
    const tags = job.tags.join(' ').toLowerCase();
    const description = job.description.toLowerCase();

    let score = 0;
    for (const term of terms) {
        if (title === term) score += 12;
        else if (containsTerm(title, term)) score += 8;
        if (containsTerm(tags, term)) score += 4;
        if (containsTerm(company, term)) score += 2;
        if (containsTerm(description, term)) score += 1;
    }
    return score;
}

/**
 * Round-robin the sources so a browse view shows the aggregation working.
 *
 * Sorting purely by recency lets one source own the whole first page: Arbeitnow
 * stamps every posting with the current day, so it buries three other feeds
 * before a visitor sees them. Each source keeps its own internal order; only
 * the interleaving is imposed. A keyword search skips this — there, relevance
 * is what the visitor asked to be ranked by.
 */
export function interleaveBySource(jobs: NormalizedJob[]): NormalizedJob[] {
    const bySource = new Map<string, NormalizedJob[]>();
    for (const job of jobs) {
        const bucket = bySource.get(job.sourceId);
        if (bucket) bucket.push(job);
        else bySource.set(job.sourceId, [job]);
    }

    if (bySource.size <= 1) return jobs;

    const buckets = [...bySource.values()];
    const interleaved: NormalizedJob[] = [];

    for (let round = 0; interleaved.length < jobs.length; round++) {
        for (const bucket of buckets) {
            const job = bucket[round];
            if (job) interleaved.push(job);
        }
    }

    return interleaved;
}

function compareRecency(a: NormalizedJob, b: NormalizedJob): number {
    const left = a.postedAt ? Date.parse(a.postedAt) : 0;
    const right = b.postedAt ? Date.parse(b.postedAt) : 0;
    return right - left;
}

async function resolveSources(ids: string[] | undefined): Promise<JobSource[]> {
    if (!ids?.length) return defaultSources();

    const resolved: JobSource[] = [];
    for (const id of ids) {
        const source = getSource(id);
        if (!source) throw new Error(`Unknown source "${id}". Known sources: ${AGGREGATOR_SOURCES.map((s) => s.id).join(', ')}`);
        resolved.push(source);
    }
    return resolved;
}

export async function searchJobs(options: JobSearchOptions = {}): Promise<JobSearchResponse> {
    const { sources: sourceIds, board, limit = DEFAULT_LIMIT, signal, anyTerms, ...filters } = options;
    const sources = await resolveSources(sourceIds);

    const expansions = anyTerms?.filter((term) => term.trim()) ?? [];
    const expanding = expansions.length > 0;

    const results = await fetchFromSources(sources, {
        // With expansions in play the provider must not pre-filter: a source
        // that only knows the literal query would drop the very postings the
        // expansion exists to reach.
        query: expanding ? undefined : filters.query,
        board,
        signal,
        // Over-fetch per source so that filtering downstream still has enough
        // candidates to fill `limit` after duplicates and misses are dropped.
        limit: expanding ? Math.max(limit * 8, 300) : Math.max(limit * 3, 100),
    });

    const terms = expanding
        ? [...new Set(expansions.map((term) => term.toLowerCase()))]
        : (filters.query?.toLowerCase().split(/\s+/).filter(Boolean) ?? []);
    const seenUrls = new Set<string>();
    const seenIdentities = new Set<string>();
    const matched: NormalizedJob[] = [];

    for (const result of results) {
        for (const job of result.jobs) {
            if (!matchesFilters(job, filters)) continue;

            // OR across expansions: one hit is enough to be relevant.
            if (expanding) {
                const haystack = `${job.title} ${job.company} ${job.tags.join(' ')} ${job.description}`;
                if (!expansions.some((term) => containsTerm(haystack, term))) continue;
            }

            const urlKey = canonicalUrl(job.url);
            const idKey = identityKey(job);
            if (seenUrls.has(urlKey) || seenIdentities.has(idKey)) continue;

            seenUrls.add(urlKey);
            seenIdentities.add(idKey);
            matched.push(job);
        }
    }

    matched.sort((a, b) => {
        if (terms.length > 0) {
            const delta = scoreJob(b, terms) - scoreJob(a, terms);
            if (delta !== 0) return delta;
        }
        return compareRecency(a, b);
    });

    const ordered = terms.length > 0 ? matched : interleaveBySource(matched);

    const attributions: Attribution[] = [];
    for (const source of sources) {
        if (source.attribution && !attributions.some((a) => a.url === source.attribution!.url)) {
            attributions.push(source.attribution);
        }
    }

    return {
        jobs: ordered.slice(0, limit),
        sources: results.map((result) => ({
            id: result.sourceId,
            name: result.sourceName,
            count: result.jobs.length,
            durationMs: result.durationMs,
            error: result.error,
        })),
        total: matched.length,
        attributions,
    };
}

/** Fetch one posting by the id `searchJobs` returned. */
export async function getJobById(id: string, signal?: AbortSignal): Promise<NormalizedJob | undefined> {
    const [sourceId, ...rest] = id.split(':');
    const source = getSource(sourceId);
    if (!source || rest.length === 0) return undefined;

    // ATS ids carry their board: `greenhouse:stripe:12345`.
    const board = source.kind === 'ats' ? rest[0] : undefined;

    const jobs = await source.fetch({ board, signal });
    return jobs.find((job) => job.id === id);
}
