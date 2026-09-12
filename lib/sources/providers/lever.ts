import { fetchJson } from '../http';
import {
    cleanLabel,
    extractTags,
    inferCountry,
    inferEmploymentType,
    inferLanguage,
    inferSeniority,
    inferVisaSponsorship,
    matchesQuery,
    stripHtml,
} from '../normalize';
import type { EmploymentType, JobSource, NormalizedJob } from '../types';
import { slugToCompanyName } from './greenhouse';

const ENDPOINT = (board: string) =>
    `https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`;

interface LeverJob {
    id: string;
    text: string;
    hostedUrl?: string;
    applyUrl?: string;
    /** Unix milliseconds. */
    createdAt?: number;
    /** ISO 3166-1 alpha-2, when Lever knows it. */
    country?: string;
    workplaceType?: 'remote' | 'onsite' | 'hybrid' | string;
    descriptionPlain?: string;
    description?: string;
    categories?: {
        location?: string;
        team?: string;
        department?: string;
        commitment?: string;
        allLocations?: string[];
    };
    lists?: Array<{ text?: string; content?: string }>;
    additionalPlain?: string;
}

/** Only the codes our country vocabulary actually uses elsewhere. */
const ISO_COUNTRIES: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    UK: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    CA: 'Canada',
    NL: 'Netherlands',
    CH: 'Switzerland',
    ES: 'Spain',
    IT: 'Italy',
    PT: 'Portugal',
    IE: 'Ireland',
    BE: 'Belgium',
    AT: 'Austria',
    PL: 'Poland',
    SE: 'Sweden',
    DK: 'Denmark',
    NO: 'Norway',
    AU: 'Australia',
    JP: 'Japan',
    SG: 'Singapore',
    IN: 'India',
    BR: 'Brazil',
    AE: 'United Arab Emirates',
};

const COMMITMENT_MAP: Record<string, EmploymentType> = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    contract: 'Contract',
    intern: 'Internship',
    internship: 'Internship',
    temporary: 'Temporary',
    freelance: 'Freelance',
};

export const lever: JobSource = {
    id: 'lever',
    name: 'Lever',
    homepage: 'https://www.lever.co',
    description:
        "A single company's official Lever board. Requires the board slug from jobs.lever.co, e.g. `leverdemo`.",
    kind: 'ats',
    docsUrl: 'https://github.com/lever/postings-api',

    async fetch(options = {}) {
        const board = options.board?.trim();
        if (!board) throw new Error('lever: a `board` slug is required, e.g. "leverdemo"');

        const payload = await fetchJson<LeverJob[]>(ENDPOINT(board), { signal: options.signal });
        const company = slugToCompanyName(board);
        const jobs: NormalizedJob[] = [];

        for (const entry of payload ?? []) {
            const title = cleanLabel(entry.text);
            if (!title || !entry.id) continue;

            // Lever splits a posting across several fields; the bullet lists carry
            // the requirements, which is exactly what skill matching needs.
            const listText = (entry.lists ?? [])
                .map((list) => `${list.text ?? ''}\n${stripHtml(list.content ?? '')}`)
                .join('\n');
            const description = [
                entry.descriptionPlain ?? stripHtml(entry.description ?? ''),
                listText,
                entry.additionalPlain ?? '',
            ]
                .filter((part) => part.trim())
                .join('\n\n')
                .trim();

            const location = cleanLabel(entry.categories?.location) || entry.categories?.allLocations?.join(', ');

            if (!matchesQuery(options.query, title, description, location)) continue;

            const commitment = entry.categories?.commitment?.toLowerCase();

            jobs.push({
                id: `lever:${board}:${entry.id}`,
                sourceId: 'lever',
                sourceName: `Lever · ${company}`,
                externalId: entry.id,
                title,
                company,
                location: location || undefined,
                country:
                    (entry.country ? ISO_COUNTRIES[entry.country.toUpperCase()] : undefined) ??
                    inferCountry(location),
                remote: entry.workplaceType === 'remote',
                description,
                descriptionHtml: entry.description,
                url: entry.hostedUrl ?? `https://jobs.lever.co/${board}/${entry.id}`,
                applyUrl: entry.applyUrl,
                tags: [
                    ...new Set(
                        [entry.categories?.team, entry.categories?.department]
                            .filter((value): value is string => Boolean(value))
                            .concat(extractTags(title, description)),
                    ),
                ],
                seniority: inferSeniority(title, description),
                employmentType:
                    (commitment ? COMMITMENT_MAP[commitment] : undefined) ??
                    inferEmploymentType(title, description),
                visaSponsorship: inferVisaSponsorship(description),
                language: inferLanguage(description),
                postedAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : undefined,
            });

            if (options.limit && jobs.length >= options.limit) break;
        }

        return jobs;
    },
};
