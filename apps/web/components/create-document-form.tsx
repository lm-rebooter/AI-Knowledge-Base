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

  function deriveTitleFromFileName(fileName: string) {
    return fileName.replace(/\.[^.]+$/, "").trim();
  }

  function isSuspiciousFileName(fileName: string) {
    // Common mojibake often contains dense Latin-1 supplement characters
    // such as `Ã`, `æ`, `å`, `ä`, `ç`, `¢`, or replacement glyphs.
    return /[ÃÂÅÆÐØÞßæøåäöü¢£¥¤]|�/.test(fileName);
  }

  const resolvedUploadTitle =
    mode === "file" && selectedFile
      ? form.title.trim() || deriveTitleFromFileName(selectedFile.name)
      : "";
  const showSuspiciousFileNameWarning =
    mode === "file" && selectedFile ? isSuspiciousFileName(selectedFile.name) : false;

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
        payload.append("title", form.title.trim() || deriveTitleFromFileName(selectedFile.name));
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
    <section className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_14px_32px_rgba(31,26,20,0.05)] backdrop-blur">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-strong)]">Add Content</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">新增文档</h2>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        {hideKnowledgeBaseSelect ? null : (
          <select
            className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-2.5 outline-none transition focus:border-[var(--brand)]"
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
        <div className="flex gap-2">
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "text"
                ? "bg-[var(--foreground)] text-white"
                : "border border-[var(--border)] bg-white text-[var(--muted)]"
            }`}
            onClick={() => setMode("text")}
            type="button"
          >
            粘贴文本
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "file"
                ? "bg-[var(--foreground)] text-white"
                : "border border-[var(--border)] bg-white text-[var(--muted)]"
            }`}
            onClick={() => setMode("file")}
            type="button"
          >
            上传文件
          </button>
        </div>
        <input
          className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-2.5 outline-none transition focus:border-[var(--brand)]"
          placeholder={mode === "file" ? "可选：给上传文件起一个展示标题" : "例如：React Compiler 机制梳理"}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required={mode === "text"}
          minLength={mode === "text" ? 2 : undefined}
        />
        {mode === "text" ? (
          <textarea
            className="min-h-28 rounded-[18px] border border-[var(--border)] bg-white px-4 py-2.5 outline-none transition focus:border-[var(--brand)]"
            placeholder="输入文档正文。为了通过后端校验，至少输入 10 个字符。"
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            required
            minLength={10}
          />
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-white/56 p-4">
            <input
              accept=".txt,.md,.markdown,.json,.csv,.pdf,text/plain,text/markdown,application/json,text/csv,application/pdf"
              className="block w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);

                if (file && !form.title.trim()) {
                  setForm((current) => ({
                    ...current,
                    title: deriveTitleFromFileName(file.name)
                  }));
                }
              }}
              required
              type="file"
            />
            <p className="mt-3 text-sm text-[var(--muted)]">
              当前支持 `.txt / .md / .markdown / .json / .csv / .pdf`。
            </p>
            {selectedFile ? <p className="mt-2 text-sm">已选择：{selectedFile.name}</p> : null}
            {selectedFile ? (
              <div className="mt-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">标题预览</p>
                <p className="mt-2 font-medium">{resolvedUploadTitle || "未命名文档"}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  如果你不修改标题，上传后会使用上面的标题作为文档名称和 chat 命中的展示标题。
                </p>
              </div>
            ) : null}
            {showSuspiciousFileNameWarning ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                检测到文件名可能存在乱码。建议你先在上方标题输入框里手动填写一个正常中文标题，再执行上传，这样知识库详情页和 chat 命中上下文都会展示正确名称。
              </div>
            ) : null}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
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
