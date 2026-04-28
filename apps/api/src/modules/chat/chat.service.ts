import { Injectable, Logger } from "@nestjs/common";
import { ChatRequestDto } from "@ai-kb/shared";
import { AiService } from "../ai/ai.service";
import { listChatHistory, saveChatHistory } from "./chat-history.store";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly aiService: AiService) {}

  async ask(body: ChatRequestDto) {
    try {
      const response = await this.aiService.askQuestion(body);

      await saveChatHistory({
        conversationId: body.conversationId,
        knowledgeBaseId: body.knowledgeBaseId,
        question: response.question,
        answer: response.answer,
        contexts: response.contexts ?? [],
        fallbackUsed: false
      });

      return response;
    } catch (error) {
      this.logger.warn(
        `AI chat fallback triggered: ${error instanceof Error ? error.message : "unknown error"}`
      );

      const fallbackResponse = {
        question: body.question,
        answer:
          "AI 服务当前不可用，所以这里返回的是后端兜底提示。你可以先继续完成前后端联调，后续再启动 FastAPI 服务接入真实 RAG 回答。",
        contexts: body.knowledgeBaseId
          ? [`当前选择的知识库 ID: ${body.knowledgeBaseId}`]
          : ["当前未指定知识库。"]
      };

      await saveChatHistory({
        conversationId: body.conversationId,
        knowledgeBaseId: body.knowledgeBaseId,
        question: fallbackResponse.question,
        answer: fallbackResponse.answer,
        contexts: fallbackResponse.contexts,
        fallbackUsed: true
      });

      return fallbackResponse;
    }
  }

  async getSummary() {
    const history = await listChatHistory();
    const conversationIds = new Set(
      history
        .map((entry) => entry.conversationId)
        .filter((conversationId): conversationId is string => Boolean(conversationId))
    );

    const fallbackCount = history.filter((entry) => entry.fallbackUsed).length;

    return {
      conversationCount: conversationIds.size,
      questionCount: history.length,
      fallbackCount,
      lastAskedAt: history[0]?.createdAt ?? null
    };
  }
}
