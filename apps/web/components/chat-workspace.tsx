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
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState(defaultKnowledgeBaseId);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);

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
          const initialSession =
            parsedSessions.find((session) => session.knowledgeBaseId === defaultKnowledgeBaseId) ??
            parsedSessions[0];

          setActiveSessionId(initialSession?.id ?? "");
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

  useEffect(() => {
    setSelectedKnowledgeBaseId(defaultKnowledgeBaseId);
  }, [defaultKnowledgeBaseId]);

  useEffect(() => {
    function handleWindowClick() {
      setMenuSessionId(null);
    }

    window.addEventListener("click", handleWindowClick);
    return () => {
      window.removeEventListener("click", handleWindowClick);
    };
  }, []);

  const visibleSessions = useMemo(
    () =>
      sessions.filter((session) =>
        selectedKnowledgeBaseId ? session.knowledgeBaseId === selectedKnowledgeBaseId : true
      ),
    [selectedKnowledgeBaseId, sessions]
  );

  const activeSession = useMemo(
    () => visibleSessions.find((session) => session.id === activeSessionId) ?? visibleSessions[0] ?? null,
    [activeSessionId, visibleSessions]
  );

  const activeKnowledgeBase = useMemo(
    () =>
      knowledgeBases.find((knowledgeBase) => knowledgeBase.id === selectedKnowledgeBaseId) ??
      knowledgeBases[0] ??
      null,
    [selectedKnowledgeBaseId, knowledgeBases]
  );

  useEffect(() => {
    if (visibleSessions.length === 0) {
      setActiveSessionId("");
      return;
    }

    if (!visibleSessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(visibleSessions[0].id);
    }
  }, [activeSessionId, visibleSessions]);

  function updateActiveSession(updater: (session: ChatSession) => ChatSession) {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === activeSessionId ? updater(session) : session
      )
    );
  }

  function handleCreateSession() {
    const newSession = createSession(selectedKnowledgeBaseId || defaultKnowledgeBaseId, sessions.length + 1);
    setSessions((currentSessions) => [newSession, ...currentSessions]);
    setActiveSessionId(newSession.id);
    setQuestion("");
    setError(null);
    setMenuSessionId(null);
  }

  function handleKnowledgeBaseChange(nextKnowledgeBaseId: string) {
    setSelectedKnowledgeBaseId(nextKnowledgeBaseId);
    setQuestion("");
    setError(null);
    setMenuSessionId(null);
  }

  function handleDeleteSession(sessionId: string) {
    const remainingSessions = sessions.filter((session) => session.id !== sessionId);

    if (remainingSessions.length === 0) {
      setSessions([]);
      setActiveSessionId("");
      setQuestion("");
      setError(null);
      setMenuSessionId(null);
      return;
    }

    setSessions(remainingSessions);
    setMenuSessionId(null);

    const remainingVisibleSessions = remainingSessions.filter((session) =>
      selectedKnowledgeBaseId ? session.knowledgeBaseId === selectedKnowledgeBaseId : true
    );

    if (activeSessionId === sessionId) {
      setActiveSessionId(remainingVisibleSessions[0]?.id ?? "");
      setQuestion("");
      setError(null);
    }
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
      <aside className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.68)] shadow-[0_18px_45px_rgba(34,28,20,0.08)] backdrop-blur">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
                Conversations
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">聊天记录</h2>
            </div>
            <button
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]"
              onClick={handleCreateSession}
              type="button"
            >
              新建
            </button>
          </div>
        </div>

        <div className="border-b border-[var(--border)] px-4 py-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            当前知识库
          </label>
          <select
            className="w-full rounded-[18px] border border-[var(--border)] bg-white/90 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)]"
            onChange={(event) => handleKnowledgeBaseChange(event.target.value)}
            value={selectedKnowledgeBaseId}
          >
            {knowledgeBases.map((knowledgeBase) => (
              <option key={knowledgeBase.id} value={knowledgeBase.id}>
                {knowledgeBase.name}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[620px] space-y-2 overflow-y-auto px-3 py-3">
          {visibleSessions.map((session) => {
            const isActive = session.id === activeSession?.id;
            const matchedKnowledgeBase = knowledgeBases.find(
              (knowledgeBase) => knowledgeBase.id === session.knowledgeBaseId
            );
            const isMenuOpen = menuSessionId === session.id;

            return (
              <article
                key={session.id}
                className={`relative overflow-visible rounded-[20px] px-3.5 py-3.5 transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--foreground)] text-white shadow-[0_16px_40px_rgba(22,22,22,0.18)]"
                    : "bg-white/70 text-[var(--foreground)] hover:bg-white"
                }`}
              >
                <div className="absolute right-3 top-3 z-20">
                  <button
                    aria-label="打开会话菜单"
                    className={`rounded-full px-2 py-1 text-sm leading-none transition ${
                      isActive ? "text-white/60 hover:bg-white/10" : "text-[var(--muted)] hover:bg-slate-100"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuSessionId((currentValue) =>
                        currentValue === session.id ? null : session.id
                      );
                    }}
                    type="button"
                  >
                    •••
                  </button>

                  {isMenuOpen ? (
                    <div
                      className="absolute right-0 top-9 w-28 rounded-2xl border border-[var(--border)] bg-white p-1.5 text-[var(--foreground)] shadow-[0_18px_36px_rgba(22,22,22,0.12)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--ink-soft)] hover:text-[var(--foreground)]"
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setMenuSessionId(null);
                        }}
                        type="button"
                      >
                        查看会话
                      </button>
                      <button
                        className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                        onClick={() => handleDeleteSession(session.id)}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  className="block w-full pr-10 text-left"
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setError(null);
                    setMenuSessionId(null);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-1 text-[15px] font-semibold leading-6">{session.title}</p>
                    <span
                      className={`shrink-0 text-xs ${isActive ? "text-white/70" : "text-[var(--muted)]"}`}
                    >
                      {formatSessionTime(session.updatedAt)}
                    </span>
                  </div>
                  <p
                    className={`mt-2 line-clamp-1 text-sm leading-6 ${
                      isActive ? "text-white/78" : "text-[var(--muted)]"
                    }`}
                  >
                    {getSessionPreview(session.messages)}
                  </p>
                  <p className={`mt-2 text-xs ${isActive ? "text-white/62" : "text-[var(--muted)]"}`}>
                    {matchedKnowledgeBase?.name ?? "未指定知识库"}
                  </p>
                </button>
              </article>
            );
          })}
          {visibleSessions.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-white/50 px-4 py-6 text-sm text-[var(--muted)]">
              当前知识库下还没有聊天记录，点击上方“新建”开始第一条会话。
            </div>
          ) : null}
        </div>
      </aside>

      <section className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[rgba(255,255,255,0.74)] shadow-[0_18px_45px_rgba(34,28,20,0.08)] backdrop-blur">
        <div className="border-b border-[var(--border)] px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
                Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
                AI Chat
              </h1>
            </div>

            {activeSession ? (
              <div className="rounded-[18px] border border-[var(--border)] bg-white/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">当前会话绑定</p>
                <p className="mt-1 text-base font-semibold">{activeKnowledgeBase?.name ?? "未指定知识库"}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-[620px] flex-col">
          <div className="flex-1 space-y-3 px-4 py-4 lg:px-6 lg:py-5">
            {activeSession ? (
              activeSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-[22px] px-4 py-3 transition-all duration-200 ${
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
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-7">{message.content}</p>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-white/35 px-8 text-center">
                <div>
                  <p className="text-2xl font-semibold tracking-[-0.04em]">当前没有聊天记录</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    点击左上角“新建”，开始一条新的会话。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] bg-white/68 px-4 py-4 lg:px-6">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <textarea
                className="min-h-24 rounded-[20px] border border-[var(--border)] bg-white px-4 py-3 text-[14px] outline-none transition focus:border-[var(--brand)]"
                disabled={!activeSession}
                minLength={2}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：客户以前没有实名在易签宝，现在三要素过不去，该怎么排查？"
                required
                value={question}
              />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {error ? <p className="text-sm text-red-600">{error}</p> : null}
                  <button
                    className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[var(--brand-strong)] disabled:opacity-60"
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
