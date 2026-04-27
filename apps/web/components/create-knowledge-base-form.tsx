"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { ApiEnvelope, CreateKnowledgeBaseDto } from "@ai-kb/shared";

type CreatedKnowledgeBase = {
  id: string;
  name: string;
  documentCount: number;
};

const initialFormState = {
  name: "",
  description: ""
};

export function CreateKnowledgeBaseForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const payload: CreateKnowledgeBaseDto = {
      name: form.name.trim(),
      description: form.description.trim() || undefined
    };

    try {
      const response = await apiRequest<ApiEnvelope<CreatedKnowledgeBase>>("/knowledge-bases", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setSuccessMessage(`知识库「${response.data.name}」创建成功。`);
      setForm(initialFormState);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "创建失败，请稍后再试。";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold">新增知识库</h2>
        <p className="mt-2 leading-7 text-[var(--muted)]">
          这个表单会真实调用 NestJS 的 <code className="rounded bg-slate-100 px-2 py-1 text-sm">POST /api/knowledge-bases</code>
          接口，并把数据写入 PostgreSQL。
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <input
          className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0"
          placeholder="例如：React Compiler 研究"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
          minLength={2}
        />
        <textarea
          className="min-h-28 rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0"
          placeholder="简单描述这个知识库准备收集什么内容。"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          minLength={5}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-2xl bg-[var(--brand)] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "创建中..." : "创建知识库"}
          </button>
          {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
