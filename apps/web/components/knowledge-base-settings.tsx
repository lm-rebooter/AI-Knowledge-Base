"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { ApiEnvelope, UpdateKnowledgeBaseDto } from "@ai-kb/shared";

type KnowledgeBaseSettingsProps = {
  id: string;
  name: string;
  description?: string | null;
  documentCount: number;
};

export function KnowledgeBaseSettings({
  id,
  name,
  description,
  documentCount
}: KnowledgeBaseSettingsProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name,
    description: description ?? ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload: UpdateKnowledgeBaseDto = {
      name: form.name.trim(),
      description: form.description.trim() || undefined
    };

    try {
      const response = await apiRequest<
        ApiEnvelope<{ id: string; name: string; description?: string | null; documentCount: number }>
      >(`/knowledge-bases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      setForm({
        name: response.data.name,
        description: response.data.description ?? ""
      });
      setMessage("知识库信息已更新。");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新知识库失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `确认删除知识库「${name}」吗？这会一并删除当前关联的 ${documentCount} 篇文档。`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);
    setError(null);

    try {
      await apiRequest<ApiEnvelope<{ id: string; deleted: boolean }>>(`/knowledge-bases/${id}`, {
        method: "DELETE"
      });
      // `replace` avoids leaving the deleted detail page as the current entry.
      // Browser back can still reach older history, so the detail page itself
      // also needs graceful 404 handling.
      router.replace("/knowledge");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除知识库失败。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold">知识库设置</h2>
        <p className="mt-2 leading-7 text-[var(--muted)]">
          在这里可以修改知识库名称和描述，也可以删除整个知识库。
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSave}>
        <input
          className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0"
          minLength={2}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
          value={form.name}
        />
        <textarea
          className="min-h-28 rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0"
          minLength={5}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          value={form.description}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-2xl bg-[var(--brand)] px-5 py-3 font-semibold text-white disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "保存中..." : "保存知识库"}
          </button>
          <button
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 disabled:opacity-60"
            disabled={isDeleting}
            onClick={handleDelete}
            type="button"
          >
            {isDeleting ? "删除中..." : "删除知识库"}
          </button>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
