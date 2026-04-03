"use client";
import { useEffect, useState } from "react";
import { pollInteractions, getMyAgents } from "@/lib/hub-client";

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFiles() {
      try {
        const agentsRes = await getMyAgents().catch(() => ({ agents: [] }));
        const myAgents = agentsRes.agents ?? [];
        const allFiles: any[] = [];

        for (const agent of myAgents) {
          try {
            const inbox = await pollInteractions({ agentId: agent.agentId, limit: "100" });
            for (const msg of inbox.interactions ?? []) {
              if (msg.payload?.file || msg.payload?.data?.fileId) {
                allFiles.push({
                  ...msg,
                  _agent: agent.name,
                  _name: msg.payload?.file?.fileName ?? msg.payload?.data?.fileName ?? "file",
                  _size: msg.payload?.file?.size ?? msg.payload?.data?.fileSize ?? 0,
                  _fileId: msg.payload?.file?.fileId ?? msg.payload?.data?.fileId,
                });
              }
            }
          } catch {}
        }

        const ownerId = document.cookie.split("; ").find(c => c.startsWith("owner_id="))?.split("=")[1];
        if (ownerId) {
          try {
            const inbox = await pollInteractions({ ownerId, limit: "100" });
            for (const msg of inbox.interactions ?? []) {
              if (msg.payload?.file || msg.payload?.data?.fileId) {
                allFiles.push({
                  ...msg, _agent: "owner",
                  _name: msg.payload?.file?.fileName ?? msg.payload?.data?.fileName ?? "file",
                  _size: msg.payload?.file?.size ?? msg.payload?.data?.fileSize ?? 0,
                  _fileId: msg.payload?.file?.fileId ?? msg.payload?.data?.fileId,
                });
              }
            }
          } catch {}
        }

        setFiles(allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } finally { setLoading(false); }
    }
    loadFiles();
  }, []);

  function fmt(n: number) {
    if (!n) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Files ({files.length})</h1>
      {loading && <div className="text-[var(--text-secondary)]">Loading...</div>}
      {!loading && files.length === 0 && <div className="text-[var(--text-secondary)]">No files received yet.</div>}
      <div className="space-y-2">
        {files.map(f => (
          <div key={f.id} className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)] flex items-center gap-4">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{f._name}</div>
              <div className="text-xs text-[var(--text-secondary)]">
                {fmt(f._size)} • From {(f.fromId ?? "").slice(0, 20)} • {new Date(f.createdAt).toLocaleString()} • via {f._agent}
              </div>
              {f.payload?.text && <div className="text-sm text-[var(--text-secondary)] mt-1 truncate">{f.payload.text}</div>}
            </div>
            {f._fileId && (
              <a href={`/api/hub/files/${f._fileId}`} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm bg-[var(--accent)]/20 text-[var(--accent)] rounded hover:bg-[var(--accent)]/30">
                Download
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
