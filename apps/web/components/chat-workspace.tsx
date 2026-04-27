"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import type { ApiEnvelope } from "@ai-kb/shared";

type KnowledgeBaseOption = {
  id: string;
  name: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  question: string;
  answer: string;
  contexts: string[];
};

type ChatWorkspaceProps = {
  knowledgeBases: KnowledgeBaseOption[];
};

const starterMessages: ChatMessage[] = [
  {
    id: "assistant-intro",
    role: "assistant",
    content: "选择一个知识库后就可以开始提问，我会返回当前后端串起来的真实响应。"
  }
];

export function ChatWorkspace({ knowledgeBases }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [question, setQuestion] = useState("");
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState(knowledgeBases[0]?.id ?? "");
  const [contexts, setContexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedQuestion
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiRequest<ApiEnvelope<ChatResponse>>("/chat", {
        method: "POST",
        body: JSON.stringify({
          question: trimmedQuestion,
          knowledgeBaseId: selectedKnowledgeBaseId || undefined
        })
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.data.answer
        }
      ]);
      setContexts(response.data.contexts);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "发送问题失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <aside className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">问答设置</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          这里可以切换当前问答使用的知识库，并观察命中的上下文片段。
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium">知识库</label>
          <select
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
            onChange={(event) => setSelectedKnowledgeBaseId(event.target.value)}
            value={selectedKnowledgeBaseId}
          >
            {knowledgeBases.map((knowledgeBase) => (
              <option key={knowledgeBase.id} value={knowledgeBase.id}>
                {knowledgeBase.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">命中上下文</h3>
          <div className="mt-3 space-y-3">
            {contexts.length > 0 ? (
              contexts.map((context) => (
                <div key={context} className="rounded-2xl bg-slate-50 p-4 text-sm leading-7">
                  {context}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-[var(--muted)]">
                发送问题后，这里会展示当前返回的上下文片段。
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">AI Chat</h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
          这个页面现在会真实请求 NestJS 的 <code className="rounded bg-slate-100 px-2 py-1 text-sm">POST /api/chat</code>
          接口。如果 Python AI 服务没有启动，后端也会返回一条友好的兜底回答。
        </p>

        <div className="mt-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl p-4 ${
                message.role === "user" ? "bg-slate-100" : "bg-blue-50"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{message.role}</p>
              <p className="mt-2 whitespace-pre-wrap leading-7">{message.content}</p>
            </div>
          ))}
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <textarea
            className="min-h-28 rounded-2xl border border-[var(--border)] px-4 py-3"
            minLength={2}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="例如：请总结这个知识库里关于 NestJS 模块设计的重点。"
            required
            value={question}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-2xl bg-[var(--brand)] px-5 py-3 font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "提问中..." : "发送问题"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </form>
      </section>
    </>
  );
}
