import { Injectable } from "@nestjs/common";
import { CreateDocumentDto } from "@ai-kb/shared";
import { AiService } from "../ai/ai.service";

@Injectable()
export class DocumentsService {
  constructor(private readonly aiService: AiService) {}

  async list() {
    return [
      { id: "doc_1", title: "NestJS 架构说明.md", status: "indexed" },
      { id: "doc_2", title: "前端工程实践.pdf", status: "processing" }
    ];
  }

  async create(body: CreateDocumentDto) {
    // In a complete implementation this step would:
    // 1. persist document metadata in PostgreSQL
    // 2. store original file in object storage
    // 3. call the AI service to chunk + embed the content
    await this.aiService.ingestDocument({
      knowledgeBaseId: body.knowledgeBaseId,
      title: body.title,
      content: body.content
    });

    return {
      id: "doc_new",
      ...body,
      status: "queued"
    };
  }
}
