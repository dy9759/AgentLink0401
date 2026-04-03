"use client";
import { useEffect, useState } from "react";
import { listTasks } from "@/lib/hub-client";

const COLUMNS = ["pending", "assigned", "running", "done", "failed"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  useEffect(() => { listTasks().then(r => setTasks(r.tasks)).catch(() => {}); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <div key={col} className="min-w-[250px] bg-[var(--bg-secondary)] rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-3 uppercase text-[var(--text-secondary)]">{col} ({tasks.filter(t => t.status === col).length})</h3>
            <div className="space-y-2">
              {tasks.filter(t => t.status === col).map(task => (
                <div key={task.id} className="bg-[var(--bg-tertiary)] p-3 rounded border border-[var(--border)]">
                  <div className="text-sm font-medium">{task.type}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{task.id.slice(0, 15)}...</div>
                  {task.assignedTo && <div className="text-xs text-[var(--accent)] mt-1">Assigned: {task.assignedTo.slice(0, 15)}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
