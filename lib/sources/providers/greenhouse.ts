import { fetchJson } from '../http';
import {
    cleanLabel,
    extractTags,
    inferCountry,
    inferEmploymentType,
    inferRemote,
    inferLanguage,
    inferSeniority,
    inferVisaSponsorship,
    matchesQuery,
    stripHtml,
} from '../normalize';
import type { JobSource, NormalizedJob } from '../types';

/**
 * Greenhouse publishes every customer's board through an officially documented,
 * key-free endpoint. Pointing at a company's own board is the most honest way
 * to aggregate its openings: the data comes straight from the employer.
 */
const ENDPOINT = (board: string) =>
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`;

interface GreenhouseJob {
    id: number;
    title: string;
    absolute_url: string;
    company_name?: string;
    updated_at?: string;
    first_published?: string;
    /** HTML, entity-encoded a second time by the API. */
    content?: string;
    location?: { name?: string };
    departments?: Array<{ name?: string }>;
    offices?: Array<{ name?: string; location?: string | null }>;
}

interface GreenhouseResponse {
    jobs: GreenhouseJob[];
}

/** `acme-corp` reads better as `Acme Corp` when the payload omits the name. */
export function slugToCompanyName(slug: string): string {
    return slug
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

export const greenhouse: JobSource = {
    id: 'greenhouse',
    name: 'Greenhouse',
    homepage: 'https://www.greenhouse.io',
    description:
        "A single company's official Greenhouse board. Requires the board token from its careers URL, e.g. `stripe`.",
    kind: 'ats',
    docsUrl: 'https://developers.greenhouse.io/job-board.html',

    async fetch(options = {}) {
        const board = options.board?.trim();
        if (!board) throw new Error('greenhouse: a `board` token is required, e.g. "stripe"');

        const payload = await fetchJson<GreenhouseResponse>(ENDPOINT(board), { signal: options.signal });
        const jobs: NormalizedJob[] = [];

        for (const entry of payload.jobs ?? []) {
            const title = cleanLabel(entry.title);
            if (!title || entry.id === undefined) continue;

            const description = stripHtml(entry.content ?? '');
            const location =
                cleanLabel(entry.location?.name) ||
                entry.offices?.map((office) => office.name).filter(Boolean).join(', ') ||
                undefined;

            if (!matchesQuery(options.query, title, description, location)) continue;

            const departments = entry.departments?.map((d) => d.name).filter(Boolean) as string[] | undefined;

            jobs.push({
                id: `greenhouse:${board}:${entry.id}`,
                sourceId: 'greenhouse',
                sourceName: `Greenhouse · ${entry.company_name ?? slugToCompanyName(board)}`,
                externalId: String(entry.id),
                title,
                company: cleanLabel(entry.company_name) || slugToCompanyName(board),
                location,
                country: inferCountry(location),
                remote: inferRemote(location, title),
                description,
                descriptionHtml: entry.content,
                url: entry.absolute_url,
                tags: [...new Set([...(departments ?? []), ...extractTags(title, description)])],
                seniority: inferSeniority(title, description),
                employmentType: inferEmploymentType(title, description),
                visaSponsorship: inferVisaSponsorship(description),
                language: inferLanguage(description),
                postedAt: entry.first_published ?? entry.updated_at,
            });

            if (options.limit && jobs.length >= options.limit) break;
        }

        return jobs;
    },
};
