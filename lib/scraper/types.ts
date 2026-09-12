export interface JobListing {
    title: string;
    company: string;
    location: string;
    description: string;
    url: string;
    source: string;
    postedAt: Date;
    tags?: string[];
    salary?: string;
    jobType?: string;
    seniority?: string;
    country?: string;
    language?: string;
    logoUrl?: string;
}

export interface ScraperSelectors {
    list: string;
    item: {
        title: string;
        company: string;
        location: string;
        url: string;
        description?: string;
        tags?: string;
        salary?: string;
        logo?: string;
    };
    nextPage?: string;
}

export interface ScraperConfig {
    name: string;
    baseUrl: string; // Can contain {keyword} placeholder for dynamic search
    type: 'static' | 'spa' | 'api';
    selectors: ScraperSelectors;
    country: string; // For filtering: 'France', 'Germany', 'UK', 'USA', 'Global', etc.
    companies?: string[]; // For company-specific scraping
    searchSelector?: string; // If search input interaction is needed
    companyFilter?: string; // internal use
}
