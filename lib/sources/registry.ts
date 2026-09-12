/**
 * The catalogue of everything GetLucky can read from.
 *
 * Every entry here talks to a public, documented endpoint that requires no key
 * and no login. Adding a source means adding a provider and one line below —
 * the UI, the REST API and the MCP server all read from this list.
 */

import { arbeitnow } from './providers/arbeitnow';
import { ashby } from './providers/ashby';
import { greenhouse } from './providers/greenhouse';
import { lever } from './providers/lever';
import { remoteOk } from './providers/remoteok';
import { remotive } from './providers/remotive';
import type { JobSource, SourceFetchOptions, SourceResult } from './types';

export const SOURCES: readonly JobSource[] = [
    remoteOk,
    arbeitnow,
    remotive,
    greenhouse,
    lever,
    ashby,
] as const;

/** Feeds that return a cross-company list without extra arguments. */
export const AGGREGATOR_SOURCES = SOURCES.filter((source) => source.kind === 'aggregator');

/** Company boards: useful only once you name the board. */
export const ATS_SOURCES = SOURCES.filter((source) => source.kind === 'ats');

export function getSource(id: string): JobSource | undefined {
    return SOURCES.find((source) => source.id === id.toLowerCase());
}

export function listSourceIds(): string[] {
    return SOURCES.map((source) => source.id);
}

/**
 * Fetch several sources at once, never letting one failure sink the rest.
 *
 * A dead or rate-limited source comes back as a `SourceResult` carrying an
 * `error`, so callers can show partial results and say honestly what is
 * missing instead of rendering an empty page.
 */
export async function fetchFromSources(
    sources: readonly JobSource[],
    options: SourceFetchOptions = {},
): Promise<SourceResult[]> {
    return Promise.all(
        sources.map(async (source): Promise<SourceResult> => {
            const startedAt = Date.now();
            try {
                const jobs = await source.fetch(options);
                return {
                    sourceId: source.id,
                    sourceName: source.name,
                    jobs,
                    durationMs: Date.now() - startedAt,
                };
            } catch (error) {
                return {
                    sourceId: source.id,
                    sourceName: source.name,
                    jobs: [],
                    error: error instanceof Error ? error.message : String(error),
                    durationMs: Date.now() - startedAt,
                };
            }
        }),
    );
}
