"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listSessions } from "@/lib/hub-client";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  useEffect(() => { listSessions().then(r => setSessions(r.sessions)).catch(() => {}); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sessions</h1>
      <div className="space-y-2">
        {sessions.map((s: any) => (
          <Link key={s.id} href={`/sessions/${s.id}`} className="block bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)]">
            <div className="flex justify-between">
              <span className="font-medium">{s.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${s.status === "active" ? "bg-[var(--success)]/20 text-[var(--success)]" : s.status === "completed" ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-gray-500/20"}`}>{s.status}</span>
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">Turn {s.currentTurn}/{s.maxTurns} - {s.participants?.length ?? 0} participants</div>
          </Link>
        ))}
        {sessions.length === 0 && <div className="text-[var(--text-secondary)]">No sessions</div>}
      </div>
    </div>
  );
}
