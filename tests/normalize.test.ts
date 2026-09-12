import { describe, expect, it } from 'vitest';

import {
    cleanLabel,
    extractTags,
    inferCountry,
    inferEmploymentType,
    inferLanguage,
    inferRemote,
    inferSeniority,
    inferVisaSponsorship,
    parseSalary,
    stripHtml,
} from '@/lib/sources/normalize';

describe('stripHtml', () => {
    it('decodes entities and drops tags', () => {
        expect(stripHtml('<p>Hello &amp; welcome</p>')).toBe('Hello & welcome');
    });

    it('handles the double-encoding Remote OK and Greenhouse send', () => {
        // The API delivers "&lt;p&gt;Hi&lt;/p&gt;" — decoding once leaves visible tags.
        expect(stripHtml('&lt;p&gt;Hi &amp;amp; bye&lt;/p&gt;')).toBe('Hi & bye');
    });

    it('turns block elements into line breaks rather than running words together', () => {
        expect(stripHtml('<li>One</li><li>Two</li>')).toBe('• One\n• Two');
    });

    it('drops script content instead of rendering it as text', () => {
        expect(stripHtml('<p>Role</p><script>alert(1)</script>')).toBe('Role');
    });
});

describe('cleanLabel', () => {
    it('decodes entities in titles', () => {
        // Regression: "Machine Operator &amp; Labourers" reached the UI verbatim.
        expect(cleanLabel('Machine Operator &amp; Labourers')).toBe('Machine Operator & Labourers');
    });

    it('collapses runs of whitespace', () => {
        expect(cleanLabel('  Senior   Engineer \n')).toBe('Senior Engineer');
    });
});

describe('inferCountry', () => {
    it('reads an explicit country name', () => {
        expect(inferCountry('Berlin, Germany')).toBe('Germany');
    });

    it('falls back to city names', () => {
        expect(inferCountry('Munich')).toBe('Germany');
        expect(inferCountry('Dublin')).toBe('Ireland');
    });

    it('exhausts the location before consulting later inputs', () => {
        // Regression: a description name-dropping a US office tagged Berlin roles
        // as United States.
        expect(inferCountry('Berlin; Munich', 'Our New York HQ also hiring')).toBe('Germany');
    });

    it('does not treat lowercase prose as a US state code', () => {
        // Regression: /[a-z ]+, ?(ca|ny|...)/ matched inside ordinary sentences.
        expect(inferCountry('nous recherchons, ca fait partie du poste')).toBeUndefined();
    });

    it('still reads a genuine uppercase state suffix', () => {
        expect(inferCountry('Austin, TX')).toBe('United States');
    });

    it('returns undefined when there is nothing to go on', () => {
        expect(inferCountry(undefined, '')).toBeUndefined();
    });
});

describe('inferRemote', () => {
    it('detects remote wording', () => {
        expect(inferRemote('Remote (Europe)')).toBe(true);
    });

    it('respects an explicit refusal', () => {
        expect(inferRemote('Remote? No remote for this role')).toBe(false);
    });
});

describe('inferSeniority', () => {
    it('prefers the title', () => {
        expect(inferSeniority('Senior Backend Engineer')).toBe('Senior');
        expect(inferSeniority('Engineering Manager')).toBe('Manager');
        expect(inferSeniority('Working Student, Data')).toBe('Intern');
    });

    it('ranks management above the seniority prefix', () => {
        expect(inferSeniority('Senior Engineering Manager')).toBe('Manager');
    });

    it('falls back to years of experience', () => {
        expect(inferSeniority('Backend Engineer', 'You have 5+ years of experience')).toBe('Senior');
        expect(inferSeniority('Backend Engineer', 'You have 3+ years of experience')).toBe('Mid');
    });
});

describe('inferEmploymentType', () => {
    it('reads the title first', () => {
        expect(inferEmploymentType('Part-time Designer')).toBe('Part-time');
    });

    it('ignores weak signals in body text', () => {
        // Regression: "temporary" in a benefits paragraph relabelled a director role.
        expect(inferEmploymentType('Engineering Director', 'temporary housing is provided')).toBeUndefined();
    });

    it('still trusts strong signals in body text', () => {
        expect(inferEmploymentType('Data Engineer', 'This is a freelance engagement')).toBe('Freelance');
    });
});

describe('parseSalary', () => {
    it('parses the k shorthand Ashby uses', () => {
        expect(parseSalary('$122.2K - $183.4K')).toMatchObject({
            min: 122_200,
            max: 183_400,
            currency: 'USD',
            period: 'Yearly',
        });
    });

    it('parses comma-separated ranges', () => {
        expect(parseSalary('€90,000 – €120,000 per year')).toMatchObject({
            min: 90_000,
            max: 120_000,
            currency: 'EUR',
            period: 'Yearly',
        });
    });

    it('keeps a single figure as a minimum with no maximum', () => {
        const salary = parseSalary('from $85,000');
        expect(salary?.min).toBe(85_000);
        expect(salary?.max).toBeUndefined();
    });

    it('reads an explicit hourly period', () => {
        expect(parseSalary('$65 per hour')?.period).toBe('Hourly');
    });

    it('keeps the raw text when nothing numeric parses', () => {
        expect(parseSalary('Competitive')).toMatchObject({ raw: 'Competitive' });
    });

    it('returns undefined for nothing at all', () => {
        expect(parseSalary(null)).toBeUndefined();
    });
});

describe('inferVisaSponsorship', () => {
    it('reads an explicit offer', () => {
        expect(inferVisaSponsorship('We offer visa sponsorship and relocation support')).toBe(true);
    });

    it('reads an explicit refusal', () => {
        expect(inferVisaSponsorship('We cannot sponsor visas for this role')).toBe(false);
    });

    it('lets a refusal win over a relocation perk mentioned alongside it', () => {
        expect(
            inferVisaSponsorship('Relocation package available, but we cannot sponsor visas'),
        ).toBe(false);
    });

    it('stays undefined when the posting is silent', () => {
        // This is the common case, and it must never be shown as a refusal.
        expect(inferVisaSponsorship('We are hiring a backend engineer in Berlin')).toBeUndefined();
    });
});

describe('inferLanguage', () => {
    it('detects German prose despite English job titles', () => {
        const german =
            'Wir suchen einen Software Engineer für unser Team in Berlin. Du hast Erfahrung mit ' +
            'TypeScript und React und arbeitest gerne mit uns an neuen Produkten. Wir bieten dir ' +
            'eine faire Bezahlung und flexible Arbeitszeiten.';
        expect(inferLanguage(german)).toBe('German');
    });

    it('detects English', () => {
        const english =
            'We are looking for a backend engineer to join the team. You will work with our ' +
            'platform group and you have experience with distributed systems and databases.';
        expect(inferLanguage(english)).toBe('English');
    });

    it('declines to guess from a short sample', () => {
        expect(inferLanguage('Backend Engineer')).toBeUndefined();
    });
});

describe('extractTags', () => {
    it('recognises technologies across spellings', () => {
        const tags = extractTags('We use Node.js, Postgres and k8s');
        expect(tags).toContain('Node.js');
        expect(tags).toContain('PostgreSQL');
        expect(tags).toContain('Kubernetes');
    });

    it('does not mistake Java for JavaScript', () => {
        expect(extractTags('Strong JavaScript skills')).not.toContain('Java');
    });

    it('does not match Go inside ordinary words', () => {
        expect(extractTags('a good opportunity, going places')).not.toContain('Go');
    });
});
