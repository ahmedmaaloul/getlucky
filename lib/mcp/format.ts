/**
 * Text rendering for MCP responses.
 *
 * Agents pay for every token they read, so tool output is dense by design:
 * one job is four short lines carrying the facts a decision needs, with the
 * full record available in `structuredContent` when the caller wants it.
 */

import type { ProfileMatch } from '../matching';
import type { JobSearchResponse } from '../sources/search';
import type { NormalizedJob } from '../sources/types';

function formatSalary(job: NormalizedJob): string | undefined {
    const { salary } = job;
    if (!salary) return undefined;
    if (salary.min === undefined) return salary.raw;

    const currency = salary.currency ?? '';
    const round = (value: number) => (value >= 10_000 ? `${Math.round(value / 1000)}k` : String(value));

    const range = salary.max === undefined ? round(salary.min) : `${round(salary.min)}–${round(salary.max)}`;
    return `${currency} ${range}${salary.period ? ` / ${salary.period.toLowerCase()}` : ''}`.trim();
}

function formatAge(postedAt: string | undefined): string | undefined {
    if (!postedAt) return undefined;
    const posted = Date.parse(postedAt);
    if (Number.isNaN(posted)) return undefined;

    const days = Math.floor((Date.now() - posted) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

export function formatJobLine(job: NormalizedJob, index?: number): string {
    const prefix = index === undefined ? '' : `${index}. `;

    const facts = [
        job.location,
        job.remote ? 'Remote' : undefined,
        job.seniority,
        job.employmentType,
        formatSalary(job),
        formatAge(job.postedAt),
    ].filter(Boolean);

    const lines = [
        `${prefix}${job.title} — ${job.company}  [${job.id}]`,
        `   ${facts.join(' · ')}`,
    ];

    if (job.tags.length) lines.push(`   ${job.tags.slice(0, 10).join(', ')}`);
    lines.push(`   ${job.url}`);

    return lines.join('\n');
}

export function formatSearchResponse(response: JobSearchResponse): string {
    if (response.jobs.length === 0) {
        const failures = response.sources.filter((source) => source.error);
        if (failures.length === response.sources.length && failures.length > 0) {
            return `No results — every source failed:\n${failures
                .map((source) => `  ${source.name}: ${source.error}`)
                .join('\n')}`;
        }
        return 'No matching jobs. Try a broader query, or drop a filter.';
    }

    const parts = [
        `${response.total} match${response.total === 1 ? '' : 'es'}, showing ${response.jobs.length}:`,
        '',
        response.jobs.map((job, index) => formatJobLine(job, index + 1)).join('\n\n'),
    ];

    // Report degraded sources rather than silently returning a short list.
    const failures = response.sources.filter((source) => source.error);
    if (failures.length) {
        parts.push(
            '',
            `Note — ${failures.length} source(s) unavailable: ${failures
                .map((source) => `${source.name} (${source.error})`)
                .join(', ')}`,
        );
    }

    if (response.attributions.length) {
        parts.push('', response.attributions.map((a) => `${a.text} — ${a.url}`).join('\n'));
    }

    return parts.join('\n');
}

export function formatJobDetail(job: NormalizedJob): string {
    const facts: Array<[string, string | undefined]> = [
        ['Company', job.company],
        ['Location', job.location],
        ['Country', job.country],
        ['Remote', job.remote ? 'yes' : 'no'],
        ['Seniority', job.seniority],
        ['Contract', job.employmentType],
        ['Salary', formatSalary(job)],
        ['Posted', job.postedAt ? `${job.postedAt} (${formatAge(job.postedAt)})` : undefined],
        ['Source', job.sourceName],
        ['URL', job.url],
        ['Apply', job.applyUrl !== job.url ? job.applyUrl : undefined],
        ['Tags', job.tags.join(', ') || undefined],
    ];

    const header = facts
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');

    const parts = [`# ${job.title}`, '', header, '', '## Description', '', job.description];
    if (job.attribution) parts.push('', `${job.attribution.text} — ${job.attribution.url}`);

    return parts.join('\n');
}

export function formatMatches(matches: ProfileMatch[]): string {
    if (matches.length === 0) {
        return 'No jobs cleared the score threshold. Lower `min_score`, widen `query`, or add skills.';
    }

    return matches
        .map((match, index) => {
            const lines = [
                `${index + 1}. [${match.score}/100] ${match.job.title} — ${match.job.company}  [${match.job.id}]`,
                `   ${[match.job.location, match.job.remote ? 'Remote' : undefined, match.job.seniority]
                    .filter(Boolean)
                    .join(' · ')}`,
                ...match.reasons.map((reason) => `   • ${reason}`),
                `   ${match.job.url}`,
            ];
            return lines.join('\n');
        })
        .join('\n\n');
}
