# Changelog

## [0.2.0] - 2026-04-02

### Added — Multi-Turn Collaboration (Phase 1-3)
- **Session model**: `sessions` table for multi-turn conversation tracking with participants, turns, shared context
- **7 new MCP tools**: `create_session`, `session_status`, `list_sessions`, `multi_turn_chat`, `share_context`, `get_session_context`
- **Session auto-complete**: sessions automatically close when `maxTurns` reached
- **Shared context**: files, code snippets, decisions can be shared within a session
- **Multi-turn chat loop**: polling-based conversation with timeout and session tracking

### Added — Owner Messaging
- **Owner-Owner, Owner-Agent bidirectional messaging**: `agentmesh_owner_send`, `agentmesh_owner_inbox`, `agentmesh_owner_conversations`
- **`fromId`/`fromType` model**: unified sender identity for agents and owners
- **Owner whoami**: `/api/owners/me` endpoint, resolved on MCP server startup
- **`ownerId` in registration response**: MCP tools can identify owner immediately

### Added — Project Structure
- **Hub split to separate repo**: [dy9759/agentmeshhub](https://github.com/dy9759/agentmeshhub)
- **Pure client mode**: MCP server connects to remote Hub, no local port
- **Global install support**: `~/.mcp.json` + `~/.claude/skills/agentmesh/` for any-directory usage
- **README**: setup guide, tool reference, deployment instructions
- **Skill dashboard**: `/agentmesh` shows online agents, messages, and natural language command guide

### Fixed — Audit Issues
- **P0**: Reject sends to non-existent agents/owners (404)
- **P0**: Add `agentId` registration check to `send-message` and `send-file`
- **P1**: Fix `fromAgent` field — empty string for owner senders
- **P1**: Message status transitions (`pending` → `delivered` on poll)
- **P1**: Exclude broadcasts from chat history
- **P1**: Fix multi-turn reply matching (prefer `correlationId`, fallback `sessionId`)
- **P2**: Add `nextCursor` to poll responses
- **P2**: Add try/catch to all MCP tools (6 tools hardened)
- **P2**: File dedup-by-name in `share-context` merge

### Fixed — Session Validation
- Reject session creation with non-existent participant IDs (404)
- Block messages to completed/failed/archived sessions (400)
- Require at least `text`, `data`, or `file` in interaction payload
- Atomic SQL turn increment (no race condition)
- Safe `JSON.parse` with fallback (crash prevention)
- Auth checks on session routes (creator/participant validation)

## [0.1.0] - 2026-04-01

### Added
- Initial AgentMesh client with 14 MCP tools
- Agent registration, discovery, messaging
- Broadcast by capability, channel messaging
- File transfer (upload/download, inline <5MB, Hub >5MB)
- WebSocket real-time notifications + desktop notifications
- `/agentmesh` skill for first-time setup
- Chat tool with correlation ID and polling
- Conversation list and chat history
