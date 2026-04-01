import { eq, and, gt, desc, inArray } from "drizzle-orm";
import {
  generateInteractionId,
  type Interaction,
  type SendInteractionRequest,
} from "@agentmesh/shared";
import type { DB } from "../db/connection.js";
import { interactions, channelMembers } from "../db/schema.js";
import type { MessageBus } from "../interfaces/message-bus.js";
import type { Registry } from "../interfaces/registry.js";

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
  constructor(
    private db: DB,
    private registry: Registry,
  ) {}

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

    return {
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
      if (agent.agentId === fromAgentId) continue; // don't send to self
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
