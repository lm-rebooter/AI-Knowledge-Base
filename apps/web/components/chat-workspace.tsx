"use client";

import { useEffect, useMemo, useState } from "react";
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

type ChatSession = {
  id: string;
  title: string;
  knowledgeBaseId: string;
  messages: ChatMessage[];
  updatedAt: string;
};

type ChatResponse = {
  question: string;
  answer: string;
  contexts: string[];
};

type ChatWorkspaceProps = {
  knowledgeBases: KnowledgeBaseOption[];
};

const STORAGE_KEY = "ai-kb-chat-sessions";

function createAssistantIntroMessage(): ChatMessage {
  return {
    id: `assistant-intro-${Date.now()}`,
    role: "assistant",
    content: "把问题直接抛给我。我会结合你选中的知识库，在后端完成检索与问答。"
  };
}

function createSession(knowledgeBaseId: string, index: number): ChatSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `新对话 ${index}`,
    knowledgeBaseId,
    messages: [createAssistantIntroMessage()],
    updatedAt: new Date().toISOString()
  };
}

function formatSessionTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildSessionTitle(question: string, fallbackIndex: number) {
  const trimmed = question.trim();

  if (!trimmed) {
    return `新对话 ${fallbackIndex}`;
  }

  return trimmed.length > 22 ? `${trimmed.slice(0, 22)}...` : trimmed;
}

