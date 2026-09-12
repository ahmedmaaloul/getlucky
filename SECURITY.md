# Security

## Reporting a vulnerability

Please report security issues privately through
[GitHub's private vulnerability reporting](https://github.com/ahmedmaaloul/getlucky/security/advisories/new)
rather than opening a public issue.

Include what you found, how to reproduce it, and what an attacker could do with
it. You will get an acknowledgement within a few days, and credit in the fix
unless you would rather not have it.

## Scope

This is a small open-source project with no hosted user accounts and no stored
personal data, which rules out whole categories of issue. What is in scope:

- Anything that injects attacker-controlled content into a page. Job
  descriptions come from third-party APIs and are treated as untrusted: they are
  rendered as text, never as markup. A path that changes that is a real bug.
- Server-side request forgery through source parameters — the ATS `board`
  argument is interpolated into an upstream URL.
- Anything that causes the MCP server to write, send, or leak data. Every tool
  is read-only by design.
- Dependency vulnerabilities that are actually reachable from the shipped code.

Out of scope: rate-limit tuning on a deployment you control, and reports about
the optional AI layer's quota, which is a cost control rather than a security
boundary.

## Design notes

A few decisions that exist for security or privacy reasons, so you know what is
deliberate:

- **Third-party descriptions are never rendered as HTML.** They are stripped to
  plain text on ingest and rendered as text in React. An earlier version used
  `dangerouslySetInnerHTML` on scraped markup; that was an XSS hole and is gone.
- **No personal data is stored.** No accounts, no cookies, no analytics, no
  database. Job searches are not logged.
- **IP addresses are never stored.** The only counter in the system — the
  optional AI quota — keys on `sha256(ip + date + salt)`, which rotates daily,
  so usage cannot be correlated across days. With no `IP_SALT` set the salt is
  random per process. Counters are in-memory and are dropped when the day rolls
  over.
- **Every MCP tool is read-only.** Nothing submits an application, uploads a CV,
  or writes to any store.
- **Secrets are never required.** The default path uses no credentials at all,
  so a leaked deployment config exposes nothing.
