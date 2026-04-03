"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"apikey" | "password">("password");
  const [hubUrl, setHubUrl] = useState("http://localhost:5555");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "password" ? "/api/auth/login-password" : "/api/auth/login";
      const body = mode === "password"
        ? { hubUrl: hubUrl.replace(/\/$/, ""), username, password }
        : { hubUrl: hubUrl.replace(/\/$/, ""), apiKey };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 502) {
          setError("Cannot connect to Hub. Check if it's running.");
        } else if (res.status === 401) {
          setError(mode === "password" ? "Invalid username or password" : "Invalid API Key");
        } else {
          setError(data.error || "Login failed");
        }
        return;
      }
      router.push("/");
    } catch (err: any) {
      setError("Network error: " + (err.message || "Cannot reach server"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubUrl: hubUrl.replace(/\/$/, ""),
          name: registerName || username,
          username,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      // Auto-login after register
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-[var(--bg-secondary)] p-8 rounded-xl w-[420px] space-y-4">
        <h1 className="text-2xl font-bold text-center">AgentMesh</h1>
        <p className="text-sm text-[var(--text-secondary)] text-center">
          {showRegister ? "Create a new account" : "Connect to your Hub server"}
        </p>

        {error && <div className="bg-[var(--error)]/10 text-[var(--error)] p-3 rounded text-sm">{error}</div>}

        {/* Hub URL (always shown) */}
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Hub URL</label>
          <input value={hubUrl} onChange={e => setHubUrl(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm"
            placeholder="http://localhost:5555" />
        </div>

        {!showRegister ? (
          <>
            {/* Login mode tabs */}
            <div className="flex gap-1 bg-[var(--bg-tertiary)] rounded p-0.5">
              <button type="button" onClick={() => setMode("password")}
                className={`flex-1 py-1.5 text-xs rounded ${mode === "password" ? "bg-[var(--accent)] text-[var(--bg-tertiary)]" : "text-[var(--text-secondary)]"}`}>
                Username / Password
              </button>
              <button type="button" onClick={() => setMode("apikey")}
                className={`flex-1 py-1.5 text-xs rounded ${mode === "apikey" ? "bg-[var(--accent)] text-[var(--bg-tertiary)]" : "text-[var(--text-secondary)]"}`}>
                API Key
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              {mode === "password" ? (
                <>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)]">Username</label>
                    <input value={username} onChange={e => setUsername(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="your-username" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)]">Password</label>
                    <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                      className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs text-[var(--text-secondary)]">API Key</label>
                  <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password"
                    className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="amk_..." />
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
                {loading ? "Connecting..." : "Login"}
              </button>
            </form>

            <div className="text-center">
              <button onClick={() => setShowRegister(true)} className="text-xs text-[var(--accent)] hover:underline">
                Don't have an account? Register
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Register form */}
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Display Name</label>
                <input value={registerName} onChange={e => setRegisterName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="Your Name" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="your-username" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm" placeholder="At least 6 characters" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2 bg-[var(--success)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50">
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>

            <div className="text-center">
              <button onClick={() => setShowRegister(false)} className="text-xs text-[var(--accent)] hover:underline">
                Already have an account? Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
