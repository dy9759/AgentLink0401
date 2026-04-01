import type {
  Agent,
  AgentRegistration,
  AgentHeartbeat,
  AgentFilter,
  Interaction,
  SendInteractionRequest,
  Channel,
  CreateChannelRequest,
  Task,
  CreateTaskRequest,
  UpdateTaskStatusRequest,
  RegisterResponse,
  ListAgentsResponse,
  ListInteractionsResponse,
  ListChannelsResponse,
  CreateTaskResponse,
  ListTasksResponse,
  HealthResponse,
  CreateOwnerResponse,
} from "@agentmesh/shared";

export interface HubClientConfig {
  hubUrl: string;
  apiKey?: string;
  agentToken?: string;
}

export class HubClient {
  private hubUrl: string;
  private token: string;

  constructor(config: HubClientConfig) {
    this.hubUrl = config.hubUrl.replace(/\/$/, "");
    this.token = config.agentToken || config.apiKey || "";
  }

  setAgentToken(token: string): void {
    this.token = token;
  }

  private async fetch<T>(
    path: string,
    opts: RequestInit = {},
  ): Promise<T> {
    const url = `${this.hubUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(opts.headers as Record<string, string>),
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...opts,
      headers,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Hub API error ${response.status}: ${body}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  // Owner
  async createOwner(name: string): Promise<CreateOwnerResponse> {
    return this.fetch("/api/owners", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  // Agent registration
  async register(registration: AgentRegistration): Promise<RegisterResponse> {
    return this.fetch("/api/register", {
      method: "POST",
      body: JSON.stringify(registration),
    });
  }

  async heartbeat(hb: AgentHeartbeat): Promise<Agent> {
    return this.fetch("/api/heartbeat", {
      method: "POST",
      body: JSON.stringify(hb),
    });
  }

  async unregister(agentId: string): Promise<void> {
    return this.fetch(`/api/agents/${agentId}`, {
      method: "DELETE",
    });
  }

  // Agent discovery
  async listAgents(filter?: AgentFilter): Promise<ListAgentsResponse> {
    const params = new URLSearchParams();
    if (filter?.type) params.set("type", filter.type);
    if (filter?.capability) params.set("capability", filter.capability);
    if (filter?.status) params.set("status", filter.status);
    if (filter?.maxLoad !== undefined)
      params.set("maxLoad", String(filter.maxLoad));

    const qs = params.toString();
    return this.fetch(`/api/agents${qs ? `?${qs}` : ""}`);
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.fetch(`/api/agents/${agentId}`);
  }

  async matchAgents(
    capability: string,
    maxLoad?: number,
  ): Promise<ListAgentsResponse> {
    const params = new URLSearchParams({ capability });
    if (maxLoad !== undefined) params.set("maxLoad", String(maxLoad));
    return this.fetch(`/api/agents/match?${params}`);
  }

  // Interactions
  async sendInteraction(
    request: SendInteractionRequest,
  ): Promise<{ id: string; delivered: boolean }> {
    return this.fetch("/api/interactions", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async pollInteractions(
    agentId: string,
    opts?: { afterId?: string; limit?: number },
  ): Promise<ListInteractionsResponse> {
    const params = new URLSearchParams({ agentId });
    if (opts?.afterId) params.set("afterId", opts.afterId);
    if (opts?.limit) params.set("limit", String(opts.limit));
    return this.fetch(`/api/interactions?${params}`);
  }

  // Channels
  async createChannel(request: CreateChannelRequest): Promise<Channel> {
    return this.fetch("/api/channels", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async listChannels(): Promise<ListChannelsResponse> {
    return this.fetch("/api/channels");
  }

  async joinChannel(channelName: string): Promise<void> {
    return this.fetch(`/api/channels/${channelName}/join`, {
      method: "POST",
    });
  }

  async getChannelMessages(
    channelName: string,
    opts?: { afterId?: string; limit?: number },
  ): Promise<ListInteractionsResponse> {
    const params = new URLSearchParams();
    if (opts?.afterId) params.set("afterId", opts.afterId);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.fetch(
      `/api/channels/${channelName}/messages${qs ? `?${qs}` : ""}`,
    );
  }

  // Tasks
  async createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    return this.fetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async listTasks(opts?: {
    status?: string;
    assignedTo?: string;
    createdBy?: string;
  }): Promise<ListTasksResponse> {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.assignedTo) params.set("assignedTo", opts.assignedTo);
    if (opts?.createdBy) params.set("createdBy", opts.createdBy);
    const qs = params.toString();
    return this.fetch(`/api/tasks${qs ? `?${qs}` : ""}`);
  }

  async getTask(taskId: string): Promise<Task> {
    return this.fetch(`/api/tasks/${taskId}`);
  }

  async assignTask(taskId: string, agentId: string): Promise<Task> {
    return this.fetch(`/api/tasks/${taskId}/assign`, {
      method: "POST",
      body: JSON.stringify({ agentId }),
    });
  }

  async updateTaskStatus(
    taskId: string,
    request: UpdateTaskStatusRequest,
  ): Promise<Task> {
    return this.fetch(`/api/tasks/${taskId}/status`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // Health
  async health(): Promise<HealthResponse> {
    return this.fetch("/health");
  }
}
