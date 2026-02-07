import { prisma } from '../prisma';
import { JobListing } from '../scraper/types';

export class JobService {
    /**
     * Saves a list of scraped jobs to the database.
     * Uses upsert to avoid duplicates based on the URL.
     */
    async saveJobs(jobs: JobListing[]) {
        let savedCount = 0;
        let errorCount = 0;

        for (const job of jobs) {
            try {
                await prisma.job.upsert({
                    where: { url: job.url },
                    update: {
                        description: job.description || undefined,
                        tags: job.tags ? JSON.stringify(job.tags) : undefined,
                        salary: job.salary || undefined,
                        logoUrl: job.logoUrl || undefined,
                        // Don't update title/company/location/postedAt if it exists, to preserve original data?
                        // Actually, updating them is fine.
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        updatedAt: new Date()
                    },
                    create: {
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        url: job.url,
                        description: job.description || "",
                        source: job.source,
                        postedAt: job.postedAt || new Date(),
                        tags: job.tags ? JSON.stringify(job.tags) : null,
                        salary: job.salary,
                        jobType: job.jobType,
                        seniority: job.seniority,
                        country: job.country,
                        language: job.language,
                        logoUrl: job.logoUrl
                    }
                });
                savedCount++;
            } catch (error) {
                console.error(`Failed to save job ${job.url}:`, error);
                errorCount++;
            }
        }

        return { savedCount, errorCount };
    }

    /**
     * Deletes jobs older than the specified number of days.
     */
    async deleteOldJobs(days: number = 30) {
        const date = new Date();
        date.setDate(date.getDate() - days);

        const result = await prisma.job.deleteMany({
            where: {
                postedAt: {
                    lt: date
                }
            }
        });
        return result.count;
    }

    /**
     * Retrieves jobs from the database.
     */
    async getJobs(limit = 50) {
        return prisma.job.findMany({
            orderBy: { postedAt: 'desc' },
            take: limit,
        });
    }
    /**
     * Retrieves jobs that haven't been analyzed by AI yet.
     */
    async getUnenrichedJobs(limit = 10) {
        return prisma.job.findMany({
            where: {
                visaSponsorship: null
            },
            take: limit,
            orderBy: { postedAt: 'desc' }
        });
    }

    /**
     * Updates a job with AI analysis results.
     */
    async updateJobWithAnalysis(id: string, analysis: any) {
        return prisma.job.update({
            where: { id },
            data: {
                tags: analysis.skills ? JSON.stringify(analysis.skills) : undefined,
                seniority: analysis.seniority !== 'Unknown' ? analysis.seniority : undefined,
                structuredSalary: analysis.salary ? JSON.stringify(analysis.salary) : undefined,
                visaSponsorship: analysis.visaSponsorship,
                jobType: analysis.jobType !== 'Unknown' ? analysis.jobType : undefined
            }
        });
    }
}
