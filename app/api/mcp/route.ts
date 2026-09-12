/**
 * Remote MCP endpoint.
 *
 * Serves the GetLucky MCP server over Streamable HTTP so any MCP client can
 * connect to a deployment without installing anything:
 *
 *   https://<your-deployment>/api/mcp
 *
 * Stateless by design — a fresh server and transport per request. Serverless
 * platforms route consecutive requests to different instances, so in-memory
 * sessions would break the moment the deployment scaled past one container.
 * Every tool is read-only, so there is no session state worth keeping.
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createGetLuckyServer } from '@/lib/mcp/server';

// Providers call out to public APIs, so this cannot be statically rendered.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handle(request: Request): Promise<Response> {
    const server = createGetLuckyServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        // Return a single JSON response rather than holding an SSE stream open:
        // our tools answer in one shot and serverless functions bill for wall time.
        enableJsonResponse: true,
    });

    try {
        await server.connect(transport);
        return await transport.handleRequest(request);
    } catch (error) {
        console.error('[mcp] request failed', error);
        return Response.json(
            {
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null,
            },
            { status: 500 },
        );
    } finally {
        // Without this the per-request server and transport leak for as long as
        // the serverless instance stays warm.
        await transport.close().catch(() => {});
        await server.close().catch(() => {});
    }
}

export { handle as GET, handle as POST, handle as DELETE };
