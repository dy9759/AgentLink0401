import type { FastifyInstance } from "fastify";
import { SendInteractionRequestSchema } from "@agentmesh/shared";
import type { MessageBusService } from "../services/message-bus.service.js";
import { getAuth } from "../auth/middleware.js";

export function interactionRoutes(
  app: FastifyInstance,
  messageBus: MessageBusService,
) {
  // Send interaction (unified: DM, channel, broadcast)
  app.post("/api/interactions", async (request, reply) => {
    const auth = getAuth(request);
    const body = SendInteractionRequestSchema.parse(request.body);

    const fromAgentId = auth.agentId;
    if (!fromAgentId) {
      reply.code(400).send({ error: "Agent token required to send interactions" });
      return;
    }

    // Route by target type
    if (body.type === "broadcast" && body.target.capability) {
      const results = await messageBus.broadcast(fromAgentId, body);
      reply.code(201).send({ interactions: results, delivered: results.length });
    } else if (body.target.channel) {
      const result = await messageBus.sendToChannel(
        fromAgentId,
        body.target.channel,
        body,
      );
      reply.code(201).send({ id: result.id, delivered: true });
    } else if (body.target.agentId) {
      const result = await messageBus.send(fromAgentId, body);
      reply.code(201).send({ id: result.id, delivered: true });
    } else {
      reply.code(400).send({ error: "Target must specify agentId, channel, or capability" });
    }
  });

  // Poll inbox
  app.get("/api/interactions", async (request) => {
    const query = request.query as Record<string, string>;
    const agentId = query.agentId;
    const afterId = query.afterId;
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;

    if (!agentId) {
      return { interactions: [] };
    }

    const results = await messageBus.poll(agentId, { afterId, limit });
    return { interactions: results };
  });
}
