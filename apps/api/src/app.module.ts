import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { KnowledgeBaseModule } from "./modules/knowledge-base/knowledge-base.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    KnowledgeBaseModule,
    ChatModule,
    AiModule
  ]
})
export class AppModule {}
