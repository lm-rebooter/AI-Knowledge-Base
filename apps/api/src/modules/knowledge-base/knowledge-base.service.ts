import { ConflictException, Injectable } from "@nestjs/common";
import { CreateKnowledgeBaseDto } from "@ai-kb/shared";
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
}
