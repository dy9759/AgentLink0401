import type {
  Interaction,
  SendInteractionRequest,
} from "@agentmesh/shared";

export interface MessageBus {
  send(
    fromAgentId: string,
    request: SendInteractionRequest,
  ): Promise<Interaction>;

  sendToChannel(
    fromAgentId: string,
    channel: string,
    request: SendInteractionRequest,
  ): Promise<Interaction>;

  broadcast(
    fromAgentId: string,
    request: SendInteractionRequest,
  ): Promise<Interaction[]>;

  poll(
    agentId: string,
    opts?: { afterId?: string; limit?: number },
  ): Promise<Interaction[]>;

  getChannelMessages(
    channel: string,
    opts?: { afterId?: string; limit?: number },
  ): Promise<Interaction[]>;

  getConversations(
    agentId: string,
  ): Promise<Array<{ agentId: string; lastMessage: Interaction; lastMessageAt: string }>>;

  getChatHistory(
    agentId: string,
    otherAgentId: string,
    opts?: { afterId?: string; limit?: number; beforeId?: string },
  ): Promise<Interaction[]>;
}
