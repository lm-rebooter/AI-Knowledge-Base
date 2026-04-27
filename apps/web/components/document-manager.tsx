"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { ApiEnvelope, UpdateDocumentDto } from "@ai-kb/shared";

type DocumentItem = {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
};

type DocumentManagerProps = {
  documents: DocumentItem[];
};

export function DocumentManager({ documents }: DocumentManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function startEditing(document: DocumentItem) {
    setEditingId(document.id);
    setDraftTitle(document.title);
    setDraftContent(document.content);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftTitle("");
    setDraftContent("");
    setError(null);
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);

    try {
      await apiRequest<ApiEnvelope<{ id: string; deleted: boolean }>>(`/documents/${id}`, {
        method: "DELETE"
      });
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除文档失败。");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSave(id: string) {
    setBusyId(id);
    setError(null);

    const payload: UpdateDocumentDto = {
      title: draftTitle.trim(),
      content: draftContent.trim()
    };

    try {
      await apiRequest<ApiEnvelope<unknown>>(`/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      cancelEditing();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新文档失败。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">文档列表</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            这里可以查看某个知识库下的文档，并直接做编辑或删除。
          </p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="mt-6 space-y-4">
        {documents.map((document) => {
          const isEditing = editingId === document.id;
          const isBusy = busyId === document.id;

          return (
            <article key={document.id} className="rounded-2xl border border-[var(--border)] bg-slate-50 p-5">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-3"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    minLength={2}
                  />
                  <textarea
                    className="min-h-32 w-full rounded-xl border border-[var(--border)] px-4 py-3"
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    minLength={10}
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      disabled={isBusy}
                      onClick={() => handleSave(document.id)}
                      type="button"
                    >
                      {isBusy ? "保存中..." : "保存修改"}
                    </button>
                    <button
                      className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
                      disabled={isBusy}
                      onClick={cancelEditing}
                      type="button"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold">{document.title}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                        {document.status}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{document.content}</p>
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      创建时间：{new Date(document.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm"
                      onClick={() => startEditing(document)}
                      type="button"
                    >
                      编辑
                    </button>
                    <button
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 disabled:opacity-60"
                      disabled={isBusy}
                      onClick={() => handleDelete(document.id)}
                      type="button"
                    >
                      {isBusy ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 p-6 text-[var(--muted)]">
            这个知识库下面还没有文档，你可以先在上面的表单里创建第一篇文档。
          </div>
        ) : null}
      </div>
    </section>
  );
}
