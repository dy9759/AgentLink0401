"use client";
import { useEffect, useState, useRef } from "react";
import { getChannelMessages, sendInteraction } from "@/lib/hub-client";
import { use } from "react";

export default function ChannelDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadMessages() {
    getChannelMessages(name).then(r => {
      setMessages(r.interactions ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }).catch(() => {});
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [name]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      await sendInteraction({
        type: "message",
        contentType: "text",
        target: { channel: name },
        payload: { text: input },
      });
      setInput("");
      loadMessages();
    } catch {} finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <h1 className="font-bold text-lg">#{name}</h1>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className="bg-[var(--bg-secondary)] p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--accent)]">{msg.fromId?.slice(0, 20)}</span>
              <span className="text-xs text-[var(--text-secondary)]">{new Date(msg.createdAt).toLocaleString()}</span>
            </div>
            <div className="text-sm">{msg.payload?.text}</div>
          </div>
        ))}
        {messages.length === 0 && <div className="text-[var(--text-secondary)] text-center mt-8">No messages yet. Start the conversation!</div>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-[var(--border)] flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded" placeholder={`Message #${name}...`} />
        <button type="submit" disabled={sending} className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
