/**
 * Ambient declaration for the operator's private scraper configurations.
 *
 * `lib/scraper/configs.local.ts` is gitignored, so it is absent in a clean
 * checkout and in CI. Without this declaration `tsc` fails on the dynamic
 * import in lib/sources/providers/custom.ts — a build that only breaks for
 * people who do not have the file, which is everyone but its author.
 *
 * The loader wraps the import in try/catch, so an absent module is the normal
 * case at runtime; this only teaches the compiler what it would export.
 */
declare module '*/scraper/configs.local' {
    import type { ScraperConfig } from '@/lib/scraper/types';

    export const localScraperConfigs: ScraperConfig[];
}
