"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getConversations } from "@/lib/hub-client";

export default function ChatListPage() {
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const ownerId = document.cookie.split("; ").find(c => c.startsWith("owner_id="))?.split("=")[1];
    if (ownerId) {
      getConversations({ ownerId }).then(r => setConversations(r.conversations ?? [])).catch(() => {});
    }
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Conversations</h1>
      <div className="space-y-2">
        {conversations.map((conv: any) => (
          <Link key={conv.peerId ?? conv.agentId} href={`/chat/${conv.peerId ?? conv.agentId}`}
            className="block bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition">
            <div className="flex justify-between">
              <span className="font-medium">{conv.peerId ?? conv.agentId}</span>
              <span className="text-xs text-[var(--text-secondary)]">{new Date(conv.lastMessageAt).toLocaleString()}</span>
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1 truncate">{conv.lastMessage?.payload?.text ?? "..."}</div>
          </Link>
        ))}
        {conversations.length === 0 && <div className="text-[var(--text-secondary)]">No conversations yet</div>}
      </div>
    </div>
  );
}
