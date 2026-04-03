"use client";
import { useEffect, useState } from "react";
import { getAgent, getAgentProfile, updateAgentProfile } from "@/lib/hub-client";
import { use } from "react";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", avatar: "", bio: "", tags: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAgent(id).then(a => {
      setAgent(a);
      const p = a.profile ?? {};
      setForm({
        displayName: p.displayName ?? a.name ?? "",
        avatar: p.avatar ?? "🤖",
        bio: p.bio ?? "",
        tags: (p.tags ?? []).join(", "),
      });
    }).catch(() => {});
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateAgentProfile(id, {
        displayName: form.displayName || undefined,
        avatar: form.avatar || undefined,
        bio: form.bio || undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      const updated = await getAgent(id);
      setAgent(updated);
      setEditing(false);
    } catch {} finally { setSaving(false); }
  }

  if (!agent) return <div className="p-6 text-[var(--text-secondary)]">Loading...</div>;

  const p = agent.profile ?? {};
  const displayName = p.displayName ?? agent.name;
  const avatar = p.avatar ?? "🤖";
  const bio = p.bio ?? "";
  const tags = p.tags ?? [];
  const caps = agent.state?.capabilities ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Profile Card */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-[var(--accent)]/30 to-[var(--success)]/20" />

        {/* Avatar + Name */}
        <div className="px-6 -mt-10 pb-6">
          <div className="flex items-end gap-4 mb-4">
            <div className="text-5xl bg-[var(--bg-tertiary)] w-20 h-20 rounded-2xl flex items-center justify-center border-4 border-[var(--bg-secondary)]">
              {avatar}
            </div>
            <div className="flex-1 pb-1">
              <h1 className="text-xl font-bold">{displayName}</h1>
              <div className="text-sm text-[var(--text-secondary)]">{agent.agentId}</div>
            </div>
            <button onClick={() => setEditing(!editing)}
              className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent)]">
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {!editing ? (
            <>
              {/* View Mode */}
              {bio && <p className="text-sm mb-4">{bio}</p>}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--text-secondary)]">Type:</span> {agent.type}
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Status:</span>
                  <span className={`ml-1 ${agent.state?.status === "online" ? "text-[var(--success)]" : agent.state?.status === "busy" ? "text-[var(--warning)]" : "text-gray-400"}`}>
                    ● {agent.state?.status}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Owner:</span> {agent.ownerId?.slice(0, 15)}
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Load:</span> {((agent.state?.load ?? 0) * 100).toFixed(0)}%
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Registered:</span> {new Date(agent.registeredAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Last Active:</span> {new Date(agent.lastHeartbeat).toLocaleString()}
                </div>
              </div>

              {/* Capabilities */}
              {caps.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Capabilities</div>
                  <div className="flex flex-wrap gap-1">
                    {caps.map((c: string) => (
                      <span key={c} className="px-2 py-0.5 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 text-xs bg-[var(--success)]/20 text-[var(--success)] rounded">#{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Edit Mode */
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Display Name</label>
                <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Avatar (emoji or URL)</label>
                <input value={form.avatar} onChange={e => setForm({ ...form, avatar: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Bio</label>
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="backend, python, senior" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50">
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
