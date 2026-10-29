/**
 * Upstream health check.
 *
 * The unit tests are deliberately network-free, which means nothing in CI
 * notices when a job board changes its payload or disappears. That is the most
 * likely way this project rots: the code stays correct and the data stops
 * arriving.
 *
 * This runs against the real APIs on a schedule. It asserts the contract each
 * provider depends on — that a source returns postings, and that the fields
 * the UI and the MCP tools read are actually populated — and reports what it
 * found rather than only passing or failing.
 */

import { SOURCES } from '../lib/sources/registry';
import type { JobSource, NormalizedJob } from '../lib/sources/types';

/** Boards chosen for longevity, not size: all three are the vendor's own or long-lived. */
const ATS_PROBES: Record<string, string> = {
    greenhouse: 'stripe',
    lever: 'leverdemo',
    ashby: 'ramp',
};

interface Check {
    source: string;
    ok: boolean;
    count: number;
    durationMs: number;
    problems: string[];
    /** Share of postings carrying each optional-but-expected field. */
    coverage: Record<string, string>;
}

/** Fields without which a posting is unusable, whatever the source. */
function requiredFieldProblems(jobs: NormalizedJob[]): string[] {
    const problems: string[] = [];

    for (const field of ['id', 'title', 'company', 'url'] as const) {
        const missing = jobs.filter((job) => !job[field]?.toString().trim()).length;
        if (missing > 0) problems.push(`${missing}/${jobs.length} postings have no ${field}`);
    }

    const badUrls = jobs.filter((job) => {
        try {
            new URL(job.url);
            return false;
        } catch {
            return true;
        }
    }).length;
    if (badUrls > 0) problems.push(`${badUrls}/${jobs.length} postings have an unparseable url`);

    const duplicateIds = jobs.length - new Set(jobs.map((job) => job.id)).size;
    if (duplicateIds > 0) problems.push(`${duplicateIds} duplicate ids within one source`);

    return problems;
}

function share(jobs: NormalizedJob[], predicate: (job: NormalizedJob) => boolean): string {
    if (jobs.length === 0) return '0%';
    return `${Math.round((jobs.filter(predicate).length / jobs.length) * 100)}%`;
}

/**
 * A term no job posting should contain, used to prove a source honours its
 * query rather than ignoring it.
 *
 * This exists because Remotive's `search` parameter stopped filtering without
 * any error: asking for "nurse" returned the same twelve engineering roles as
 * asking for nothing. A source that silently ignores a filter is worse than
 * one that is down, because the wrong results look right.
 */
const IMPOSSIBLE_QUERY = 'zzqxwv';

async function check(source: JobSource): Promise<Check> {
    const startedAt = Date.now();
    const board = source.kind === 'ats' ? ATS_PROBES[source.id] : undefined;

    try {
        const jobs = await source.fetch({ board, limit: 100 });
        const problems = requiredFieldProblems(jobs);

        // An empty feed is not an error from the HTTP layer's point of view,
        // but it means the source has stopped being useful to us.
        if (jobs.length === 0) problems.push('returned no postings at all');

        const nonsense = await source.fetch({ board, query: IMPOSSIBLE_QUERY, limit: 10 });
        if (nonsense.length > 0) {
            problems.push(
                `ignores the query filter — "${IMPOSSIBLE_QUERY}" still returned ${nonsense.length} postings`,
            );
        }

        return {
            source: source.id,
            ok: problems.length === 0,
            count: jobs.length,
            durationMs: Date.now() - startedAt,
            problems,
            coverage: {
                postedAt: share(jobs, (job) => Boolean(job.postedAt)),
                location: share(jobs, (job) => Boolean(job.location)),
                description: share(jobs, (job) => job.description.length > 100),
                seniority: share(jobs, (job) => Boolean(job.seniority)),
                contract: share(jobs, (job) => Boolean(job.employmentType)),
            },
        };
    } catch (error) {
        return {
            source: source.id,
            ok: false,
            count: 0,
            durationMs: Date.now() - startedAt,
            problems: [error instanceof Error ? error.message : String(error)],
            coverage: {},
        };
    }
}

async function main(): Promise<void> {
    // The custom scraper source depends on private configuration that CI does
    // not have, so there is nothing meaningful to assert about it here.
    const sources = SOURCES.filter((source) => source.id !== 'custom');

    const results = await Promise.all(sources.map(check));

    for (const result of results) {
        const status = result.ok ? 'OK  ' : 'FAIL';
        console.log(
            `${status} ${result.source.padEnd(12)} ${String(result.count).padStart(3)} postings  ${String(result.durationMs).padStart(5)}ms`,
        );
        if (Object.keys(result.coverage).length > 0) {
            const coverage = Object.entries(result.coverage)
                .map(([field, value]) => `${field} ${value}`)
                .join('  ');
            console.log(`     ${coverage}`);
        }
        for (const problem of result.problems) console.log(`     -> ${problem}`);
    }

    const failed = results.filter((result) => !result.ok);
    console.log(`\n${results.length - failed.length}/${results.length} sources healthy`);

    if (failed.length > 0) {
        console.error(`\nUnhealthy: ${failed.map((result) => result.source).join(', ')}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Health check could not run:', error);
    process.exit(1);
});
