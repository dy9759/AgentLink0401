import Fastify from "fastify";
import cors from "@fastify/cors";
import { createDatabase, initializeDatabase, type DB } from "./db/connection.js";
import { OwnerService } from "./services/owner.service.js";
import { RegistryService } from "./services/registry.service.js";
import { MessageBusService } from "./services/message-bus.service.js";
import { ChannelService } from "./services/channel.service.js";
import { TaskEngineService } from "./services/task-engine.service.js";
import { createAuthMiddleware } from "./auth/middleware.js";
import { healthRoutes } from "./routes/health.js";
import { ownerRoutes } from "./routes/owners.js";
import { agentRoutes } from "./routes/agents.js";
import { interactionRoutes } from "./routes/interactions.js";
import { channelRoutes } from "./routes/channels.js";
import { taskRoutes } from "./routes/tasks.js";
import { startStaleAgentReaper } from "./tasks/stale-agent-reaper.js";

export interface AppConfig {
  dbUrl?: string;
  port?: number;
  host?: string;
}

export function createApp(config: AppConfig = {}) {
  const app = Fastify({ logger: true });
  const db = createDatabase(config.dbUrl);

  // Initialize database tables
  initializeDatabase(db);

  // Services
  const ownerService = new OwnerService(db);
  const registryService = new RegistryService(db);
  const messageBusService = new MessageBusService(db, registryService);
  const channelService = new ChannelService(db);
  const taskEngineService = new TaskEngineService(db, registryService);

  // Middleware
  app.register(cors);
  app.addHook("onRequest", createAuthMiddleware(ownerService));

  // Error handler for Zod validation errors
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    if (error.name === "ZodError") {
      reply.code(400).send({ error: "Validation error", details: error });
      return;
    }
    if (error.statusCode) {
      reply.code(error.statusCode).send({ error: error.message });
      return;
    }
    request.log.error(error);
    reply.code(500).send({ error: "Internal server error" });
  });

  // Routes
  healthRoutes(app, registryService);
  ownerRoutes(app, ownerService);
  agentRoutes(app, registryService);
  interactionRoutes(app, messageBusService);
  channelRoutes(app, channelService, messageBusService);
  taskRoutes(app, taskEngineService);

  // Background tasks
  const reaper = startStaleAgentReaper(registryService);
  app.addHook("onClose", () => clearInterval(reaper));

  return {
    app,
    db,
    services: {
      ownerService,
      registryService,
      messageBusService,
      channelService,
      taskEngineService,
    },
  };
}
