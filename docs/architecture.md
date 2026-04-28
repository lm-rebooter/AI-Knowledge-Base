# Architecture

## 1. 总体结构

这个项目是一个典型的“三层业务 + 一个共享包”结构：

- `apps/web`: 用户可见的界面层
- `apps/api`: 主业务后端
- `apps/ai-service`: AI / RAG 专用后端
- `packages/shared`: 前后端共享契约

## 2. 一张脑图式理解

```text
Browser
  ↓
Next.js Web
  ↓ HTTP
NestJS API
  ├─ PostgreSQL
  ├─ local storage/json
  └─ HTTP → FastAPI AI Service
             ├─ LLM
             └─ Vector Store (FAISS / Pinecone)
```

## 3. 每层职责

### `apps/web`

负责：

- 页面路由
- 表单交互
- 调用 `apps/api`
- 展示知识库、文档、聊天和工作台

不负责：

- 直接连数据库
- 直接调用 Python RAG

### `apps/api`

负责：

- 登录认证和 JWT
- 业务规则校验
- 数据库存取
- 文档文件存储
- 聊天历史摘要
- 调用 AI Service

不负责：

- Embedding
- 向量检索
- 直接拼装大模型 Prompt 的核心细节

### `apps/ai-service`

负责：

- 文档切片
- 向量化
- 向量存储读写
- 检索上下文
- 调用大模型生成答案

## 4. 两条核心业务链

### 文档入库链

1. 用户在 `web` 上传文件或粘贴内容。
2. `web` 调用 `POST /api/documents` 或 `POST /api/documents/upload`。
3. `api` 解析文件、清洗文本、写入 PostgreSQL。
4. `api` 调用 `ai-service` 的 `/api/ingest`。
5. `ai-service` 切片、Embedding，并写入向量存储。

### 问答链

1. 用户在 `web` 提问。
2. `web` 调用 `POST /api/chat`。
3. `api` 负责记录会话、转发问题。
4. `ai-service` 检索相关文档片段。
5. `ai-service` 结合上下文生成答案。
6. 结果回到 `api`，再返回给 `web` 展示。

## 5. 数据落点

### PostgreSQL

存结构化数据：

- 用户
- 知识库
- 文档元信息
- 文档正文
- 聊天相关结构化记录

### 本地 JSON / 文件

当前开发阶段还保留一些轻量本地存储：

- `apps/api/storage/chat-history.json`
- `apps/api/storage/chat-sessions.json`
- `apps/api/storage/document-assets.json`
- `apps/api/storage/uploads/*`
- `apps/ai-service/data/knowledge_store.json`

这部分更偏教学和本地开发便利，不建议直接作为生产方案。

## 6. 为什么这样拆

这样拆的好处是：

- 前端与 AI 逻辑解耦
- Node 生态和 Python 生态各做自己擅长的部分
- 业务编排和模型推理边界更清楚
- 新人能逐层理解，不会一上来就陷进所有复杂度

## 7. 配套可视化

如果你更想直接看图，请打开根目录：

- [architecture.html](/Users/lm/Desktop/ai-knowledge-base/architecture.html)
