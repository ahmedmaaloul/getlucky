
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface JobAnalysisResult {
    skills: string[];
    seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Unknown';
    salary: {
        min?: number;
        max?: number;
        currency?: string;
        period?: 'Yearly' | 'Monthly' | 'Hourly';
    } | null;
    visaSponsorship: boolean | null;
    jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship' | 'Unknown';
}

export class JobAnalyzer {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

    async analyze(description: string): Promise<JobAnalysisResult> {
        if (!process.env.GEMINI_API_KEY) {
            console.warn("Skipping AI analysis: Missing GEMINI_API_KEY");
            return this.getEmptyResult();
        }

        const prompt = `
        Analyze the following job description and extract structured data in JSON format.
        
        EXTRACT:
        - skills: Array of technical skills, languages, and frameworks mentioned.
        - seniority: One of ['Junior', 'Mid', 'Senior', 'Lead', 'Unknown']. Infer if not explicit.
        - salary: Object with min, max, currency, period. Null if not mentioned.
        - visaSponsorship: Boolean (true if explicitly offers sponsorship, false if explicitly says no, null if not mentioned).
        - jobType: One of ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Unknown'].

        JOB DESCRIPTION:
        ${description.slice(0, 10000)} // Truncate to avoid token limits
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return JSON.parse(text) as JobAnalysisResult;
        } catch (error) {
            console.error("AI Analysis failed:", error);
            return this.getEmptyResult();
        }
    }

    private getEmptyResult(): JobAnalysisResult {
        return {
            skills: [],
            seniority: 'Unknown',
            salary: null,
            visaSponsorship: null,
            jobType: 'Unknown'
        };
    }
}
