import { fetchJson } from '../http';
import {
    cleanLabel,
    extractTags,
    inferCountry,
    inferEmploymentType,
    inferSeniority,
    matchesQuery,
    parseSalary,
    stripHtml,
} from '../normalize';
import type { EmploymentType, JobSource, NormalizedJob } from '../types';
import { slugToCompanyName } from './greenhouse';

const ENDPOINT = (board: string) =>
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`;

interface AshbyJob {
    id: string;
    title: string;
    department?: string;
    team?: string;
    employmentType?: string;
    location?: string;
    secondaryLocations?: Array<{ location?: string }>;
    publishedAt?: string;
    isListed?: boolean;
    isRemote?: boolean;
    workplaceType?: string;
    jobUrl?: string;
    applyUrl?: string;
    descriptionHtml?: string;
    descriptionPlain?: string;
    compensation?: {
        compensationTierSummary?: string;
        scrapeableCompensationSalarySummary?: string;
    };
}

interface AshbyResponse {
    jobs: AshbyJob[];
}

const EMPLOYMENT_TYPE_MAP: Record<string, EmploymentType> = {
    FullTime: 'Full-time',
    PartTime: 'Part-time',
    Contract: 'Contract',
    Intern: 'Internship',
    Temporary: 'Temporary',
};

export const ashby: JobSource = {
    id: 'ashby',
    name: 'Ashby',
    homepage: 'https://www.ashbyhq.com',
    description:
        "A single company's official Ashby board. Requires the board name from jobs.ashbyhq.com, e.g. `ramp`.",
    kind: 'ats',
    docsUrl: 'https://developers.ashbyhq.com/reference/introduction',

    async fetch(options = {}) {
        const board = options.board?.trim();
        if (!board) throw new Error('ashby: a `board` name is required, e.g. "ramp"');

        const payload = await fetchJson<AshbyResponse>(ENDPOINT(board), { signal: options.signal });
        const company = slugToCompanyName(board);
        const jobs: NormalizedJob[] = [];

        for (const entry of payload.jobs ?? []) {
            // `isListed: false` means the company has unpublished the posting.
            if (entry.isListed === false) continue;

            const title = cleanLabel(entry.title);
            if (!title || !entry.id) continue;

            const description = entry.descriptionPlain?.trim() || stripHtml(entry.descriptionHtml ?? '');
            const secondary = entry.secondaryLocations
                ?.map((item) => item.location)
                .filter((value): value is string => Boolean(value));
            const location = [entry.location, ...(secondary ?? [])].filter(Boolean).join(' · ') || undefined;

            if (!matchesQuery(options.query, title, description, location)) continue;

            jobs.push({
                id: `ashby:${board}:${entry.id}`,
                sourceId: 'ashby',
                sourceName: `Ashby · ${company}`,
                externalId: entry.id,
                title,
                company,
                location,
                country: inferCountry(entry.location, ...(secondary ?? [])),
                remote: entry.isRemote ?? entry.workplaceType === 'Remote',
                description,
                descriptionHtml: entry.descriptionHtml,
                url: entry.jobUrl ?? `https://jobs.ashbyhq.com/${board}/${entry.id}`,
                applyUrl: entry.applyUrl,
                tags: [
                    ...new Set(
                        [entry.department, entry.team]
                            .filter((value): value is string => Boolean(value))
                            .concat(extractTags(title, description)),
                    ),
                ],
                seniority: inferSeniority(title, description),
                employmentType:
                    (entry.employmentType ? EMPLOYMENT_TYPE_MAP[entry.employmentType] : undefined) ??
                    inferEmploymentType(title, description),
                salary: parseSalary(
                    entry.compensation?.scrapeableCompensationSalarySummary ??
                        entry.compensation?.compensationTierSummary,
                ),
                postedAt: entry.publishedAt,
            });

            if (options.limit && jobs.length >= options.limit) break;
        }

        return jobs;
    },
};
