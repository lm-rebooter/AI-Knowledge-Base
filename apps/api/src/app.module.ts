/**
NestJS 根模块 - 整合所有功能模块

【模块化架构】
NestJS 使用模块来组织代码，每个模块包含：
- Controllers（控制器）：处理 HTTP 请求
- Providers（提供者）：处理业务逻辑
- Imports（导入）：引入其他模块
- Exports（导出）：对外暴露服务

【当前模块一览】

┌─────────────────────────────────────────────────────────────┐
│                         AppModule                            │
│                    （根模块，组装所有模块）                      │
├─────────────────────────────────────────────────────────────┤
│  ConfigModule     │ 配置管理（环境变量）                       │
│  PrismaModule     │ 数据库 ORM                               │
│  AuthModule       │ 认证授权（JWT）                          │
│  UsersModule      │ 用户管理                                │
│  DocumentsModule  │ 文档管理                                │
│  KnowledgeBaseModule │ 知识库管理                            │
│  ChatModule       │ 聊天问答                                │
│  AiModule         │ AI 服务调用                             │
└─────────────────────────────────────────────────────────────┘
*/
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
    // 【配置模块】
    // isGlobal: true 表示这个模块全局可用，不需要在每个模块中重复导入
    ConfigModule.forRoot({
      isGlobal: true
    }),

    // 【数据库模块】
    PrismaModule,

    // 【认证模块】
    AuthModule,

    // 【用户模块】
    UsersModule,

    // 【文档模块】
    DocumentsModule,

    // 【知识库模块】
    KnowledgeBaseModule,

    // 【聊天模块】
    ChatModule,

    // 【AI 服务模块】
    // 负责调用 FastAPI AI Service
    AiModule
  ]
})
export class AppModule {}
