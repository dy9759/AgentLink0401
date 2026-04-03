"use client";
import { useEffect, useState } from "react";
import { listAgents } from "@/lib/hub-client";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => { listAgents().then(r => setAgents(r.agents)).catch(() => {}); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Agents ({agents.length})</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
            <th className="pb-2">Status</th><th className="pb-2">Name</th><th className="pb-2">Type</th>
            <th className="pb-2">Capabilities</th><th className="pb-2">Load</th><th className="pb-2">Last Active</th>
          </tr></thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.agentId} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-secondary)]">
                <td className="py-3"><span className={`inline-block w-2 h-2 rounded-full ${a.state?.status === "online" ? "bg-[var(--success)]" : a.state?.status === "busy" ? "bg-[var(--warning)]" : "bg-gray-500"}`} /> {a.state?.status}</td>
                <td className="py-3 font-medium">{a.name}</td>
                <td className="py-3">{a.type}</td>
                <td className="py-3">{a.state?.capabilities?.map((c: string) => <span key={c} className="inline-block bg-[var(--bg-tertiary)] px-2 py-0.5 rounded text-xs mr-1">{c}</span>)}</td>
                <td className="py-3">{((a.state?.load ?? 0) * 100).toFixed(0)}%</td>
                <td className="py-3 text-[var(--text-secondary)]">{a.lastHeartbeat ? new Date(a.lastHeartbeat).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
