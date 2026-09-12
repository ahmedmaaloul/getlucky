# Contributing

Thanks for looking. The most useful contributions here are new job sources and
better normalization heuristics — both are small, self-contained, and directly
improve what a job hunter sees.

## Getting set up

```bash
git clone https://github.com/ahmedmaaloul/getlucky.git
cd getlucky
npm install
npm run dev
```

No environment file is needed. Every job source is public and key-free.

Before opening a pull request:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Adding a job source

A source is one file exporting a `JobSource`. The contract is in
[`lib/sources/types.ts`](lib/sources/types.ts) and every existing provider in
[`lib/sources/providers/`](lib/sources/providers/) is a worked example.

1. **Check the terms first.** The endpoint must be public, documented, and
   permit programmatic access. This is not negotiable — the whole point of the
   API-first design is that anyone can run this without inheriting a terms
   violation. If the source requires attribution, put it in the provider's
   `attribution` field; it will propagate to every job and render in the UI.

2. **Write the provider.** Map the payload onto `NormalizedJob`, using the
   helpers in [`lib/sources/normalize.ts`](lib/sources/normalize.ts) rather than
   writing new heuristics. Prefer the source's own structured fields over
   inference whenever it offers them — an explicit `employmentType` beats
   guessing from the title.

3. **Register it.** One line in `SOURCES` in
   [`lib/sources/registry.ts`](lib/sources/registry.ts). The UI, the REST layer
   and the MCP server all read from there.

4. **Say what you verified.** Which endpoint you hit, roughly how many listings
   came back, and anything odd about the payload. Several existing providers
   carry comments about upstream quirks found exactly this way — Remote OK
   double-encodes its HTML, Greenhouse puts the job id in a query parameter,
   Arbeitnow sends unix seconds.

## Changing a heuristic

The inference functions in `normalize.ts` decide what a candidate sees, so
changes there need a test. Each regression already locked in carries a comment
saying what broke — please follow that pattern, so the next person knows why a
line is written the way it is.

Two rules that are not style preferences:

- **Never widen a heuristic into a false negative about a candidate's
  eligibility.** `inferVisaSponsorship` returns `undefined` when a posting is
  silent, and that must never collapse into `false`.
- **Weight evidence by where it comes from.** A signal in the title is stronger
  than one in a tag, which is stronger than one buried in prose. Treating them
  equally is how tag spam wins.

## Testing

Tests must be pure — no network calls, no fixtures captured from a live feed.
A job board reshuffling its results should never turn CI red. If a change can
only be verified against a live endpoint, verify it by hand and say so in the
pull request.

```bash
npm test
npm run test:watch
```

## Commit messages

Say what changed and why it needed changing. If you found a bug while working on
something else, describe the failure — "the greedy US state regex tagged Berlin
roles as United States" tells the next reader far more than "fix regex".

## Scope

Things likely to be merged: new public-API sources, normalization fixes with
tests, MCP tool improvements, accessibility and performance work, documentation.

Things unlikely to be merged: scraper configurations for sites that forbid
scraping, features requiring an account or a database in the default path, and
anything that stores personal data.
