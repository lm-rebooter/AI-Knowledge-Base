# AI Knowledge Base

这是一个面向前端开发者转全栈的 AI 知识库示例仓库。它把常见的现代 Web 架构拆成三层：

- `apps/web`: Next.js 前端，负责登录、仪表盘、知识库管理和聊天界面。
- `apps/api`: NestJS 主后端，负责认证、业务编排、数据库访问和调用 AI 服务。
- `apps/ai-service`: FastAPI AI 服务，负责文档入库、向量检索和 RAG 问答。

## 为什么这样分层

这种拆分非常适合你从前端逐步过渡到全栈：

- 先在 `web` 里继续发挥前端优势。
- 再通过 `api` 学习鉴权、数据库、缓存和接口设计。
- 最后在 `ai-service` 里理解 RAG、Embedding、向量库和大模型调用。

## 快速开始

```bash
pnpm install
docker compose up -d postgres redis
pnpm dev
```

如果你暂时不想运行全部服务，也可以单独进入某个应用目录按需启动。

## 单独启动 AI Service

如果你想真正体验“文档 -> 检索 -> 问答”链路，建议把 FastAPI 服务也单独跑起来：

```bash
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动后你可以先访问：

```bash
http://localhost:8000/api/health
```

如果返回：

```json
{"status":"ok"}
```

说明 AI 服务已经可用了。

然后完整体验路径就是：

1. 在知识库页新增一个文档
2. NestJS 调用 `POST /api/ingest`
3. FastAPI 把切片写进本地 JSON 检索存储
4. 去 `/chat` 里选择对应知识库提问
5. 你会看到回答里引用刚刚入库的上下文片段

## 当前脚手架包含什么

- 带注释的 monorepo 配置
- Next.js App Router 页面骨架
- NestJS 模块化后端骨架
- FastAPI + RAG 服务骨架
- Prisma 数据模型示例
- Docker Compose、Nginx、初始化脚本和设计文档

## 适合你的学习路径

1. 先从 `apps/web/app` 看页面入口和数据请求流向。
2. 再看 `apps/api/src/modules`，理解业务模块怎么组织。
3. 最后看 `apps/ai-service/app/rag`，理解知识库问答链怎么工作。

## 说明

这个仓库重点是“结构清晰、方便审查、便于扩展”，不是一次性塞满所有复杂实现。很多文件已经放好了扩展点，并且写了较多注释，便于你后续边学边补。
