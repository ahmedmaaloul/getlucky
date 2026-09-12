/**
 * Scoring a posting against a candidate profile.
 *
 * Deliberately deterministic: no model call, no API key, no network. An agent
 * asking "which of these fit me?" gets the same answer every time and can
 * afford to ask about hundreds of jobs.
 */

import type { NormalizedJob, Seniority } from './sources/types';

export interface CandidateProfile {
    /** Technologies and skills the candidate has, free-form. */
    skills: string[];
    seniority?: Seniority;
    /** Acceptable countries. Empty means anywhere. */
    countries?: string[];
    remoteOnly?: boolean;
    /** Floor on the advertised low end, in the posting's own currency. */
    minSalary?: number;
}

export interface ProfileMatch {
    job: NormalizedJob;
    /** 0–100. Not a probability — a ranking aid. */
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    /** Plain-language notes on what drove the score, for an agent to relay. */
    reasons: string[];
}

/** Seniority as a line, so we can talk about "one step up" rather than equality. */
const SENIORITY_LADDER: Seniority[] = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager'];

function seniorityDistance(a: Seniority | undefined, b: Seniority | undefined): number | undefined {
    if (!a || !b) return undefined;
    const left = SENIORITY_LADDER.indexOf(a);
    const right = SENIORITY_LADDER.indexOf(b);
    if (left < 0 || right < 0) return undefined;
    return Math.abs(left - right);
}

/** Tolerate the spellings that mean the same thing to a human reader. */
function normalizeSkill(skill: string): string {
    return skill
        .toLowerCase()
        .replace(/\.js$/, '')
        .replace(/[^a-z0-9+#]/g, '');
}

const WEIGHTS = {
    skills: 70,
    seniority: 18,
    location: 12,
} as const;

/**
 * Above this many tags, a posting stops being evidence of anything.
 *
 * Across a 357-job sample the median listing carries 2 tags and the 90th
 * percentile carries 18, while staffing agencies publish the same 60–77 tag
 * blob on every role they list. Counting those as skill matches let a DevOps
 * opening rank first for a React developer, so past the threshold we ignore
 * the tags and judge the posting on its title and description alone.
 */
const TAG_SPAM_THRESHOLD = 25;

export function matchJobToProfile(job: NormalizedJob, profile: CandidateProfile): ProfileMatch {
    const reasons: string[] = [];

    // Where a skill appears matters as much as whether it appears. A title is a
    // statement about the role; a tag is a deliberate label; a mention buried in
    // prose is often just a laundry list. Scoring these identically is what lets
    // an agency's catch-all posting outrank a genuinely matching one.
    const MATCH_STRENGTH = { title: 1, tag: 0.9, description: 0.55 } as const;

    const tagsAreInformative = job.tags.length <= TAG_SPAM_THRESHOLD;
    const searchableTags = tagsAreInformative ? job.tags : [];
    const normalizedTags = new Set(searchableTags.map(normalizeSkill));

    const title = job.title.toLowerCase();
    const description = job.description.toLowerCase();

    if (!tagsAreInformative) {
        reasons.push(
            `Ignoring ${job.tags.length} tags — a posting claiming that many technologies is ` +
                'advertising a talent pool rather than describing one role',
        );
    }

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const titleSkills: string[] = [];
    let strengthTotal = 0;

    for (const skill of profile.skills) {
        const normalized = normalizeSkill(skill);
        if (!normalized) continue;

        const needle = skill.toLowerCase();
        let strength = 0;

        if (title.includes(needle)) {
            strength = MATCH_STRENGTH.title;
            titleSkills.push(skill);
        } else if (normalizedTags.has(normalized)) {
            strength = MATCH_STRENGTH.tag;
        } else if (description.includes(needle)) {
            strength = MATCH_STRENGTH.description;
        }

        if (strength > 0) {
            matchedSkills.push(skill);
            strengthTotal += strength;
        } else {
            missingSkills.push(skill);
        }
    }

    const totalSkills = matchedSkills.length + missingSkills.length;
    // Weighted, so four description-only mentions cannot reach the ceiling that
    // four title-and-tag matches would.
    const skillRatio = totalSkills > 0 ? strengthTotal / totalSkills : 0;
    let score = skillRatio * WEIGHTS.skills;

    if (titleSkills.length > 0) {
        reasons.push(`The title itself names ${titleSkills.join(', ')}`);
    }

    if (totalSkills > 0) {
        reasons.push(
            matchedSkills.length > 0
                ? `Matches ${matchedSkills.length}/${totalSkills} of your skills: ${matchedSkills.join(', ')}`
                : 'None of your listed skills appear in this posting',
        );
    }

    // Seniority: exact level is ideal, one step away is still worth surfacing.
    const distance = seniorityDistance(profile.seniority, job.seniority);
    if (distance === undefined) {
        // Unknown on either side is neutral, not a penalty — most of the score
        // should still come from skills rather than from a missing field.
        score += WEIGHTS.seniority / 2;
    } else if (distance === 0) {
        score += WEIGHTS.seniority;
        reasons.push(`Seniority matches exactly (${job.seniority})`);
    } else if (distance === 1) {
        score += WEIGHTS.seniority * 0.6;
        reasons.push(`Seniority is one step away (role is ${job.seniority}, you are ${profile.seniority})`);
    } else {
        reasons.push(`Seniority gap: role is ${job.seniority}, you are ${profile.seniority}`);
    }

    // Location, treated as a hard-ish preference rather than a filter.
    if (profile.remoteOnly && !job.remote) {
        reasons.push('Not remote, and you asked for remote only');
    } else if (profile.countries?.length) {
        if (job.country && profile.countries.includes(job.country)) {
            score += WEIGHTS.location;
            reasons.push(`Located in ${job.country}`);
        } else if (job.remote) {
            score += WEIGHTS.location * 0.7;
            reasons.push('Remote, so your country preference is likely satisfiable');
        } else {
            reasons.push(`Located in ${job.country ?? 'an unstated country'}, outside your preferences`);
        }
    } else {
        score += WEIGHTS.location;
    }

    if (profile.minSalary !== undefined) {
        if (job.salary?.min === undefined) {
            reasons.push('No salary advertised, so it cannot be checked against your floor');
        } else if (job.salary.min < profile.minSalary) {
            // Salary shortfalls scale the whole score rather than subtracting a
            // fixed amount: a role paying half your floor should sink, not dip.
            score *= 0.6;
            reasons.push(`Advertised from ${job.salary.min}, below your floor of ${profile.minSalary}`);
        } else {
            reasons.push(`Advertised from ${job.salary.min}, at or above your floor`);
        }
    }

    return {
        job,
        score: Math.round(Math.max(0, Math.min(100, score))),
        matchedSkills,
        missingSkills,
        reasons,
    };
}

/** Rank a batch, best first, optionally dropping weak matches. */
export function rankJobsForProfile(
    jobs: NormalizedJob[],
    profile: CandidateProfile,
    options: { minScore?: number; limit?: number } = {},
): ProfileMatch[] {
    const { minScore = 0, limit } = options;

    const ranked = jobs
        .map((job) => matchJobToProfile(job, profile))
        .filter((match) => match.score >= minScore)
        .sort((a, b) => b.score - a.score);

    return limit ? ranked.slice(0, limit) : ranked;
}
