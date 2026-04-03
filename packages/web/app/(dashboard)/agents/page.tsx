"use client";
import { useEffect, useState } from "react";
import { listAgents } from "@/lib/hub-client";
import Link from "next/link";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => { listAgents().then(r => setAgents(r.agents)).catch(() => {}); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Agents ({agents.length})</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(a => {
          const p = a.profile ?? {};
          const avatar = p.avatar ?? "🤖";
          const displayName = p.displayName ?? a.name;
          const bio = p.bio ?? "";
          const caps = a.state?.capabilities ?? [];
          const status = a.state?.status;

          return (
            <Link key={a.agentId} href={`/agents/${a.agentId}`}
              className="block bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl w-10 h-10 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center">
                  {avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{displayName}</div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className={`inline-block w-2 h-2 rounded-full ${status === "online" ? "bg-[var(--success)]" : status === "busy" ? "bg-[var(--warning)]" : "bg-gray-500"}`} />
                    {status}
                    <span className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">{a.type}</span>
                  </div>
                </div>
              </div>
              {bio && <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{bio}</p>}
              {caps.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {caps.slice(0, 5).map((c: string) => (
                    <span key={c} className="px-1.5 py-0.5 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded">{c}</span>
                  ))}
                  {caps.length > 5 && <span className="text-xs text-[var(--text-secondary)]">+{caps.length - 5}</span>}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
