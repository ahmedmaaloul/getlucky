# getlucky-mcp

An MCP server for searching live tech job openings. No API key, no account, no
database — it reads public, documented endpoints directly.

## Install

**Claude Code**

```bash
claude mcp add getlucky -- npx -y getlucky-mcp
```

**Claude Desktop and other MCP clients**

```json
{
  "mcpServers": {
    "getlucky": { "command": "npx", "args": ["-y", "getlucky-mcp"] }
  }
}
```

## Tools

| Tool | What it does |
| --- | --- |
| `search_jobs` | Search every aggregator at once — Remote OK, Arbeitnow, Remotive. Filters for country, remote, seniority, contract type, tags, salary floor, visa sponsorship, posting language and recency. |
| `search_company_board` | Read one company's own Greenhouse, Lever or Ashby board. The board token is the slug in its careers URL — `stripe` in `boards.greenhouse.io/stripe`. |
| `get_job` | One posting in full, including the complete description text. |
| `match_profile` | Rank live openings against a candidate's skills, scored 0–100 with a plain-language reason per result. Deterministic, so it costs nothing to run over hundreds of jobs. |
| `list_sources` | The source catalogue and what each one covers. |

Also exposes a `getlucky://sources` resource and a `job_hunt` prompt.

Every tool is read-only. Nothing submits an application, stores a CV, or keeps
personal data.

## Example

> *"Search for senior backend roles in Germany that sponsor visas, then rank
> them against Go, Kubernetes and PostgreSQL."*

## Source

Part of [GetLucky](https://getlucky-ahmed-maalouls-projects.vercel.app) ([source](https://github.com/ahmedmaaloul/getlucky)),
which also ships the web UI and a hosted HTTP MCP endpoint at
`https://getlucky-ahmed-maalouls-projects.vercel.app/api/mcp` for clients that prefer not to install anything. MIT licensed.
