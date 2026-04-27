"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { ApiEnvelope, CreateDocumentDto } from "@ai-kb/shared";

type KnowledgeBaseOption = {
  id: string;
  name: string;
};

type CreatedDocument = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  status: string;
  ingestStatus: "queued" | "skipped";
};

type CreateDocumentFormProps = {
  knowledgeBases: KnowledgeBaseOption[];
  defaultKnowledgeBaseId?: string;
  hideKnowledgeBaseSelect?: boolean;
};

export function CreateDocumentForm({
  knowledgeBases,
  defaultKnowledgeBaseId,
  hideKnowledgeBaseSelect = false
}: CreateDocumentFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "file">("text");
  const [form, setForm] = useState({
    knowledgeBaseId: defaultKnowledgeBaseId ?? knowledgeBases[0]?.id ?? "",
    title: "",
    content: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      let response: ApiEnvelope<CreatedDocument>;

      if (mode === "file") {
        if (!selectedFile) {
          throw new Error("请先选择一个文件。");
        }

        const payload = new FormData();
        payload.append("knowledgeBaseId", form.knowledgeBaseId);
        payload.append("title", form.title.trim());
        payload.append("file", selectedFile);

        response = await apiRequest<ApiEnvelope<CreatedDocument>>("/documents/upload", {
          method: "POST",
          body: payload
        });
      } else {
        const payload: CreateDocumentDto = {
          knowledgeBaseId: form.knowledgeBaseId,
          title: form.title.trim(),
          content: form.content.trim()
        };

        response = await apiRequest<ApiEnvelope<CreatedDocument>>("/documents", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setSuccessMessage(
        response.data.ingestStatus === "queued"
          ? `文档「${response.data.title}」已创建并完成入库。`
          : `文档「${response.data.title}」已写入数据库，AI 入库稍后可补跑。`
      );
      setForm({
        knowledgeBaseId: defaultKnowledgeBaseId ?? knowledgeBases[0]?.id ?? "",
        title: "",
        content: ""
      });
      setSelectedFile(null);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建文档失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold">新增文档</h2>
        <p className="mt-2 leading-7 text-[var(--muted)]">
          这一步会真实写入 PostgreSQL，并让对应知识库的文档数立刻变化。你现在可以继续手动粘贴文本，也可以上传纯文本文件。
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        {hideKnowledgeBaseSelect ? null : (
          <select
            className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0"
            value={form.knowledgeBaseId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                knowledgeBaseId: event.target.value
              }))
            }
            required
          >
            {knowledgeBases.map((knowledgeBase) => (
              <option key={knowledgeBase.id} value={knowledgeBase.id}>
                {knowledgeBase.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-3">
          <button
            className={`rounded-2xl px-4 py-2 text-sm ${
              mode === "text" ? "bg-slate-900 text-white" : "border border-[var(--border)] bg-white"
            }`}
            onClick={() => setMode("text")}
            type="button"
          >
            粘贴文本
          </button>
          <button
            className={`rounded-2xl px-4 py-2 text-sm ${
              mode === "file" ? "bg-slate-900 text-white" : "border border-[var(--border)] bg-white"
            }`}
            onClick={() => setMode("file")}
            type="button"
          >
            上传文件
          </button>
        </div>
        <input
          className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0"
          placeholder={mode === "file" ? "可选：给上传文件起一个展示标题" : "例如：React Compiler 机制梳理"}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required={mode === "text"}
          minLength={mode === "text" ? 2 : undefined}
        />
        {mode === "text" ? (
          <textarea
            className="min-h-32 rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0"
            placeholder="输入文档正文。为了通过后端校验，至少输入 10 个字符。"
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            required
            minLength={10}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 p-5">
            <input
              accept=".txt,.md,.markdown,.json,.csv,.pdf,text/plain,text/markdown,application/json,text/csv,application/pdf"
              className="block w-full text-sm"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
            <p className="mt-3 text-sm text-[var(--muted)]">
              当前支持 `.txt / .md / .markdown / .json / .csv / .pdf`。PDF 解析依赖 `pdf-parse`，如果你刚刚更新了代码，记得重新执行一次 `pnpm install`。
            </p>
            {selectedFile ? <p className="mt-2 text-sm">已选择：{selectedFile.name}</p> : null}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || knowledgeBases.length === 0}
            type="submit"
          >
            {isSubmitting ? "提交中..." : "创建文档"}
          </button>
          {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
