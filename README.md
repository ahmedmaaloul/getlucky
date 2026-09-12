# GetLucky

**Live tech job search over public APIs — for humans and for agents.**

GetLucky aggregates open tech roles from public, key-free job APIs and from
companies' own applicant tracking systems, normalizes them into one shape, and
exposes the result two ways: a web UI, and an **MCP server** so Claude and other
agents can search jobs as a first-class tool.

**Live:** [getlucky-ahmed-maalouls-projects.vercel.app](https://getlucky-ahmed-maalouls-projects.vercel.app)

```bash
git clone https://github.com/ahmedmaaloul/getlucky.git
cd getlucky && npm install && npm run dev
```

That is the whole setup. No API key, no database, no migration, no seed. The
job data is live from the first page load.

---

## Use it from Claude

```bash
claude mcp add getlucky -- npx -y getlucky-mcp
```

Or point any MCP client at the hosted endpoint over HTTP — nothing to install:

```
https://getlucky-ahmed-maalouls-projects.vercel.app/api/mcp
```

Then ask for what you actually want:

> *"Find senior Rust roles in Europe that sponsor visas, rank them against my
> stack — TypeScript, Go, Kubernetes — and tell me which two are worth the
> afternoon it takes to apply properly."*

### Tools

| Tool | What it does |
| --- | --- |
| `search_jobs` | Search every aggregator at once. Filters for country, remote, seniority, contract type, tags, salary floor, visa sponsorship, posting language, recency. |
| `search_company_board` | Read one company's official Greenhouse / Lever / Ashby board. Straight from the employer, so it is more complete and more current than any aggregator. |
| `get_job` | One posting in full, including the complete description. |
| `match_profile` | Rank live openings against a candidate's skills, scored 0–100 with a plain-language reason for each score. Deterministic — no model call — so it is cheap to run across hundreds of jobs. |
| `list_sources` | The source catalogue and what each one covers. |

Plus a `getlucky://sources` resource and a `job_hunt` prompt.

Every tool is read-only. Nothing here submits an application, stores a CV, or
keeps personal data.

---

## Sources

All six talk to documented, public endpoints. None needs a key or an account.

| Source | Kind | Covers |
| --- | --- | --- |
| [Remote OK](https://remoteok.com) | aggregator | Remote-first roles worldwide |
| [Arbeitnow](https://www.arbeitnow.com) | aggregator | Germany and wider Europe, strong on visa-sponsoring employers |
| [Remotive](https://remotive.com) | aggregator | Curated remote roles, screened before publication |
| [Greenhouse](https://developers.greenhouse.io/job-board.html) | ATS | Any company's own board, by token — `stripe`, `figma`, … |
| [Lever](https://github.com/lever/postings-api) | ATS | Any company's own board, by slug |
| [Ashby](https://developers.ashbyhq.com) | ATS | Any company's own board, by name |

The ATS connectors are the interesting half: most companies you would want to
work for publish their openings through one of these three, with an official
public endpoint per board. You get the employer's own data, the day they post it.

**On scraping.** GetLucky ships no scraper configurations, deliberately. The
sites people usually reach for forbid automated access in their terms, and
shipping working configs for them would hand every reader of this repository a
terms violation. The Playwright machinery is here — see
[custom scrapers](#custom-scrapers) — but what you point it at is your call and
your responsibility.

---

## What it does with a posting

Job boards return messy, inconsistent payloads. Everything lands in one
`NormalizedJob` shape, enriched by deterministic heuristics that run offline
with no API key:

- **Country** from free-text locations, including city names — `Munich` → Germany
- **Seniority** from the title, falling back to years-of-experience in the body
- **Contract type**, reconciled across each source's own vocabulary
- **Tech tags** over a ~45-entry taxonomy that knows `k8s` is Kubernetes and
  that `Java` is not `JavaScript`
- **Salary ranges** parsed from the many shapes sources use — `$122.2K - $183.4K`,
  `€90,000 – €120,000 per year`, `$65 per hour`
- **Visa sponsorship**, read off the text
- **Posting language**, by function-word frequency, so German-language roles in
  Germany are findable as such

### Two judgement calls worth knowing about

**Sponsorship is three-valued, not two.** Most postings say nothing about visas.
That is `undefined`, never `false`, and the UI only shows the badge on an
explicit yes. "Does not say" must never reach a candidate as "will not sponsor".

**Tag spam is ignored, loudly.** Across a 357-job sample the median posting
carries 2 tags and the 90th percentile carries 18 — while staffing agencies
publish the same 60–77 tag blob on every role. Past 25 tags, `match_profile`
stops treating tags as evidence and says so in its reasoning. Skill matches are
also weighted by *where* they land: a title names what a role is, a tag is a
deliberate label, a mention buried in prose is often just a laundry list.

---

## Architecture

```
lib/sources/          One interface, six providers
  types.ts            NormalizedJob — the shape everything becomes
  normalize.ts        Deterministic enrichment (no AI, no network)
  http.ts             Timeouts, honest User-Agent, backoff that respects Retry-After
  registry.ts         The catalogue; fan-out that survives a dead source
  search.ts           Filtering, dedupe, ranking, interleaving
  providers/          remoteok · arbeitnow · remotive · greenhouse · lever · ashby · custom

lib/mcp/              One server definition, two transports
lib/matching.ts       Profile scoring — deterministic, explainable
lib/cache.ts          TTL cache with request coalescing

app/api/mcp/          Streamable HTTP endpoint
mcp/                  getlucky-mcp — the npm-publishable stdio server
```

A few decisions that are load-bearing:

**A dead source degrades the page, it does not empty it.** `searchJobs` fans out
with `Promise.all` and reports each source's outcome. The UI says which feeds
are down rather than quietly showing you less.

**Browse results interleave sources round-robin.** Sorting purely by recency let
Arbeitnow — which stamps every posting with the current day — own the entire
first page and bury three other feeds. A keyword search skips the interleaving;
there, relevance is what you asked to be ranked by.

**One upstream fetch serves many visitors.** Results are cached in process for
five minutes, and concurrent callers share a single in-flight request. These
APIs are offered for free; hammering them would be rude.

**Sources that ask for credit get it.** Remote OK's terms grant API access in
exchange for a *followed* link back. The attribution travels on every job and
renders in the UI, with `rel` deliberately unset.

---

## The AI is the caller's, not the project's

GetLucky ships no model and pays for no inference. There is not a single AI call
anywhere in the MCP server, the matching engine, or the normalization layer —
`grep -ri gemini lib/mcp lib/sources lib/matching.ts` returns nothing.

That is the point of the MCP design. When someone connects this to Claude, their
Claude *is* the intelligence: it reads "find me senior k8s roles in Germany that
sponsor visas, and tell me which are worth applying to", picks the tool call,
and reasons over what comes back. The server only makes HTTP requests.

| | Who understands the request | Who pays |
| --- | --- | --- |
| Web UI, no key | nobody — literal matching | nobody |
| Web UI, `GEMINI_API_KEY` set | Gemini Flash | whoever deployed it |
| **MCP** | **the user's own model** | **the user's own subscription** |

**Deploy without `GEMINI_API_KEY`.** That is the intended configuration, not a
degraded one: the site serves live jobs with working filters and zero inference
cost. The optional Gemini layer only expands a typed query into related terms
("k8s" also finds "Kubernetes") for people self-hosting who want it. It is the
only part of the app that is rate limited, and only because it costs money.
Search itself is never rate limited.

---

## Privacy

The app stores nothing about you. No cookies, no analytics, no fingerprinting,
no accounts, no database.

The one counter that exists — the AI daily quota — hashes the caller's IP with a
secret salt **and the current date**, so the same visitor produces a different
key tomorrow. Correlating usage across days is not discouraged, it is not
computable from what is kept. Counters live in memory and vanish when the day
rolls over. With no `IP_SALT` configured the salt is random per process, which is
more private still: a missing secret should fail towards privacy, not towards a
predictable hash that could be brute-forced across the IPv4 space.

`tests/runtime.test.ts` asserts these as properties, not promises.

---

## Development

```bash
npm run dev          # app on http://localhost:3000
npm test             # 72 tests, all pure — no network
npm run typecheck
npm run lint
npm run build:mcp    # bundle the stdio MCP server
npm run mcp          # build it and run it on stdio
```

Tests are deliberately network-free, so CI cannot go red because a job board
happened to be down.

### Adding a source

1. Write `lib/sources/providers/<name>.ts` exporting a `JobSource`.
2. Map its payload to `NormalizedJob`, leaning on `lib/sources/normalize.ts`.
3. Add one line to `SOURCES` in `lib/sources/registry.ts`.

That is the whole contract — the UI, the REST layer and the MCP server all read
from that registry. See [CONTRIBUTING.md](CONTRIBUTING.md).

### Custom scrapers

Put your own configurations in `lib/scraper/configs.local.ts` — gitignored, so
they stay yours.

```bash
npm install playwright && npx playwright install chromium
```

They stay out of ordinary searches until you opt in with
`ENABLE_CUSTOM_SCRAPERS=true`, because each config launches a browser and they
run one after another — a dozen of them would add minutes to a page load. You
can always request the source explicitly instead, with `sources: ['custom']`,
and skip the flag.

Check the `robots.txt` and terms of service of anything you point it at. That
part is on you, and it is why nothing is shipped pre-configured.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui ·
Model Context Protocol SDK · Vitest

No model is bundled and none is required.

## License

MIT — see [LICENSE](LICENSE). Built by [Ahmed Maaloul](https://ahmedmaaloul.com).
