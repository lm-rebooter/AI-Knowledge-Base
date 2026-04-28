# Project Guide

这份文档回答 3 个问题：

1. 这个仓库里哪些文件最值得看。
2. 每个目录承担什么职责。
3. 新人进入项目时，先从哪条链路读最省力。

## 1. 仓库分层

```text
ai-knowledge-base
├── apps
│   ├── web          # Next.js 前端
│   ├── api          # NestJS 主后端
│   └── ai-service   # FastAPI AI 服务
├── packages
│   └── shared       # 共享 DTO / 类型 / 常量
├── docs             # 项目文档
├── infra            # Nginx / Docker / 脚本
└── docker-compose.yml
```

## 2. 最值得看的文件

### 前端

- `apps/web/app/knowledge/page.tsx`
  这是知识库页面入口，能看到页面如何组装表单和管理组件。
- `apps/web/components/create-document-form.tsx`
  最适合新人理解“表单提交 -> API 请求 -> 成功/失败反馈”的完整前端链路。
- `apps/web/components/chat-workspace.tsx`
  可以看到本地会话状态、知识库切换和聊天提交流程。
- `apps/web/lib/api.ts`
  全站统一请求封装，理解后看其他页面会快很多。

### 主后端

- `apps/api/src/main.ts`
  NestJS 启动入口，负责全局前缀、CORS、验证管道和异常过滤器。
- `apps/api/src/app.module.ts`
  根模块，把所有业务模块串起来。
- `apps/api/src/modules/documents/documents.controller.ts`
  文档接口入口，适合看上传和 CRUD 路由。
- `apps/api/src/modules/documents/documents.service.ts`
  最关键的业务文件之一，串起文件解析、数据库写入、AI 入库和文件存储。
- `apps/api/src/modules/chat/chat.service.ts`
  适合理解聊天问答、会话统计和本地历史存储。
- `apps/api/src/modules/ai/ai.service.ts`
  主后端如何调用 Python AI 服务的桥接层。
- `apps/api/prisma/schema.prisma`
  数据结构定义，是理解业务关系最短的入口。

### AI 服务

- `apps/ai-service/app/main.py`
  FastAPI 启动入口和路由挂载点。
- `apps/ai-service/app/api/ingest.py`
  文档入库接口。
- `apps/ai-service/app/api/chat.py`
  RAG 问答接口。
- `apps/ai-service/app/rag/loader.py`
- `apps/ai-service/app/rag/splitter.py`
- `apps/ai-service/app/rag/retriever.py`
- `apps/ai-service/app/rag/chain.py`
  这几份文件连起来，就是完整的 RAG 主链路。

### 共享包

- `packages/shared/src/dto/*.ts`
  前后端共享请求体与响应相关类型。
- `packages/shared/src/types/common.ts`
  通用 API 响应包裹类型。

## 3. 实际目录职责

### `apps/web`

- `app/`: 页面路由入口
- `components/`: 页面级和业务级组件
- `lib/`: API、认证和小工具

当前有效页面：

- `/`
- `/login`
- `/dashboard`
- `/knowledge`
- `/knowledge/[id]`
- `/chat`

### `apps/api`

- `src/common`: 公共守卫、装饰器、过滤器、拦截器
- `src/modules/auth`: 登录和 JWT
- `src/modules/users`: 用户查询
- `src/modules/knowledge-base`: 知识库 CRUD
- `src/modules/documents`: 文档上传、解析、入库和文件下载
- `src/modules/chat`: 问答、会话历史和摘要统计
- `src/modules/ai`: 调用 FastAPI 的适配层
- `src/prisma`: Prisma Service 和 Module
- `prisma`: schema、seed、reset 脚本
- `storage`: 开发期本地文件与本地索引存储

### `apps/ai-service`

- `app/api`: HTTP 路由
- `app/core`: 配置和 LLM 调用
- `app/rag`: RAG 处理链
- `app/vectorstore`: FAISS / Pinecone 抽象
- `data`: 开发期本地知识存储

## 4. 哪些文件是源码，哪些是产物

### 源码/配置，应该保留

- `src/`, `app/`, `components/`, `lib/`
- `prisma/schema.prisma`
- `requirements.txt`, `package.json`, `docker-compose.yml`
- `docs/`, `infra/`

### 运行产物，通常不提交

- `apps/web/.next`
- `apps/api/dist`
- `*.tsbuildinfo`
- `.turbo`
- `apps/api/storage/*.json`
- `apps/api/storage/uploads/*`
- `apps/ai-service/.venv`
- `apps/ai-service/data/knowledge_store.json`

## 5. 新人第一次读代码时的建议

- 不要一开始就横向把所有文件扫一遍。
- 最好顺着一条真实业务链往下读。
- 最推荐的第一条链是“新增文档”。

推荐路径：

1. `apps/web/app/knowledge/page.tsx`
2. `apps/web/components/create-document-form.tsx`
3. `apps/web/lib/api.ts`
4. `apps/api/src/modules/documents/documents.controller.ts`
5. `apps/api/src/modules/documents/documents.service.ts`
6. `apps/api/src/modules/ai/ai.service.ts`
7. `apps/ai-service/app/api/ingest.py`
8. `apps/ai-service/app/rag/*.py`

读完这条链，再回来看聊天，你会快很多。
