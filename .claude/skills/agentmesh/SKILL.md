---
name: agentmesh
description: Initialize AgentMesh network — start Hub, install MCP, register agent, show online agents and usage guide. Use when user wants to join or connect to the agent mesh network.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# AgentMesh Onboarding

Execute the following steps in order. Skip any step that is already satisfied.

## Step 1: Ensure Hub is Running

Check if the Hub server is available:

```
curl -s http://localhost:5555/health
```

If the Hub is NOT running (curl fails or returns non-200):

1. Kill any stale process on port 5555: `lsof -ti:5555 | xargs kill -9 2>/dev/null`
2. Start the Hub in background from the project root: `cd ${CLAUDE_SKILL_DIR}/../../.. && pnpm dev &`
3. Wait up to 10 seconds for the Hub to become healthy, polling `curl -s http://localhost:5555/health` every 2 seconds
4. If the Hub does not start, tell the user and stop

## Step 2: Ensure Owner API Key Exists

Check if an owner and API key exist by reading the Hub database or calling the API:

```
curl -s http://localhost:5555/api/owners -H "Authorization: Bearer test"
```

If no owner exists yet (or the response returns 401), create one:

```
curl -s -X POST http://localhost:5555/api/owners \
  -H "Content-Type: application/json" \
  -d '{"name": "default-owner"}'
```

Save the returned `apiKey` value — you will need it for the MCP config.

If an owner already exists, read the API key from the existing `.claude/settings.local.json` MCP config (look for `AGENTMESH_API_KEY` in the env).

## Step 3: Install MCP Server

Check if the agentmesh MCP server is already configured in the project's `.claude/settings.local.json` under `mcpServers`.

If NOT configured, add it by running:

```bash
claude mcp add agentmesh -s project -- npx tsx ${CLAUDE_SKILL_DIR}/../../../packages/mcp-server/src/server.ts
```

Then update the MCP server's environment variables in `.claude/settings.local.json` to include:

```json
{
  "mcpServers": {
    "agentmesh": {
      "command": "npx",
      "args": ["tsx", "<project-root>/packages/mcp-server/src/server.ts"],
      "env": {
        "AGENTMESH_HUB_URL": "http://localhost:5555",
        "AGENTMESH_API_KEY": "<the-api-key-from-step-2>"
      }
    }
  }
}
```

Merge this into the existing settings file, preserving any existing `permissions` config.

After adding the MCP config, tell the user: **"MCP server configured. Please restart Claude Code (or run /mcp) to load the new MCP server, then run /agentmesh again."** and STOP here.

## Step 4: Register Agent

Once the MCP tools are available, register this agent:

```
agentmesh_register({
  name: "<hostname>-claude-<short-random>",
  type: "claude-code",
  capabilities: ["code-review", "coding", "documentation", "debugging"]
})
```

Use the machine's hostname in the name to make it identifiable. Save the returned `agentId`.

## Step 5: Show Online Agents

List all currently registered agents:

```
agentmesh_list_agents()
```

Display the results in a clean table:

| Agent | Type | Status | Capabilities |
|-------|------|--------|-------------|
| ... | ... | ... | ... |

## Step 6: Show Usage Guide

Print the following quick-reference:

---

**AgentMesh Ready!** You are now connected to the mesh network.

### Quick Commands

**Send a message to another agent:**
```
agentmesh_send_message({ toAgentId: "<agent-id>", text: "Hello!" })
```

**Chat with an agent (wait for reply):**
```
agentmesh_chat({ toAgentId: "<agent-id>", text: "Can you help me review this code?" })
```

**List all online agents:**
```
agentmesh_list_agents({ status: "online" })
```

**Broadcast to agents with a capability:**
```
agentmesh_broadcast({ capability: "code-review", text: "New PR ready for review" })
```

**Create a task (auto-assigned):**
```
agentmesh_create_task({ type: "code-review", requiredCapabilities: ["code-review"], payload: { description: "Review PR #42" } })
```

**Check your inbox:**
```
agentmesh_check_messages()
```

**Send a file:**
```
agentmesh_send_file({ toAgentId: "<agent-id>", filePath: "/path/to/file" })
```

---
