const HUB_API_BASE = "/api/hub";

async function hubFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${HUB_API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hub API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Health
export const getHealth = () => hubFetch<{ status: string; agentsOnline: number }>("/health");

// Agents
export const listAgents = (filter?: Record<string, string>) => {
  const params = new URLSearchParams(filter);
  return hubFetch<{ agents: any[] }>(`/agents${params.toString() ? `?${params}` : ""}`);
};
export const getAgent = (id: string) => hubFetch<any>(`/agents/${id}`);
export const getMyAgents = () => hubFetch<{ agents: any[] }>("/agents/mine");

// Messages
export const sendInteraction = (body: any) => hubFetch<any>("/interactions", { method: "POST", body: JSON.stringify(body) });
export const pollInteractions = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params);
  return hubFetch<{ interactions: any[]; nextCursor?: string }>(`/interactions?${qs}`);
};
export const getConversations = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params);
  return hubFetch<{ conversations: any[] }>(`/conversations?${qs}`);
};
export const getChatHistory = (otherId: string, params: Record<string, string>) => {
  const qs = new URLSearchParams(params);
  return hubFetch<{ messages: any[] }>(`/conversations/${otherId}/messages?${qs}`);
};

// Channels
export const listChannels = () => hubFetch<{ channels: any[] }>("/channels");
export const getChannelMessages = (name: string, params?: Record<string, string>) => {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return hubFetch<{ interactions: any[] }>(`/channels/${name}/messages${qs}`);
};
export const createChannel = (body: any) => hubFetch<any>("/channels", { method: "POST", body: JSON.stringify(body) });
export const joinChannel = (name: string) => hubFetch<void>(`/channels/${name}/join`, { method: "POST" });

// Tasks
export const listTasks = (params?: Record<string, string>) => {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return hubFetch<{ tasks: any[] }>(`/tasks${qs}`);
};
export const createTask = (body: any) => hubFetch<any>("/tasks", { method: "POST", body: JSON.stringify(body) });
export const updateTaskStatus = (id: string, body: any) => hubFetch<any>(`/tasks/${id}/status`, { method: "POST", body: JSON.stringify(body) });

// Sessions
export const listSessions = (params?: Record<string, string>) => {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return hubFetch<{ sessions: any[] }>(`/sessions${qs}`);
};
export const getSession = (id: string) => hubFetch<any>(`/sessions/${id}`);
export const getSessionMessages = (id: string) => hubFetch<{ messages: any[] }>(`/sessions/${id}/messages`);
export const getSessionSummary = (id: string) => hubFetch<any>(`/sessions/${id}/summary`);
export const createSession = (body: any) => hubFetch<any>("/sessions", { method: "POST", body: JSON.stringify(body) });

// Teams
export const listTeams = () => hubFetch<{ teams: any[] }>("/teams");
export const getTeam = (id: string) => hubFetch<any>(`/teams/${id}`);
export const createTeam = (body: any) => hubFetch<any>("/teams", { method: "POST", body: JSON.stringify(body) });

// Owner
export const getOwnerMe = () => hubFetch<{ ownerId: string; name: string }>("/owners/me");
export const getOwnerInbox = (params?: Record<string, string>) => {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return hubFetch<{ interactions: any[] }>(`/interactions${qs}`);
};

// Agent token (identity switching)
export const getAgentToken = (agentId: string) => hubFetch<{ agentId: string; agentToken: string; expiresIn: number }>(`/agents/${agentId}/token`, { method: "POST" });

// Auto-reply
export const getAutoReplyConfig = (agentId: string) => hubFetch<any>(`/agents/${agentId}/auto-reply`);
export const updateAutoReplyConfig = (agentId: string, config: Record<string, unknown>) => hubFetch<any>(`/agents/${agentId}/auto-reply`, { method: "PATCH", body: JSON.stringify(config) });

// Session auto-discussion
export const startAutoDiscussion = (sessionId: string) => hubFetch<any>(`/sessions/${sessionId}/auto-start`, { method: "POST" });
export const stopAutoDiscussion = (sessionId: string) => hubFetch<any>(`/sessions/${sessionId}/auto-stop`, { method: "POST" });

// Files
export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${HUB_API_BASE}/files`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
};
