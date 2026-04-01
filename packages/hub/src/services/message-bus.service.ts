import { eq, and, or, gt, desc, inArray, sql } from "drizzle-orm";
import {
  generateInteractionId,
  type Interaction,
  type SendInteractionRequest,
} from "@agentmesh/shared";
import type { DB } from "../db/connection.js";
import { interactions, channelMembers } from "../db/schema.js";
import type { MessageBus } from "../interfaces/message-bus.js";
import type { Registry } from "../interfaces/registry.js";
import type { WebSocketManager } from "./websocket-manager.js";

function rowToInteraction(row: typeof interactions.$inferSelect): Interaction {
  return {
    id: row.id,
    type: row.type as Interaction["type"],
    contentType: row.contentType as Interaction["contentType"],
    fromAgent: row.fromAgent,
    target: {
      agentId: row.toAgent ?? undefined,
      channel: row.channel ?? undefined,
      capability: row.capability ?? undefined,
    },
    payload: JSON.parse(row.payload),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    status: row.status as Interaction["status"],
    createdAt: row.createdAt,
  };
}

export class MessageBusService implements MessageBus {
  private wsManager?: WebSocketManager;

  constructor(
    private db: DB,
    private registry: Registry,
  ) {}

  setWebSocketManager(wsManager: WebSocketManager): void {
    this.wsManager = wsManager;
  }

  async send(
    fromAgentId: string,
    request: SendInteractionRequest,
  ): Promise<Interaction> {
    const id = generateInteractionId();
    const now = new Date().toISOString();

    this.db
      .insert(interactions)
      .values({
        id,
        type: request.type,
        fromAgent: fromAgentId,
        toAgent: request.target.agentId ?? null,
        channel: request.target.channel ?? null,
        capability: request.target.capability ?? null,
        contentType: request.contentType,
        schema: request.metadata?.schema ?? null,
        payload: JSON.stringify(request.payload),
        metadata: request.metadata
          ? JSON.stringify(request.metadata)
          : null,
        status: "pending",
        createdAt: now,
      })
      .run();

    const interaction: Interaction = {
      id,
      type: request.type,
      contentType: request.contentType,
      fromAgent: fromAgentId,
      target: request.target,
      payload: request.payload,
      metadata: request.metadata,
      status: "pending",
      createdAt: now,
    };

    // Try WebSocket push for DM
    if (this.wsManager && request.target.agentId) {
      this.wsManager.pushToAgent(request.target.agentId, interaction);
    }

    return interaction;
  }

  async sendToChannel(
    fromAgentId: string,
    channel: string,
    request: SendInteractionRequest,
  ): Promise<Interaction> {
    return this.send(fromAgentId, {
      ...request,
      target: { ...request.target, channel },
    });
  }

  async broadcast(
    fromAgentId: string,
    request: SendInteractionRequest,
  ): Promise<Interaction[]> {
    const capability = request.target.capability;
    if (!capability) {
      throw new Error("broadcast requires target.capability");
    }

    const matchedAgents = await this.registry.matchByCapability(capability, {
      maxLoad: 0.7,
    });

    const results: Interaction[] = [];
    for (const agent of matchedAgents) {
      if (agent.agentId === fromAgentId) continue;
      const interaction = await this.send(fromAgentId, {
        ...request,
        target: { agentId: agent.agentId, capability },
      });
      results.push(interaction);
    }

    return results;
  }

