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
    <main className="mx-auto grid min-h-screen max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[280px_1fr]">
      <MainNav />
      <div className="lg:col-span-2 grid gap-6 lg:grid-cols-[280px_1fr]">
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
