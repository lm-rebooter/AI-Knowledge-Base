import { Injectable, Logger } from "@nestjs/common";
import { ChatRequestDto } from "@ai-kb/shared";
import { AiService } from "../ai/ai.service";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly aiService: AiService) {}

  async ask(body: ChatRequestDto) {
    try {
      return await this.aiService.askQuestion(body);
    } catch (error) {
      this.logger.warn(
        `AI chat fallback triggered: ${error instanceof Error ? error.message : "unknown error"}`
      );

      return {
        question: body.question,
        answer:
          "AI 服务当前不可用，所以这里返回的是后端兜底提示。你可以先继续完成前后端联调，后续再启动 FastAPI 服务接入真实 RAG 回答。",
        contexts: body.knowledgeBaseId
          ? [`当前选择的知识库 ID: ${body.knowledgeBaseId}`]
          : ["当前未指定知识库。"]
      };
    }
  }
}
