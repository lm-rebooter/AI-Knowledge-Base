/**
 * AI 服务调用模块 - 封装与 FastAPI AI Service 的交互
 *
 * 【设计目的】
 * 将对 AI 服务的 HTTP 调用封装在这里，隔离外部依赖
 * 方便后续替换 AI 服务提供商（如从 FastAPI 换成其他服务）
 *
 * 【当前支持的 AI 能力】
 * 1. askQuestion: RAG 问答
 * 2. ingestDocument: 文档入库
 */
import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ChatRequestDto, IngestDocumentRequest } from "@ai-kb/shared";

@Injectable()
export class AiService {
  // 【依赖注入】HttpService 用于发起 HTTP 请求
  // NestJS 封装了 Axios，提供更好的测试支持
  constructor(private readonly httpService: HttpService) {}

  // 【配置】AI 服务的基础 URL
  // 从环境变量读取，默认连接到本地 FastAPI 服务
  private readonly baseUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

  /**
   * 发起 RAG 问答
   *
   * 【请求体格式】
   * {
   *   question: "用户的问题",
   *   knowledgeBaseId: "可选，指定知识库"
   * }
   *
   * 【响应格式】
   * {
   *   question: "原始问题",
   *   answer: "AI 生成的回答",
   *   contexts: ["引用的片段1", "引用的片段2"]
   * }
   */
  async askQuestion(payload: ChatRequestDto) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/chat`, payload)
    );

    return response.data;
  }

  /**
   * 触发文档入库（切片 + 向量化）
   *
   * 【请求体格式】
   * {
   *   documentId: "文档ID",
   *   knowledgeBaseId: "知识库ID",
   *   title: "文档标题",
   *   content: "文档内容"
   * }
   *
   * 【响应格式】
   * {
   *   title: "文档标题",
   *   knowledgeBaseId: "知识库ID",
   *   chunkCount: 切片数量,
   *   vectorCount: 向量数量,
   *   status: "queued"
   * }
   */
  async ingestDocument(payload: IngestDocumentRequest) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/ingest`, payload)
    );

    return response.data;
  }

  async deleteDocumentIndex(documentId: string) {
    const response = await firstValueFrom(
      this.httpService.delete(`${this.baseUrl}/api/index/documents/${documentId}`)
    );

    return response.data;
  }

  async deleteKnowledgeBaseIndex(knowledgeBaseId: string) {
    const response = await firstValueFrom(
      this.httpService.delete(`${this.baseUrl}/api/index/knowledge-bases/${knowledgeBaseId}`)
    );

    return response.data;
  }
}
