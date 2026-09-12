/**
 * Rate limiting for the optional AI layer.
 *
 * The privacy design is the point here, and it is worth stating plainly:
 *
 *   - The caller's IP is never stored. It is hashed with a secret salt *and
 *     today's date*, so the same visitor produces a different key tomorrow.
 *     Correlating a person's usage across days is not merely discouraged, it
 *     is not computable from what we keep.
 *   - Counters live in process memory and are dropped as soon as their day
 *     rolls over. Nothing is written to disk or to a database.
 *   - No cookies, no fingerprinting, no analytics.
 *
 * Only the AI enrichment path is limited. Job search itself reads public APIs
 * and is not rate limited by us.
 */

import crypto from 'node:crypto';
import { headers } from 'next/headers';

export interface RateLimitConfig {
    /** Requests allowed per visitor per day. */
    perVisitorPerDay: number;
    /** Distinct visitors allowed per day, as a spend ceiling on the AI provider. */
    visitorsPerDay: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
    perVisitorPerDay: Number(process.env.AI_REQUESTS_PER_VISITOR_PER_DAY ?? 20),
    visitorsPerDay: Number(process.env.AI_VISITORS_PER_DAY ?? 500),
};

export type RateLimitReason = 'USER_QUOTA_EXCEEDED' | 'GLOBAL_QUOTA_EXCEEDED';

export class RateLimitError extends Error {
    constructor(readonly reason: RateLimitReason) {
        super(reason);
        this.name = 'RateLimitError';
    }
}

interface DayBucket {
    date: string;
    counts: Map<string, number>;
}

let bucket: DayBucket = { date: '', counts: new Map() };

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Ephemeral per-day visitor key.
 *
 * Without a configured IP_SALT the salt is random per process, which makes the
 * key even less linkable — at the cost of resetting counters on restart. That
 * is the right default: a missing secret should fail towards privacy, not
 * towards a predictable hash that could be brute-forced over the IPv4 space.
 */
const FALLBACK_SALT = crypto.randomBytes(32).toString('hex');

export function visitorKey(ip: string, date = today()): string {
    const salt = process.env.IP_SALT || FALLBACK_SALT;
    return crypto.createHash('sha256').update(`${ip}${date}${salt}`).digest('hex');
}

function rollOver(date: string): void {
    if (bucket.date !== date) bucket = { date, counts: new Map() };
}

/** Pure core, so the policy can be tested without a request context. */
export function consume(
    ip: string,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT,
    date = today(),
): { allowed: true; remaining: number } {
    rollOver(date);

    const key = visitorKey(ip, date);
    const used = bucket.counts.get(key) ?? 0;

    if (used === 0 && bucket.counts.size >= config.visitorsPerDay) {
        throw new RateLimitError('GLOBAL_QUOTA_EXCEEDED');
    }
    if (used >= config.perVisitorPerDay) {
        throw new RateLimitError('USER_QUOTA_EXCEEDED');
    }

    bucket.counts.set(key, used + 1);
    return { allowed: true, remaining: config.perVisitorPerDay - used - 1 };
}

export async function checkAiRateLimit(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    const headersList = await headers();
    // Behind a proxy the client address is the first hop in x-forwarded-for.
    const ip =
        headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip')?.trim() ||
        '127.0.0.1';

    return consume(ip, config);
}

/** Test seam. */
export function resetRateLimit(): void {
    bucket = { date: '', counts: new Map() };
}
