import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiRequestError, apiRequest } from "@/lib/api";
import { CreateDocumentForm } from "@/components/create-document-form";
import { DocumentManager } from "@/components/document-manager";
import { KnowledgeBaseSettings } from "@/components/knowledge-base-settings";
import { MainNav } from "@/components/main-nav";
import type { ApiEnvelope } from "@ai-kb/shared";

type KnowledgeBaseDetail = {
  id: string;
  name: string;
  description?: string | null;
  documentCount: number;
  documents: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
    createdAt: string;
  }>;
};

async function getKnowledgeBaseDetail(id: string) {
  try {
    const response = await apiRequest<ApiEnvelope<KnowledgeBaseDetail>>(`/knowledge-bases/${id}`, {
      cache: "no-store"
    });

    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function KnowledgeBaseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const knowledgeBase = await getKnowledgeBaseDetail(id);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <MainNav />

      <section className="rounded-[40px] border border-[var(--border)] bg-[rgba(255,255,255,0.7)] p-8 shadow-[0_28px_70px_rgba(31,26,20,0.08)] backdrop-blur lg:p-10">
        <Link className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]" href="/knowledge">
          返回知识库列表
        </Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] lg:text-5xl">{knowledgeBase.name}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
          {knowledgeBase.description || "这个知识库还没有补充描述，你可以后续继续扩展编辑能力。"}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full border border-[var(--border)] bg-white/84 px-4 py-2 text-sm">
            当前文档数：{knowledgeBase.documentCount}
          </span>
        </div>
      </section>

      <CreateDocumentForm
        defaultKnowledgeBaseId={knowledgeBase.id}
        hideKnowledgeBaseSelect
        knowledgeBases={[{ id: knowledgeBase.id, name: knowledgeBase.name }]}
      />

      <KnowledgeBaseSettings
        description={knowledgeBase.description}
        documentCount={knowledgeBase.documentCount}
        id={knowledgeBase.id}
        name={knowledgeBase.name}
      />

      <DocumentManager documents={knowledgeBase.documents} />
    </main>
  );
}
