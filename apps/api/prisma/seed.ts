import { PrismaClient, DocumentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // This seed keeps the first database experience friendly:
  // once the tables exist, the knowledge page immediately has visible data.
  const frontendKb = await prisma.knowledgeBase.upsert({
    where: {
      name: "前端工程"
    },
    update: {
      description: "收集前端工程化、性能优化和组件设计相关知识。"
    },
    create: {
      name: "前端工程",
      description: "收集前端工程化、性能优化和组件设计相关知识。"
    }
  });

  const nestKb = await prisma.knowledgeBase.upsert({
    where: {
      name: "NestJS 学习"
    },
    update: {
      description: "用于整理 NestJS 模块化、鉴权、数据库访问等实践。"
    },
    create: {
      name: "NestJS 学习",
      description: "用于整理 NestJS 模块化、鉴权、数据库访问等实践。"
    }
  });

  const documentSeeds = [
    {
      title: "前端工程化清单",
      content: "包含构建流程、CI、监控、性能优化等主题。",
      status: DocumentStatus.INDEXED,
      knowledgeBaseId: frontendKb.id
    },
    {
      title: "组件设计模式",
      content: "总结可复用组件、状态管理和交互抽象方式。",
      status: DocumentStatus.INDEXED,
      knowledgeBaseId: frontendKb.id
    },
    {
      title: "NestJS 模块设计",
      content: "记录模块边界、依赖注入、守卫和拦截器组织方式。",
      status: DocumentStatus.INDEXED,
      knowledgeBaseId: nestKb.id
    }
  ];

  for (const documentSeed of documentSeeds) {
    const exists = await prisma.document.findFirst({
      where: {
        title: documentSeed.title,
        knowledgeBaseId: documentSeed.knowledgeBaseId
      }
    });

    if (!exists) {
      await prisma.document.create({
        data: documentSeed
      });
    }
  }

  console.log("Database seeded with starter knowledge bases and documents.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