function getSessionPreview(messages: ChatMessage[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return lastUserMessage?.content ?? "还没有提问";
}

export function ChatWorkspace({ knowledgeBases }: ChatWorkspaceProps) {
  const defaultKnowledgeBaseId = knowledgeBases[0]?.id ?? "";
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);

      if (rawValue) {
        const parsedSessions = JSON.parse(rawValue) as ChatSession[];

        if (parsedSessions.length > 0) {
          setSessions(parsedSessions);
          setActiveSessionId(parsedSessions[0].id);
          setHasLoadedLocalState(true);
          return;
        }
      }
    } catch {
      // Ignore bad local cache and rebuild a clean local workspace.
    }

    const initialSession = createSession(defaultKnowledgeBaseId, 1);
    setSessions([initialSession]);
    setActiveSessionId(initialSession.id);
    setHasLoadedLocalState(true);
  }, [defaultKnowledgeBaseId]);

  useEffect(() => {
    if (!hasLoadedLocalState || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [hasLoadedLocalState, sessions]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [activeSessionId, sessions]
  );

  const activeKnowledgeBase = useMemo(
    () =>
      knowledgeBases.find((knowledgeBase) => knowledgeBase.id === activeSession?.knowledgeBaseId) ??
      knowledgeBases[0] ??
      null,
    [activeSession?.knowledgeBaseId, knowledgeBases]
  );

  function updateActiveSession(updater: (session: ChatSession) => ChatSession) {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === activeSessionId ? updater(session) : session
      )
    );
  }

  function handleCreateSession() {
    const newSession = createSession(defaultKnowledgeBaseId, sessions.length + 1);
    setSessions((currentSessions) => [newSession, ...currentSessions]);
    setActiveSessionId(newSession.id);
    setQuestion("");
    setError(null);
  }

  function handleKnowledgeBaseChange(nextKnowledgeBaseId: string) {
    if (!activeSession) {
      return;
    }

    updateActiveSession((session) => ({
      ...session,
      knowledgeBaseId: nextKnowledgeBaseId,
      updatedAt: new Date().toISOString()
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeSession) {
      return;
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    const askedAt = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedQuestion
    };

    setQuestion("");
    setError(null);
    setIsSubmitting(true);

    updateActiveSession((session) => ({
      ...session,
      title:
        session.messages.length <= 1
          ? buildSessionTitle(trimmedQuestion, sessions.length)
          : session.title,
      messages: [...session.messages, userMessage],
      updatedAt: askedAt
    }));

    try {
      const response = await apiRequest<ApiEnvelope<ChatResponse>>("/chat", {
        method: "POST",
        body: JSON.stringify({
          conversationId: activeSession.id,
          question: trimmedQuestion,
          knowledgeBaseId: activeSession.knowledgeBaseId || undefined
        })
      });

      updateActiveSession((session) => ({
        ...session,
        messages: [
          ...session.messages,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.data.answer
          }
        ],
        updatedAt: new Date().toISOString()
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "发送问题失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <aside className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.68)] shadow-[0_24px_60px_rgba(34,28,20,0.08)] backdrop-blur">
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
                Conversations
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">聊天记录</h2>
            </div>
            <button
              className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[var(--brand-strong)]"
              onClick={handleCreateSession}
              type="button"
            >
              新建
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            左侧只负责切换会话，检索上下文已经改成在后端留存，不再占用页面空间。
          </p>
        </div>

        <div className="border-b border-[var(--border)] px-5 py-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            当前知识库
          </label>
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
            onChange={(event) => handleKnowledgeBaseChange(event.target.value)}
            value={activeSession?.knowledgeBaseId ?? defaultKnowledgeBaseId}
          >
            {knowledgeBases.map((knowledgeBase) => (
              <option key={knowledgeBase.id} value={knowledgeBase.id}>
                {knowledgeBase.name}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[720px] space-y-2 overflow-y-auto px-4 py-4">
          {sessions.map((session) => {
            const isActive = session.id === activeSession?.id;
            const matchedKnowledgeBase = knowledgeBases.find(
              (knowledgeBase) => knowledgeBase.id === session.knowledgeBaseId
            );

            return (
              <button
                key={session.id}
                className={`w-full rounded-[24px] px-4 py-4 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--foreground)] text-white shadow-[0_16px_40px_rgba(22,22,22,0.18)]"
                    : "bg-white/70 text-[var(--foreground)] hover:bg-white"
                }`}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setError(null);
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-base font-semibold leading-6">{session.title}</p>
                  <span
                    className={`shrink-0 text-xs ${isActive ? "text-white/70" : "text-[var(--muted)]"}`}
                  >
                    {formatSessionTime(session.updatedAt)}
                  </span>
                </div>
                <p
                  className={`mt-2 line-clamp-2 text-sm leading-6 ${
                    isActive ? "text-white/78" : "text-[var(--muted)]"
                  }`}
                >
                  {getSessionPreview(session.messages)}
                </p>
                <p className={`mt-3 text-xs ${isActive ? "text-white/62" : "text-[var(--muted)]"}`}>
                  {matchedKnowledgeBase?.name ?? "未指定知识库"}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="overflow-hidden rounded-[36px] border border-[var(--border)] bg-[rgba(255,255,255,0.74)] shadow-[0_24px_60px_rgba(34,28,20,0.08)] backdrop-blur">
        <div className="border-b border-[var(--border)] px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
                Workspace
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
                AI Chat
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                右侧是当前会话的工作区。你只管提问，后端会负责检索、问答和上下文留痕。
              </p>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">当前会话绑定</p>
              <p className="mt-2 text-lg font-semibold">{activeKnowledgeBase?.name ?? "未指定知识库"}</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[680px] flex-col">
          <div className="flex-1 space-y-4 px-5 py-5 lg:px-8 lg:py-6">
            {activeSession?.messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-[28px] px-5 py-4 transition-all duration-200 ${
                  message.role === "user"
                    ? "ml-auto bg-[var(--foreground)] text-white"
                    : "bg-[var(--ink-soft)] text-[var(--foreground)]"
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    message.role === "user" ? "text-white/65" : "text-[var(--muted)]"
                  }`}
                >
                  {message.role === "user" ? "你" : "助手"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-8">{message.content}</p>
              </div>
            )) ?? null}
          </div>

          <div className="border-t border-[var(--border)] bg-white/68 px-5 py-5 lg:px-8">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <textarea
                className="min-h-32 rounded-[28px] border border-[var(--border)] bg-white px-5 py-4 text-[15px] outline-none transition focus:border-[var(--brand)]"
                minLength={2}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：客户以前没有实名在易签宝，现在三要素过不去，该怎么排查？"
                required
                value={question}
              />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-[var(--muted)]">
                  每条会话都会单独保存标题和内容，便于左侧快速切换。
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {error ? <p className="text-sm text-red-600">{error}</p> : null}
                  <button
                    className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[var(--brand-strong)] disabled:opacity-60"
                    disabled={isSubmitting || !activeSession}
                    type="submit"
                  >
                    {isSubmitting ? "提问中..." : "发送问题"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
