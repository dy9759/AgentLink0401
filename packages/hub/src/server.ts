import { createApp } from "./app.js";

const PORT = parseInt(process.env.PORT || "5555", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DB_URL = process.env.DATABASE_URL || "agentmesh.db";

const { app } = createApp({ dbUrl: DB_URL, port: PORT, host: HOST });

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`AgentMesh Hub running on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
