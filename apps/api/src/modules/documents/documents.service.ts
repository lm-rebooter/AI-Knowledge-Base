import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DocumentStatus } from "@prisma/client";
import { CreateDocumentDto, UpdateDocumentDto } from "@ai-kb/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  async list() {
    const documents = await this.prisma.document.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      knowledgeBaseId: document.knowledgeBaseId,
      status: document.status.toLowerCase()
    }));
  }

  async create(body: CreateDocumentDto) {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id: body.knowledgeBaseId
      }
    });

    if (!knowledgeBase) {
      throw new NotFoundException("Knowledge base not found.");
    }

    // The database write is the primary source of truth.
    // AI ingestion runs afterwards so local CRUD demos still work even when
    // the Python service is not running yet.
    const document = await this.prisma.document.create({
      data: {
        knowledgeBaseId: body.knowledgeBaseId,
        title: body.title,
        content: body.content,
        status: DocumentStatus.PROCESSING
      }
    });

    let ingestStatus: "queued" | "skipped" = "queued";

    try {
      await this.aiService.ingestDocument({
        knowledgeBaseId: body.knowledgeBaseId,
        title: body.title,
        content: body.content
      });

      await this.prisma.document.update({
        where: {
          id: document.id
        },
        data: {
          status: DocumentStatus.INDEXED
        }
      });
    } catch (error) {
      ingestStatus = "skipped";
      this.logger.warn(
        `AI ingestion skipped for document ${document.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }

    return {
      id: document.id,
      knowledgeBaseId: document.knowledgeBaseId,
      title: document.title,
      status: ingestStatus === "queued" ? "indexed" : "processing",
      ingestStatus
    };
  }

  async update(id: string, body: UpdateDocumentDto) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("Document not found.");
    }

    const updatedDocument = await this.prisma.document.update({
      where: {
        id
      },
      data: {
        title: body.title ?? existingDocument.title,
        content: body.content ?? existingDocument.content,
        status: body.content ? DocumentStatus.PROCESSING : existingDocument.status
      }
    });

    return {
      id: updatedDocument.id,
      knowledgeBaseId: updatedDocument.knowledgeBaseId,
      title: updatedDocument.title,
      content: updatedDocument.content,
      status: updatedDocument.status.toLowerCase()
    };
  }

  async remove(id: string) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("Document not found.");
    }

    await this.prisma.document.delete({
      where: {
        id
      }
    });

    return {
      id,
      deleted: true
    };
  }
}
