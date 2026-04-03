"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [hubUrl, setHubUrl] = useState("http://192.168.50.119:5555");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubUrl: hubUrl.replace(/\/$/, ""), apiKey }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleLogin} className="bg-[var(--bg-secondary)] p-8 rounded-xl w-[400px] space-y-4">
        <h1 className="text-2xl font-bold text-center">AgentMesh</h1>
        <p className="text-sm text-[var(--text-secondary)] text-center">Connect to your Hub server</p>
        {error && <div className="bg-[var(--error)]/10 text-[var(--error)] p-3 rounded text-sm">{error}</div>}
        <div>
          <label className="text-sm text-[var(--text-secondary)]">Hub URL</label>
          <input value={hubUrl} onChange={e => setHubUrl(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="http://192.168.50.119:5555" />
        </div>
        <div>
          <label className="text-sm text-[var(--text-secondary)]">API Key</label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="amk_..." />
        </div>
        <button type="submit" disabled={loading} className="w-full py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
          {loading ? "Connecting..." : "Connect"}
        </button>
      </form>
    </div>
  );
}
