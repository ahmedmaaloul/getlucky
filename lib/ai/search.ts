/**
 * Optional query understanding.
 *
 * Turns what someone typed into something the search layer can act on:
 * synonyms it would otherwise miss ("k8s" also means "Kubernetes"), and
 * filters stated in prose ("senior rust roles in Berlin with visa").
 *
 * Strictly additive. Without GEMINI_API_KEY, or when the model is unavailable
 * or returns something unusable, search falls back to literal matching. It is
 * the only part of GetLucky that calls a model at all.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

import { KNOWN_COUNTRIES } from '@/lib/sources/normalize';
import type { EmploymentType, Seniority } from '@/lib/sources/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SENIORITIES: readonly Seniority[] = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager'];
const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
    'Full-time',
    'Part-time',
    'Contract',
    'Freelance',
    'Internship',
    'Temporary',
];
const LANGUAGES = ['English', 'German', 'French', 'Spanish'] as const;

export interface SearchAnalysisResult {
    keywords: string[];
    filters: {
        seniority?: Seniority;
        country?: string;
        language?: string;
        employmentType?: EmploymentType;
        visaSponsorship?: boolean;
        remote?: boolean;
    };
}

/**
 * Keep only values the search layer can actually match.
 *
 * A model asked for an enum will still occasionally invent a member, and an
 * invented country is worse than no filter at all: it matches nothing, so the
 * user gets an empty page for a query that would have worked without AI.
 */
function pickFrom<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
    if (typeof value !== 'string') return undefined;
    return allowed.find((option) => option.toLowerCase() === value.trim().toLowerCase());
}

export class SearchAgent {
    private model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
    });

    async analyzeQuery(query: string): Promise<SearchAnalysisResult> {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('[ai] no GEMINI_API_KEY, skipping query expansion');
            return this.fallback(query);
        }

        const prompt = `You help a job seeker search a tech job board.

Analyse this query and return JSON.

QUERY: ${JSON.stringify(query)}

Return exactly this shape:
{
  "keywords": string[],
  "filters": {
    "seniority": ${SENIORITIES.map((s) => `"${s}"`).join(' | ')} | null,
    "country": ${KNOWN_COUNTRIES.map((c) => `"${c}"`).join(' | ')} | null,
    "language": ${LANGUAGES.map((l) => `"${l}"`).join(' | ')} | null,
    "employmentType": ${EMPLOYMENT_TYPES.map((t) => `"${t}"`).join(' | ')} | null,
    "visaSponsorship": true | null,
    "remote": true | null
  }
}

RULES
- keywords: the original terms plus 3-6 genuinely related ones — synonyms,
  expanded abbreviations, adjacent role titles, closely tied technologies.
- Use the exact spellings listed above for every filter. Do not invent values;
  use null when the query does not clearly ask for one.
- "remote", "anywhere", "work from home" set remote, NOT country.
- Set visaSponsorship only when sponsorship or relocation is actually asked for.
- language is the language the posting is written in, not a programming language.`;

        try {
            const result = await this.model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text()) as unknown;
            return this.validate(parsed, query);
        } catch (error) {
            console.error('[ai] query expansion failed, falling back to literal search', error);
            return this.fallback(query);
        }
    }

    private validate(parsed: unknown, query: string): SearchAnalysisResult {
        const raw = (parsed ?? {}) as { keywords?: unknown; filters?: Record<string, unknown> };
        const filters = raw.filters ?? {};

        const keywords = Array.isArray(raw.keywords)
            ? raw.keywords.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
            : [];

        return {
            // The original query always survives, whatever the model returned.
            keywords: [...new Set([query, ...keywords])],
            filters: {
                seniority: pickFrom(filters.seniority, SENIORITIES),
                country: pickFrom(filters.country, KNOWN_COUNTRIES),
                language: pickFrom(filters.language, LANGUAGES),
                employmentType: pickFrom(filters.employmentType, EMPLOYMENT_TYPES),
                visaSponsorship: filters.visaSponsorship === true ? true : undefined,
                remote: filters.remote === true ? true : undefined,
            },
        };
    }

    private fallback(query: string): SearchAnalysisResult {
        return { keywords: [query], filters: {} };
    }
}
