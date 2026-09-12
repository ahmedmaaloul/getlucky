import { fetchJson } from '../http';
import {
    extractTags,
    inferCountry,
    inferEmploymentType,
    inferSeniority,
    parseSalary,
    stripHtml,
} from '../normalize';
import type { EmploymentType, JobSource, NormalizedJob } from '../types';

const ENDPOINT = 'https://remotive.com/api/remote-jobs';

const ATTRIBUTION = {
    text: 'Sourced from Remotive',
    url: 'https://remotive.com',
} as const;

interface RemotiveJob {
    id: number;
    url: string;
    title: string;
    company_name: string;
    company_logo?: string;
    company_logo_url?: string;
    category?: string;
    tags?: string[];
    job_type?: string;
    publication_date?: string;
    candidate_required_location?: string;
    salary?: string;
    description?: string;
}

interface RemotiveResponse {
    jobs: RemotiveJob[];
}

/** Remotive uses its own slugs for contract shape; map them to our vocabulary. */
const JOB_TYPE_MAP: Record<string, EmploymentType> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    freelance: 'Freelance',
    internship: 'Internship',
    temporary: 'Temporary',
    other: 'Full-time',
};

export const remotive: JobSource = {
    id: 'remotive',
    name: 'Remotive',
    homepage: 'https://remotive.com',
    description: 'Curated remote roles, hand-screened before publication.',
    kind: 'aggregator',
    docsUrl: 'https://github.com/remotive-com/remote-jobs-api',
    attribution: ATTRIBUTION,

    async fetch(options = {}) {
        // Remotive filters server-side, so we push the query down rather than
        // pulling the whole feed and discarding most of it.
        const url = new URL(ENDPOINT);
        if (options.query) url.searchParams.set('search', options.query);
        if (options.limit) url.searchParams.set('limit', String(options.limit));

        const payload = await fetchJson<RemotiveResponse>(url.toString(), { signal: options.signal });
        const jobs: NormalizedJob[] = [];

        for (const entry of payload.jobs ?? []) {
            const description = stripHtml(entry.description ?? '');
            const title = entry.title?.trim();
            if (!title || entry.id === undefined) continue;

            const location = entry.candidate_required_location?.trim();

            jobs.push({
                id: `remotive:${entry.id}`,
                sourceId: 'remotive',
                sourceName: 'Remotive',
                externalId: String(entry.id),
                title,
                company: entry.company_name?.trim() || 'Unknown',
                companyLogo: entry.company_logo_url || entry.company_logo || undefined,
                location,
                // "France, Japan, Turkey" style lists mean eligibility, not one
                // office — only resolve a country when the answer is unambiguous.
                country: location && !location.includes(',') ? inferCountry(location) : undefined,
                remote: true,
                description,
                descriptionHtml: entry.description,
                url: entry.url,
                tags: [
                    ...new Set([
                        ...(entry.tags ?? []),
                        ...(entry.category ? [entry.category] : []),
                        ...extractTags(title, description),
                    ]),
                ],
                seniority: inferSeniority(title, description),
                employmentType:
                    (entry.job_type ? JOB_TYPE_MAP[entry.job_type] : undefined) ??
                    inferEmploymentType(title, description),
                salary: parseSalary(entry.salary),
                postedAt: entry.publication_date
                    ? new Date(entry.publication_date).toISOString()
                    : undefined,
                attribution: ATTRIBUTION,
            });

            if (options.limit && jobs.length >= options.limit) break;
        }

        return jobs;
    },
};
