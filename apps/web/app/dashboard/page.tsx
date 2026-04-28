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
  const completionRate =
    documents.length > 0 ? Math.round((indexedCount / documents.length) * 100) : 100;

  const dashboardStats = [
    { label: "知识库", value: String(knowledgeBases.length), detail: "已上线空间" },
    { label: "文档", value: String(documents.length), detail: "内容资产总量" },
    { label: "会话", value: String(chatSummary.conversationCount), detail: "留存会话数" }
  ];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-5 lg:px-8">
      <MainNav />

      <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.7)] shadow-[0_24px_60px_rgba(31,26,20,0.08)] backdrop-blur">
        <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-strong)]">
              Operations Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em]">工作台总览</h1>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {dashboardStats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-[18px] border border-[var(--border)] bg-white/82 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.05em]">{stat.value}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{stat.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[var(--border)] bg-white/82 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              索引完成度
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{completionRate}%</p>
            <div className="mt-4 h-2 rounded-full bg-[var(--ink-soft)]">
              <div
                className="h-2 rounded-full bg-[var(--foreground)]"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              已完成索引 {indexedCount} 篇，处理中 {processingCount} 篇。最近问答更新：{formatLastAskedAt(chatSummary.lastAskedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_20px_50px_rgba(31,26,20,0.08)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.04em]">知识库分布</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">最近更新：{formatLastAskedAt(chatSummary.lastAskedAt)}</p>
          </div>

          <div className="mt-4 space-y-3">
            {knowledgeBases.map((knowledgeBase) => (
              <div
                key={knowledgeBase.id}
                className="rounded-[20px] border border-[var(--border)] bg-white/84 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold">{knowledgeBase.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {knowledgeBase.documentCount} 篇文档正在服务检索与问答
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
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
          <section className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_20px_50px_rgba(31,26,20,0.08)] backdrop-blur">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">索引状态</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] bg-[var(--foreground)] p-4 text-white">
                <p className="text-sm text-white/65">已完成索引</p>
                <p className="mt-2 text-3xl font-semibold">{indexedCount}</p>
              </div>
              <div className="rounded-[20px] bg-[var(--ink-soft)] p-4 text-[var(--foreground)]">
                <p className="text-sm text-[var(--muted)]">处理中</p>
                <p className="mt-2 text-3xl font-semibold">{processingCount}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_20px_50px_rgba(31,26,20,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-[-0.04em]">问答运行观察</h2>
              <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--muted)]">
                建议管理员查看
              </span>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white/84 px-4 py-2.5">
                <span>提问总数</span>
                <strong className="text-lg text-[var(--foreground)]">{chatSummary.questionCount}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white/84 px-4 py-2.5">
                <span>会话数量</span>
                <strong className="text-lg text-[var(--foreground)]">{chatSummary.conversationCount}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white/84 px-4 py-2.5">
                <span>兜底回答次数</span>
                <strong className="text-lg text-[var(--foreground)]">{chatSummary.fallbackCount}</strong>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
