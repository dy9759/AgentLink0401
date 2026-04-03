"use client";
import { useEffect, useState, useRef } from "react";
import { getChatHistory, sendInteraction } from "@/lib/hub-client";
import { use } from "react";

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: otherId } = use(params);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ownerId = typeof document !== "undefined" ? document.cookie.split("; ").find(c => c.startsWith("owner_id="))?.split("=")[1] : undefined;

  function loadMessages() {
    if (!ownerId) return;
    getChatHistory(otherId, { ownerId }).then(r => {
      setMessages(r.messages ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }).catch(() => {});
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [otherId, ownerId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      await sendInteraction({
        type: "message",
        contentType: "text",
        target: { agentId: otherId.startsWith("agent-") ? otherId : undefined, ownerId: otherId.startsWith("owner-") ? otherId : undefined },
        payload: { text: input },
      });
      setInput("");
      loadMessages();
    } catch {} finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <h1 className="font-bold">{otherId}</h1>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.fromId === ownerId ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] p-3 rounded-lg text-sm ${msg.fromId === ownerId ? "bg-[var(--accent)] text-[var(--bg-tertiary)]" : "bg-[var(--bg-secondary)]"}`}>
              <div className="text-xs opacity-70 mb-1">{msg.fromId?.slice(0, 15)}</div>
              {msg.payload?.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-[var(--border)] flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded" placeholder="Type a message..." />
        <button type="submit" disabled={sending} className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
