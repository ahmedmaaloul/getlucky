/**
 * Shared vocabulary for every job source.
 *
 * A source is anything that can hand us a list of openings through a public,
 * documented interface. Each provider is responsible for turning its own
 * payload into `NormalizedJob`, so the rest of the app never has to know
 * whether a listing came from an aggregator or from a company's ATS.
 */

export type Seniority = 'Intern' | 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager';

export type EmploymentType =
    | 'Full-time'
    | 'Part-time'
    | 'Contract'
    | 'Freelance'
    | 'Internship'
    | 'Temporary';

export interface SalaryRange {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'Yearly' | 'Monthly' | 'Weekly' | 'Daily' | 'Hourly';
    /** The raw string we parsed, kept so the UI can show what the source said. */
    raw?: string;
}

/**
 * Credit a source requires in exchange for API access.
 *
 * Remote OK's API terms, for instance, ask for a followed link back. We honour
 * that literally: `rel` is omitted rather than set to `nofollow`.
 */
export interface Attribution {
    /** Sentence to display next to the listing, e.g. "Sourced from Remote OK". */
    text: string;
    /** Where the credit should point. */
    url: string;
    /** `rel` attribute for the link. Omit to render a followed link. */
    rel?: string;
}

export interface NormalizedJob {
    /** Deterministic across runs: `${sourceId}:${externalId}`. */
    id: string;
    sourceId: string;
    sourceName: string;
    /** The id the source itself uses, so we can re-fetch a single posting. */
    externalId: string;

    title: string;
    company: string;
    companyLogo?: string;

    location?: string;
    /** Best-effort country name, inferred when the source does not say. */
    country?: string;
    remote: boolean;

    /** Plain text, HTML stripped and entities decoded. */
    description: string;
    /** Original markup, when the source provides it. */
    descriptionHtml?: string;

    /** Canonical posting page. */
    url: string;
    /** Direct application link when it differs from `url`. */
    applyUrl?: string;

    tags: string[];
    seniority?: Seniority;
    employmentType?: EmploymentType;
    salary?: SalaryRange;
    /**
     * Whether the posting offers visa sponsorship.
     *
     * `undefined` means the posting does not say — which is most of them. Never
     * collapse that into `false` when showing this to a candidate.
     */
    visaSponsorship?: boolean;
    /** Language the posting is written in, e.g. "German". */
    language?: string;
    /** ISO 8601. */
    postedAt?: string;

    attribution?: Attribution;
}

export interface SourceFetchOptions {
    /** Free-text filter. Providers that cannot search server-side filter locally. */
    query?: string;
    /** Upper bound on returned listings. Providers should respect it. */
    limit?: number;
    /**
     * Board identifier for ATS sources — the slug in the company's job board
     * URL, e.g. `stripe` in boards.greenhouse.io/stripe.
     */
    board?: string;
    signal?: AbortSignal;
}

export type SourceKind =
    /** Multi-company board with a single global feed. */
    | 'aggregator'
    /** Applicant tracking system: one board per company, `board` required. */
    | 'ats';

export interface JobSource {
    /** Stable slug used in URLs, MCP arguments and the database. */
    id: string;
    name: string;
    homepage: string;
    description: string;
    kind: SourceKind;
    /** Public documentation for the endpoint we call. */
    docsUrl?: string;
    /** Credit this source's terms require, propagated onto every job. */
    attribution?: Attribution;
    fetch(options?: SourceFetchOptions): Promise<NormalizedJob[]>;
}

/** Outcome of fetching one source, including the failure case. */
export interface SourceResult {
    sourceId: string;
    sourceName: string;
    jobs: NormalizedJob[];
    /** Present when the source could not be reached or returned garbage. */
    error?: string;
    /** Wall-clock duration of the fetch, for the /api/sources health view. */
    durationMs: number;
}
