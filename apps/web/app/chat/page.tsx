import { apiRequest } from "@/lib/api";
import { ChatWorkspace } from "@/components/chat-workspace";
import { MainNav } from "@/components/main-nav";
import type { ApiEnvelope } from "@ai-kb/shared";

type KnowledgeBaseItem = {
  id: string;
  name: string;
  documentCount: number;
};

async function getKnowledgeBases() {
  try {
    const response = await apiRequest<ApiEnvelope<KnowledgeBaseItem[]>>("/knowledge-bases", {
      cache: "no-store"
    });

    return response.data;
  } catch {
    return [];
  }
}

export default async function ChatPage() {
  const knowledgeBases = await getKnowledgeBases();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <MainNav />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ChatWorkspace
          knowledgeBases={
            knowledgeBases.length > 0
              ? knowledgeBases.map((knowledgeBase) => ({
                  id: knowledgeBase.id,
                  name: knowledgeBase.name
                }))
              : [{ id: "", name: "当前没有知识库" }]
          }
        />
      </div>
    </main>
  );
}
