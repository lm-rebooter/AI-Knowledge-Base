const links = [
  { href: "/", label: "首页" },
  { href: "/dashboard", label: "工作台" },
  { href: "/knowledge", label: "知识库" },
  { href: "/chat", label: "对话" },
  { href: "/login", label: "登录" }
];

export function MainNav() {
  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xl font-bold">AI KB</p>
        <p className="text-sm text-[var(--muted)]">前端到全栈的练手仓库</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm shadow-sm"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
