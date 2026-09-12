import { describe, expect, it } from 'vitest';

import { matchJobToProfile, rankJobsForProfile } from '@/lib/matching';
import type { NormalizedJob } from '@/lib/sources/types';

function job(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
    return {
        id: 'test:1',
        sourceId: 'test',
        sourceName: 'Test',
        externalId: '1',
        title: 'Backend Engineer',
        company: 'Acme',
        remote: false,
        description: 'Build services.',
        url: 'https://example.com/jobs/1',
        tags: [],
        ...overrides,
    };
}

describe('matchJobToProfile', () => {
    it('separates matched from missing skills', () => {
        const match = matchJobToProfile(
            job({ tags: ['TypeScript'], description: 'We use PostgreSQL heavily.' }),
            { skills: ['TypeScript', 'PostgreSQL', 'Rust'] },
        );

        expect(match.matchedSkills).toEqual(['TypeScript', 'PostgreSQL']);
        expect(match.missingSkills).toEqual(['Rust']);
    });

    it('tolerates spelling variants', () => {
        const match = matchJobToProfile(job({ tags: ['Node.js'] }), { skills: ['nodejs'] });
        expect(match.matchedSkills).toEqual(['nodejs']);
    });

    it('weights a title match above a description mention', () => {
        const profile = { skills: ['React'] };

        const inTitle = matchJobToProfile(job({ title: 'React Engineer' }), profile);
        const inTags = matchJobToProfile(job({ tags: ['React'] }), profile);
        const inBody = matchJobToProfile(job({ description: 'some React work' }), profile);

        expect(inTitle.score).toBeGreaterThan(inTags.score);
        expect(inTags.score).toBeGreaterThan(inBody.score);
    });

    it('ignores tags on postings that claim dozens of technologies', () => {
        // A staffing agency listing 60 tags is advertising a talent pool, not a
        // role; the median genuine posting carries two.
        const spam = job({ title: 'DevOps Engineer', tags: Array.from({ length: 60 }, (_, i) => `Tech${i}`).concat('React') });
        const match = matchJobToProfile(spam, { skills: ['React'] });

        expect(match.matchedSkills).toEqual([]);
        expect(match.reasons.some((reason) => reason.includes('Ignoring 61 tags'))).toBe(true);
    });

    it('still counts tags on a normally-tagged posting', () => {
        const match = matchJobToProfile(job({ tags: ['React', 'AWS'] }), { skills: ['React'] });
        expect(match.matchedSkills).toEqual(['React']);
    });

    it('rewards an exact seniority match over a distant one', () => {
        const profile = { skills: ['Go'], seniority: 'Senior' as const };

        const exact = matchJobToProfile(job({ seniority: 'Senior' }), profile);
        const adjacent = matchJobToProfile(job({ seniority: 'Lead' }), profile);
        const distant = matchJobToProfile(job({ seniority: 'Intern' }), profile);

        expect(exact.score).toBeGreaterThan(adjacent.score);
        expect(adjacent.score).toBeGreaterThan(distant.score);
    });

    it('scales the score down when pay is below the floor', () => {
        const profile = { skills: ['Go'], minSalary: 100_000 };

        const above = matchJobToProfile(job({ salary: { min: 120_000 } }), profile);
        const below = matchJobToProfile(job({ salary: { min: 50_000 } }), profile);

        expect(below.score).toBeLessThan(above.score);
    });

    it('says so rather than penalising when no salary is advertised', () => {
        const match = matchJobToProfile(job(), { skills: ['Go'], minSalary: 100_000 });
        expect(match.reasons.some((reason) => reason.includes('No salary advertised'))).toBe(true);
    });

    it('keeps the score inside 0–100', () => {
        const perfect = matchJobToProfile(
            job({ title: 'Senior Go Engineer', tags: ['Go'], seniority: 'Senior', country: 'Germany' }),
            { skills: ['Go'], seniority: 'Senior', countries: ['Germany'] },
        );

        expect(perfect.score).toBeGreaterThan(0);
        expect(perfect.score).toBeLessThanOrEqual(100);
    });
});

describe('rankJobsForProfile', () => {
    it('sorts best first and honours the threshold and limit', () => {
        const jobs = [
            job({ id: 'weak', title: 'Designer' }),
            job({ id: 'strong', title: 'Rust Engineer', tags: ['Rust'] }),
        ];

        const ranked = rankJobsForProfile(jobs, { skills: ['Rust'] });
        expect(ranked[0].job.id).toBe('strong');

        expect(rankJobsForProfile(jobs, { skills: ['Rust'] }, { limit: 1 })).toHaveLength(1);
        expect(rankJobsForProfile(jobs, { skills: ['Rust'] }, { minScore: 101 })).toHaveLength(0);
    });
});
