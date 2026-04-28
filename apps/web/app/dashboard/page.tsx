import { MainNav } from "@/components/main-nav";
import { apiRequest } from "@/lib/api";
import type { ApiEnvelope } from "@ai-kb/shared";

type KnowledgeBaseItem = {
  id: string;
  name: string;
  documentCount: number;
};

type DocumentItem = {
  id: string;
  title: string;
  status: string;
  knowledgeBaseId: string;
};

type ChatSummary = {
  conversationCount: number;
  questionCount: number;
  fallbackCount: number;
  lastAskedAt: string | null;
};

async function getDashboardData() {
  const [knowledgeBaseResponse, documentResponse, chatSummaryResponse] = await Promise.all([
    apiRequest<ApiEnvelope<KnowledgeBaseItem[]>>("/knowledge-bases", { cache: "no-store" }).catch(() => ({
      data: []
    })),
    apiRequest<ApiEnvelope<DocumentItem[]>>("/documents", { cache: "no-store" }).catch(() => ({
      data: []
    })),
    apiRequest<ApiEnvelope<ChatSummary>>("/chat/summary", { cache: "no-store" }).catch(() => ({
      data: {
        conversationCount: 0,
        questionCount: 0,
        fallbackCount: 0,
        lastAskedAt: null
      }
    }))
  ]);

  return {
    knowledgeBases: knowledgeBaseResponse.data,
    documents: documentResponse.data,
    chatSummary: chatSummaryResponse.data
  };
}

function formatLastAskedAt(value: string | null) {
  if (!value) {
    return "暂无问答记录";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function DashboardPage() {
  const { knowledgeBases, documents, chatSummary } = await getDashboardData();
  const indexedCount = documents.filter((document) => document.status === "indexed").length;
  const processingCount = documents.filter((document) => document.status === "processing").length;

  const dashboardStats = [
    { label: "知识库数量", value: String(knowledgeBases.length), detail: "当前已上线的知识空间" },
    { label: "文档总量", value: String(documents.length), detail: "已接入并可管理的内容资产" },
    { label: "聊天会话", value: String(chatSummary.conversationCount), detail: "已留存的问答会话数量" },
    { label: "兜底回答", value: String(chatSummary.fallbackCount), detail: "用于排查 AI 服务稳定性的提示数" }
  ];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 lg:px-8">
      <MainNav />

      <section className="overflow-hidden rounded-[40px] border border-[var(--border)] bg-[rgba(255,255,255,0.7)] shadow-[0_32px_80px_rgba(31,26,20,0.08)] backdrop-blur">
        <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-strong)]">
              Operations Dashboard
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em]">知识运营总览</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
              聚合知识库、文档与问答数据，帮助团队快速判断内容沉淀、索引状态和问答稳定性。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardStats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-[28px] border border-[var(--border)] bg-white/82 p-5 shadow-[0_14px_35px_rgba(31,26,20,0.05)]"
              >
                <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{stat.value}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{stat.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_24px_60px_rgba(31,26,20,0.08)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">知识库分布</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                观察当前知识库规模，快速定位文档密度较高的业务域。
              </p>
            </div>
            <p className="text-sm text-[var(--muted)]">最近更新：{formatLastAskedAt(chatSummary.lastAskedAt)}</p>
          </div>

          <div className="mt-6 space-y-4">
            {knowledgeBases.map((knowledgeBase) => (
              <div
                key={knowledgeBase.id}
                className="rounded-[24px] border border-[var(--border)] bg-white/84 px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{knowledgeBase.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {knowledgeBase.documentCount} 篇文档正在服务检索与问答
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold tracking-[-0.05em]">
                      {knowledgeBase.documentCount}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">documents</p>
                  </div>
                </div>
              </div>
            ))}
            {knowledgeBases.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/65 p-5 text-sm text-[var(--muted)]">
                暂无知识库数据。
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_24px_60px_rgba(31,26,20,0.08)] backdrop-blur">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">索引状态</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-[var(--foreground)] p-5 text-white">
                <p className="text-sm text-white/65">已完成索引</p>
                <p className="mt-3 text-4xl font-semibold">{indexedCount}</p>
              </div>
              <div className="rounded-[24px] bg-[var(--ink-soft)] p-5 text-[var(--foreground)]">
                <p className="text-sm text-[var(--muted)]">处理中</p>
                <p className="mt-3 text-4xl font-semibold">{processingCount}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_24px_60px_rgba(31,26,20,0.08)] backdrop-blur">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">问答运行观察</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--muted)]">
              <div className="flex items-center justify-between gap-4 rounded-[22px] bg-white/84 px-4 py-3">
                <span>提问总数</span>
                <strong className="text-lg text-[var(--foreground)]">{chatSummary.questionCount}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[22px] bg-white/84 px-4 py-3">
                <span>会话数量</span>
                <strong className="text-lg text-[var(--foreground)]">{chatSummary.conversationCount}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[22px] bg-white/84 px-4 py-3">
                <span>后端兜底次数</span>
                <strong className="text-lg text-[var(--foreground)]">{chatSummary.fallbackCount}</strong>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
