/**
 * Process-local TTL cache.
 *
 * Sources are public APIs offered for free, so the polite thing — and the fast
 * thing — is not to re-fetch the same feed for every visitor. Deliberately
 * in-memory: a cache that needs provisioning is a cache that stops a reader
 * from running `npm run dev` and having a working app.
 *
 * On serverless each instance keeps its own copy, which is fine. The worst
 * case is a cold instance doing one extra upstream fetch.
 */

interface Entry<T> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** Bound the map so a long-lived instance cannot grow without limit. */
const MAX_ENTRIES = 200;

function evictExpired(now: number): void {
    for (const [key, entry] of store) {
        if (entry.expiresAt <= now) store.delete(key);
    }
}

export function getCached<T>(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
    }
    return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
    const now = Date.now();

    if (store.size >= MAX_ENTRIES) {
        evictExpired(now);
        // Still full of live entries: drop the oldest insertion, which Map
        // iteration yields first.
        if (store.size >= MAX_ENTRIES) {
            const oldest = store.keys().next().value;
            if (oldest !== undefined) store.delete(oldest);
        }
    }

    store.set(key, { value, expiresAt: now + ttlMs });
}

/**
 * Run `produce` at most once per TTL per key.
 *
 * Concurrent callers share one in-flight promise, so a burst of visitors on a
 * cold instance produces a single upstream request rather than one each.
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
    const hit = getCached<T>(key);
    if (hit !== undefined) return hit;

    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = produce()
        .then((value) => {
            setCached(key, value, ttlMs);
            return value;
        })
        .finally(() => {
            inFlight.delete(key);
        });

    inFlight.set(key, promise);
    return promise;
}

/** Test seam. */
export function clearCache(): void {
    store.clear();
    inFlight.clear();
}
