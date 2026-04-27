import { apiRequest } from "@/lib/api";
import { MainNav } from "@/components/main-nav";
import type { ApiEnvelope } from "@ai-kb/shared";

type KnowledgeBaseItem = {
  id: string;
  name: string;
  documentCount: number;
};

async function getKnowledgeBases() {
  try {
    // This page uses a Server Component request so data is ready on first render.
    // `cache: "no-store"` is helpful during development because every refresh
    // shows the latest backend response instead of a cached snapshot.
    const response = await apiRequest<ApiEnvelope<KnowledgeBaseItem[]>>("/knowledge-bases", {
      cache: "no-store"
    });

    return {
      data: response.data,
      error: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      data: [],
      error: message
    };
  }
}

export default async function KnowledgePage() {
  const { data, error } = await getKnowledgeBases();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MainNav />

      <section className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold">Knowledge Base</h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
          这个页面现在已经不是写死的演示数据了，而是会真实请求 NestJS 的
          <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-sm">/api/knowledge-bases</code>
          接口。
        </p>
      </section>

      {error ? (
        <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <h2 className="text-xl font-semibold">接口请求失败</h2>
          <p className="mt-3 leading-7">
            当前无法从后端获取知识库列表，请确认 `api` 服务仍然在运行。
          </p>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4">
        {data.map((base) => (
          <article key={base.id} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{base.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{base.documentCount} 篇文档</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">已从后端读取</span>
            </div>
          </article>
        ))}
      </section>

      {!error && data.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-[var(--border)] bg-slate-50 p-6 text-[var(--muted)]">
          当前还没有知识库数据，后续你接上 Prisma 查询后，这里会展示数据库里的真实记录。
        </section>
      ) : null}
    </main>
  );
}
