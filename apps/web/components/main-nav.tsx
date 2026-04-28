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
    <nav className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-strong)]">
          AI KB
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          构建面向企业知识运营的 AI 知识中枢
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          聚合文档、检索、问答与会话留痕，让团队在统一界面里完成知识沉淀与问题响应。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-2 shadow-[0_18px_40px_rgba(28,24,17,0.06)] backdrop-blur">
        {links.map((link) => {
          const isActive =
            link.href === "/" ? pathname === link.href : pathname?.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[var(--foreground)] text-white shadow-[0_10px_25px_rgba(22,22,22,0.18)]"
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
