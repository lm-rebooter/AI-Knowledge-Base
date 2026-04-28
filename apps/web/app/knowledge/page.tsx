import { apiRequest } from "@/lib/api";
import { CreateKnowledgeBaseForm } from "@/components/create-knowledge-base-form";
import { CreateDocumentForm } from "@/components/create-document-form";
import { MainNav } from "@/components/main-nav";
import Link from "next/link";
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

      <section className="rounded-[36px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-8 shadow-[0_24px_60px_rgba(31,26,20,0.08)] backdrop-blur">
        <h1 className="text-4xl font-semibold tracking-[-0.05em]">知识库总览</h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
          在这里管理知识库、录入文档和进入详情页处理具体内容。当前列表直接读取后端实时数据。
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

      <CreateKnowledgeBaseForm />
      <CreateDocumentForm
        knowledgeBases={data.map((knowledgeBase) => ({
          id: knowledgeBase.id,
          name: knowledgeBase.name
        }))}
      />

      <section className="mt-8 grid gap-4">
        {data.map((base) => (
          <article key={base.id} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  <Link className="hover:underline" href={`/knowledge/${base.id}`}>
                    {base.name}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{base.documentCount} 篇文档</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">已从后端读取</span>
                <Link
                  className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-sm"
                  href={`/knowledge/${base.id}`}
                >
                  查看详情
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!error && data.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-[var(--border)] bg-slate-50 p-6 text-[var(--muted)]">
          当前还没有知识库数据。创建第一个知识库后，这里会开始显示团队知识资产。
        </section>
      ) : null}
    </main>
  );
}
