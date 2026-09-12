/**
 * The GetLucky MCP server.
 *
 * One definition, two transports: `app/api/mcp/route.ts` serves it over
 * Streamable HTTP for hosted clients, and `mcp/src/stdio.ts` runs the same
 * thing locally over stdio. Adding a tool here adds it to both.
 *
 * Every tool is read-only and key-free. Nothing here writes to a database,
 * sends an application, or touches a candidate's personal data.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { rankJobsForProfile, type CandidateProfile } from '../matching';
import { ATS_SOURCES, SOURCES } from '../sources/registry';
import { getJobById, searchJobs } from '../sources/search';
import type { EmploymentType, Seniority } from '../sources/types';
import { formatJobDetail, formatMatches, formatSearchResponse } from './format';

export const SERVER_NAME = 'getlucky';
export const SERVER_VERSION = '1.0.1';

const SENIORITY_VALUES = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager'] as const;
const EMPLOYMENT_VALUES = [
    'Full-time',
    'Part-time',
    'Contract',
    'Freelance',
    'Internship',
    'Temporary',
] as const;

const AGGREGATOR_IDS = SOURCES.filter((s) => s.kind === 'aggregator').map((s) => s.id);
const ATS_IDS = ATS_SOURCES.map((s) => s.id) as [string, ...string[]];

/** Shared filter arguments, so `search_jobs` and `match_profile` stay consistent. */
const filterShape = {
    country: z
        .string()
        .optional()
        .describe('Exact country name as returned by the API, e.g. "Germany", "United States".'),
    remote: z.boolean().optional().describe('true for remote-only, false for on-site only.'),
    seniority: z.enum(SENIORITY_VALUES).optional(),
    employment_type: z.enum(EMPLOYMENT_VALUES).optional(),
    tags: z
        .array(z.string())
        .optional()
        .describe('Technologies that must ALL be present, e.g. ["TypeScript", "AWS"].'),
    min_salary: z
        .number()
        .optional()
        .describe('Floor on the advertised low end. Drops jobs with no stated salary.'),
    visa_sponsorship: z
        .boolean()
        .optional()
        .describe(
            'true keeps only postings that explicitly offer sponsorship. Most postings say ' +
                'nothing either way and are excluded by this filter rather than assumed to refuse.',
        ),
    language: z
        .string()
        .optional()
        .describe('Language the posting is written in, e.g. "German" — useful for local-market roles.'),
    posted_within_days: z.number().int().positive().optional(),
};

