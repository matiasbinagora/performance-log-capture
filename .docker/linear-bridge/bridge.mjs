import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

try {
  const token = process.env.LINEAR_API_KEY;
  const expected = process.env.LINEAR_EXPECTED_EMAIL;
  if (!token || !expected) throw new Error('Missing identity configuration');
  const r = await fetch('https://api.linear.app/graphql', {
    method: 'POST', headers: {'Content-Type':'application/json', Authorization:token},
    body: JSON.stringify({query:'{ viewer { email } }'}), signal:AbortSignal.timeout(20000),
  });
  const identity = await r.json();
  if (!r.ok || identity.data?.viewer?.email !== expected) throw new Error('IDENTITY NOT VERIFIED');
  const upstream = new Client({name:'performance-log-linear',version:'1.0.0'});
  await upstream.connect(new StreamableHTTPClientTransport(new URL('https://mcp.linear.app/mcp'), {
    requestInit:{headers:{Authorization:`Bearer ${token}`}},
  }));
  const server = new Server({name:`linear-${process.env.LINEAR_ROLE}`,version:'1.0.0'}, {capabilities:{tools:{}}});
  server.setRequestHandler(ListToolsRequestSchema, request => upstream.listTools(request.params));
  server.setRequestHandler(CallToolRequestSchema, request => upstream.callTool(request.params));
  await server.connect(new StdioServerTransport());
  process.stdin.on('end', async () => {await upstream.close(); await server.close();});
} catch {
  console.error('Linear bridge startup failed; verify configured identity, connectivity and token permissions.');
  process.exit(1);
}
