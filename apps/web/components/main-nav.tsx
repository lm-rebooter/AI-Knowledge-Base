"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "首页" },
  { href: "/dashboard", label: "工作台" },
  { href: "/knowledge", label: "知识库" },
  { href: "/chat", label: "对话" },
  { href: "/login", label: "登录" }
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex items-center justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] px-4 py-3 shadow-[0_10px_30px_rgba(28,24,17,0.05)] backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-full bg-[var(--foreground)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white">
          AI KB
        </div>
        <p className="truncate text-sm font-medium text-[var(--muted)]">企业 AI 知识库</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full bg-white/70 p-1">
        {links.map((link) => {
          const isActive =
            link.href === "/" ? pathname === link.href : pathname?.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[var(--foreground)] text-white shadow-[0_8px_20px_rgba(22,22,22,0.14)]"
                  : "text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
