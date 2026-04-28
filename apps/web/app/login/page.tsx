export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-screen max-w-7xl items-center px-5 py-5 lg:px-8">
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(31,26,20,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-strong)]">Login</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">登录</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">默认账号：admin，默认密码：admin</p>
        <form className="mt-6 space-y-3">
          <input
            className="w-full rounded-[18px] border border-[var(--border)] bg-white p-3 outline-none transition focus:border-[var(--brand)]"
            placeholder="邮箱"
            defaultValue="admin"
          />
          <input
            className="w-full rounded-[18px] border border-[var(--border)] bg-white p-3 outline-none transition focus:border-[var(--brand)]"
            placeholder="密码"
            type="password"
            defaultValue="admin"
          />
          <button className="w-full rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]">
            登录
          </button>
        </form>
      </div>
    </section>
  );
}
