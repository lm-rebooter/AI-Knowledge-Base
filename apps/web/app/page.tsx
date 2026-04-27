import { MainNav } from "@/components/main-nav";
import { SectionCard } from "@/components/section-card";

const learningTracks = [
  {
    title: "前端视角切入",
    description: "从 UI、页面路由、表单和 API 请求开始，逐步看到整个系统的数据流。"
  },
  {
    title: "后端模块化演进",
    description: "通过 NestJS 模块拆分，把认证、文档、知识库和聊天串成完整业务。"
  },
  {
    title: "AI 知识库落地",
    description: "用 FastAPI + RAG 管线理解文档入库、检索增强和大模型问答。"
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <MainNav />
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
          AI Knowledge Base Starter
        </p>
        <h1 className="mb-4 max-w-3xl text-5xl font-bold leading-tight">
          用一个真实项目，把前端经验延伸到全栈与 AI 应用开发。
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
          这个脚手架把页面、接口、数据库、缓存、文档入库和 AI 问答全部串起来，方便你边做边学。
        </p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {learningTracks.map((track) => (
          <SectionCard key={track.title} title={track.title} description={track.description} />
        ))}
      </section>
    </main>
  );
}
