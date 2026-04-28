/**
 * 聊天问答服务 - 处理 RAG 问答和历史记录
 *
 * 【RAG 问答流程】
 * 1. 接收用户问题
 * 2. 调用 AI Service 获取答案（内部包含检索 + 生成）
 * 3. 保存问答历史到本地存储
 * 4. 返回答案和引用片段
 *
 * 【兜底机制】
 * 如果 AI Service 不可用，返回友好的提示信息
 * 这样前端可以正常展示，不至于崩溃
 */
import { Injectable, Logger } from "@nestjs/common";
import { ChatRequestDto } from "@ai-kb/shared";
import { AiService } from "../ai/ai.service";
import { listChatHistory, saveChatHistory } from "./chat-history.store";

@Injectable()
export class ChatService {
  // Logger 用于记录日志，方便调试和排查问题
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * 发起问答
   *
   * 【参数】
   * - body.question: 用户的问题
   * - body.knowledgeBaseId: 知识库 ID（可选）
   * - body.conversationId: 会话 ID（用于分组保存历史）
   *
   * 【返回】
   * {
   *   question: 原始问题,
   *   answer: AI 回答,
   *   contexts: 引用的片段
   * }
   */
  async ask(body: ChatRequestDto) {
    try {
      // 【正常流程】调用 AI 服务获取答案
      const response = await this.aiService.askQuestion(body);

      // 保存问答历史（用于 Dashboard 统计）
      await saveChatHistory({
        conversationId: body.conversationId,
        knowledgeBaseId: body.knowledgeBaseId,
        question: response.question,
        answer: response.answer,
        contexts: response.contexts ?? [],
        fallbackUsed: false  // 标记是否使用了兜底
      });

      return response;

    } catch (error) {
      // 【兜底机制】AI 服务不可用时
      this.logger.warn(
        `AI chat fallback triggered: ${error instanceof Error ? error.message : "unknown error"}`
      );

      // 返回友好的兜底信息，而不是报错
      const fallbackResponse = {
        question: body.question,
        answer:
          "AI 服务当前不可用，这是一条后端兜底提示。\n\n" +
          "你可以：\n" +
          "1. 确认 FastAPI AI Service 已启动（uvicorn app.main:app --reload）\n" +
          "2. 检查 AI_SERVICE_URL 环境变量配置\n" +
          "3. 后续再继续联调",
        contexts: body.knowledgeBaseId
          ? [`当前选择的知识库 ID: ${body.knowledgeBaseId}`]
          : ["当前未指定知识库。"]
      };

      // 即使失败也要保存历史，便于统计
      await saveChatHistory({
        conversationId: body.conversationId,
        knowledgeBaseId: body.knowledgeBaseId,
        question: fallbackResponse.question,
        answer: fallbackResponse.answer,
        contexts: fallbackResponse.contexts,
        fallbackUsed: true  // 标记使用了兜底
      });

      return fallbackResponse;
    }
  }

  /**
   * 获取问答统计摘要
   *
   * 用于 Dashboard 展示：
   * - 总会话数
   * - 总提问数
   * - 兜底回答次数（反映 AI 服务可用性）
   * - 最近一次问答时间
   */
  async getSummary() {
    const history = await listChatHistory();

    // 统计独立的会话数（去重 conversationId）
    const conversationIds = new Set(
      history
        .map((entry) => entry.conversationId)
        .filter((conversationId): conversationId is string => Boolean(conversationId))
    );

    // 统计使用了兜底的次数
    const fallbackCount = history.filter((entry) => entry.fallbackUsed).length;

    return {
      conversationCount: conversationIds.size,
      questionCount: history.length,
      fallbackCount,
      // 最近一次问答的时间
      lastAskedAt: history[0]?.createdAt ?? null
    };
  }
}
