import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = (await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `
      select tablename
      from pg_tables
      where schemaname = 'public'
      order by tablename asc
    `
  )) ?? [];

  const [knowledgeBaseCount, documentCount, userCount, chatCount] = await Promise.all([
    prisma.knowledgeBase.count(),
    prisma.document.count(),
    prisma.user.count(),
    prisma.chat.count()
  ]);

  console.log("Public tables:");
  for (const table of tables) {
    console.log(`- ${table.tablename}`);
  }

  console.log("");
  console.log("Record counts:");
  console.log(`- KnowledgeBase: ${knowledgeBaseCount}`);
  console.log(`- Document: ${documentCount}`);
  console.log(`- User: ${userCount}`);
  console.log(`- Chat: ${chatCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
