#!/usr/bin/env node
/**
 * GetLucky MCP server — stdio transport.
 *
 * Runs the same server as the hosted /api/mcp endpoint, but locally and with
 * no deployment involved. Everything it reads is a public, key-free API, so
 * `npx getlucky-mcp` is genuinely zero-config.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createGetLuckyServer, SERVER_VERSION } from '../../lib/mcp/server';

const HELP = `getlucky-mcp ${SERVER_VERSION} — job search over MCP

Runs an MCP server on stdio that searches live tech job openings from public
APIs (Remote OK, Arbeitnow, Remotive) and company ATS boards (Greenhouse,
Lever, Ashby). No API key, no account, no database.

USAGE
  getlucky-mcp              Run the server (clients launch this for you)
  getlucky-mcp --help       Show this message
  getlucky-mcp --version    Print the version

CLAUDE CODE
  claude mcp add getlucky -- npx -y getlucky-mcp

CLAUDE DESKTOP / OTHER CLIENTS
  Add to your MCP config:

  {
    "mcpServers": {
      "getlucky": { "command": "npx", "args": ["-y", "getlucky-mcp"] }
    }
  }
`;

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        process.stdout.write(HELP);
        return;
    }
    if (args.includes('--version') || args.includes('-v')) {
        process.stdout.write(`${SERVER_VERSION}\n`);
        return;
    }

    const server = createGetLuckyServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // stdout is the JSON-RPC channel — anything written there corrupts the
    // protocol, so status goes to stderr.
    process.stderr.write(`getlucky-mcp ${SERVER_VERSION} ready\n`);

    const shutdown = async () => {
        await server.close().catch(() => {});
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((error) => {
    process.stderr.write(`getlucky-mcp failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
