import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared/vitest.config.ts",
  "packages/hub/vitest.config.ts",
  "packages/agent-runtime/vitest.config.ts",
  "packages/mcp-server/vitest.config.ts",
]);
