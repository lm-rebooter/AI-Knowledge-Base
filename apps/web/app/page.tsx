import { MainNav } from "@/components/main-nav";
import { SectionCard } from "@/components/section-card";

const capabilityBlocks = [
  {
    title: "统一知识入口",
    description: "把 FAQ、SOP、内部说明和业务资料收敛到同一个知识空间，降低口径分散带来的响应成本。"
  },
  {
    title: "检索增强问答",
    description: "通过入库、切片和检索，把文档上下文送入问答流程，让回答更贴近真实业务资料。"
  },
  {
    title: "过程可追踪",
    description: "保留会话、文档和问答留痕，便于团队复盘常见问题、运营内容质量和服务稳定性。"
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 lg:px-8">
      <MainNav />
      <section className="overflow-hidden rounded-[40px] border border-[var(--border)] bg-[rgba(255,255,255,0.68)] shadow-[0_32px_80px_rgba(31,26,20,0.08)] backdrop-blur">
        <div className="grid gap-10 px-7 py-8 lg:grid-cols-[1.3fr_0.7fr] lg:px-10 lg:py-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand-strong)]">
              Enterprise Knowledge Layer
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] lg:text-6xl">
              让文档、检索与问答真正进入业务现场
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] lg:text-lg">
              面向企业内部知识运营场景，统一管理文档资产、构建可检索问答，并让一线问题响应、培训和知识复用进入同一套工作流。
            </p>
          </div>

          <div className="rounded-[32px] bg-[var(--foreground)] p-6 text-white shadow-[0_18px_40px_rgba(22,22,22,0.18)]">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Core Workflow</p>
            <div className="mt-6 space-y-5 text-sm leading-7 text-white/82">
              <div>
                <p className="font-semibold text-white">1. 文档入池</p>
                <p>上传 PDF、文本与业务说明，把分散资料统一接入知识库。</p>
              </div>
              <div>
                <p className="font-semibold text-white">2. 检索问答</p>
                <p>基于知识库上下文完成问答，提升业务回复的一致性和准确性。</p>
              </div>
              <div>
                <p className="font-semibold text-white">3. 会话留痕</p>
                <p>把问答轨迹沉淀下来，形成可复盘、可复用的服务经验资产。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {capabilityBlocks.map((block) => (
          <SectionCard key={block.title} title={block.title} description={block.description} />
        ))}
      </section>
    </main>
  );
}
