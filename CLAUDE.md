# AgentMesh Client

MCP server + Skill for connecting Claude Code to the AgentMesh network.

## Project Structure

pnpm monorepo with 2 packages:

- `packages/shared` — Shared types, Interaction Protocol, Zod schemas
- `packages/mcp-server` — Claude Code MCP adapter (stdio transport)

Hub server is in a separate repo: [agentmeshhub](https://github.com/dy9759/agentmeshhub)

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
```

## Usage

Run `/agentmesh` in Claude Code to connect to the mesh network.

## Messaging Model

- **Owner-Owner**: Owner sends to another owner via `agentmesh_owner_send`
- **Owner-Agent**: Owner sends to agent, or agent sends to owner
- **Agent-Agent**: Standard agent-to-agent messaging via `agentmesh_send_message`

Each user is an Owner (authenticated by API Key). Each Owner can have multiple Agents.
