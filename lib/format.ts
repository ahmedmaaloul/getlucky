/**
 * Display helpers shared by the web UI and the MCP server, so a salary reads
 * the same whether a person or an agent is looking at it.
 */

import type { NormalizedJob } from './sources/types';

/** 120000 -> "120k", 850 -> "850". */
function compactAmount(value: number): string {
    return value >= 10_000 ? `${Math.round(value / 1000)}k` : String(value);
}

export function formatSalaryLabel(job: NormalizedJob): string | undefined {
    const { salary } = job;
    if (!salary) return undefined;
    // Nothing parsed cleanly — show the source's own wording rather than nothing.
    if (salary.min === undefined) return salary.raw;

    const range =
        salary.max === undefined
            ? compactAmount(salary.min)
            : `${compactAmount(salary.min)}–${compactAmount(salary.max)}`;

    const period = salary.period ? ` / ${salary.period.toLowerCase()}` : '';
    return `${salary.currency ?? ''} ${range}${period}`.trim();
}

export function formatRelativeAge(postedAt: string | undefined): string | undefined {
    if (!postedAt) return undefined;

    const posted = Date.parse(postedAt);
    if (Number.isNaN(posted)) return undefined;

    const days = Math.floor((Date.now() - posted) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Strip the gender markers German and Dutch postings append to every title.
 * "(m/w/d)" carries no information for a reader scanning a list of results.
 */
export function cleanJobTitle(title: string): string {
    return title
        .replace(/\((m\/w\/d|f\/m\/d|m\/f\/d|w\/m\/d|m\/f\/x|f\/m\/x|m\/w\/x|gn|d\/f\/m)\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
