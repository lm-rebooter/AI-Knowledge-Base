import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DocumentStatus } from "@prisma/client";
import { CreateDocumentDto, UpdateDocumentDto } from "@ai-kb/shared";
import { createReadStream } from "fs";
import { Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { ParsedPdfDocument, UploadedDocumentFile } from "./document-file.type";
import { getDocumentAsset, saveDocumentAsset } from "./document-asset.store";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly supportedTextExtensions = [".txt", ".md", ".markdown", ".json", ".csv"];
  private readonly supportedPdfExtensions = [".pdf"];

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
      status: document.status.toLowerCase(),
      fileUrl: `/api/documents/${document.id}/file`
    }));
  }

  async create(body: CreateDocumentDto) {
    return this.createAndIngestDocument(body);
  }

  async upload(file: UploadedDocumentFile | undefined, knowledgeBaseId: string, title?: string) {
    if (!file) {
      throw new BadRequestException("Please upload a file.");
    }

    const extractedContent = await this.extractFileContent(file);
    const derivedTitle = title?.trim() || file.originalname;

    const createdDocument = await this.createAndIngestDocument({
      knowledgeBaseId,
      title: derivedTitle,
      content: extractedContent
    });

    await saveDocumentAsset(createdDocument.id, file);

    return createdDocument;
  }

  private async createAndIngestDocument(body: CreateDocumentDto) {
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
        documentId: document.id,
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

  private async extractFileContent(file: UploadedDocumentFile) {
    const lowerName = file.originalname.toLowerCase();
    const matchedExtension = this.supportedTextExtensions.find((extension) =>
      lowerName.endsWith(extension)
    );

    if (matchedExtension) {
      const content = file.buffer.toString("utf-8").trim();

      if (content.length < 10) {
        throw new BadRequestException("The uploaded file content is too short to index.");
      }

      return content;
    }

    const matchedPdfExtension = this.supportedPdfExtensions.find((extension) =>
      lowerName.endsWith(extension)
    );

    if (matchedPdfExtension) {
      const content = await this.extractPdfText(file.buffer);

      if (content.length < 10) {
        throw new BadRequestException("The uploaded PDF content is too short to index.");
      }

      return content;
    }

    throw new BadRequestException(
      "Current upload supports .txt, .md, .markdown, .json, .csv, and .pdf files."
    );
  }

  private async extractPdfText(fileBuffer: Buffer) {
    let pdfParse: ((buffer: Buffer) => Promise<ParsedPdfDocument>) | undefined;

    try {
      pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<ParsedPdfDocument>;
    } catch {
      throw new BadRequestException(
        "PDF support requires the `pdf-parse` package. Please run `pnpm install` in the project root and try again."
      );
    }

    const parsedPdf = await pdfParse(fileBuffer);
    return parsedPdf.text.trim();
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

    let finalStatus = updatedDocument.status;

    try {
      await this.aiService.ingestDocument({
        documentId: updatedDocument.id,
        knowledgeBaseId: updatedDocument.knowledgeBaseId,
        title: updatedDocument.title,
        content: updatedDocument.content
      });

      const indexedDocument = await this.prisma.document.update({
        where: {
          id
        },
        data: {
          status: DocumentStatus.INDEXED
        }
      });

      finalStatus = indexedDocument.status;
    } catch (error) {
      this.logger.warn(
        `AI re-ingestion skipped for document ${updatedDocument.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }

    return {
      id: updatedDocument.id,
      knowledgeBaseId: updatedDocument.knowledgeBaseId,
      title: updatedDocument.title,
      content: updatedDocument.content,
      status: finalStatus.toLowerCase(),
      fileUrl: `/api/documents/${updatedDocument.id}/file`
    };
  }

  async reindex(id: string) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("Document not found.");
    }

    await this.prisma.document.update({
      where: {
        id
      },
      data: {
        status: DocumentStatus.PROCESSING
      }
    });

    let finalStatus: DocumentStatus = DocumentStatus.PROCESSING;
    let ingestStatus: "queued" | "skipped" = "queued";

    try {
      await this.aiService.ingestDocument({
        documentId: existingDocument.id,
        knowledgeBaseId: existingDocument.knowledgeBaseId,
        title: existingDocument.title,
        content: existingDocument.content
      });

      const indexedDocument = await this.prisma.document.update({
        where: {
          id
        },
        data: {
          status: DocumentStatus.INDEXED
        }
      });

      finalStatus = indexedDocument.status;
    } catch (error) {
      ingestStatus = "skipped";
      this.logger.warn(
        `AI reindex skipped for document ${existingDocument.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }

    return {
      id: existingDocument.id,
      knowledgeBaseId: existingDocument.knowledgeBaseId,
      title: existingDocument.title,
      status: finalStatus.toLowerCase(),
      ingestStatus
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

  async streamFile(id: string, response: Response) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("Document not found.");
    }

    const asset = await getDocumentAsset(id);

    if (!asset) {
      throw new NotFoundException("Document file not found.");
    }

    response.setHeader("Content-Type", asset.mimeType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(asset.originalFileName)}"`
    );

    return createReadStream(asset.absolutePath).pipe(response);
  }
}
