import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HubClient } from "@agentmesh/hub";
import { registerAgentTool } from "./tools/register.js";
import { registerListAgentsTool } from "./tools/list-agents.js";
import { registerSendMessageTool } from "./tools/send-message.js";
import { registerCheckMessagesTool } from "./tools/check-messages.js";
import { registerBroadcastTool } from "./tools/broadcast.js";
import { registerCreateTaskTool } from "./tools/create-task.js";
import { registerCreateChannelTool } from "./tools/create-channel.js";
import { registerSendToChannelTool } from "./tools/send-to-channel.js";
import { registerListChannelsTool } from "./tools/list-channels.js";
import { registerJoinChannelTool } from "./tools/join-channel.js";

export interface McpServerConfig {
  hubUrl: string;
  apiKey: string;
}

export function createMcpServer(config: McpServerConfig): McpServer {
  const client = new HubClient({
    hubUrl: config.hubUrl,
    apiKey: config.apiKey,
  });

  // Shared mutable state — agentId is set after registration
  const state: { agentId?: string } = {};

  const server = new McpServer({
    name: "agentmesh",
    version: "0.1.0",
  });

  // Register all tools
  registerAgentTool(server, client, state);
  registerListAgentsTool(server, client);
  registerSendMessageTool(server, client, state);
  registerCheckMessagesTool(server, client, state);
  registerBroadcastTool(server, client);
  registerCreateTaskTool(server, client, state);
  registerCreateChannelTool(server, client, state);
  registerSendToChannelTool(server, client);
  registerListChannelsTool(server, client);
  registerJoinChannelTool(server, client, state);

  return server;
}

// CLI entrypoint: stdio transport
async function main() {
  const hubUrl = process.env.AGENTMESH_HUB_URL ?? "http://localhost:3000";
  const apiKey = process.env.AGENTMESH_API_KEY ?? "";

  if (!apiKey) {
    console.error("[agentmesh-mcp] Warning: AGENTMESH_API_KEY not set");
  }

  const server = createMcpServer({ hubUrl, apiKey });
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error(`[agentmesh-mcp] Connected to Hub at ${hubUrl}`);
}

main().catch((err) => {
  console.error("[agentmesh-mcp] Fatal error:", err);
  process.exit(1);
});
