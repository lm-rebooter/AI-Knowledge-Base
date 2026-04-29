import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DocumentStatus } from "@prisma/client";
import { readFile } from "fs/promises";
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from "@ai-kb/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { getDocumentAsset } from "../documents/document-asset.store";
import { getDocumentPreview, saveDocumentPreview } from "../documents/document-preview.store";
import { extractPdfTextWithPages } from "../documents/pdf-extractor";

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  async list() {
    // Querying with `_count` is a very common Prisma pattern.
    // It lets the frontend get both the parent records and lightweight
    // aggregate info in one request, which is ideal for list pages.
    const knowledgeBases = await this.prisma.knowledgeBase.findMany({
      orderBy: {
        createdAt: "asc"
      },
      include: {
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    return knowledgeBases.map((knowledgeBase) => ({
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      documentCount: knowledgeBase._count.documents
    }));
  }

  async create(body: CreateKnowledgeBaseDto) {
    const existingKnowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        name: body.name
      }
    });

    if (existingKnowledgeBase) {
      throw new ConflictException("A knowledge base with the same name already exists.");
    }

    const knowledgeBase = await this.prisma.knowledgeBase.create({
      data: {
        name: body.name,
        description: body.description
      }
    });

    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      documentCount: 0
    };
  }

  async findOne(id: string) {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id
      },
      include: {
        documents: {
          orderBy: {
            createdAt: "desc"
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    if (!knowledgeBase) {
      throw new NotFoundException("Knowledge base not found.");
    }

    const documentsWithAssets = await Promise.all(
      knowledgeBase.documents.map(async (document) => {
        const asset = await getDocumentAsset(document.id);
        let previewPages: string[] | null = null;

        if (asset?.mimeType === "application/pdf") {
          const savedPreview = await getDocumentPreview(document.id);

          if (savedPreview?.pageTexts?.length) {
            previewPages = savedPreview.pageTexts;
          } else {
            try {
              const fileBuffer = await readFile(asset.absolutePath);
              const extractedPreview = await extractPdfTextWithPages(fileBuffer);
              previewPages = extractedPreview.pageTexts
                .map((pageText) => pageText.replace(/\r\n/g, "\n").trim())
                .filter((pageText) => pageText.length > 0);

              if (previewPages.length) {
                await saveDocumentPreview(document.id, previewPages);
              }
            } catch {
              previewPages = null;
            }
          }
        }

        return {
          id: document.id,
          title: document.title,
          content: document.content,
          contentPreviewLabel: asset?.mimeType === "application/pdf" ? "提取文本预览（全文）" : "文档内容",
          status: document.status.toLowerCase(),
          createdAt: document.createdAt.toISOString(),
          fileUrl: asset ? `/api/documents/${document.id}/file` : null,
          fileType: asset?.mimeType ?? null,
          originalFileName: asset?.originalFileName ?? null,
          previewPages,
        };
      })
    );

    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description,
      documentCount: knowledgeBase._count.documents,
      documents: documentsWithAssets
    };
  }

  async update(id: string, body: UpdateKnowledgeBaseDto) {
    const existingKnowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id
      }
    });

    if (!existingKnowledgeBase) {
      throw new NotFoundException("Knowledge base not found.");
    }

    if (body.name && body.name !== existingKnowledgeBase.name) {
      const duplicateKnowledgeBase = await this.prisma.knowledgeBase.findUnique({
        where: {
          name: body.name
        }
      });

      if (duplicateKnowledgeBase) {
        throw new ConflictException("A knowledge base with the same name already exists.");
      }
    }

    const updatedKnowledgeBase = await this.prisma.knowledgeBase.update({
      where: {
        id
      },
      data: {
        name: body.name ?? existingKnowledgeBase.name,
        description: body.description ?? existingKnowledgeBase.description
      },
      include: {
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    return {
      id: updatedKnowledgeBase.id,
      name: updatedKnowledgeBase.name,
      description: updatedKnowledgeBase.description,
      documentCount: updatedKnowledgeBase._count.documents
    };
  }

  private async getDocumentPageTexts(documentId: string) {
    const savedPreview = await getDocumentPreview(documentId);
    if (savedPreview?.pageTexts?.length) {
      return savedPreview.pageTexts;
    }

    const asset = await getDocumentAsset(documentId);
    if (!asset || asset.mimeType !== "application/pdf") {
      return undefined;
    }

    try {
      const fileBuffer = await readFile(asset.absolutePath);
      const extractedPreview = await extractPdfTextWithPages(fileBuffer);
      const pageTexts = extractedPreview.pageTexts
        .map((pageText) => pageText.replace(/\r\n/g, "\n").trim())
        .filter((pageText) => pageText.length > 0);

      if (pageTexts.length) {
        await saveDocumentPreview(documentId, pageTexts);
        return pageTexts;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  async rebuildIndex(id: string) {
    const existingKnowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id
      },
      include: {
        documents: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!existingKnowledgeBase) {
      throw new NotFoundException("Knowledge base not found.");
    }

    await this.aiService.deleteKnowledgeBaseIndex(id);

    if (existingKnowledgeBase.documents.length === 0) {
      return {
        id,
        rebuiltCount: 0
      };
    }

    for (const document of existingKnowledgeBase.documents) {
      const pageTexts = await this.getDocumentPageTexts(document.id);

      await this.aiService.ingestDocument({
        documentId: document.id,
        knowledgeBaseId: document.knowledgeBaseId,
        title: document.title,
        content: document.content,
        pageTexts
      });

      if (document.status !== DocumentStatus.INDEXED) {
        await this.prisma.document.update({
          where: {
            id: document.id
          },
          data: {
            status: DocumentStatus.INDEXED
          }
        });
      }
    }

    return {
      id,
      rebuiltCount: existingKnowledgeBase.documents.length
    };
  }

  async remove(id: string) {
    const existingKnowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id
      }
    });

    if (!existingKnowledgeBase) {
      throw new NotFoundException("Knowledge base not found.");
    }

    try {
      await this.aiService.deleteKnowledgeBaseIndex(id);
    } catch {
      // Keep the knowledge base deletion flow available even if AI cleanup fails.
    }

    // Documents reference the knowledge base with a foreign key, so we delete
    // children first to keep the starter's delete flow predictable.
    await this.prisma.document.deleteMany({
      where: {
        knowledgeBaseId: id
      }
    });

    await this.prisma.knowledgeBase.delete({
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
