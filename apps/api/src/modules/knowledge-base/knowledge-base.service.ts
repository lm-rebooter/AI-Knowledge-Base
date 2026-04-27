import { Injectable } from "@nestjs/common";
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
}
