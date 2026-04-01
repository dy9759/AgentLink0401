# AgentMesh

Cross-machine, cross-model Agent communication network.

## Project Structure

pnpm monorepo with 6 packages:

- `packages/shared` — Shared types, Interaction Protocol, Zod schemas
- `packages/hub` — Central Hub server (Fastify + Drizzle ORM + SQLite/PostgreSQL)
- `packages/agent-runtime` — Agent autonomous runtime loop (poll → route → handle → respond)
- `packages/mcp-server` — Claude Code MCP adapter (stdio + HTTP)
- `packages/a2a-adapter` — OpenClaw A2A adapter (Express + A2A SDK)
- `packages/rest-client` — REST SDK + CLI (commander)

## Tech Stack

- TypeScript (ES2022, Node16 module resolution)
- Fastify (HTTP server)
- Drizzle ORM (SQLite dev / PostgreSQL prod)
- Zod (validation)
- jose (JWT for Agent Token)
- vitest (testing)

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm dev              # Start Hub dev server
pnpm test             # Run all tests
pnpm typecheck        # Type check all packages
```

## Authentication

3-layer auth system:
1. Owner API Key (Bearer token) — all requests
2. OAuth 2.1 + PKCE — HTTP remote mode
3. Agent Token (JWT) — per-agent identity after registration

## Core Concepts

- **Interaction Protocol**: Unified message format with types (message/task/query/event/broadcast) and capability routing
- **Agent Runtime**: Autonomous poll loop with handler registry for self-directed agent collaboration
- **Hub interfaces**: Registry, MessageBus, TaskEngine — logically decoupled for future federation
