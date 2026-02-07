import { ScraperConfig } from './types';

/**
 * Public Demo Scraper Configurations
 * 
 * This file contains example scraper configurations for demonstration purposes.
 * For production use, you would add your own data source configurations here.
 * 
 * The actual scraping logic in `engine.ts` uses Playwright to extract job data
 * from job board websites. Each config defines:
 * - name: Display name for the source
 * - baseUrl: The search results URL to scrape
 * - type: 'static' (single page) or 'dynamic' (paginated)
 * - selectors: CSS selectors to extract job data
 * 
 * IMPORTANT: Always respect robots.txt and Terms of Service of any website you scrape.
 * This demo project is for educational purposes only.
 */

// Example configuration structure (not functional - for demonstration only)
export const scraperConfigs: ScraperConfig[] = [
    // Add your own scraper configurations here
    // Example:
    // {
    //     name: 'Example Job Board (Germany)',
    //     baseUrl: 'https://example-job-board.com/search?q=developer&location=germany',
    //     type: 'static',
    //     selectors: {
    //         list: 'ul.job-list li',
    //         item: {
    //             title: 'h3.job-title',
    //             company: 'span.company-name',
    //             location: 'span.location',
    //             url: 'a.job-link'
    //         }
    //     }
    // }
];
