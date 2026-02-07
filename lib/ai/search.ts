import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface SearchAnalysisResult {
    keywords: string[];
    filters: {
        seniority?: 'Junior' | 'Mid' | 'Senior' | 'Lead';
        country?: string;
        language?: string;
        visaSponsorship?: boolean;
    };
}

export class SearchAgent {
    private model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

    async analyzeQuery(query: string): Promise<SearchAnalysisResult> {
        if (!process.env.GEMINI_API_KEY) {
            console.warn("Skipping AI search analysis: Missing GEMINI_API_KEY");
            return this.getFallbackResult(query);
        }

        const prompt = `
        You are an expert recruiter and search engine optimizer.
        Analyze the user's search query for a job board and extract structured data.
        
        GOAL:
        1. Expand the query into a list of relevant keywords (synonyms, related technologies, role titles).
        2. Extract specific filters if mentioned (seniority, country, language, visa sponsorship).

        USER QUERY: "${query}"

        OUTPUT JSON FORMAT:
        {
            "keywords": ["string", "string"], // Original query + 3-5 related terms
            "filters": {
                "seniority": "Junior" | "Mid" | "Senior" | "Lead" | null,
                "country": "Germany" | "UK" | "UAE" | "Saudi Arabia" | "France" | "Global/Remote" | null, // Map to these exact values if possible, otherwise null
                "language": "English" | "German" | "French" | null,
                "visaSponsorship": true | null // Only set to true if explicitly asked
            }
        }
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return JSON.parse(text) as SearchAnalysisResult;
        } catch (error) {
            console.error("AI Search Analysis failed:", error);
            return this.getFallbackResult(query);
        }
    }

    private getFallbackResult(query: string): SearchAnalysisResult {
        return {
            keywords: [query],
            filters: {}
        };
    }
}
