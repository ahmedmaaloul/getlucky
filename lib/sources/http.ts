/**
 * Minimal HTTP client shared by every provider.
 *
 * Public APIs are a privilege, not a right: we identify ourselves honestly in
 * the User-Agent, cap concurrency by never firing more than one request per
 * provider call, back off when asked to, and give up quickly instead of
 * hammering a struggling endpoint.
 */

export const USER_AGENT =
    process.env.GETLUCKY_USER_AGENT ??
    'GetLucky/1.0 (+https://github.com/ahmedmaaloul/getlucky)';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

export class SourceHttpError extends Error {
    constructor(
        message: string,
        readonly status?: number,
        readonly url?: string,
    ) {
        super(message);
        this.name = 'SourceHttpError';
    }
}

interface FetchJsonOptions {
    timeoutMs?: number;
    retries?: number;
    signal?: AbortSignal;
    headers?: Record<string, string>;
}

/** Retry on transient failures only — a 404 board will never become a 200. */
function isRetryable(status: number): boolean {
    return status === 429 || status === 408 || status >= 500;
}

/** Honour `Retry-After` when present, otherwise exponential backoff. */
function backoffMs(attempt: number, retryAfter: string | null): number {
    if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 10_000);
    }
    return Math.min(500 * 2 ** attempt, 8_000);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retries = DEFAULT_RETRIES,
        signal,
        headers = {},
    } = options;

    let lastError: Error = new SourceHttpError('Request never ran', undefined, url);

    for (let attempt = 0; attempt <= retries; attempt++) {
        const timeout = AbortSignal.timeout(timeoutMs);
        // Caller cancellation and our own timeout both abort the request.
        const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

        try {
            const response = await fetch(url, {
                headers: { accept: 'application/json', 'user-agent': USER_AGENT, ...headers },
                signal: combined,
            });

            if (!response.ok) {
                const error = new SourceHttpError(
                    `HTTP ${response.status} ${response.statusText}`,
                    response.status,
                    url,
                );
                if (attempt < retries && isRetryable(response.status)) {
                    lastError = error;
                    await sleep(backoffMs(attempt, response.headers.get('retry-after')));
                    continue;
                }
                throw error;
            }

            return (await response.json()) as T;
        } catch (error) {
            // A caller-initiated abort is a decision, not a failure to retry around.
            if (signal?.aborted) throw error;

            lastError = error instanceof Error ? error : new Error(String(error));
            if (error instanceof SourceHttpError && !isRetryable(error.status ?? 0)) throw error;
            if (attempt === retries) break;
            await sleep(backoffMs(attempt, null));
        }
    }

    throw lastError;
}
