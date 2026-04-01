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
import { registerSendFileTool } from "./tools/send-file.js";
import { registerDownloadFileTool } from "./tools/download-file.js";
import { sendDesktopNotification } from "./notify.js";

export interface McpServerConfig {
  hubUrl: string;
  apiKey: string;
}

export interface McpServerState {
  agentId?: string;
  onRegistered?: (agentId: string) => void;
}

export function createMcpServer(config: McpServerConfig): { server: McpServer; client: HubClient; state: McpServerState } {
  const client = new HubClient({
    hubUrl: config.hubUrl,
    apiKey: config.apiKey,
  });

  // Shared mutable state — agentId is set after registration
  const state: McpServerState = {};

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
  registerSendFileTool(server, client, state);
  registerDownloadFileTool(server, client);

  return { server, client, state };
}

// CLI entrypoint: stdio transport
async function main() {
  const hubUrl = process.env.AGENTMESH_HUB_URL ?? "http://localhost:3000";
  const apiKey = process.env.AGENTMESH_API_KEY ?? "";

  if (!apiKey) {
    console.error("[agentmesh-mcp] Warning: AGENTMESH_API_KEY not set");
  }

  const { server, client, state } = createMcpServer({ hubUrl, apiKey });
  const transport = new StdioServerTransport();

  // After agent registration, connect WebSocket for real-time notifications
  state.onRegistered = (agentId: string) => {
    client.connectWebSocket(agentId);
    client.onInteraction((interaction) => {
      const fromAgent = interaction.fromAgent;
      const preview = interaction.payload.text?.slice(0, 100) || (interaction.payload.file ? `[File: ${interaction.payload.file.fileName}]` : "[message]");

      // Send desktop notification
      sendDesktopNotification(
        "AgentMesh",
        `${fromAgent}: ${preview}`,
      );

      // Also log to MCP (visible in Claude Code logs)
      server.sendLoggingMessage({
        level: "info",
        data: `[AgentMesh] New message from ${fromAgent}: ${preview}`,
      }).catch(() => {});
    });
    console.error(`[agentmesh-mcp] WebSocket connected for agent ${agentId}`);
  };

  await server.connect(transport);
  console.error(`[agentmesh-mcp] Connected to Hub at ${hubUrl}`);
}

main().catch((err) => {
  console.error("[agentmesh-mcp] Fatal error:", err);
  process.exit(1);
});
