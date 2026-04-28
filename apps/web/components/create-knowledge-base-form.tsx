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
    <section className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_14px_32px_rgba(31,26,20,0.05)] backdrop-blur">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-strong)]">Create Space</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">新增知识库</h2>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input
          className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-2.5 outline-none transition focus:border-[var(--brand)]"
          placeholder="例如：React Compiler 研究"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
          minLength={2}
        />
        <textarea
          className="min-h-24 rounded-[18px] border border-[var(--border)] bg-white px-4 py-2.5 outline-none transition focus:border-[var(--brand)]"
          placeholder="简单描述这个知识库准备收集什么内容。"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          minLength={5}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
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
