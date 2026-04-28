import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // This reset is intentionally scoped to PostgreSQL records only.
  // It does not remove local uploaded files or AI-side JSON vector data.
  await prisma.chat.deleteMany();
  await prisma.user.deleteMany();
  await prisma.document.deleteMany();
  await prisma.knowledgeBase.deleteMany();

  console.log("Database records cleared: Chat, User, Document, KnowledgeBase.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
