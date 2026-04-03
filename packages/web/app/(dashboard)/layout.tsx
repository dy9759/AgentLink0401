"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyAgents } from "@/lib/hub-client";

const NAV_ITEMS = [
  { href: "/", icon: "D", label: "Dashboard" },
  { href: "/chat", icon: "C", label: "Chat" },
  { href: "/agents", icon: "A", label: "Agents" },
  { href: "/channels", icon: "#", label: "Channels" },
  { href: "/tasks", icon: "T", label: "Tasks" },
  { href: "/sessions", icon: "S", label: "Sessions" },
  { href: "/teams", icon: "G", label: "Teams" },
  { href: "/files", icon: "F", label: "Files" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [identity, setIdentity] = useState<string>("owner");
  const [currentAgentId, setCurrentAgentId] = useState<string>("");
  const [showSwitcher, setShowSwitcher] = useState(false);

  useEffect(() => {
    const hasOwner = document.cookie.split("; ").some(c => c.startsWith("owner_id="));
    if (!hasOwner) {
      router.replace("/login");
    } else {
      setAuthenticated(true);
      // Load identity state from cookie
      const idCookie = document.cookie.split("; ").find(c => c.startsWith("identity="))?.split("=")[1];
      const agentCookie = document.cookie.split("; ").find(c => c.startsWith("agent_id="))?.split("=")[1];
      if (idCookie) setIdentity(idCookie);
      if (agentCookie) setCurrentAgentId(agentCookie);
      // Load my agents
      getMyAgents().then(r => setMyAgents(r.agents ?? [])).catch(() => {});
    }
  }, [router]);

  async function switchToOwner() {
    await fetch("/api/auth/switch-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: "owner" }),
    });
    setIdentity("owner");
    setCurrentAgentId("");
    setShowSwitcher(false);
    router.refresh();
  }

  async function switchToAgent(agentId: string) {
    const res = await fetch("/api/auth/switch-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: "agent", agentId }),
    });
    if (res.ok) {
      setIdentity("agent");
      setCurrentAgentId(agentId);
      setShowSwitcher(false);
      router.refresh();
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (authenticated === null) {
    return <div className="flex items-center justify-center h-screen text-[var(--text-secondary)]">Loading...</div>;
  }

  const currentAgent = myAgents.find(a => a.agentId === currentAgentId);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-16 bg-[var(--bg-tertiary)] flex flex-col items-center py-4 gap-2 relative">
        <div className="text-xl mb-2 font-bold text-[var(--accent)]">AM</div>

        {/* Identity indicator */}
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all border-2 ${
            identity === "agent" ? "border-[var(--success)] bg-[var(--success)]/20 text-[var(--success)]" : "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
          }`}
          title={identity === "agent" ? `Agent: ${currentAgent?.name ?? currentAgentId.slice(0, 8)}` : "Owner mode"}
        >
          {identity === "agent" ? "🤖" : "👤"}
        </button>

        <div className="w-8 border-t border-[var(--border)] my-1" />

        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:bg-[var(--bg-secondary)] ${pathname === item.href ? "bg-[var(--accent)] text-[var(--bg-tertiary)]" : "text-[var(--text-secondary)]"}`}
            title={item.label}>
            {item.icon}
          </Link>
        ))}

        <div className="flex-1" />
        <button onClick={handleLogout} className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-[var(--error)] hover:bg-[var(--bg-secondary)] transition-all" title="Logout">✕</button>

        {/* Identity Switcher Popup */}
        {showSwitcher && (
          <div className="absolute left-16 top-12 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-xl w-56 z-50 p-3">
            <div className="text-xs text-[var(--text-secondary)] mb-2 font-semibold">Switch Identity</div>

            {/* Owner option */}
            <button
              onClick={switchToOwner}
              className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${identity === "owner" ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "hover:bg-[var(--bg-tertiary)]"}`}
            >
              👤 <span>Owner</span>
              {identity === "owner" && <span className="ml-auto text-xs">✓</span>}
            </button>

            {/* Agent options */}
            {myAgents.length > 0 && (
              <div className="border-t border-[var(--border)] mt-2 pt-2">
                <div className="text-xs text-[var(--text-secondary)] mb-1">Your Agents</div>
                {myAgents.map(agent => (
                  <button
                    key={agent.agentId}
                    onClick={() => switchToAgent(agent.agentId)}
                    className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${currentAgentId === agent.agentId ? "bg-[var(--success)]/20 text-[var(--success)]" : "hover:bg-[var(--bg-tertiary)]"}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${agent.state?.status === "online" ? "bg-[var(--success)]" : "bg-gray-500"}`} />
                    <span className="truncate">{agent.name}</span>
                    {currentAgentId === agent.agentId && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {myAgents.length === 0 && (
              <div className="text-xs text-[var(--text-secondary)] mt-2">No agents registered yet</div>
            )}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Identity banner */}
        {identity === "agent" && (
          <div className="bg-[var(--success)]/10 border-b border-[var(--success)]/30 px-4 py-1.5 text-xs text-[var(--success)] flex items-center gap-2">
            🤖 Acting as <strong>{currentAgent?.name ?? currentAgentId}</strong>
            <button onClick={switchToOwner} className="ml-auto underline">Switch back to Owner</button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
