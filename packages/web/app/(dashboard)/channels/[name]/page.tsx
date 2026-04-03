"use client";
import { useEffect, useState, useRef } from "react";
import { getChannelMessages, sendInteraction, uploadFile } from "@/lib/hub-client";
import { use } from "react";

export default function ChannelDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      loadMessages();
    } catch {} finally { setSending(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");

    try {
      for (const file of Array.from(files)) {
        // Upload file to Hub
        const uploaded = await uploadFile(file);

        // Send message to channel with file info
        await sendInteraction({
          type: "message",
          contentType: "json",
          target: { channel: name },
          payload: {
            text: `📎 ${file.name}`,
            data: {
              fileId: uploaded.id,
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type || "application/octet-stream",
            },
          },
        });
      }
      loadMessages();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <h1 className="font-bold text-lg">#{name}</h1>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className="bg-[var(--bg-secondary)] p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--accent)]">{msg.fromId?.slice(0, 20)}</span>
              <span className="text-xs text-[var(--text-secondary)]">{new Date(msg.createdAt).toLocaleString()}</span>
            </div>
            {/* Text message */}
            {msg.payload?.text && !msg.payload?.data?.fileId && (
              <div className="text-sm">{msg.payload.text}</div>
            )}
            {/* File attachment */}
            {msg.payload?.data?.fileId && (
              <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-2 rounded mt-1">
                <span className="text-lg">📎</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/api/hub/files/${msg.payload.data.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--accent)] hover:underline truncate block"
                  >
                    {msg.payload.data.fileName || "file"}
                  </a>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {msg.payload.data.fileSize ? formatFileSize(msg.payload.data.fileSize) : ""}
                  </span>
                </div>
                <a
                  href={`/api/hub/files/${msg.payload.data.fileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded hover:bg-[var(--accent)]/30"
                >
                  Download
                </a>
              </div>
            )}
            {/* File from payload.file (inline file attachment) */}
            {msg.payload?.file && (
              <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-2 rounded mt-1">
                <span className="text-lg">📄</span>
                <div className="flex-1">
                  <div className="text-sm">{msg.payload.file.fileName}</div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatFileSize(msg.payload.file.size)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && <div className="text-[var(--text-secondary)] text-center mt-8">No messages yet. Start the conversation!</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[var(--border)]">
        {uploadError && <div className="text-xs text-[var(--error)] mb-2">{uploadError}</div>}
        {uploading && <div className="text-xs text-[var(--accent)] mb-2">Uploading file...</div>}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded"
            placeholder={`Message #${name}...`}
          />
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent)] disabled:opacity-50"
            title="Upload file"
          >
            📎
          </button>
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-tertiary)] rounded font-medium disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
