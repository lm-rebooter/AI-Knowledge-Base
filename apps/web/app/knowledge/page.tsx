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
    <main className="mx-auto max-w-7xl px-5 py-5 lg:px-8 lg:py-6">
      <MainNav />

      <section className="rounded-[30px] border border-[var(--border)] bg-[rgba(255,255,255,0.7)] p-5 shadow-[0_20px_50px_rgba(31,26,20,0.08)] backdrop-blur lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-strong)]">
              Knowledge Spaces
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] lg:text-4xl">知识库总览</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-sm text-[var(--muted)]">知识库数量</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.05em]">{data.length}</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-sm text-[var(--muted)]">文档总量</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.05em]">
                {data.reduce((total, item) => total + item.documentCount, 0)}
              </p>
            </div>
          </div>
        </div>
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

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <CreateKnowledgeBaseForm />
        <CreateDocumentForm
          knowledgeBases={data.map((knowledgeBase) => ({
            id: knowledgeBase.id,
            name: knowledgeBase.name
          }))}
        />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((base) => (
          <article
            key={base.id}
            className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_14px_30px_rgba(31,26,20,0.06)] backdrop-blur transition duration-300 hover:bg-white"
          >
            <div className="flex min-h-[150px] flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Knowledge Base
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                  <Link className="transition hover:text-[var(--brand-strong)]" href={`/knowledge/${base.id}`}>
                    {base.name}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  当前空间已沉淀 {base.documentCount} 篇文档，可进入详情页继续维护文档与设置。
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-[-0.05em]">{base.documentCount}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">documents</p>
                </div>
                <Link
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-sm font-medium transition hover:border-[var(--foreground)]"
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
        <section className="mt-8 rounded-[28px] border border-dashed border-[var(--border)] bg-white/55 p-6 text-[var(--muted)]">
          当前还没有知识库数据。创建第一个知识库后，这里会开始显示团队知识资产。
        </section>
      ) : null}
    </main>
  );
}
