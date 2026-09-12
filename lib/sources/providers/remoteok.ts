import { fetchJson } from '../http';
import { extractTags, inferEmploymentType, inferSeniority, matchesQuery, stripHtml } from '../normalize';
import type { JobSource, NormalizedJob } from '../types';

const ENDPOINT = 'https://remoteok.com/api';

/**
 * Remote OK's terms grant API access in exchange for a *followed* link back.
 * We take that literally — `rel` is deliberately absent so the rendered anchor
 * passes link equity, which is exactly what they ask for.
 */
const ATTRIBUTION = {
    text: 'Sourced from Remote OK',
    url: 'https://remoteok.com',
} as const;

interface RemoteOkLegal {
    legal: string;
    last_updated: number;
}

interface RemoteOkJob {
    slug: string;
    id: string;
    epoch: number;
    date: string;
    company: string;
    company_logo?: string;
    logo?: string;
    position: string;
    tags?: string[];
    description?: string;
    location?: string;
    url?: string;
    apply_url?: string;
    salary_min?: number;
    salary_max?: number;
}

type RemoteOkResponse = Array<RemoteOkLegal | RemoteOkJob>;

const isLegalNotice = (entry: RemoteOkLegal | RemoteOkJob): entry is RemoteOkLegal =>
    'legal' in entry;

export const remoteOk: JobSource = {
    id: 'remoteok',
    name: 'Remote OK',
    homepage: 'https://remoteok.com',
    description: 'Remote-first roles across engineering, design and product, worldwide.',
    kind: 'aggregator',
    docsUrl: 'https://remoteok.com/api',
    attribution: ATTRIBUTION,

    async fetch(options = {}) {
        const payload = await fetchJson<RemoteOkResponse>(ENDPOINT, { signal: options.signal });

        // The feed's first element is Remote OK's API terms, not a posting.
        const jobs: NormalizedJob[] = [];

        for (const entry of payload) {
            if (isLegalNotice(entry)) continue;

            const description = stripHtml(entry.description ?? '');
            const title = entry.position?.trim();
            if (!title || !entry.id) continue;

            if (!matchesQuery(options.query, title, entry.company, description, entry.tags?.join(' '))) {
                continue;
            }

            // Remote OK sends 0 rather than null when a salary is unknown.
            const min = entry.salary_min && entry.salary_min > 0 ? entry.salary_min : undefined;
            const max = entry.salary_max && entry.salary_max > 0 ? entry.salary_max : undefined;

            jobs.push({
                id: `remoteok:${entry.id}`,
                sourceId: 'remoteok',
                sourceName: 'Remote OK',
                externalId: entry.id,
                title,
                company: entry.company?.trim() || 'Unknown',
                companyLogo: entry.company_logo || entry.logo || undefined,
                location: entry.location?.trim() || undefined,
                country: undefined,
                // Every listing on Remote OK is, by construction, remote.
                remote: true,
                description,
                descriptionHtml: entry.description,
                url: entry.url ?? `https://remoteok.com/remote-jobs/${entry.slug}`,
                applyUrl: entry.apply_url,
                tags: [...new Set([...(entry.tags ?? []), ...extractTags(title, description)])],
                seniority: inferSeniority(title, description),
                employmentType: inferEmploymentType(title, description),
                salary: min ? { min, max, currency: 'USD', period: 'Yearly' } : undefined,
                postedAt: entry.date ?? new Date(entry.epoch * 1000).toISOString(),
                attribution: ATTRIBUTION,
            });

            if (options.limit && jobs.length >= options.limit) break;
        }

        return jobs;
    },
};
