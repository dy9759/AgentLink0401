"use client";
import { useEffect, useState } from "react";
import { listTeams } from "@/lib/hub-client";

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  useEffect(() => { listTeams().then(r => setTeams(r.teams)).catch(() => {}); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Teams</h1>
      <div className="grid grid-cols-2 gap-4">
        {teams.map((t: any) => (
          <div key={t.id} className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
            <div className="font-bold text-lg">{t.name}</div>
            {t.description && <div className="text-sm text-[var(--text-secondary)] mt-1">{t.description}</div>}
            <div className="text-sm mt-2">Leader: {t.leaderId?.slice(0, 20)}</div>
            <div className="text-sm text-[var(--text-secondary)]">{t.members?.length ?? 0} members</div>
          </div>
        ))}
        {teams.length === 0 && <div className="text-[var(--text-secondary)]">No teams</div>}
      </div>
    </div>
  );
}
