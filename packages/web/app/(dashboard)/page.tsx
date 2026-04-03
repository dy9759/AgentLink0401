"use client";
import { useEffect, useState } from "react";
import { getHealth, listAgents, listTasks, listSessions } from "@/lib/hub-client";

export default function DashboardPage() {
  const [health, setHealth] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getHealth().catch(() => null),
      listAgents().catch(() => ({ agents: [] })),
      listTasks().catch(() => ({ tasks: [] })),
      listSessions().catch(() => ({ sessions: [] })),
    ]).then(([h, a, t, s]) => {
      setHealth(h);
      setAgents(a?.agents ?? []);
      setTasks(t?.tasks ?? []);
      setSessions(s?.sessions ?? []);
    }).catch(e => setError(e.message));
  }, []);

  const online = agents.filter(a => a.state?.status === "online").length;
  const busy = agents.filter(a => a.state?.status === "busy").length;
  const activeSessions = sessions.filter(s => s.status === "active").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {error && <div className="bg-[var(--error)]/10 text-[var(--error)] p-3 rounded">{error}</div>}

      {/* Status cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Hub Status" value={health?.status === "ok" ? "Online" : "Offline"} />
        <StatCard label="Agents Online" value={`${online} / ${agents.length}`} sub={busy > 0 ? `${busy} busy` : undefined} />
        <StatCard label="Active Sessions" value={String(activeSessions)} />
        <StatCard label="Pending Tasks" value={String(pendingTasks)} />
      </div>

      {/* Agent list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Agents</h2>
        <div className="grid grid-cols-3 gap-3">
          {agents.map(agent => (
            <div key={agent.agentId} className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${agent.state?.status === "online" ? "bg-[var(--success)]" : agent.state?.status === "busy" ? "bg-[var(--warning)]" : "bg-gray-500"}`} />
                <span className="font-medium">{agent.name}</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">{agent.type} - {agent.state?.capabilities?.join(", ") || "no capabilities"}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">ID: {agent.agentId.slice(0, 15)}...</div>
            </div>
          ))}
          {agents.length === 0 && <div className="text-[var(--text-secondary)] col-span-3">No agents registered</div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-[var(--text-secondary)] mt-1">{sub}</div>}
    </div>
  );
}
