export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <div className="w-full rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">登录</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          这里预留给邮箱密码登录、GitHub OAuth，或者未来接入企业 SSO。
        </p>
        <form className="mt-8 space-y-4">
          <input className="w-full rounded-xl border border-[var(--border)] p-3" placeholder="邮箱" />
          <input
            className="w-full rounded-xl border border-[var(--border)] p-3"
            placeholder="密码"
            type="password"
          />
          <button className="w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white">
            登录示例
          </button>
        </form>
      </div>
    </section>
  );
}
