# AI Knowledge Base

一个适合前端开发者转全栈的 AI 知识库练手项目。仓库拆成 3 个应用和 1 个共享包：

- `apps/web`: Next.js 15 前端，负责页面、交互和表单
- `apps/api`: NestJS 主后端，负责认证、知识库、文档、聊天和数据库访问
- `apps/ai-service`: FastAPI AI 服务，负责文档入库、检索和 RAG 问答
- `packages/shared`: 前后端共享 DTO、常量和响应类型

## Start Here

第一次接触这个项目，建议按下面顺序：

1. 先读 [docs/PROJECT_GUIDE.md](/Users/lm/Desktop/ai-knowledge-base/docs/PROJECT_GUIDE.md) 了解仓库地图
2. 再读 [docs/LEARNING_PATH.md](/Users/lm/Desktop/ai-knowledge-base/docs/LEARNING_PATH.md) 按路线学习
3. 需要看整体调用关系时，打开 [docs/architecture.md](/Users/lm/Desktop/ai-knowledge-base/docs/architecture.md)
4. 想看可视化架构图，直接打开根目录的 [architecture.html](/Users/lm/Desktop/ai-knowledge-base/architecture.html)

## 环境要求

- Node.js 20+
- pnpm 10+
- Python 3.9+
- Docker Desktop

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动基础服务

后端依赖 PostgreSQL 和 Redis。你截图里的报错：

```text
PrismaClientInitializationError: Can't reach database server at `localhost:5432`
```

说明数据库还没启动，所以 `pnpm --filter @ai-kb/api dev` 命令本身没错，只是前置服务没起来。

先执行：

```bash
docker compose up -d postgres redis
```

### 3. 初始化数据库

```bash
pnpm --filter @ai-kb/api prisma:db:push
pnpm --filter @ai-kb/api prisma:seed
```

### 4. 启动后端 API

是的，单独启动 NestJS 后端就是这个命令：

```bash
pnpm --filter @ai-kb/api dev
```

默认端口：`3001`

### 5. 启动 AI Service

如果你要完整体验“文档入库 -> 检索 -> 问答”，还需要单独启动 FastAPI AI 服务：

```bash
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

默认端口：`8000`

### 6. 启动前端

```bash
pnpm --filter @ai-kb/web dev
```

默认端口：`3000`

### 7. 一次性并行启动

如果数据库已经起来了，也已经装好 AI Service 的 Python 依赖，那么前端和 NestJS 可以一起用：

```bash
pnpm dev
```

注意：根目录的 `pnpm dev` 只会启动 Turborepo 里的 Node 应用，不会自动帮你启动 `apps/ai-service` 的 `uvicorn`。

## 推荐启动顺序

每次本地开发，按这个顺序最稳：

1. `docker compose up -d postgres redis`
2. `pnpm --filter @ai-kb/api prisma:db:push`
3. `pnpm --filter @ai-kb/api prisma:seed` 首次需要
4. 新终端启动 `pnpm --filter @ai-kb/api dev`
5. 新终端启动 `cd apps/ai-service && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
6. 新终端启动 `pnpm --filter @ai-kb/web dev`

## 常用命令

```bash
# 查看数据库表
pnpm db:tables

# 重置数据库并重新灌入种子数据
pnpm db:reset:seed

# 打开 Prisma Studio
pnpm db:studio

# 只启动 API
pnpm --filter @ai-kb/api dev

# 只启动 Web
pnpm --filter @ai-kb/web dev
```

## 环境变量

本地开发时，API 使用 [apps/api/.env](/Users/lm/Desktop/ai-knowledge-base/apps/api/.env)：

```env
API_PORT=3001
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_knowledge_base?schema=public
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
```

重点看这两个：

- `DATABASE_URL`: PostgreSQL 地址，决定 Prisma 能不能连上数据库
- `AI_SERVICE_URL`: NestJS 调 AI Service 的地址，决定知识库检索和问答能不能工作

## 启动排查

### 1. `Can't reach database server at localhost:5432`

先确认数据库容器起来了：

```bash
docker compose ps
```

如果 `postgres` 没起来，执行：

```bash
docker compose up -d postgres
```

### 2. Chat 提示 `AI 服务当前不可用`

说明 `apps/api` 没连上 `apps/ai-service`。先确认这个命令是否在运行：

```bash
cd apps/ai-service
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. `pnpm dev` 跑起来了，但问答还是不工作

常见原因是：

- 只启动了前端和 NestJS，没有启动 AI Service
- 知识库文档还没重建索引
- `AI_SERVICE_URL` 不是 `http://localhost:8000`

## Useful Vs Generated

建议保留：

- `apps/**/src`, `apps/web/app`, `apps/web/components`, `packages/shared/src`
- `apps/api/prisma/schema.prisma`, `seed.ts`, `reset.ts`
- `docs/`, `docker-compose.yml`, `infra/`
- `apps/api/storage/uploads/.gitkeep`

建议忽略或定期清理：

- `apps/web/.next`
- `apps/api/dist`
- `*.tsbuildinfo`
- `.turbo`
- `apps/api/storage/*.json`
- `apps/api/storage/uploads/*`
- `apps/ai-service/.venv`
- `apps/ai-service/data/knowledge_store.json`

## Core Docs

- [docs/PROJECT_GUIDE.md](/Users/lm/Desktop/ai-knowledge-base/docs/PROJECT_GUIDE.md): 仓库地图和模块说明
- [docs/LEARNING_PATH.md](/Users/lm/Desktop/ai-knowledge-base/docs/LEARNING_PATH.md): 新人学习路线
- [docs/architecture.md](/Users/lm/Desktop/ai-knowledge-base/docs/architecture.md): 架构说明和调用链
- [docs/api.md](/Users/lm/Desktop/ai-knowledge-base/docs/api.md): API 入口概览
- [docs/rag-flow.md](/Users/lm/Desktop/ai-knowledge-base/docs/rag-flow.md): 文档入库与问答链路
- [docs/deployment.md](/Users/lm/Desktop/ai-knowledge-base/docs/deployment.md): 基础部署说明

## Recommended Reading Order

1. `apps/web/app/knowledge/page.tsx`
2. `apps/web/components/create-document-form.tsx`
3. `apps/web/lib/api.ts`
4. `apps/api/src/modules/documents/documents.controller.ts`
5. `apps/api/src/modules/documents/documents.service.ts`
6. `apps/api/src/modules/ai/ai.service.ts`
7. `apps/ai-service/app/api/ingest.py`
8. `apps/ai-service/app/rag/*.py`

## Notes

- 当前聊天历史和上传文件索引仍然走本地 JSON，适合开发和教学，不适合生产。
- PostgreSQL 负责结构化数据，FAISS/Pinecone 负责向量检索，两者职责不要混在一起。
- 这个仓库更偏“教学型骨架”，重点是结构清楚、职责分层明确、方便继续扩展。
