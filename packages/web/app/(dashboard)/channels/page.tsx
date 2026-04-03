"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listChannels, createChannel } from "@/lib/hub-client";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { listChannels().then(r => setChannels(r.channels)).catch(() => {}); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createChannel({ name: newName.trim().toLowerCase() });
      setNewName("");
      const r = await listChannels();
      setChannels(r.channels);
    } catch (err: any) {
      setError(err.message || "Failed to create channel");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Channels</h1>
      <form onSubmit={handleCreate} className="flex gap-2 mb-4 items-start">
        <div className="flex-1">
          <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="new-channel-name" />
          {error && <div className="text-xs text-[var(--error)] mt-1">{error}</div>}
        </div>
        <button type="submit" disabled={creating || !newName.trim()} className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded text-sm font-medium disabled:opacity-50 hover:bg-[var(--accent-hover)]">
          {creating ? "Creating..." : "Create"}
        </button>
      </form>
      <div className="space-y-2">
        {channels.map((ch: any) => (
          <Link key={ch.name} href={`/channels/${ch.name}`} className="block bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition">
            <span className="font-medium">#{ch.name}</span>
            {ch.description && <span className="text-sm text-[var(--text-secondary)] ml-2">{ch.description}</span>}
          </Link>
        ))}
        {channels.length === 0 && <div className="text-[var(--text-secondary)]">No channels yet. Create one above!</div>}
      </div>
    </div>
  );
}
