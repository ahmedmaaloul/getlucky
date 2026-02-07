export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getRandomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15'
];

export const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

export const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (e) {
        if (retries > 0) {
            await sleep(delay);
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw e;
    }
};
