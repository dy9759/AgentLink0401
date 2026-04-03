"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listChannels, createChannel } from "@/lib/hub-client";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => { listChannels().then(r => setChannels(r.channels)).catch(() => {}); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return;
    try {
      await createChannel({ name: newName });
      setNewName("");
      listChannels().then(r => setChannels(r.channels));
    } catch {}
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Channels</h1>
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="new-channel" />
        <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded text-sm">Create</button>
      </form>
      <div className="space-y-2">
        {channels.map((ch: any) => (
          <Link key={ch.name} href={`/channels/${ch.name}`} className="block bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)]">
            <span className="font-medium">#{ch.name}</span>
            {ch.description && <span className="text-sm text-[var(--text-secondary)] ml-2">{ch.description}</span>}
          </Link>
        ))}
        {channels.length === 0 && <div className="text-[var(--text-secondary)]">No channels</div>}
      </div>
    </div>
  );
}
