'use server';

/**
 * Server actions backing the web UI.
 *
 * Jobs come from live public APIs rather than a database, so a fresh clone
 * works with no migration, no seed and no credentials. Results are cached in
 * process for a few minutes — both to keep the page fast and to be a good
 * guest on APIs that are offered for free.
 */

import { cached } from '@/lib/cache';
import { RateLimitError, checkAiRateLimit } from '@/lib/rate-limit';
import { searchJobs, type JobSearchFilters } from '@/lib/sources/search';
import { SOURCES } from '@/lib/sources/registry';
import type { EmploymentType, NormalizedJob, Seniority } from '@/lib/sources/types';

const CACHE_TTL_MS = 5 * 60_000;

/**
 * How many listings to pull per distinct filter combination.
 *
 * The UI paginates by slicing this pool, so one upstream round trip serves
 * every "load more" the visitor clicks.
 */
const POOL_SIZE = 300;

/** The UI passes "All" for an unset dropdown. */
const unset = (value?: string) => (!value || value === 'All' ? undefined : value);

export interface UiFilters {
    country?: string;
    language?: string;
    seniority?: string;
    employmentType?: string;
    visaSponsorship?: boolean;
    remote?: boolean;
    skip?: number;
    take?: number;
}

export interface JobsResult {
    success: boolean;
    data: NormalizedJob[];
    total: number;
    hasMore: boolean;
    /** Per-source outcome, so the UI can say which feeds are down. */
    sources: Array<{ id: string; name: string; count: number; error?: string }>;
    attributions: Array<{ text: string; url: string; rel?: string }>;
    /** True when the AI query expansion was skipped because of rate limits. */
    quotaExceeded: boolean;
    /** True when the AI layer widened the search, so the UI can say so. */
    aiEnhanced: boolean;
    error?: string;
}

/**
 * Optional AI pass over the raw query.
 *
 * Purely additive: it widens keywords and can fill in filters the visitor did
 * not set. Without GEMINI_API_KEY — or when the daily budget is spent — search
 * still works, just without synonym expansion.
 */
interface Enhancement {
    filters: JobSearchFilters;
    /** Expanded terms, OR-matched. Empty when no expansion happened. */
    anyTerms: string[];
    quotaExceeded: boolean;
    enhanced: boolean;
}

async function enhanceQuery(query: string, filters: JobSearchFilters): Promise<Enhancement> {
    const untouched: Enhancement = { filters, anyTerms: [], quotaExceeded: false, enhanced: false };
    if (!process.env.GEMINI_API_KEY) return untouched;

    try {
        await checkAiRateLimit();

        const { SearchAgent } = await import('@/lib/ai/search');
        const analysis = await new SearchAgent().analyzeQuery(query);

        const next: JobSearchFilters = { ...filters };
        // Never override something the visitor chose themselves.
        if (!next.seniority && analysis.filters.seniority) next.seniority = analysis.filters.seniority;
        if (!next.country && analysis.filters.country) next.country = analysis.filters.country;
        if (!next.language && analysis.filters.language) next.language = analysis.filters.language;
        if (!next.employmentType && analysis.filters.employmentType) {
            next.employmentType = analysis.filters.employmentType;
        }
        if (next.visaSponsorship === undefined && analysis.filters.visaSponsorship) {
            next.visaSponsorship = true;
        }
        if (next.remote === undefined && analysis.filters.remote) next.remote = true;

        // Only claim an expansion when the model actually added something; it
        // often returns the query alone, and the UI should not say otherwise.
        const anyTerms = analysis.keywords.length > 1 ? analysis.keywords : [];

        return {
            filters: next,
            anyTerms,
            quotaExceeded: false,
            enhanced: anyTerms.length > 0 || JSON.stringify(next) !== JSON.stringify(filters),
        };
    } catch (error) {
        if (error instanceof RateLimitError) return { ...untouched, quotaExceeded: true };

        console.error('[actions] AI enhancement failed, continuing without it', error);
        return untouched;
    }
}

export async function getJobs(query?: string, filters: UiFilters = {}): Promise<JobsResult> {
    const skip = filters.skip ?? 0;
    const take = filters.take ?? 20;

    try {
        const base: JobSearchFilters = {
            query: query?.trim() || undefined,
            country: unset(filters.country),
            language: unset(filters.language),
            seniority: unset(filters.seniority) as Seniority | undefined,
            employmentType: unset(filters.employmentType) as EmploymentType | undefined,
            // `false` here means "no preference", matching the UI's toggle.
            visaSponsorship: filters.visaSponsorship ? true : undefined,
            remote: filters.remote ? true : undefined,
        };

        const { filters: effective, anyTerms, quotaExceeded, enhanced } = base.query
            ? await enhanceQuery(base.query, base)
            : { filters: base, anyTerms: [] as string[], quotaExceeded: false, enhanced: false };

        // The cache key covers the expanded terms too, so the AI pass is paid
        // for once per distinct search rather than once per page of results.
        const key = `jobs:${JSON.stringify(effective)}:${anyTerms.join('|')}`;
        const response = await cached(key, CACHE_TTL_MS, () =>
            searchJobs({ ...effective, anyTerms, limit: POOL_SIZE }),
        );

        const page = response.jobs.slice(skip, skip + take);

        return {
            success: true,
            data: page,
            total: response.total,
            hasMore: skip + take < response.jobs.length,
            sources: response.sources.map(({ id, name, count, error }) => ({ id, name, count, error })),
            attributions: response.attributions,
            quotaExceeded,
            aiEnhanced: enhanced,
        };
    } catch (error) {
        console.error('[actions] job search failed', error);
        return {
            success: false,
            data: [],
            total: 0,
            hasMore: false,
            sources: [],
            attributions: [],
            quotaExceeded: false,
            aiEnhanced: false,
            error: 'Could not reach the job sources. Please try again.',
        };
    }
}

/** The source catalogue, for the UI's "where does this come from?" panel. */
export async function getSources() {
    return SOURCES.map(({ id, name, kind, description, homepage, docsUrl }) => ({
        id,
        name,
        kind,
        description,
        homepage,
        docsUrl,
    }));
}
