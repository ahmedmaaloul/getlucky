import { JobListing, ScraperConfig } from './types';
import { JobProcessor } from './processor';
import { getRandomUserAgent } from './utils';

export class JobScraperEngine {
    async scrape(config: ScraperConfig, keyword?: string): Promise<JobListing[]> {
        if (config.type === 'api') {
            return this.scrapeApi(config);
        }

        // Replace {keyword} placeholder with actual search term
        const searchKeyword = keyword || 'Software Engineer';
        const encodedKeyword = encodeURIComponent(searchKeyword);
        const targetUrl = config.baseUrl.replace('{keyword}', encodedKeyword);

        console.log(`Starting scrape for ${config.name} with keyword: "${searchKeyword}"...`);

        // Imported here rather than at module scope because Playwright is
        // genuinely optional: it is a devDependency, and the published
        // getlucky-mcp package does not ship it at all. A static import would
        // make Node resolve it the moment this module loads — which is what
        // broke `npx getlucky-mcp` before it ever reached a tool call.
        const { chromium } = await import('playwright');

        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            viewport: { width: 1920, height: 1080 }
        });

        const page = await context.newPage();
        const jobs: JobListing[] = [];

        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Simple wait for list
            try {
                await page.waitForSelector(config.selectors.list, { timeout: 10000 });
            } catch {
                console.log(`List selector ${config.selectors.list} not found.`);
            }

            const items = await page.$$(config.selectors.list);
            console.log(`Found ${items.length} items`);

            for (const item of items) {
                try {
                    const titleEl = await item.$(config.selectors.item.title);
                    const companyEl = await item.$(config.selectors.item.company);
                    const locationEl = await item.$(config.selectors.item.location);
                    const urlEl = await item.$(config.selectors.item.url);

                    const title = titleEl ? await titleEl.innerText() : 'Unknown Title';
                    const company = companyEl ? await companyEl.innerText() : 'Unknown Company';
                    const location = locationEl ? await locationEl.innerText() : 'Unknown Location';
                    const link = urlEl ? await urlEl.getAttribute('href') : '';

                    if (title && link) {
                        const fullUrl = link.startsWith('http') ? link : new URL(link, config.baseUrl).toString();
                        const processed = JobProcessor.process(title, '', config.name, location);

                        jobs.push({
                            title,
                            company,
                            location,
                            url: fullUrl,
                            description: title,
                            source: config.name,
                            postedAt: new Date(),
                            tags: processed.tags,
                            salary: processed.salary || undefined,
                            jobType: processed.jobType,
                            seniority: processed.seniority,
                            country: processed.country,
                            language: processed.language
                        });
                    }
                } catch {
                    // One malformed card must not abort the page
                }
            }

        } catch (error) {
            console.error(`Error scraping ${config.name}:`, error);
        } finally {
            await browser.close();
        }

        return jobs;
    }

    private async scrapeApi(_config: ScraperConfig): Promise<JobListing[]> {
        // Placeholder for API scraping logic
        return [];
    }
}
