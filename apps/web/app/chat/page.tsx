const messages = [
  { role: "user", content: "帮我总结一下这份 NestJS 架构文档的重点。" },
  { role: "assistant", content: "可以从模块边界、鉴权流、数据库访问和 AI 服务编排四个角度概括。" }
];

export default function ChatPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">会话列表</h2>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">默认演示会话</div>
      </aside>
      <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">AI Chat</h1>
        <div className="mt-6 space-y-4">
          {messages.map((message) => (
            <div
              key={`${message.role}-${message.content}`}
              className={`rounded-2xl p-4 ${
                message.role === "user" ? "bg-slate-100" : "bg-blue-50"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{message.role}</p>
              <p className="mt-2 leading-7">{message.content}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
