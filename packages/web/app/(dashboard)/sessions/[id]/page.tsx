"use client";
import { useEffect, useState, useRef } from "react";
import { getSession, getSessionMessages, getSessionSummary, sendInteraction, startAutoDiscussion, stopAutoDiscussion } from "@/lib/hub-client";
import { use } from "react";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadData() {
    getSession(id).then(setSession).catch(() => {});
    getSessionMessages(id).then(r => {
      setMessages(r.messages ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }).catch(() => {});
  }

  useEffect(() => {
    loadData();
    getSessionSummary(id).then(setSummary).catch(() => {});
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !session) return;
    // Send to first other participant
    const other = session.participants?.find((p: any) => p.role !== "creator");
    if (!other) return;
    setSending(true);
    try {
      const target: any = { sessionId: id };
      if (other.type === "agent") target.agentId = other.id;
      else target.ownerId = other.id;
      await sendInteraction({
        type: "message",
        contentType: "text",
        target,
        payload: { text: input },
      });
      setInput("");
      loadData();
    } catch {} finally { setSending(false); }
  }

  async function handleAutoStart() {
    try {
      await startAutoDiscussion(id);
      setAutoRunning(true);
    } catch (err: any) {
      alert(err.message || "Failed to start auto-discussion");
    }
  }

  async function handleAutoStop() {
    try {
      await stopAutoDiscussion(id);
      setAutoRunning(false);
    } catch {}
  }

  const isCompleted = session?.status === "completed" || session?.status === "failed" || session?.status === "archived";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">{session?.title ?? "Session"}</h1>
          <div className="flex gap-3 text-xs text-[var(--text-secondary)] mt-1">
            <span className={`px-2 py-0.5 rounded ${session?.status === "active" ? "bg-[var(--success)]/20 text-[var(--success)]" : session?.status === "completed" ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-gray-500/20"}`}>
              {session?.status}
            </span>
            <span>Turn {session?.currentTurn ?? 0}/{session?.maxTurns ?? "?"}</span>
            <span>{session?.participants?.length ?? 0} participants</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!isCompleted && (
            autoRunning ? (
              <button onClick={handleAutoStop} className="px-3 py-1.5 text-sm bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/30 rounded hover:bg-[var(--error)]/30">
                ⏹ Stop Auto
              </button>
            ) : (
              <button onClick={handleAutoStart} className="px-3 py-1.5 text-sm bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30 rounded hover:bg-[var(--success)]/30">
                ▶ Auto Discussion
              </button>
            )
          )}
          <button onClick={() => setShowContext(!showContext)} className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent)]">
            {showContext ? "Hide Context" : "Show Context"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={msg.id} className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">T{i + 1}</span>
                  <span className="text-sm font-medium text-[var(--accent)]">{msg.fromId?.slice(0, 20)}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{new Date(msg.createdAt).toLocaleString()}</span>
                  {msg.type !== "message" && <span className="text-xs bg-[var(--warning)]/20 text-[var(--warning)] px-1.5 py-0.5 rounded">{msg.type}</span>}
                </div>
                <div className="text-sm">{msg.payload?.text}</div>
              </div>
            ))}
            {messages.length === 0 && <div className="text-[var(--text-secondary)] text-center mt-8">No messages yet</div>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!isCompleted ? (
            <form onSubmit={handleSend} className="p-4 border-t border-[var(--border)] flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded" placeholder="Continue the discussion..." />
              <button type="submit" disabled={sending} className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50">Send</button>
            </form>
          ) : (
            <div className="p-4 border-t border-[var(--border)] text-center text-[var(--text-secondary)] text-sm">Session {session?.status}. No more messages can be sent.</div>
          )}
        </div>

        {/* Context Sidebar */}
        {showContext && (
          <div className="w-80 border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-auto p-4 space-y-4">
            <h3 className="font-semibold text-sm">Shared Context</h3>

            {session?.context?.topic && (
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1">Topic</div>
                <div className="text-sm">{session.context.topic}</div>
              </div>
            )}

            {session?.context?.summary && (
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1">Summary</div>
                <div className="text-sm">{session.context.summary}</div>
              </div>
            )}

            {session?.context?.decisions?.length > 0 && (
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1">Decisions ({session.context.decisions.length})</div>
                {session.context.decisions.map((d: any, i: number) => (
                  <div key={i} className="text-sm bg-[var(--bg-tertiary)] p-2 rounded mb-1">✅ {d.decision}</div>
                ))}
              </div>
            )}

            {session?.context?.codeSnippets?.length > 0 && (
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1">Code Snippets ({session.context.codeSnippets.length})</div>
                {session.context.codeSnippets.map((s: any, i: number) => (
                  <div key={i} className="mb-2">
                    <div className="text-xs text-[var(--accent)]">{s.language} — {s.description}</div>
                    <pre className="text-xs bg-[var(--bg-tertiary)] p-2 rounded mt-1 overflow-auto">{s.code.slice(0, 200)}</pre>
                  </div>
                ))}
              </div>
            )}

            {session?.context?.files?.length > 0 && (
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1">Files ({session.context.files.length})</div>
                {session.context.files.map((f: any, i: number) => (
                  <div key={i} className="text-sm bg-[var(--bg-tertiary)] p-2 rounded mb-1">📄 {f.name}</div>
                ))}
              </div>
            )}

            {/* Summary stats */}
            {summary && (
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1">Participant Stats</div>
                {summary.participants?.map((p: any) => (
                  <div key={p.id} className="text-sm flex justify-between">
                    <span>{p.id.slice(0, 18)}</span>
                    <span className="text-[var(--text-secondary)]">{p.messageCount} msgs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
