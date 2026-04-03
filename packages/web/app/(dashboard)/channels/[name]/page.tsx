"use client";
import { useEffect, useState, useRef } from "react";
import { getChannelMessages, getChannelMembers, sendInteraction, uploadFile } from "@/lib/hub-client";
import { use } from "react";

// File type icon mapping
function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗", csv: "📗",
    ppt: "📙", pptx: "📙", txt: "📄", md: "📝", json: "📋", xml: "📋",
    ts: "🟦", tsx: "🟦", js: "🟨", jsx: "🟨", py: "🐍", rs: "🦀",
    go: "🔵", java: "☕", html: "🌐", css: "🎨", svg: "🖼️",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", webp: "🖼️",
    mp4: "🎬", mp3: "🎵", wav: "🎵", zip: "📦", tar: "📦", gz: "📦",
  };
  return map[ext] ?? "📄";
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChannelDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function loadMessages() {
    getChannelMessages(name).then(r => {
      setMessages(r.interactions ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }).catch(() => {});
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [name]);

  useEffect(() => {
    getChannelMembers(name).then(r => setMembers(r.members ?? [])).catch(() => {});
  }, [name]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      await sendInteraction({
        type: "message",
        contentType: "text",
        target: { channel: name },
        payload: { text: input },
      });
      setInput("");
      setShowMentions(false);
      loadMessages();
    } catch {} finally { setSending(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setUploadError("");
    setUploadProgress([]);

    const files = Array.from(fileList);
    const totalCount = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Show relative path for folder uploads
        const displayName = (file as any).webkitRelativePath || file.name;
        setUploadProgress(prev => [...prev, `Uploading ${i + 1}/${totalCount}: ${displayName}`]);

        const uploaded = await uploadFile(file);
        await sendInteraction({
          type: "message",
          contentType: "json",
          target: { channel: name },
          payload: {
            text: `📎 ${displayName}`,
            data: {
              fileId: uploaded.id,
              fileName: displayName,
              fileSize: file.size,
              contentType: file.type || "application/octet-stream",
              isFolder: !!(file as any).webkitRelativePath,
              relativePath: (file as any).webkitRelativePath || undefined,
            },
          },
        });
      }
      setUploadProgress([`✅ ${totalCount} file${totalCount > 1 ? "s" : ""} uploaded successfully`]);
      setTimeout(() => setUploadProgress([]), 3000);
      loadMessages();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && lastAt === val.length - 1) {
      setShowMentions(true);
      setMentionFilter("");
    } else if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(" ")) {
        setShowMentions(true);
        setMentionFilter(afterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(memberName: string) {
    const lastAt = input.lastIndexOf("@");
    const before = input.slice(0, lastAt);
    setInput(`${before}@${memberName} `);
    setShowMentions(false);
  }

  const filteredMembers = members.filter(m => !mentionFilter || m.name?.toLowerCase().includes(mentionFilter));

  // Count files in channel
  const fileMessages = messages.filter(m => m.payload?.data?.fileId || m.payload?.file);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-lg">#{name}</h1>
          {fileMessages.length > 0 && (
            <span className="text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded text-[var(--text-secondary)]">
              📎 {fileMessages.length} file{fileMessages.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button onClick={() => setShowMembers(!showMembers)}
          className={`px-3 py-1.5 text-sm border rounded transition ${showMembers ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-[var(--accent)]"}`}>
          👥 {members.length}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map(msg => {
              const hasFile = msg.payload?.data?.fileId;
              const hasInlineFile = msg.payload?.file;
              const isFile = hasFile || hasInlineFile;
              const fData = msg.payload?.data ?? {};
              const fInline = msg.payload?.file ?? {};

              return (
                <div key={msg.id} className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                  {/* Sender info */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--accent)]">
                      {members.find(m => m.agentId === msg.fromId)?.name ?? msg.fromId?.slice(0, 20)}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>

                  {/* Text-only message */}
                  {msg.payload?.text && !isFile && (
                    <div className="text-sm whitespace-pre-wrap">{msg.payload.text}</div>
                  )}

                  {/* File attachment card (uploaded via Hub) */}
                  {hasFile && (
                    <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg p-3 mt-1 hover:border-[var(--accent)]/50 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{fileIcon(fData.fileName ?? "file")}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{fData.fileName ?? "file"}</div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                            {fData.fileSize > 0 && <span>{formatFileSize(fData.fileSize)}</span>}
                            {fData.contentType && <span>• {fData.contentType.split("/").pop()}</span>}
                            {fData.relativePath && <span>• 📁 {fData.relativePath.split("/").slice(0, -1).join("/")}</span>}
                          </div>
                        </div>
                        <a
                          href={`/api/hub/files/${fData.fileId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium hover:bg-[var(--accent-hover)] transition"
                        >
                          ⬇ Download
                        </a>
                      </div>
                      {/* Preview for images */}
                      {fData.contentType?.startsWith("image/") && (
                        <div className="mt-2 rounded overflow-hidden max-w-sm">
                          <img src={`/api/hub/files/${fData.fileId}`} alt={fData.fileName} className="max-h-48 object-contain" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline file (base64 from payload.file) */}
                  {hasInlineFile && !hasFile && (
                    <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg p-3 mt-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{fileIcon(fInline.fileName ?? "file")}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{fInline.fileName}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{formatFileSize(fInline.size)}</div>
                        </div>
                        {fInline.fileId && (
                          <a href={`/api/hub/files/${fInline.fileId}`} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium">
                            ⬇ Download
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {messages.length === 0 && <div className="text-[var(--text-secondary)] text-center mt-8">No messages yet. Start the conversation!</div>}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-[var(--border)]">
            {/* Upload progress */}
            {uploadProgress.length > 0 && (
              <div className="mb-2 space-y-1">
                {uploadProgress.map((p, i) => (
                  <div key={i} className={`text-xs ${p.startsWith("✅") ? "text-[var(--success)]" : "text-[var(--accent)]"}`}>{p}</div>
                ))}
              </div>
            )}
            {uploadError && <div className="text-xs text-[var(--error)] mb-2">{uploadError}</div>}

            <form onSubmit={handleSend} className="flex gap-2 relative">
              {/* @mention dropdown */}
              {showMentions && (
                <div className="absolute bottom-full mb-1 left-0 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-xl max-h-48 overflow-auto w-64 z-50">
                  {filteredMembers.map(m => (
                    <button key={m.agentId} type="button" onClick={() => insertMention(m.name)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--bg-tertiary)] flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full ${m.status === "online" ? "bg-[var(--success)]" : "bg-gray-500"}`} />
                      <span>{m.name}</span>
                      <span className="text-xs text-[var(--text-secondary)] ml-auto">{m.type}</span>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">No matching members</div>
                  )}
                </div>
              )}

              <input
                value={input}
                onChange={handleInputChange}
                className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded"
                placeholder={`Message #${name}... (type @ to mention)`}
              />

              {/* File upload button */}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              {/* Folder upload button */}
              <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleFileUpload}
                {...{ webkitdirectory: "", directory: "" } as any} />

              <div className="flex gap-1">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent)] disabled:opacity-50"
                  title="Upload files">
                  📎
                </button>
                <button type="button" onClick={() => folderInputRef.current?.click()} disabled={uploading}
                  className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent)] disabled:opacity-50"
                  title="Upload folder">
                  📁
                </button>
              </div>

              <button type="submit" disabled={sending || !input.trim()}
                className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50 hover:bg-[var(--accent-hover)]">
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Members sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-auto p-4">
            <h3 className="font-semibold text-sm mb-3">Members ({members.length})</h3>
            {members.map(m => (
              <div key={m.agentId} className="flex items-center gap-2 py-2 border-b border-[var(--border)]/30">
                <span className={`w-2 h-2 rounded-full ${m.status === "online" ? "bg-[var(--success)]" : m.status === "busy" ? "bg-[var(--warning)]" : "bg-gray-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{m.type}</div>
                  {m.capabilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.capabilities.map((c: string) => (
                        <span key={c} className="text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
