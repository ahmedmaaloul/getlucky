/**
 * Enrichment applied to every listing, whatever its source.
 *
 * These are deterministic heuristics, not AI: they run on every job for free,
 * offline, and identically on the server, in tests and inside the MCP server.
 * The AI layer sits on top and is always optional.
 */

import type { EmploymentType, SalaryRange, Seniority } from './types';

const HTML_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    hellip: '…',
    mdash: '—',
    ndash: '–',
    rsquo: '’',
    lsquo: '‘',
    ldquo: '“',
    rdquo: '”',
};

export function decodeEntities(input: string): string {
    return input
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&([a-z]+);/gi, (match, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Turn source markup into readable plain text.
 *
 * Some feeds (Remote OK) double-encode their HTML, so we decode, strip, then
 * decode again — otherwise `&lt;p&gt;` survives as visible tags.
 */
export function stripHtml(input: string): string {
    if (!input) return '';

    const decodedOnce = decodeEntities(input);

    return decodeEntities(
        decodedOnce
            .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
            .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<li[^>]*>/gi, '• ')
            .replace(/<[^>]+>/g, ''),
    )
        .replace(/[ \t ]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Tidy a short label (title, company, location).
 *
 * Several feeds hand these over HTML-escaped — "Machine Operator &amp;
 * Labourers" — so they need the same entity decoding as a description body,
 * minus the tag stripping.
 */
export function cleanLabel(input: string | undefined | null): string {
    return decodeEntities(input ?? '').replace(/\s+/g, ' ').trim();
}

export function truncate(input: string, maxLength: number): string {
    if (input.length <= maxLength) return input;
    return `${input.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Country inference from a free-text location.
 *
 * Ordered most-specific first: an explicit country name wins over a city, so
 * "Paris, TX, United States" resolves to United States rather than France.
 * These are heuristics over messy strings and will occasionally be wrong.
 */
const COUNTRY_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
    ['United States', /\b(united states|u\.?s\.?a\.?|usa)\b/i],
    // State codes are always written uppercase after a comma, which keeps this
    // from firing on lowercase prose like "recherche, ca fait partie du poste".
    ['United States', /,\s?(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/],
    ['United Kingdom', /\b(united kingdom|great britain|england|scotland|wales|u\.k\.|uk)\b/i],
    ['Germany', /\b(germany|deutschland)\b/i],
    ['France', /\b(france)\b/i],
    ['Canada', /\b(canada)\b/i],
    ['Netherlands', /\b(netherlands|holland)\b/i],
    ['Switzerland', /\b(switzerland|schweiz|suisse)\b/i],
    ['Spain', /\b(spain|españa)\b/i],
    ['Italy', /\b(italy|italia)\b/i],
    ['Portugal', /\b(portugal)\b/i],
    ['Ireland', /\b(ireland)\b/i],
    ['Belgium', /\b(belgium|belgique)\b/i],
    ['Austria', /\b(austria|österreich)\b/i],
    ['Poland', /\b(poland|polska)\b/i],
    ['Sweden', /\b(sweden|sverige)\b/i],
    ['Denmark', /\b(denmark|danmark)\b/i],
    ['Norway', /\b(norway|norge)\b/i],
    ['Australia', /\b(australia)\b/i],
    ['Japan', /\b(japan)\b/i],
    ['Singapore', /\b(singapore)\b/i],
    ['India', /\b(india)\b/i],
    ['Brazil', /\b(brazil|brasil)\b/i],
    ['United Arab Emirates', /\b(united arab emirates|uae|u\.a\.e\.)\b/i],

    // Cities, checked only after every country name has had its chance.
    ['United States', /\b(new york|san francisco|seattle|austin|boston|chicago|los angeles|denver|atlanta|brooklyn|palo alto|mountain view|san jose|washington, ?dc)\b/i],
    ['United Kingdom', /\b(london|manchester|edinburgh|bristol|cambridge|glasgow|leeds)\b/i],
    ['Germany', /\b(berlin|munich|münchen|hamburg|frankfurt|cologne|köln|stuttgart|düsseldorf|leipzig|karlsruhe)\b/i],
    ['France', /\b(paris|lyon|toulouse|bordeaux|nantes|lille|marseille|montpellier|grenoble|sophia antipolis)\b/i],
    ['Canada', /\b(toronto|vancouver|montreal|montréal|ottawa|calgary|waterloo)\b/i],
    ['Netherlands', /\b(amsterdam|rotterdam|utrecht|eindhoven|the hague)\b/i],
    ['Switzerland', /\b(zurich|zürich|geneva|genève|lausanne|basel|bern)\b/i],
    ['Spain', /\b(madrid|barcelona|valencia|seville|málaga)\b/i],
    ['Ireland', /\b(dublin|cork|galway)\b/i],
    ['Portugal', /\b(lisbon|lisboa|porto)\b/i],
    ['Belgium', /\b(brussels|bruxelles|antwerp|ghent)\b/i],
    ['Austria', /\b(vienna|wien|graz|linz|salzburg)\b/i],
    ['Poland', /\b(warsaw|warszawa|krakow|kraków|wrocław|wroclaw|gdansk)\b/i],
    ['Sweden', /\b(stockholm|gothenburg|göteborg|malmö)\b/i],
    ['Denmark', /\b(copenhagen|københavn|aarhus)\b/i],
    ['Norway', /\b(oslo|bergen|trondheim)\b/i],
    ['Australia', /\b(sydney|melbourne|brisbane|perth|canberra)\b/i],
    ['Japan', /\b(tokyo|osaka|kyoto|fukuoka|yokohama)\b/i],
    ['India', /\b(bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|gurgaon|noida)\b/i],
    ['Brazil', /\b(são paulo|sao paulo|rio de janeiro|belo horizonte)\b/i],
    ['United Arab Emirates', /\b(dubai|abu dhabi|sharjah)\b/i],
];

/**
 * Every country name `inferCountry` can return.
 *
 * Derived from the pattern table rather than written out again, so anything
 * that needs to offer countries — a filter dropdown, an AI prompt — cannot
 * drift out of sync with what jobs are actually tagged with.
 */
export const KNOWN_COUNTRIES: readonly string[] = [
    ...new Set(COUNTRY_PATTERNS.map(([country]) => country)),
].sort();

export function inferCountry(...inputs: Array<string | undefined>): string | undefined {
    // Inputs are ranked by trustworthiness: a `location` field is exhausted
    // against the whole table before a description gets a say, so "Berlin;
    // Munich" resolves to Germany even when the body text name-drops New York.
    for (const input of inputs) {
        if (!input?.trim()) continue;
        for (const [country, pattern] of COUNTRY_PATTERNS) {
            if (pattern.test(input)) return country;
        }
    }
    return undefined;
}

const REMOTE_PATTERN = /\b(remote|work from home|wfh|distributed|anywhere|télétravail|homeoffice|home office)\b/i;
const ONSITE_ONLY_PATTERN = /\b(no remote|on-?site only|not remote)\b/i;

export function inferRemote(...inputs: Array<string | undefined>): boolean {
    const haystack = inputs.filter(Boolean).join(' ');
    if (ONSITE_ONLY_PATTERN.test(haystack)) return false;
    return REMOTE_PATTERN.test(haystack);
}

/**
 * Seniority from the job title, with the description as a fallback.
 *
 * Title first and most-senior-wins: "Senior Engineering Manager" is Manager,
 * and a description mentioning "reports to a senior engineer" must not promote
 * a junior role.
 */
export function inferSeniority(title: string, description?: string): Seniority | undefined {
    const t = title.toLowerCase();

    if (/\b(intern|internship|working student|werkstudent|stagiaire|apprentice|alternance)\b/.test(t)) return 'Intern';
    if (/\b(head of|vp|vice president|director|manager|chief|cto)\b/.test(t)) return 'Manager';
    if (/\b(staff|principal|lead|architect)\b/.test(t)) return 'Lead';
    if (/\b(senior|sr\.?|snr|iii|iv)\b/.test(t)) return 'Senior';
    if (/\b(junior|jr\.?|entry[- ]level|graduate|grad|associate|i{1,2}\b)\b/.test(t)) return 'Junior';

    if (description) {
        const d = description.toLowerCase();
        if (/\b(([7-9]|1\d)\+? years)\b/.test(d)) return 'Lead';
        if (/\b([5-6]\+? years)\b/.test(d)) return 'Senior';
        if (/\b([3-4]\+? years)\b/.test(d)) return 'Mid';
        if (/\b([0-2]\+? years|no experience required)\b/.test(d)) return 'Junior';
    }

    return undefined;
}

const EMPLOYMENT_PATTERNS: ReadonlyArray<readonly [EmploymentType, RegExp]> = [
    ['Internship', /\b(intern|internship|werkstudent|working student|stage|stagiaire|alternance)\b/i],
    ['Freelance', /\b(freelance|freelancer)\b/i],
    ['Contract', /\b(contract|contractor|b2b|fixed[- ]term|cdd)\b/i],
    ['Part-time', /\b(part[- ]time|teilzeit|temps partiel)\b/i],
    ['Temporary', /\b(temporary|seasonal)\b/i],
    ['Full-time', /\b(full[- ]time|vollzeit|permanent|cdi)\b/i],
];

/**
 * Contract shape, title first.
 *
 * Only a subset of patterns is trusted in body text: job descriptions mention
 * "temporary" or "permanent" for all sorts of incidental reasons, whereas a
 * posting that says "freelance" or "internship" in its body almost always is
 * one. Sources that expose an explicit field should prefer it over this.
 */
const DESCRIPTION_SAFE_TYPES = new Set<EmploymentType>([
    'Internship',
    'Freelance',
    'Contract',
    'Part-time',
]);

export function inferEmploymentType(title: string, description?: string): EmploymentType | undefined {
    for (const [type, pattern] of EMPLOYMENT_PATTERNS) {
        if (pattern.test(title)) return type;
    }

    if (description) {
        for (const [type, pattern] of EMPLOYMENT_PATTERNS) {
            if (DESCRIPTION_SAFE_TYPES.has(type) && pattern.test(description)) return type;
        }
    }

    return undefined;
}

/**
 * Technology taxonomy.
 *
 * Each entry maps a canonical tag to the spellings that appear in the wild.
 * Patterns are anchored so "Go" does not match "going" and "R" does not match
 * every capital R on the page.
 */
const TAG_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
    ['TypeScript', /\btypescript\b/i],
    ['JavaScript', /\b(javascript|es6)\b/i],
    ['React', /\breact(\.js)?\b/i],
    ['Next.js', /\bnext\.?js\b/i],
    ['Vue', /\bvue(\.js)?\b/i],
    ['Angular', /\bangular\b/i],
    ['Svelte', /\bsvelte(kit)?\b/i],
    ['Node.js', /\bnode(\.js)?\b/i],
    ['Deno', /\bdeno\b/i],
    ['Python', /\bpython\b/i],
    ['Django', /\bdjango\b/i],
    ['FastAPI', /\bfastapi\b/i],
    ['Java', /\bjava\b(?!script)/i],
    ['Kotlin', /\bkotlin\b/i],
    ['Scala', /\bscala\b/i],
    ['Go', /\b(golang|go lang)\b/i],
    ['Rust', /\brust\b/i],
    ['Ruby', /\bruby\b/i],
    ['Rails', /\b(ruby on rails|rails)\b/i],
    ['PHP', /\bphp\b/i],
    ['Laravel', /\blaravel\b/i],
    ['C++', /\bc\+\+\b/i],
    ['C#', /\bc#|\.net\b/i],
    ['Swift', /\bswift\b/i],
    ['Elixir', /\belixir\b/i],
    ['GraphQL', /\bgraphql\b/i],
    ['REST', /\brest(ful)? api\b/i],
    ['PostgreSQL', /\b(postgres(ql)?)\b/i],
    ['MySQL', /\bmysql\b/i],
    ['MongoDB', /\bmongo\s?db\b/i],
    ['Redis', /\bredis\b/i],
    ['Elasticsearch', /\belastic\s?search\b/i],
    ['AWS', /\b(aws|amazon web services)\b/i],
    ['GCP', /\b(gcp|google cloud)\b/i],
    ['Azure', /\bazure\b/i],
    ['Docker', /\bdocker\b/i],
    ['Kubernetes', /\b(kubernetes|k8s)\b/i],
    ['Terraform', /\bterraform\b/i],
    ['CI/CD', /\b(ci\/cd|continuous (integration|delivery))\b/i],
    ['Machine Learning', /\b(machine learning|\bml\b)\b/i],
    ['LLM', /\b(llm|large language model|genai|generative ai)\b/i],
    ['PyTorch', /\bpytorch\b/i],
    ['TensorFlow', /\btensorflow\b/i],
    ['Data Engineering', /\b(data engineer(ing)?|etl|airflow|dbt)\b/i],
    ['Tailwind', /\btailwind\b/i],
    ['Figma', /\bfigma\b/i],
];

export function extractTags(...inputs: Array<string | undefined>): string[] {
    const haystack = inputs.filter(Boolean).join(' ');
    if (!haystack.trim()) return [];

    const tags: string[] = [];
    for (const [tag, pattern] of TAG_PATTERNS) {
        if (pattern.test(haystack)) tags.push(tag);
    }
    return tags;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    $: 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
};

/** Expand the `k` shorthand: "80k" and "80,000" both mean 80000. */
function parseAmount(raw: string): number | undefined {
    const cleaned = raw.replace(/[,\s]/g, '');
    const match = cleaned.match(/^(\d+(?:\.\d+)?)(k)?$/i);
    if (!match) return undefined;

    const value = Number(match[1]);
    if (!Number.isFinite(value)) return undefined;
    return match[2] ? value * 1000 : value;
}

/**
 * Best-effort salary parsing for the many shapes sources use:
 * "$120,000 - $160,000", "€60k–80k", "$10K-$20K", "90000 USD per year".
 */
export function parseSalary(raw?: string | null): SalaryRange | undefined {
    if (!raw) return undefined;

    const text = decodeEntities(raw).trim();
    if (!text) return undefined;

    const symbol = Object.keys(CURRENCY_SYMBOLS).find((s) => text.includes(s));
    const isoMatch = text.match(/\b(USD|EUR|GBP|CHF|CAD|AUD|SEK|DKK|NOK|PLN|JPY|INR|BRL)\b/i);
    const currency = isoMatch ? isoMatch[1].toUpperCase() : symbol ? CURRENCY_SYMBOLS[symbol] : undefined;

    // Period first, because it decides which numbers are plausible amounts.
    let period: SalaryRange['period'] | undefined;
    if (/\b(per hour|hourly|\/\s?h(r|our)?)\b/i.test(text)) period = 'Hourly';
    else if (/\b(per day|daily|\/\s?day|tjm)\b/i.test(text)) period = 'Daily';
    else if (/\b(per month|monthly|\/\s?mo(nth)?)\b/i.test(text)) period = 'Monthly';
    else if (/\b(per year|yearly|annually|per annum|\/\s?y(r|ear)?|pa)\b/i.test(text)) period = 'Yearly';

    /**
     * Smallest number worth treating as pay.
     *
     * The floor exists to keep stray figures — "3+ years", a street number, a
     * year — out of the range. It has to scale with the period: a flat floor of
     * 100 silently discarded every hourly rate.
     */
    const FLOORS: Record<NonNullable<SalaryRange['period']>, number> = {
        Hourly: 5,
        Daily: 50,
        Weekly: 100,
        Monthly: 300,
        Yearly: 1000,
    };
    const floor = period ? FLOORS[period] : 100;

    const amounts = [...text.matchAll(/(\d[\d,.\s]*\d|\d)\s*(k)?/gi)]
        .map((m) => parseAmount(`${m[1]}${m[2] ?? ''}`))
        .filter((n): n is number => n !== undefined && n >= floor);

    // No figure parsed, but the currency or cadence may still be worth keeping.
    if (amounts.length === 0) return { currency, period, raw: text };

    // A five-figure headline number is an annual salary in every currency we
    // handle; hourly and monthly rates are stated explicitly above.
    if (!period && amounts[0] >= 10_000) period = 'Yearly';

    const min = Math.min(...amounts);
    const max = Math.max(...amounts);

    return {
        min,
        max: max === min ? undefined : max,
        currency,
        period,
        raw: text,
    };
}

/**
 * Does `haystack` contain `term` at the start of a word?
 *
 * Plain substring matching is wrong for job search in a way that is easy to
 * miss: searching "rust" returns every posting mentioning "trust", which on a
 * payments company's board is all of them. Anchoring the *start* of the term to
 * a word boundary fixes that while keeping prefix matches that people expect —
 * "develop" still finds "developer", and "rust" still finds "rustlang".
 *
 * A trailing boundary is deliberately not required, and the leading one is a
 * character class rather than `\b` so that terms beginning with punctuation —
 * ".net", "c++" — behave sensibly.
 */
const termPatterns = new Map<string, RegExp>();

export function containsTerm(haystack: string, term: string): boolean {
    if (!term) return false;

    let pattern = termPatterns.get(term);
    if (!pattern) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(`(?<![a-z0-9])${escaped}`, 'i');
        // Queries are short and repeat across calls; the cache keeps this off
        // the hot path without growing unboundedly in practice.
        if (termPatterns.size < 500) termPatterns.set(term, pattern);
    }

    return pattern.test(haystack);
}

/** Case-insensitive match of every term in `query` against the given fields. */
export function matchesQuery(query: string | undefined, ...fields: Array<string | undefined>): boolean {
    if (!query?.trim()) return true;

    const haystack = fields.filter(Boolean).join(' ');
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => containsTerm(haystack, term));
}

/**
 * Visa sponsorship, read off the posting text.
 *
 * Returns `undefined` — not `false` — when the posting is silent, which is the
 * common case. That distinction matters: "does not say" must never be
 * presented to a candidate as "will not sponsor".
 *
 * The negative patterns are checked first because a posting that says
 * "relocation support available, but we cannot sponsor visas" is a no.
 */
const VISA_NEGATIVE =
    /\b(no visa sponsorship|cannot sponsor|can't sponsor|unable to sponsor|not able to sponsor|does not sponsor|without sponsorship|must (already )?(have|hold) (the )?(right to work|work authori[sz]ation|valid work permit)|authori[sz]ed to work in .{0,30} without sponsorship)\b/i;

const VISA_POSITIVE =
    /\b(visa sponsorship|sponsor(ship)? (is )?(available|provided|offered)|we sponsor|will sponsor|sponsor(ing)? visas?|relocation (package|support|assistance|bonus)|blue card|work permit (support|sponsorship|assistance)|help(s|ing)? (you )?(with )?(your )?(visa|relocation))\b/i;

export function inferVisaSponsorship(...inputs: Array<string | undefined>): boolean | undefined {
    const haystack = inputs.filter(Boolean).join(' ');
    if (!haystack.trim()) return undefined;

    if (VISA_NEGATIVE.test(haystack)) return false;
    if (VISA_POSITIVE.test(haystack)) return true;
    return undefined;
}

/**
 * Posting language, by stopword frequency.
 *
 * Job descriptions mix languages constantly — a German posting will still say
 * "Software Engineer" and list English tool names — so this counts function
 * words, which are the part that does not get borrowed, rather than looking
 * for any single marker.
 */
const LANGUAGE_STOPWORDS: ReadonlyArray<readonly [string, RegExp]> = [
    ['German', /\b(und|oder|mit|für|von|bei|dem|der|die|das|wir|sie|ist|sind|eine|einen|nicht|auch|werden|haben|deine|unsere)\b/gi],
    ['French', /\b(et|ou|avec|pour|de|du|des|le|la|les|nous|vous|est|sont|une|un|ne|pas|aussi|votre|notre|vos|nos)\b/gi],
    ['Spanish', /\b(y|o|con|para|de|del|el|la|los|las|nosotros|es|son|una|un|no|también|tu|nuestro)\b/gi],
    ['English', /\b(and|or|with|for|of|the|we|you|is|are|a|an|not|also|your|our|will|have)\b/gi],
];

/** Below this many function-word hits the sample is too short to judge. */
const LANGUAGE_MIN_HITS = 6;

export function inferLanguage(...inputs: Array<string | undefined>): string | undefined {
    const haystack = inputs.filter(Boolean).join(' ');
    if (haystack.trim().length < 60) return undefined;

    let best: { language: string; hits: number } | undefined;

    for (const [language, pattern] of LANGUAGE_STOPWORDS) {
        // A global regex carries lastIndex between calls; match() with /g does not.
        const hits = haystack.match(pattern)?.length ?? 0;
        if (!best || hits > best.hits) best = { language, hits };
    }

    if (!best || best.hits < LANGUAGE_MIN_HITS) return undefined;
    return best.language;
}
