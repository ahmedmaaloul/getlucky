import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('.', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        // Every test here is pure: no network, no clock skew, no fixtures that
        // go stale when a job board reshuffles its feed.
        include: ['tests/**/*.test.ts'],
    },
});
