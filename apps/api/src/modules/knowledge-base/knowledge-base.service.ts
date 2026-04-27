import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from "@ai-kb/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description,
      documentCount: knowledgeBase._count.documents,
      documents: knowledgeBase.documents.map((document) => ({
        id: document.id,
        title: document.title,
        content: document.content,
        status: document.status.toLowerCase(),
        createdAt: document.createdAt.toISOString()
      }))
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

  async remove(id: string) {
    const existingKnowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id
      }
    });

    if (!existingKnowledgeBase) {
      throw new NotFoundException("Knowledge base not found.");
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
