import { fetchJson } from '../http';
import {
    cleanLabel,
    extractTags,
    inferCountry,
    inferEmploymentType,
    inferRemote,
    inferSeniority,
    matchesQuery,
    stripHtml,
} from '../normalize';
import type { JobSource, NormalizedJob } from '../types';

const ENDPOINT = 'https://www.arbeitnow.com/api/job-board-api';

const ATTRIBUTION = {
    text: 'Sourced from Arbeitnow',
    url: 'https://www.arbeitnow.com',
} as const;

interface ArbeitnowJob {
    slug: string;
    company_name: string;
    title: string;
    description: string;
    remote: boolean;
    url: string;
    tags?: string[];
    job_types?: string[];
    location?: string;
    /** Unix seconds. */
    created_at: number;
}

interface ArbeitnowResponse {
    data: ArbeitnowJob[];
}

export const arbeitnow: JobSource = {
    id: 'arbeitnow',
    name: 'Arbeitnow',
    homepage: 'https://www.arbeitnow.com',
    description: 'German and wider European market, with visa-sponsoring employers well represented.',
    kind: 'aggregator',
    docsUrl: 'https://documenter.getpostman.com/view/18545166/UVJbJdKh',
    attribution: ATTRIBUTION,

    async fetch(options = {}) {
        const payload = await fetchJson<ArbeitnowResponse>(ENDPOINT, { signal: options.signal });
        const jobs: NormalizedJob[] = [];

        for (const entry of payload.data ?? []) {
            const description = stripHtml(entry.description ?? '');
            const title = cleanLabel(entry.title);
            if (!title || !entry.slug) continue;

            if (!matchesQuery(options.query, title, entry.company_name, description, entry.tags?.join(' '))) {
                continue;
            }

            jobs.push({
                id: `arbeitnow:${entry.slug}`,
                sourceId: 'arbeitnow',
                sourceName: 'Arbeitnow',
                externalId: entry.slug,
                title,
                company: cleanLabel(entry.company_name) || 'Unknown',
                location: cleanLabel(entry.location) || undefined,
                // Arbeitnow is a German board, so an on-site role whose location we
                // cannot parse is overwhelmingly in Germany. Remote roles get no
                // such default — they really could be anywhere.
                country: inferCountry(entry.location) ?? (entry.remote ? undefined : 'Germany'),
                remote: entry.remote || inferRemote(entry.location, title),
                description,
                descriptionHtml: entry.description,
                url: entry.url,
                tags: [...new Set([...(entry.tags ?? []), ...extractTags(title, description)])],
                seniority: inferSeniority(title, description),
                employmentType:
                    inferEmploymentType(entry.job_types?.join(' ') ?? '', '') ??
                    inferEmploymentType(title, description),
                postedAt: entry.created_at ? new Date(entry.created_at * 1000).toISOString() : undefined,
                attribution: ATTRIBUTION,
            });

            if (options.limit && jobs.length >= options.limit) break;
        }

        return jobs;
    },
};
