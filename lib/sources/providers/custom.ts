/**
 * Bring-your-own scraper source.
 *
 * The public build ships no scraper configurations, and that is deliberate:
 * the sites people usually want to scrape forbid it in their terms, so
 * shipping working configs for them would hand every reader of this repository
 * a terms violation on a plate.
 *
 * What ships instead is the machinery. Drop your own configurations into
 * `lib/scraper/configs.local.ts` — gitignored, so they stay yours — and this
 * source appears in the registry automatically. You are responsible for the
 * robots.txt and terms of service of anything you point it at.
 *
 * Playwright is an optional dependency. Without it installed this source
 * reports a clear error rather than crashing the search, so the default,
 * API-only path stays a small install.
 */

import { extractTags, inferCountry, inferEmploymentType, inferLanguage, inferRemote, inferSeniority, inferVisaSponsorship, matchesQuery } from '../normalize';
import type { JobSource, NormalizedJob } from '../types';
import type { JobListing, ScraperConfig } from '../../scraper/types';

const SOURCE_ID = 'custom';

/**
 * Load the operator's private configurations, if they left any.
 *
 * The file is gitignored and absent in a clean checkout, so a failed import is
 * the normal case and means "no custom scrapers configured", not an error.
 */
export async function loadLocalConfigs(): Promise<ScraperConfig[]> {
    try {
        const module = await import('../../scraper/configs.local');
        const configs = (module as { localScraperConfigs?: ScraperConfig[] }).localScraperConfigs;
        return Array.isArray(configs) ? configs : [];
    } catch {
        return [];
    }
}

function toNormalized(listing: JobListing, config: ScraperConfig): NormalizedJob {
    const description = listing.description ?? '';

    return {
        // The URL is the only identifier a scraped page reliably has.
        id: `${SOURCE_ID}:${encodeURIComponent(listing.url)}`,
        sourceId: SOURCE_ID,
        sourceName: `Custom · ${config.name}`,
        externalId: listing.url,
        title: listing.title,
        company: listing.company,
        companyLogo: listing.logoUrl,
        location: listing.location,
        country: listing.country ?? inferCountry(listing.location) ?? config.country,
        remote: inferRemote(listing.location, listing.title, description),
        description,
        url: listing.url,
        tags: [...new Set([...(listing.tags ?? []), ...extractTags(listing.title, description)])],
        seniority: inferSeniority(listing.title, description),
        employmentType: inferEmploymentType(listing.title, description),
        visaSponsorship: inferVisaSponsorship(description),
        language: inferLanguage(description),
        postedAt: listing.postedAt?.toISOString(),
    };
}

export const custom: JobSource = {
    id: SOURCE_ID,
    name: 'Custom scrapers',
    homepage: 'https://github.com/ahmedmaaloul/getlucky#custom-scrapers',
    description:
        'Your own scraper configurations from lib/scraper/configs.local.ts, run with Playwright. ' +
        'Absent unless you add some. You are responsible for the terms of service of any site you target.',
    kind: 'aggregator',

    async fetch(options = {}) {
        const configs = await loadLocalConfigs();
        if (configs.length === 0) return [];

        let JobScraperEngine: typeof import('../../scraper/engine').JobScraperEngine;
        try {
            ({ JobScraperEngine } = await import('../../scraper/engine'));
        } catch {
            throw new Error(
                'Custom scrapers are configured but Playwright is not installed. ' +
                    'Run `npm install playwright && npx playwright install chromium`.',
            );
        }

        const engine = new JobScraperEngine();
        const jobs: NormalizedJob[] = [];

        // Sequential on purpose: each config launches a browser, and running
        // them in parallel exhausts memory on a small machine.
        for (const config of configs) {
            if (options.signal?.aborted) break;

            try {
                const listings = await engine.scrape(config, options.query);
                for (const listing of listings) {
                    const job = toNormalized(listing, config);
                    if (!matchesQuery(options.query, job.title, job.company, job.description)) continue;

                    jobs.push(job);
                    if (options.limit && jobs.length >= options.limit) return jobs;
                }
            } catch (error) {
                // One broken selector must not take down the other configs.
                console.error(`[custom] ${config.name} failed:`, error);
            }
        }

        return jobs;
    },
};
