import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "AgentMesh", description: "Agent Communication Network" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg-primary)]">{children}</body>
    </html>
  );
}
