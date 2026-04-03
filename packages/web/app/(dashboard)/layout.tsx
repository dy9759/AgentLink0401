"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-16 bg-[var(--bg-tertiary)] flex flex-col items-center py-4 gap-2">
        <div className="text-xl mb-4 font-bold text-[var(--accent)]">AM</div>
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:bg-[var(--bg-secondary)] ${pathname === item.href ? "bg-[var(--accent)] text-[var(--bg-tertiary)]" : "text-[var(--text-secondary)]"}`}
            title={item.label}>
            {item.icon}
          </Link>
        ))}
      </nav>
      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
