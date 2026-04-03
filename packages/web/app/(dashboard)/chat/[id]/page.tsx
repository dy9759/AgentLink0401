"use client";
import { useEffect, useState, useRef } from "react";
import { getChatHistory, sendInteraction, uploadFile } from "@/lib/hub-client";
import { use } from "react";

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: otherId } = use(params);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ownerId = typeof document !== "undefined" ? document.cookie.split("; ").find(c => c.startsWith("owner_id="))?.split("=")[1] : undefined;

  const target = otherId.startsWith("agent-") ? { agentId: otherId } : { ownerId: otherId };

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
        target,
        payload: { text: input },
      });
      setInput("");
      loadMessages();
    } catch {} finally { setSending(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file);
        await sendInteraction({
          type: "message",
          contentType: "json",
          target,
          payload: {
            text: `📎 ${file.name}`,
            data: { fileId: uploaded.id, fileName: file.name, fileSize: file.size, contentType: file.type || "application/octet-stream" },
          },
        });
      }
      loadMessages();
    } catch {} finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
              {/* Text */}
              {msg.payload?.text && !msg.payload?.data?.fileId && (
                <div>{msg.payload.text}</div>
              )}
              {/* File */}
              {msg.payload?.data?.fileId && (
                <div className="flex items-center gap-2 mt-1">
                  <span>📎</span>
                  <a href={`/api/hub/files/${msg.payload.data.fileId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {msg.payload.data.fileName} ({formatSize(msg.payload.data.fileSize || 0)})
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-[var(--border)]">
        {uploading && <div className="text-xs text-[var(--accent)] mb-2">Uploading...</div>}
        <form onSubmit={handleSend} className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded" placeholder="Type a message..." />
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent)] disabled:opacity-50" title="Upload file">📎</button>
          <button type="submit" disabled={sending || !input.trim()} className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50">Send</button>
        </form>
      </div>
    </div>
  );
}
