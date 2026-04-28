# Learning Path

这份路线是给“前端出身、第一次碰全栈 + AI 项目”的同学准备的。

## Phase 0: 先把项目跑起来

目标：

- 知道每个服务的作用
- 能本地启动页面、API、数据库和 AI Service

建议动作：

1. `pnpm install`
2. `docker compose up -d postgres redis`
3. `pnpm --filter @ai-kb/api prisma:db:push`
4. `pnpm --filter @ai-kb/api prisma:seed`
5. `pnpm dev`
6. 单独启动 `apps/ai-service`

你在这一阶段先不要急着改代码，先把环境认清。

## Phase 1: 只看前端，不下钻实现

目标：

- 知道页面有哪些
- 理解用户操作是怎么变成 API 请求的

建议顺序：

1. `apps/web/app/layout.tsx`
2. `apps/web/components/main-nav.tsx`
3. `apps/web/app/knowledge/page.tsx`
4. `apps/web/app/knowledge/[id]/page.tsx`
5. `apps/web/app/chat/page.tsx`
6. `apps/web/lib/api.ts`

这一阶段重点回答两个问题：

- 页面入口在哪里
- 页面数据从哪里来

## Phase 2: 顺着“新增文档”读一遍

这是最推荐的第一条主线，因为它同时覆盖前端、后端、数据库和 AI。

阅读顺序：

1. `apps/web/components/create-document-form.tsx`
2. `apps/api/src/modules/documents/documents.controller.ts`
3. `apps/api/src/modules/documents/documents.service.ts`
4. `apps/api/src/modules/documents/document-asset.store.ts`
5. `apps/api/src/modules/ai/ai.service.ts`
6. `apps/ai-service/app/api/ingest.py`
7. `apps/ai-service/app/rag/loader.py`
8. `apps/ai-service/app/rag/splitter.py`
9. `apps/ai-service/app/rag/embeddings.py`
10. `apps/ai-service/app/vectorstore/faiss_store.py`

读完这条链，你会真正理解“一个文档怎么变成可检索知识”。

## Phase 3: 再看“聊天问答”

阅读顺序：

1. `apps/web/components/chat-workspace.tsx`
2. `apps/api/src/modules/chat/chat.controller.ts`
3. `apps/api/src/modules/chat/chat.service.ts`
4. `apps/api/src/modules/chat/chat-history.store.ts`
5. `apps/api/src/modules/chat/chat-session.store.ts`
6. `apps/ai-service/app/api/chat.py`
7. `apps/ai-service/app/rag/retriever.py`
8. `apps/ai-service/app/rag/chain.py`

这一阶段重点理解：

- 会话状态如何维护
- 问题如何传给 AI Service
- 检索和生成各自发生在哪一层

## Phase 4: 看数据库和共享契约

阅读顺序：

1. `apps/api/prisma/schema.prisma`
2. `apps/api/prisma/seed.ts`
3. `packages/shared/src/dto/*.ts`
4. `packages/shared/src/types/common.ts`

这一阶段重点理解：

- 数据模型怎么支撑前面的页面和接口
- 为什么前后端要共享 DTO

## Phase 5: 再看基础设施和部署

阅读顺序：

1. `docker-compose.yml`
2. `apps/api/Dockerfile`
3. `apps/web/Dockerfile`
4. `apps/ai-service/Dockerfile`
5. `docs/deployment.md`

## 最后给新人的建议

- 一次只跟一条业务链，不要一上来平铺全仓库。
- 先读“入口文件”和“服务编排文件”，再读细节工具。
- 看不懂 AI 代码时，不要卡太久，先搞懂 HTTP 边界和数据流更重要。
- 这个项目最有价值的不是单个文件，而是“前端 -> API -> AI Service -> 存储”的分层方式。