export function createGetLuckyServer(): McpServer {
    const server = new McpServer(
        { name: SERVER_NAME, version: SERVER_VERSION },
        {
            instructions: [
                'GetLucky aggregates tech job openings from public, key-free APIs:',
                `aggregators (${AGGREGATOR_IDS.join(', ')}) and company ATS boards (${ATS_IDS.join(', ')}).`,
                '',
                'Start with `search_jobs` for a market-wide look, or `search_company_board`',
                'when the user names a specific employer. `match_profile` ranks openings',
                'against a candidate\'s skills and is the right tool for "what should I apply to?".',
                '',
                'Job ids look like "remoteok:1137381" or "greenhouse:stripe:8172487" and can be',
                'passed straight to `get_job`. All tools are read-only: nothing here submits',
                'an application or stores personal data.',
            ].join('\n'),
        },
    );

    server.registerTool(
        'search_jobs',
        {
            title: 'Search jobs',
            description:
                'Search live tech job openings across every aggregator source at once. ' +
                'Returns the newest and most relevant matches with location, seniority, ' +
                'contract type, salary when advertised, and a direct link.',
            inputSchema: {
                query: z
                    .string()
                    .optional()
                    .describe('Free text, e.g. "rust backend" or "product designer". Omit to browse everything.'),
                sources: z
                    .array(z.string())
                    .optional()
                    .describe(`Source ids to query. Defaults to all aggregators: ${AGGREGATOR_IDS.join(', ')}.`),
                ...filterShape,
                limit: z.number().int().min(1).max(100).optional().describe('Default 20.'),
            },
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            const response = await searchJobs({
                query: args.query,
                sources: args.sources,
                country: args.country,
                remote: args.remote,
                seniority: args.seniority as Seniority | undefined,
                employmentType: args.employment_type as EmploymentType | undefined,
                tags: args.tags,
                minSalary: args.min_salary,
                visaSponsorship: args.visa_sponsorship,
                language: args.language,
                postedWithinDays: args.posted_within_days,
                limit: args.limit ?? 20,
            });

            return {
                content: [{ type: 'text', text: formatSearchResponse(response) }],
                structuredContent: response as unknown as Record<string, unknown>,
            };
        },
    );

    server.registerTool(
        'search_company_board',
        {
            title: 'Search a company job board',
            description:
                "Read one company's official job board directly from its applicant tracking " +
                'system. Use this when the user names an employer. The board token is the slug ' +
                'in their careers URL — `stripe` in boards.greenhouse.io/stripe, `ramp` in ' +
                'jobs.ashbyhq.com/ramp. Data comes straight from the employer, so it is more ' +
                'complete and more current than any aggregator.',
            inputSchema: {
                ats: z.enum(ATS_IDS).describe('Which system hosts the board.'),
                board: z.string().describe('Board token / slug from the careers URL, e.g. "stripe".'),
                query: z.string().optional().describe('Optional filter within that board.'),
                limit: z.number().int().min(1).max(100).optional().describe('Default 25.'),
            },
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            const response = await searchJobs({
                sources: [args.ats],
                board: args.board,
                query: args.query,
                limit: args.limit ?? 25,
            });

            const failure = response.sources.find((source) => source.error);
            if (failure) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text',
                            text:
                                `Could not read the "${args.board}" board on ${args.ats}: ${failure.error}\n\n` +
                                'A 404 usually means the token is wrong. Check the company\'s careers ' +
                                'page URL — the token is the path segment after the ATS domain.',
                        },
                    ],
                };
            }

            return {
                content: [{ type: 'text', text: formatSearchResponse(response) }],
                structuredContent: response as unknown as Record<string, unknown>,
            };
        },
    );

    server.registerTool(
        'get_job',
        {
            title: 'Get job details',
            description:
                'Fetch one posting in full, including the complete description text. ' +
                'Takes an id from a previous search, e.g. "greenhouse:stripe:8172487".',
            inputSchema: {
                id: z.string().describe('Job id as returned by search_jobs or match_profile.'),
            },
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            const job = await getJobById(args.id);

            if (!job) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text',
                            text:
                                `No job found with id "${args.id}". Listings expire, so an id from an ` +
                                'older search may no longer exist. Run search_jobs again.',
                        },
                    ],
                };
            }

            return {
                content: [{ type: 'text', text: formatJobDetail(job) }],
                structuredContent: job as unknown as Record<string, unknown>,
            };
        },
    );

    server.registerTool(
        'match_profile',
        {
            title: 'Match jobs to a candidate profile',
            description:
                "Rank live openings against a candidate's skills and constraints, scored 0–100 " +
                'with a plain-language explanation of what drove each score. Scoring is ' +
                'deterministic — no model call — so it is cheap to run over a wide search. ' +
                'This is the right tool for "what should I apply to?".',
            inputSchema: {
                skills: z
                    .array(z.string())
                    .min(1)
                    .describe('The candidate\'s skills, e.g. ["TypeScript", "React", "PostgreSQL"].'),
                query: z.string().optional().describe('Narrows the pool before scoring, e.g. "frontend".'),
                seniority: z.enum(SENIORITY_VALUES).optional().describe("The candidate's own level."),
                countries: z.array(z.string()).optional().describe('Acceptable countries. Omit for anywhere.'),
                remote_only: z.boolean().optional(),
                min_salary: z.number().optional(),
                sources: z.array(z.string()).optional(),
                min_score: z.number().min(0).max(100).optional().describe('Drop weaker matches. Default 0.'),
                limit: z.number().int().min(1).max(50).optional().describe('Default 10.'),
            },
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            // Cast a wide net, then rank: the scoring is free, so a bigger pool
            // strictly improves the answer.
            const response = await searchJobs({
                query: args.query,
                sources: args.sources,
                country: args.countries?.length === 1 ? args.countries[0] : undefined,
                remote: args.remote_only ? true : undefined,
                limit: 150,
            });

            const profile: CandidateProfile = {
                skills: args.skills,
                seniority: args.seniority as Seniority | undefined,
                countries: args.countries,
                remoteOnly: args.remote_only,
                minSalary: args.min_salary,
            };

            const matches = rankJobsForProfile(response.jobs, profile, {
                minScore: args.min_score ?? 0,
                limit: args.limit ?? 10,
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: `Scored ${response.jobs.length} openings against your profile.\n\n${formatMatches(matches)}`,
                    },
                ],
                structuredContent: {
                    scanned: response.jobs.length,
                    matches: matches.map((match) => ({
                        id: match.job.id,
                        score: match.score,
                        title: match.job.title,
                        company: match.job.company,
                        url: match.job.url,
                        matchedSkills: match.matchedSkills,
                        missingSkills: match.missingSkills,
                        reasons: match.reasons,
                    })),
                },
            };
        },
    );

    server.registerTool(
        'list_sources',
        {
            title: 'List job sources',
            description:
                'The catalogue of sources GetLucky can read, what each covers, and whether it ' +
                'needs a board token. Call this when unsure which source fits a request.',
            inputSchema: {},
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async () => {
            const text = SOURCES.map((source) =>
                [
                    `${source.id}  (${source.kind})`,
                    `   ${source.name} — ${source.description}`,
                    `   ${source.homepage}${source.docsUrl ? ` · docs: ${source.docsUrl}` : ''}`,
                    source.kind === 'ats' ? '   Requires a `board` token; use search_company_board.' : '',
                ]
                    .filter(Boolean)
                    .join('\n'),
            ).join('\n\n');

            return {
                content: [{ type: 'text', text }],
                structuredContent: {
                    sources: SOURCES.map(({ id, name, kind, description, homepage, docsUrl }) => ({
                        id,
                        name,
                        kind,
                        description,
                        homepage,
                        docsUrl,
                    })),
                },
            };
        },
    );

    server.registerResource(
        'sources',
        'getlucky://sources',
        {
            title: 'Job source catalogue',
            description: 'Every source GetLucky reads from, as JSON.',
            mimeType: 'application/json',
        },
        async (uri) => ({
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(
                        SOURCES.map(({ id, name, kind, description, homepage, docsUrl, attribution }) => ({
                            id,
                            name,
                            kind,
                            description,
                            homepage,
                            docsUrl,
                            attribution,
                        })),
                        null,
                        2,
                    ),
                },
            ],
        }),
    );

    server.registerPrompt(
        'job_hunt',
        {
            title: 'Run a job hunt',
            description: 'Search, shortlist and explain the best-fitting openings for a candidate.',
            argsSchema: {
                role: z.string().describe('Target role, e.g. "senior backend engineer".'),
                skills: z.string().describe('Comma-separated skills, e.g. "Go, Kubernetes, PostgreSQL".'),
                location: z.string().optional().describe('Country or "remote".'),
            },
        },
        ({ role, skills, location }) => ({
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: [
                            `Find me openings for a ${role}.`,
                            `My skills: ${skills}.`,
                            location ? `Location preference: ${location}.` : 'I am open on location.',
                            '',
                            'Use match_profile to rank live openings against that, then give me a',
                            'shortlist of five with a one-line reason each. Use get_job on the top',
                            'two so you can tell me what the day-to-day actually looks like, and',
                            'flag anything in the descriptions I should be wary of.',
                        ].join('\n'),
                    },
                },
            ],
        }),
    );

    return server;
}
