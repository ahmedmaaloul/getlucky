import { describe, expect, it } from 'vitest';

import {
    canonicalUrl,
    interleaveBySource,
    matchesFilters,
    scoreJob,
} from '@/lib/sources/search';
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

describe('canonicalUrl', () => {
    it('ignores protocol, www and a trailing slash', () => {
        expect(canonicalUrl('https://www.Example.com/jobs/1/')).toBe(canonicalUrl('http://example.com/jobs/1'));
    });

    it('keeps query parameters that identify the posting', () => {
        // Regression: dropping the query string collapsed every Stripe posting
        // into one, because Greenhouse identifies a job by ?gh_jid=.
        expect(canonicalUrl('https://stripe.com/jobs/search?gh_jid=1')).not.toBe(
            canonicalUrl('https://stripe.com/jobs/search?gh_jid=2'),
        );
    });

    it('drops tracking parameters', () => {
        expect(canonicalUrl('https://example.com/j/1?utm_source=x&gh_src=y')).toBe(
            canonicalUrl('https://example.com/j/1'),
        );
    });

    it('is order-insensitive for the parameters it keeps', () => {
        expect(canonicalUrl('https://e.com/j?a=1&b=2')).toBe(canonicalUrl('https://e.com/j?b=2&a=1'));
    });

    it('falls back to the raw string for an unparseable URL', () => {
        expect(canonicalUrl('not a url')).toBe('not a url');
    });
});

describe('matchesFilters', () => {
    it('filters on country, seniority and remote', () => {
        const berlin = job({ country: 'Germany', seniority: 'Senior', remote: false });

        expect(matchesFilters(berlin, { country: 'Germany' })).toBe(true);
        expect(matchesFilters(berlin, { country: 'France' })).toBe(false);
        expect(matchesFilters(berlin, { seniority: 'Junior' })).toBe(false);
        expect(matchesFilters(berlin, { remote: true })).toBe(false);
    });

    it('requires every requested tag', () => {
        const tagged = job({ tags: ['TypeScript', 'AWS'] });

        expect(matchesFilters(tagged, { tags: ['typescript'] })).toBe(true);
        expect(matchesFilters(tagged, { tags: ['TypeScript', 'AWS'] })).toBe(true);
        expect(matchesFilters(tagged, { tags: ['TypeScript', 'Rust'] })).toBe(false);
    });

    it('excludes postings with no stated salary when a floor is set', () => {
        // Showing an unpriced role as clearing a floor would be a claim we cannot make.
        expect(matchesFilters(job(), { minSalary: 50_000 })).toBe(false);
        expect(matchesFilters(job({ salary: { min: 60_000 } }), { minSalary: 50_000 })).toBe(true);
        expect(matchesFilters(job({ salary: { min: 40_000 } }), { minSalary: 50_000 })).toBe(false);
    });

    it('excludes postings that are silent about sponsorship', () => {
        expect(matchesFilters(job({ visaSponsorship: undefined }), { visaSponsorship: true })).toBe(false);
        expect(matchesFilters(job({ visaSponsorship: true }), { visaSponsorship: true })).toBe(true);
    });

    it('treats an unknown posting date as outside any recency window', () => {
        expect(matchesFilters(job({ postedAt: undefined }), { postedWithinDays: 7 })).toBe(false);
        expect(
            matchesFilters(job({ postedAt: new Date().toISOString() }), { postedWithinDays: 7 }),
        ).toBe(true);
    });
});

describe('scoreJob', () => {
    it('ranks a title hit above a description hit', () => {
        const inTitle = job({ title: 'Rust Engineer' });
        const inBody = job({ description: 'Some Rust experience helps' });

        expect(scoreJob(inTitle, ['rust'])).toBeGreaterThan(scoreJob(inBody, ['rust']));
    });

    it('scores nothing without terms', () => {
        expect(scoreJob(job(), [])).toBe(0);
    });
});

describe('interleaveBySource', () => {
    it('round-robins so one source cannot own the first page', () => {
        // Regression: Arbeitnow stamps every posting with the current day, so a
        // pure recency sort buried every other feed.
        const jobs = [
            job({ id: 'a:1', sourceId: 'a' }),
            job({ id: 'a:2', sourceId: 'a' }),
            job({ id: 'a:3', sourceId: 'a' }),
            job({ id: 'b:1', sourceId: 'b' }),
            job({ id: 'c:1', sourceId: 'c' }),
        ];

        expect(interleaveBySource(jobs).map((entry) => entry.id)).toEqual([
            'a:1',
            'b:1',
            'c:1',
            'a:2',
            'a:3',
        ]);
    });

    it('preserves every job exactly once', () => {
        const jobs = Array.from({ length: 20 }, (_, index) =>
            job({ id: `s${index % 3}:${index}`, sourceId: `s${index % 3}` }),
        );

        const result = interleaveBySource(jobs);
        expect(result).toHaveLength(jobs.length);
        expect(new Set(result.map((entry) => entry.id)).size).toBe(jobs.length);
    });

    it('leaves a single-source list untouched', () => {
        const jobs = [job({ id: 'a:1' }), job({ id: 'a:2' })];
        expect(interleaveBySource(jobs)).toEqual(jobs);
    });
});