  async poll(
    agentId: string,
    opts?: { afterId?: string; limit?: number },
  ): Promise<Interaction[]> {
    const limit = opts?.limit ?? 50;

    // Get direct messages to this agent
    const conditions = [eq(interactions.toAgent, agentId)];

    if (opts?.afterId) {
      // Get the createdAt of the afterId interaction for cursor-based pagination
      const cursor = this.db
        .select({ createdAt: interactions.createdAt })
        .from(interactions)
        .where(eq(interactions.id, opts.afterId))
        .get();

      if (cursor) {
        conditions.push(gt(interactions.createdAt, cursor.createdAt));
      }
    }

    const directMessages = this.db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(interactions.createdAt)
      .limit(limit)
      .all();

    // Get channels this agent is a member of
    const memberships = this.db
      .select({ channel: channelMembers.channel })
      .from(channelMembers)
      .where(eq(channelMembers.agentId, agentId))
      .all();

    const channelNames = memberships.map((m) => m.channel);

    let channelMessages: (typeof interactions.$inferSelect)[] = [];
    if (channelNames.length > 0) {
      const channelConditions = [
        inArray(interactions.channel, channelNames),
      ];

      if (opts?.afterId) {
        const cursor = this.db
          .select({ createdAt: interactions.createdAt })
          .from(interactions)
          .where(eq(interactions.id, opts.afterId))
          .get();
        if (cursor) {
          channelConditions.push(
            gt(interactions.createdAt, cursor.createdAt),
          );
        }
      }

      channelMessages = this.db
        .select()
        .from(interactions)
        .where(and(...channelConditions))
        .orderBy(interactions.createdAt)
        .limit(limit)
        .all();
    }

    // Merge, deduplicate, sort, limit
    const allRows = [...directMessages, ...channelMessages];
    const seen = new Set<string>();
    const unique = allRows.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    unique.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return unique.slice(0, limit).map(rowToInteraction);
  }

  /**
   * Get list of agents that this agent has had direct conversations with,
   * along with the last message and timestamp.
   */
  async getConversations(agentId: string): Promise<
    Array<{
      agentId: string;
      lastMessage: Interaction;
      lastMessageAt: string;
    }>
  > {
    // Get all DMs involving this agent (sent or received)
    const rows = this.db
      .select()
      .from(interactions)
      .where(
        and(
          or(
            eq(interactions.toAgent, agentId),
            eq(interactions.fromAgent, agentId),
          ),
          // Only DMs (toAgent is not null, channel is null)
          sql`${interactions.toAgent} IS NOT NULL`,
          sql`${interactions.channel} IS NULL`,
        ),
      )
      .orderBy(desc(interactions.createdAt))
      .all();

    // Group by the other agent
    const convMap = new Map<string, Interaction>();
    for (const row of rows) {
      const otherAgent =
        row.fromAgent === agentId ? row.toAgent! : row.fromAgent;
      if (!convMap.has(otherAgent)) {
        convMap.set(otherAgent, rowToInteraction(row));
      }
    }

    return Array.from(convMap.entries()).map(([otherAgentId, lastMessage]) => ({
      agentId: otherAgentId,
      lastMessage,
      lastMessageAt: lastMessage.createdAt,
    }));
  }

  /**
   * Get chat history between two agents (bidirectional).
   */
  async getChatHistory(
    agentId: string,
    otherAgentId: string,
    opts?: { afterId?: string; limit?: number; beforeId?: string },
  ): Promise<Interaction[]> {
    const limit = opts?.limit ?? 50;

    const conditions = [
      or(
        and(
          eq(interactions.fromAgent, agentId),
          eq(interactions.toAgent, otherAgentId),
        ),
        and(
          eq(interactions.fromAgent, otherAgentId),
          eq(interactions.toAgent, agentId),
        ),
      )!,
    ];

    if (opts?.afterId) {
      const cursor = this.db
        .select({ createdAt: interactions.createdAt })
        .from(interactions)
        .where(eq(interactions.id, opts.afterId))
        .get();
      if (cursor) {
        conditions.push(gt(interactions.createdAt, cursor.createdAt));
      }
    }

    const rows = this.db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(interactions.createdAt)
      .limit(limit)
      .all();

    return rows.map(rowToInteraction);
  }

  async getChannelMessages(
    channel: string,
    opts?: { afterId?: string; limit?: number },
  ): Promise<Interaction[]> {
    const limit = opts?.limit ?? 50;
    const conditions = [eq(interactions.channel, channel)];

    if (opts?.afterId) {
      const cursor = this.db
        .select({ createdAt: interactions.createdAt })
        .from(interactions)
        .where(eq(interactions.id, opts.afterId))
        .get();
      if (cursor) {
        conditions.push(gt(interactions.createdAt, cursor.createdAt));
      }
    }

    const rows = this.db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(interactions.createdAt)
      .limit(limit)
      .all();

    return rows.map(rowToInteraction);
  }
}
