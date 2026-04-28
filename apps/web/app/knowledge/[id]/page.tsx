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
    contentPreviewLabel?: string | null;
    status: string;
    createdAt: string;
    fileUrl?: string | null;
    fileType?: string | null;
    originalFileName?: string | null;
    previewPages?: string[] | null;
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
    <main className="mx-auto max-w-7xl px-5 py-5 lg:px-8 lg:py-6">
      <MainNav />

      <section className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.7)] p-5 shadow-[0_20px_50px_rgba(31,26,20,0.08)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]" href="/knowledge">
              返回知识库列表
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{knowledgeBase.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {knowledgeBase.description || "当前知识库暂无补充描述。"}
            </p>
          </div>

          <div className="rounded-[18px] border border-[var(--border)] bg-white/84 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">documents</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.05em]">{knowledgeBase.documentCount}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
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
      </section>

      <DocumentManager documents={knowledgeBase.documents} />
    </main>
  );
}
