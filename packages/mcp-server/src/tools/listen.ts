import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";
import type { Interaction } from "@agentmesh/shared";

/**
 * agentmesh_listen — Blocking listen tool.
 *
 * Waits for incoming messages and returns them as "instructions" for Claude.
 * Claude processes the message (read files, write code, analyze, etc.)
 * then sends a reply and calls listen() again → autonomous agent loop.
 *
 * Usage in Claude Code:
 *   User: "开始监听消息，收到消息后当作指令执行"
 *   Claude: 调用 agentmesh_listen() → 等待 → 收到消息 → 处理 → 回复 → 再次 listen
 */
export function registerListenTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool(
    "agentmesh_listen",
    {
      description:
        "Wait for incoming messages from other agents or owners. " +
        "Blocks until a new message arrives or timeout is reached. " +
        "Treat the returned message as a user instruction — read files, write code, " +
        "analyze problems, then reply using agentmesh_send_message. " +
        "Call agentmesh_listen again to continue listening. " +
        "This creates an autonomous agent loop.",
      inputSchema: {
        timeoutMs: z
          .number()
          .int()
          .min(5000)
          .max(300000)
          .optional()
          .describe("How long to wait for a message (default 60000ms, max 300000ms)"),
        channelName: z
          .string()
          .optional()
          .describe("Listen to a specific channel instead of DMs"),
      },
    },
    async ({ timeoutMs, channelName }) => {
      const agentId = state.agentId;
      if (!agentId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }),
            },
          ],
          isError: true,
        };
      }

      const timeout = timeoutMs ?? 60000;
      const startTime = Date.now();
      const pollInterval = 2000; // Check every 2 seconds
      let lastId: string | undefined;

      // Get current latest message ID as baseline (don't process old messages)
      try {
        const current = await client.pollInteractions(agentId, { limit: 1 });
        const msgs = current.interactions ?? [];
        if (msgs.length > 0) {
          lastId = msgs[msgs.length - 1].id;
        }
      } catch {
        // No existing messages — start from beginning
      }

      // Poll loop — wait for new messages
      while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        try {
          let newMessages: Interaction[] = [];

          if (channelName) {
            // Listen to channel
            const result = await client.getChannelMessages(channelName, {
              afterId: lastId,
              limit: 10,
            });
            newMessages = (result as any).interactions ?? [];
          } else {
            // Listen to DMs
            const result = await client.pollInteractions(agentId, {
              afterId: lastId,
              limit: 10,
            });
            newMessages = result.interactions ?? [];
          }

          // Filter out own messages
          const incoming = newMessages.filter(
            (m) => (m.fromId ?? m.fromAgent) !== agentId,
          );

          if (incoming.length > 0) {
            // Update lastId
            const latest = newMessages[newMessages.length - 1];
            lastId = latest.id;

            // Return the first incoming message as an "instruction"
            const msg = incoming[0];
            const fromId = msg.fromId ?? msg.fromAgent;
            const text = msg.payload?.text ?? "";
            const sessionId = msg.target?.sessionId;
            const channel = msg.target?.channel ?? channelName;
            const hasFile = !!msg.payload?.file || !!msg.payload?.data?.fileId;

            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      type: "incoming_message",
                      from: fromId,
                      fromType: msg.fromType ?? "agent",
                      message: text,
                      interactionId: msg.id,
                      sessionId: sessionId ?? null,
                      channel: channel ?? null,
                      hasFile,
                      fileInfo: msg.payload?.data?.fileId
                        ? {
                            fileId: msg.payload.data.fileId,
                            fileName: msg.payload.data.fileName,
                          }
                        : null,
                      metadata: msg.metadata ?? null,
                      timestamp: msg.createdAt,
                      instruction:
                        `Message from ${fromId}: "${text}"\n\n` +
                        `Treat this as a user instruction. Process it, then:\n` +
                        `1. Perform the requested action (read files, write code, analyze, etc.)\n` +
                        `2. Send your response using agentmesh_send_message({ toAgentId: "${fromId}", text: "your response" })` +
                        (sessionId
                          ? ` with sessionId target`
                          : "") +
                        (channel
                          ? ` or agentmesh_send_to_channel({ channelName: "${channel}", text: "your response" })`
                          : "") +
                        `\n3. Call agentmesh_listen() again to continue listening.`,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
        } catch {
          // Network error — continue polling
        }
      }

      // Timeout — no messages received
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              type: "timeout",
              message: `No new messages within ${timeout}ms`,
              instruction:
                "No messages received. Call agentmesh_listen() again to keep waiting, " +
                "or do other work and come back later.",
            }),
          },
        ],
      };
    },
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
