import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-3xl border border-[var(--border)] bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">404</p>
        <h1 className="mt-4 text-4xl font-bold">页面不存在了</h1>
        <p className="mt-4 max-w-2xl leading-8 text-[var(--muted)]">
          这个知识库可能已经被删除，或者地址已经失效。你可以返回知识库列表继续浏览其他内容。
        </p>
        <div className="mt-8">
          <Link
            className="inline-flex rounded-2xl bg-[var(--brand)] px-5 py-3 font-semibold text-white"
            href="/knowledge"
          >
            返回知识库列表
          </Link>
        </div>
      </section>
    </main>
  );
}
