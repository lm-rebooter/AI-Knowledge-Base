# AI Knowledge Base

一个适合前端开发者转全栈的 AI 知识库练手项目。仓库拆成 3 个应用和 1 个共享包：

- `apps/web`: Next.js 15 前端，负责页面、交互和表单。
- `apps/api`: NestJS 主后端，负责认证、知识库、文档、聊天和数据库访问。
- `apps/ai-service`: FastAPI AI 服务，负责文档入库、检索和 RAG 问答。
- `packages/shared`: 前后端共享 DTO、常量和响应类型。

## Start Here

第一次接触这个项目，建议按下面顺序：

1. 先读 [docs/PROJECT_GUIDE.md](/Users/lm/Desktop/ai-knowledge-base/docs/PROJECT_GUIDE.md) 了解仓库地图。
2. 再读 [docs/LEARNING_PATH.md](/Users/lm/Desktop/ai-knowledge-base/docs/LEARNING_PATH.md) 按路线学习。
3. 需要看整体调用关系时，打开 [docs/architecture.md](/Users/lm/Desktop/ai-knowledge-base/docs/architecture.md)。
4. 想看可视化架构图，直接打开根目录的 [architecture.html](/Users/lm/Desktop/ai-knowledge-base/architecture.html)。

## Quick Start

```bash
pnpm install
docker compose up -d postgres redis
pnpm --filter @ai-kb/api prisma:db:push
pnpm --filter @ai-kb/api prisma:seed
pnpm dev
```

如果你要完整体验“文档入库 -> 检索 -> 问答”，还需要单独启动 AI Service：

```bash
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

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
