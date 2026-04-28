/**
 * 文档服务 - 处理文档的 CRUD 和文件上传
 *
 * 【核心功能】
 * 1. 文档列表查询
 * 2. 创建文档（支持纯文本或文件上传）
 * 3. 更新文档
 * 4. 删除文档
 * 5. 重新索引（重新入库 AI）
 * 6. 文件下载
 *
 * 【文件处理流程】
 * 用户上传文件 → 提取文本内容 → 保存到数据库 → 触发 AI 入库
 *
 * 【支持的格式】
 * - 纯文本：.txt, .md, .markdown, .json, .csv
 * - PDF：.pdf（通过 pdf-parse 提取文本）
 */
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

  // 支持的纯文本格式
  private readonly supportedTextExtensions = [".txt", ".md", ".markdown", ".json", ".csv"];
  // 支持的 PDF 格式
  private readonly supportedPdfExtensions = [".pdf"];

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  /**
   * 获取所有文档列表
   */
  async list() {
    const documents = await this.prisma.document.findMany({
      orderBy: {
        createdAt: "desc"  // 按创建时间倒序，最新的在前
      }
    });

    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      knowledgeBaseId: document.knowledgeBaseId,
      status: document.status.toLowerCase(),
      fileUrl: `/api/documents/${document.id}/file`  // 文件下载 URL
    }));
  }

  /**
   * 创建文档（纯文本方式）
   * 用于知识库页面直接输入文本内容
   */
  async create(body: CreateDocumentDto) {
    return this.createAndIngestDocument(body);
  }

  /**
   * 上传文档（文件方式）
   * 支持 PDF 和纯文本文件，自动提取内容
   */
  async upload(file: UploadedDocumentFile | undefined, knowledgeBaseId: string, title?: string) {
    // 验证文件存在
    if (!file) {
      throw new BadRequestException("请上传文件。");
    }

    // 提取文件内容
    const extractedContent = await this.extractFileContent(file);
    // 使用指定标题或文件名作为文档标题
    const derivedTitle = title?.trim() || file.originalname;

    // 创建文档并触发 AI 入库
    const createdDocument = await this.createAndIngestDocument({
      knowledgeBaseId,
      title: derivedTitle,
      content: extractedContent
    });

    // 保存原始文件到本地存储
    await saveDocumentAsset(createdDocument.id, file);

    return createdDocument;
  }

  /**
   * 创建文档并触发 AI 入库
   *
   * 【流程】
   * 1. 验证知识库存在
   * 2. 创建文档记录（状态 = PROCESSING）
   * 3. 调用 AI Service 入库
   * 4. 更新状态为 INDEXED
   */
  private async createAndIngestDocument(body: CreateDocumentDto) {
    // 验证知识库存在
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id: body.knowledgeBaseId
      }
    });

    if (!knowledgeBase) {
      throw new NotFoundException("知识库不存在。");
    }

    // 【数据库写入】先保存文档记录
    // 即使 AI 入库失败，文档也保存成功，便于后续重试
    const document = await this.prisma.document.create({
      data: {
        knowledgeBaseId: body.knowledgeBaseId,
        title: body.title,
        content: body.content,
        status: DocumentStatus.PROCESSING  // 处理中状态
      }
    });

    let ingestStatus: "queued" | "skipped" = "queued";

    // 【AI 入库】
    // 使用 try-catch 确保即使 AI 服务不可用，数据库操作不受影响
    try {
      await this.aiService.ingestDocument({
        documentId: document.id,
        knowledgeBaseId: body.knowledgeBaseId,
        title: body.title,
        content: body.content
      });

      // 入库成功，更新状态
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
        `AI 入库跳过，文档 ${document.id}: ${error instanceof Error ? error.message : "未知错误"}`
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

  /**
   * 提取文件内容
   *
   * 根据文件扩展名选择不同的提取策略：
   * - 纯文本：直接读取 buffer 转字符串
   * - PDF：使用 pdf-parse 库提取文本
   */
  private async extractFileContent(file: UploadedDocumentFile) {
    const lowerName = file.originalname.toLowerCase();

    // 【纯文本处理】
    const matchedExtension = this.supportedTextExtensions.find((extension) =>
      lowerName.endsWith(extension)
    );

    if (matchedExtension) {
      // Buffer 转 UTF-8 字符串
      const content = file.buffer.toString("utf-8").trim();

      if (content.length < 10) {
        throw new BadRequestException("文件内容太短，无法索引。");
      }

      return content;
    }

    // 【PDF 处理】
    const matchedPdfExtension = this.supportedPdfExtensions.find((extension) =>
      lowerName.endsWith(extension)
    );

    if (matchedPdfExtension) {
      const content = await this.extractPdfText(file.buffer);

      if (content.length < 10) {
        throw new BadRequestException("PDF 内容太短，无法索引。");
      }

      return content;
    }

    // 【不支持的格式】
    throw new BadRequestException(
      "当前支持 .txt, .md, .markdown, .json, .csv 和 .pdf 文件。"
    );
  }

  /**
   * 提取 PDF 文本
   *
   * 使用 pdf-parse 库解析 PDF 内容
   * 注意：这是一个同步操作，大文件可能需要较长时间
   */
  private async extractPdfText(fileBuffer: Buffer) {
    let pdfParse: ((buffer: Buffer) => Promise<ParsedPdfDocument>) | undefined;

    try {
      // 动态引入 pdf-parse（懒加载）
      pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<ParsedPdfDocument>;
    } catch {
      throw new BadRequestException(
        "PDF 解析需要安装 pdf-parse 包。请在项目根目录运行 pnpm install 后重试。"
      );
    }

    const parsedPdf = await pdfParse(fileBuffer);
    // 返回提取的纯文本内容
    return parsedPdf.text.trim();
  }

  /**
   * 更新文档
   */
  async update(id: string, body: UpdateDocumentDto) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("文档不存在。");
    }

    // 更新文档
    const updatedDocument = await this.prisma.document.update({
      where: {
        id
      },
      data: {
        title: body.title ?? existingDocument.title,
        content: body.content ?? existingDocument.content,
        // 如果更新了内容，重置状态为 PROCESSING
        status: body.content ? DocumentStatus.PROCESSING : existingDocument.status
      }
    });

    // 如果更新了内容，重新触发 AI 入库
    let finalStatus = updatedDocument.status;

    if (body.content) {
      try {
        await this.aiService.ingestDocument({
          documentId: updatedDocument.id,
          knowledgeBaseId: updatedDocument.knowledgeBaseId,
          title: updatedDocument.title,
          content: updatedDocument.content
        });

        // 入库成功，更新状态
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
          `AI 重新入库跳过，文档 ${updatedDocument.id}: ${error instanceof Error ? error.message : "未知错误"}`
        );
      }
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

  /**
   * 重新索引文档
   * 用于手动触发 AI 入库，解决之前入库失败的问题
   */
  async reindex(id: string) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("文档不存在。");
    }

    // 更新状态为处理中
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
        `AI 重新索引跳过，文档 ${existingDocument.id}: ${error instanceof Error ? error.message : "未知错误"}`
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

  /**
   * 删除文档
   */
  async remove(id: string) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("文档不存在。");
    }

    // 删除文档记录
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

  /**
   * 流式下载文件
   *
   * 使用流式传输，适合大文件
   * 设置正确的 Content-Type 和 Content-Disposition
   */
  async streamFile(id: string, response: Response) {
    const existingDocument = await this.prisma.document.findUnique({
      where: {
        id
      }
    });

    if (!existingDocument) {
      throw new NotFoundException("文档不存在。");
    }

    // 获取文件资产
    const asset = await getDocumentAsset(id);

    if (!asset) {
      throw new NotFoundException("文件不存在。");
    }

    // 设置响应头
    response.setHeader("Content-Type", asset.mimeType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(asset.originalFileName)}"`
    );

    // 使用流式传输，避免大文件占用过多内存
    return createReadStream(asset.absolutePath).pipe(response);
  }
}
