import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-10 lg:px-8">
      <section className="w-full rounded-[40px] border border-[var(--border)] bg-[rgba(255,255,255,0.76)] p-10 shadow-[0_28px_70px_rgba(31,26,20,0.08)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">页面不存在了</h1>
        <p className="mt-4 max-w-2xl leading-8 text-[var(--muted)]">
          这个知识库可能已经被删除，或者地址已经失效。你可以返回知识库列表继续浏览其他内容。
        </p>
        <div className="mt-8">
          <Link
            className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            href="/knowledge"
          >
            返回知识库列表
          </Link>
        </div>
      </section>
    </main>
  );
}
