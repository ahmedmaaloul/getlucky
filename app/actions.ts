'use server'

import { prisma } from "@/lib/prisma"
import { Job } from "@prisma/client"
import { JobScraperEngine } from "@/lib/scraper/engine"
import { scraperConfigs } from "@/lib/scraper/configs"
import { JobService } from "@/lib/services/job-service"
import { ScraperConfig } from "@/lib/scraper/types"

// Try to load local configs (gitignored) for actual scraping
let activeConfigs: ScraperConfig[] = scraperConfigs;
try {
    // Dynamic import of local configs if they exist
    const localModule = require("@/lib/scraper/configs.local");
    if (localModule.localScraperConfigs && localModule.localScraperConfigs.length > 0) {
        activeConfigs = localModule.localScraperConfigs;
        console.log("Using local scraper configs (private)");
    }
} catch {
    console.log("Using public scraper configs (demo mode - no active scrapers)");
}

/**
 * Dynamic scraping with user-provided keyword and country filter
 * @param keyword - Search term from user input (e.g., "React Developer")
 * @param country - Country filter (e.g., "France", "Germany", "All")
 */
export async function syncJobs(keyword?: string, country?: string) {
    try {
        console.log(`Starting dynamic sync... Keyword: "${keyword || 'All'}", Country: "${country || 'All'}"`);
        const engine = new JobScraperEngine();
        const jobService = new JobService();
        let totalSaved = 0;

        // Filter scrapers by country if specified
        let configsToRun = activeConfigs;
        if (country && country !== 'All') {
            configsToRun = activeConfigs.filter(c =>
                c.country === country || c.country === 'Global'
            );
            console.log(`Filtered to ${configsToRun.length} scrapers for ${country}`);
        }

        // Run scrapers sequentially to avoid resource exhaustion
        for (const config of configsToRun) {
            try {
                const jobs = await engine.scrape(config, keyword);
                if (jobs.length > 0) {
                    const { savedCount } = await jobService.saveJobs(jobs);
                    totalSaved += savedCount;
                }
            } catch (e) {
                console.error(`Failed to scrape ${config.name}`, e);
            }
        }

        // Cleanup old jobs (retention policy: 7 days for free tier efficiency)
        const deletedCount = await jobService.deleteOldJobs(7);
        console.log(`Cleaned up ${deletedCount} old jobs.`);

        return { success: true, count: totalSaved, deleted: deletedCount, enriched: 0 };
    } catch (error) {
        console.error('Failed to sync jobs:', error)
        return { success: false, error: 'Failed to sync jobs' }
    }
}

export async function getJobs(query?: string, filters?: {
    country?: string,
    language?: string,
    seniority?: string,
    visaSponsorship?: boolean,
    minSalary?: number,
    skip?: number,
    take?: number
}) {
    try {
        const where: any = {};
        let searchKeywords = query ? [query] : [];

        // AI Search Enhancement
        let quotaExceeded = false;
        if (query && process.env.GEMINI_API_KEY) {
            try {
                // Rate Limit Check
                const { checkAiRateLimit } = await import("@/lib/rate-limit");
                await checkAiRateLimit();

                const { SearchAgent } = await import("@/lib/ai/search");
                const searchAgent = new SearchAgent();
                const analysis = await searchAgent.analyzeQuery(query);

                // Expand keywords
                if (analysis.keywords && analysis.keywords.length > 0) {
                    searchKeywords = [...new Set([...searchKeywords, ...analysis.keywords])];
                }

                // Apply AI-extracted filters if not explicitly overridden by UI filters
                if (analysis.filters) {
                    if (!filters?.seniority || filters.seniority === "All") {
                        if (analysis.filters.seniority) filters = { ...filters, seniority: analysis.filters.seniority };
                    }
                    if (!filters?.country || filters.country === "All") {
                        if (analysis.filters.country) filters = { ...filters, country: analysis.filters.country };
                    }
                    if (!filters?.language || filters.language === "All") {
                        if (analysis.filters.language) filters = { ...filters, language: analysis.filters.language };
                    }
                    if (filters?.visaSponsorship === undefined || filters.visaSponsorship === false) {
                        if (analysis.filters.visaSponsorship) filters = { ...filters, visaSponsorship: true };
                    }
                }
            } catch (e: any) {
                if (e.message === "GLOBAL_QUOTA_EXCEEDED" || e.message === "USER_QUOTA_EXCEEDED") {
                    console.warn("AI Quota Exceeded:", e.message);
                    quotaExceeded = true;
                } else {
                    console.error("AI Search enhancement failed, falling back to basic search", e);
                }
            }
        }

        if (searchKeywords.length > 0) {
            where.OR = searchKeywords.map(keyword => ({
                OR: [
                    { title: { contains: keyword } }, // Case insensitive by default in SQLite? No, usually need mode: 'insensitive' for Postgres, but let's check prisma schema or assume default behavior for now. 
                    // Actually, for better results with multiple keywords, we might want to group them. 
                    // But simple OR across all keywords for all fields might be too broad. 
                    // Let's stick to the original logic but expanded:
                    // (Title contains K1 OR Title contains K2 ...) OR (Desc contains K1 ...)
                    { title: { contains: keyword } },
                    { company: { contains: keyword } },
                    { description: { contains: keyword } },
                ]
            })).flat();

            // Wait, the above logic `where.OR = [...]` means ANY of the conditions in the array must be true.
            // If we map each keyword to a set of conditions, we get [ {OR: ...}, {OR: ...} ].
            // If we put this in `where.OR`, it means (Keyword1 matched) OR (Keyword2 matched). This is good for expansion.
        }

        if (filters?.country && filters.country !== "All") {
            where.country = filters.country;
        }

        if (filters?.language && filters.language !== "All") {
            where.language = filters.language;
        }

        if (filters?.seniority && filters.seniority !== "All") {
            where.seniority = filters.seniority;
        }

        if (filters?.visaSponsorship) {
            where.visaSponsorship = true;
        }

        const jobs = await prisma.job.findMany({
            where,
            orderBy: {
                postedAt: 'desc'
            },
            skip: filters?.skip || 0,
            take: filters?.take || 50
        })

        return { success: true, data: jobs, quotaExceeded }
    } catch (error) {
        console.error('Failed to fetch jobs:', error)
        return { success: false, error: 'Failed to fetch jobs' }
    }
}
