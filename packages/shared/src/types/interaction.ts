export type InteractionType =
  | "message"
  | "task"
  | "query"
  | "event"
  | "broadcast";

export type ContentType = "text" | "json" | "action";

export type Priority = "low" | "normal" | "high";

export interface InteractionTarget {
  agentId?: string; // DM
  channel?: string; // channel message
  capability?: string; // broadcast by capability
}

export interface InteractionMetadata {
  expectReply?: boolean;
  timeoutMs?: number;
  priority?: Priority;
  schema?: string; // named interaction schema
  correlationId?: string; // link request ↔ response
}

export interface InteractionPayload {
  text?: string; // natural language (first-class)
  data?: Record<string, unknown>; // structured data
}

export interface Interaction {
  id: string;
  type: InteractionType;
  contentType: ContentType;
  fromAgent: string;
  target: InteractionTarget;
  payload: InteractionPayload;
  metadata?: InteractionMetadata;
  status?: "pending" | "delivered" | "read";
  createdAt: string;
}

export interface SendInteractionRequest {
  type: InteractionType;
  contentType: ContentType;
  target: InteractionTarget;
  payload: InteractionPayload;
  metadata?: InteractionMetadata;
}
