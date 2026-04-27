const dashboardStats = [
  ["知识库数量", "3"],
  ["已入库文档", "28"],
  ["最近对话", "14"],
  ["待处理任务", "2"]
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p className="mt-3 text-[var(--muted)]">这个页面用来承接登录后的工作台概览。</p>
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {dashboardStats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-3 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
