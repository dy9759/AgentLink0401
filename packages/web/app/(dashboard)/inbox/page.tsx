"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { pollInteractions, getMyAgents } from "@/lib/hub-client";

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "files" | "sessions">("all");

  useEffect(() => {
    async function load() {
      try {
        const allMsgs: any[] = [];

        // Owner inbox
        const ownerId = document.cookie.split("; ").find(c => c.startsWith("owner_id="))?.split("=")[1];
        if (ownerId) {
          const res = await pollInteractions({ ownerId, limit: "50" }).catch(() => ({ interactions: [] }));
          for (const m of res.interactions ?? []) {
            allMsgs.push({ ...m, _via: "owner" });
          }
        }

        // Agent inboxes
        const agents = await getMyAgents().catch(() => ({ agents: [] }));
        for (const agent of agents.agents ?? []) {
          const res = await pollInteractions({ agentId: agent.agentId, limit: "50" }).catch(() => ({ interactions: [] }));
          for (const m of res.interactions ?? []) {
            allMsgs.push({ ...m, _via: agent.name });
          }
        }

        // Deduplicate by ID
        const seen = new Set<string>();
        const unique = allMsgs.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
        unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMessages(unique);
      } finally { setLoading(false); }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = messages.filter(m => {
    if (tab === "files") return m.payload?.file || m.payload?.data?.fileId;
    if (tab === "sessions") return m.target?.sessionId;
    return true;
  });

  function formatSize(n: number) {
    if (!n) return "";
    if (n < 1024) return `${n}B`;
    if (n < 1048576) return `${(n / 1024).toFixed(0)}KB`;
    return `${(n / 1048576).toFixed(1)}MB`;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "files", "sessions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded ${tab === t ? "bg-[var(--accent)] text-[var(--bg-tertiary)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"}`}>
            {t === "all" ? `All (${messages.length})` : t === "files" ? `Files (${messages.filter(m => m.payload?.file || m.payload?.data?.fileId).length})` : `Sessions (${messages.filter(m => m.target?.sessionId).length})`}
          </button>
        ))}
      </div>

      {loading && <div className="text-[var(--text-secondary)]">Loading...</div>}

      <div className="space-y-2">
        {filtered.map(msg => {
          const hasFile = msg.payload?.file || msg.payload?.data?.fileId;
          const fileId = msg.payload?.file?.fileId ?? msg.payload?.data?.fileId;
          const fileName = msg.payload?.file?.fileName ?? msg.payload?.data?.fileName;
          const fileSize = msg.payload?.file?.size ?? msg.payload?.data?.fileSize;
          const sessionId = msg.target?.sessionId;

          return (
            <div key={msg.id} className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${msg.fromType === "owner" ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-[var(--success)]/20 text-[var(--success)]"}`}>
                    {msg.fromType}
                  </span>
                  <span className="font-medium text-sm">{(msg.fromId ?? "").slice(0, 25)}</span>
                  {msg.type !== "message" && <span className="text-xs bg-[var(--warning)]/20 text-[var(--warning)] px-1.5 py-0.5 rounded">{msg.type}</span>}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {new Date(msg.createdAt).toLocaleString()} • via {msg._via}
                </div>
              </div>

              {/* Text content */}
              {msg.payload?.text && <div className="text-sm mt-2">{msg.payload.text.slice(0, 200)}{msg.payload.text.length > 200 ? "..." : ""}</div>}

              {/* File attachment */}
              {hasFile && (
                <div className="flex items-center gap-2 mt-2 bg-[var(--bg-tertiary)] p-2 rounded">
                  <span>📎</span>
                  <span className="text-sm">{fileName ?? "file"}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{formatSize(fileSize)}</span>
                  {fileId && (
                    <a href={`/api/hub/files/${fileId}`} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-xs px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded hover:bg-[var(--accent)]/30">
                      Download
                    </a>
                  )}
                </div>
              )}

              {/* Session link */}
              {sessionId && (
                <Link href={`/sessions/${sessionId}`} className="inline-block mt-2 text-xs text-[var(--accent)] hover:underline">
                  View Session →
                </Link>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && <div className="text-[var(--text-secondary)]">No messages</div>}
      </div>
    </div>
  );
}
