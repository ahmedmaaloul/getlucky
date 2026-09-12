import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cached, clearCache, getCached, setCached } from '@/lib/cache';
import { RateLimitError, consume, resetRateLimit, visitorKey } from '@/lib/rate-limit';

describe('cache', () => {
    beforeEach(clearCache);

    it('returns a stored value until it expires', () => {
        setCached('k', 'v', 1000);
        expect(getCached('k')).toBe('v');
    });

    it('drops an expired entry', async () => {
        setCached('k', 'v', 1);
        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(getCached('k')).toBeUndefined();
    });

    it('runs the producer once per key', async () => {
        const produce = vi.fn(async () => 'value');

        expect(await cached('k', 1000, produce)).toBe('value');
        expect(await cached('k', 1000, produce)).toBe('value');
        expect(produce).toHaveBeenCalledTimes(1);
    });

    it('coalesces concurrent callers into one upstream call', async () => {
        // A burst of visitors hitting a cold instance must not become a burst of
        // requests to someone else's free API.
        const produce = vi.fn(
            () => new Promise<string>((resolve) => setTimeout(() => resolve('value'), 20)),
        );

        const results = await Promise.all([
            cached('k', 1000, produce),
            cached('k', 1000, produce),
            cached('k', 1000, produce),
        ]);

        expect(results).toEqual(['value', 'value', 'value']);
        expect(produce).toHaveBeenCalledTimes(1);
    });

    it('does not cache a rejection', async () => {
        const failing = vi.fn(async () => {
            throw new Error('upstream down');
        });

        await expect(cached('k', 1000, failing)).rejects.toThrow('upstream down');
        await expect(cached('k', 1000, failing)).rejects.toThrow('upstream down');
        expect(failing).toHaveBeenCalledTimes(2);
    });

    it('evicts rather than growing without limit', () => {
        for (let i = 0; i < 260; i++) setCached(`k${i}`, i, 60_000);
        expect(getCached('k259')).toBe(259);
        expect(getCached('k0')).toBeUndefined();
    });
});

describe('rate limit', () => {
    beforeEach(resetRateLimit);

    const config = { perVisitorPerDay: 2, visitorsPerDay: 2 };

    it('allows up to the per-visitor cap then refuses', () => {
        expect(consume('1.1.1.1', config).allowed).toBe(true);
        expect(consume('1.1.1.1', config).remaining).toBe(0);
        expect(() => consume('1.1.1.1', config)).toThrow(RateLimitError);
    });

    it('refuses a new visitor once the daily ceiling is reached', () => {
        consume('1.1.1.1', config);
        consume('2.2.2.2', config);

        expect(() => consume('3.3.3.3', config)).toThrow(/GLOBAL_QUOTA_EXCEEDED/);
        // An already-counted visitor still gets their remaining allowance.
        expect(consume('1.1.1.1', config).allowed).toBe(true);
    });

    it('starts a fresh count when the day rolls over', () => {
        consume('1.1.1.1', config, '2026-01-01');
        consume('1.1.1.1', config, '2026-01-01');
        expect(() => consume('1.1.1.1', config, '2026-01-01')).toThrow(RateLimitError);

        expect(consume('1.1.1.1', config, '2026-01-02').allowed).toBe(true);
    });

    it('never stores the address itself', () => {
        const key = visitorKey('203.0.113.9', '2026-01-01');
        expect(key).not.toContain('203.0.113.9');
        expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('gives the same visitor a different key on a different day', () => {
        // This is what makes "we cannot track you across days" a property of the
        // data rather than a promise.
        expect(visitorKey('203.0.113.9', '2026-01-01')).not.toBe(
            visitorKey('203.0.113.9', '2026-01-02'),
        );
    });
});
