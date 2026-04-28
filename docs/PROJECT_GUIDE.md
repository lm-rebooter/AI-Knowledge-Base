# AI Knowledge Base 项目完全解读

> 本文档为新人准备，详细介绍项目的架构、技术栈、数据流和开发要点。

---

## 一、项目概览

这是一个**面向前端开发者转全栈的 AI 知识库示例仓库**，采用现代化的三层微服务架构。

### 核心技术栈

| 层级 | 技术栈 | 职责 |
|------|--------|------|
| 前端 | Next.js 15 + React 19 | 用户界面、页面路由、API 请求 |
| 主后端 | NestJS + Prisma | 认证、业务逻辑、数据库操作、AI 服务调用 |
| AI 服务 | FastAPI (Python) | 文档处理、向量嵌入、RAG 问答 |
| 数据库 | PostgreSQL | 结构化数据存储 |
| 缓存/会话 | JSON 文件存储 | 聊天历史记录（开发阶段） |

### 快速启动

```bash
# 1. 安装依赖
pnpm install

# 2. 启动基础设施（PostgreSQL + Redis）
docker compose up -d postgres redis

# 3. 启动所有服务
pnpm dev
```

---

## 二、项目目录结构

```
ai-knowledge-base/
├── apps/
│   ├── web/                 # Next.js 前端应用
│   │   ├── app/             # App Router 页面
│   │   │   ├── page.tsx                 # 首页
│   │   │   ├── login/page.tsx           # 登录页
│   │   │   ├── dashboard/page.tsx       # 工作台仪表盘
│   │   │   ├── chat/page.tsx            # 问答聊天页
│   │   │   ├── knowledge/page.tsx        # 知识库列表页
│   │   │   └── knowledge/[id]/page.tsx   # 知识库详情页
│   │   └── components/      # 可复用的 UI 组件
│   │
│   ├── api/                 # NestJS 主后端
│   │   ├── src/
│   │   │   ├── main.ts                   # 应用入口
│   │   │   ├── app.module.ts             # 根模块
│   │   │   ├── prisma/                   # Prisma ORM 配置
│   │   │   ├── common/                   # 公共组件（拦截器、过滤器、装饰器）
│   │   │   └── modules/                  # 业务模块
│   │   │       ├── auth/                 # 认证模块（JWT）
│   │   │       ├── users/                # 用户模块
│   │   │       ├── documents/            # 文档管理模块
│   │   │       ├── knowledge-base/        # 知识库模块
│   │   │       ├── chat/                 # 聊天问答模块
│   │   │       └── ai/                   # AI 服务调用模块
│   │   ├── prisma/
│   │   │   └── schema.prisma             # 数据模型定义
│   │   └── storage/                      # 本地文件存储（上传的文档）
│   │
│   └── ai-service/           # FastAPI AI 服务
│       └── app/
│           ├── main.py                    # FastAPI 应用入口
│           ├── api/                       # API 路由
│           │   ├── health.py             # 健康检查
│           │   ├── ingest.py             # 文档入库
│           │   └── chat.py               # 问答接口
│           ├── rag/                      # RAG 核心逻辑
│           │   ├── loader.py             # 文档加载
│           │   ├── splitter.py           # 文档切片
│           │   ├── embeddings.py        # 向量化（Embedding）
│           │   ├── retriever.py         # 检索器
│           │   └── chain.py             # 问答链
│           ├── vectorstore/              # 向量存储
│           │   ├── faiss_store.py        # FAISS 实现
│           │   └── pinecone_store.py     # Pinecone 实现
│           └── core/                     # 核心配置
│               ├── config.py             # 配置管理
│               └── llm.py               # LLM 调用
│
├── packages/
│   └── shared/               # 共享类型和 DTO
│       └── src/
│           ├── dto/          # 数据传输对象
│           ├── types/        # TypeScript 类型定义
│           └── constants/    # 常量
│
├── docs/                     # 文档目录
│   ├── architecture.md       # 架构说明
│   ├── rag-flow.md          # RAG 流程说明
│   ├── api.md               # API 文档
│   └── deployment.md         # 部署指南
│
├── infra/                    # 基础设施配置
├── docker-compose.yml        # Docker 容器编排
├── turbo.json               # Turborepo 配置
└── pnpm-workspace.yaml       # pnpm 工作空间配置
```

---

## 三、数据流详解

### 3.1 整体请求链路

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Browser    │────▶│  Next.js    │────▶│    NestJS       │
│  (用户操作)   │◀────│   Web       │◀────│     API         │
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                   │
                           ┌───────────────────────┼───────────────────────┐
                           │                       │                       │
                           ▼                       ▼                       ▼
                    ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
                    │ PostgreSQL  │     │  FastAPI        │     │   Redis     │
                    │ (数据存储)   │     │  AI Service     │     │  (会话缓存)  │
                    └─────────────┘     │  (RAG + LLM)    │     └─────────────┘
                                        └─────────────────┘
```

### 3.2 文档入库流程（RAG Ingestion）

```
用户上传文档
      │
      ▼
┌─────────────────┐
│  NestJS API     │
│  documents/     │
│  upload         │
└────────┬────────┘
         │
         ├── 保存原始文件到 storage/
         ├── 提取文本内容（PDF/TXT）
         │
         ▼
┌─────────────────┐
│  FastAPI        │
│  /api/ingest    │
└────────┬────────┘
         │
         ├── 文档切片 (split_document)
         ├── 向量化 (embed_chunks)
         │
         ▼
┌─────────────────┐
│  向量存储        │
│  (FAISS/Pinecone)│
└─────────────────┘
```

### 3.3 问答流程（RAG Retrieval + Generation）

```
用户提问
      │
      ▼
┌─────────────────┐
│  NestJS API     │
│  /api/chat      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FastAPI        │
│  /api/chat      │
└────────┬────────┘
         │
         ├── 检索相关片段 (retrieve_context)
         │     │
         │     ▼
         │  ┌─────────────────┐
         │  │  FaissStore     │
         │  │  similarity     │
         │  │  search()       │
         │  └─────────────────┘
         │
         ├── 构建提示词 + 调用 LLM
         │
         ▼
┌─────────────────┐
│  返回答案        │
│  + 引用来源     │
└─────────────────┘
```

---

## 四、关键模块解读

### 4.1 前端页面路由

| 路由 | 组件 | 功能说明 |
|------|------|----------|
| `/` | `page.tsx` | 首页，展示产品概览 |
| `/login` | `login/page.tsx` | 登录页（默认账号 admin/admin） |
| `/dashboard` | `dashboard/page.tsx` | 工作台仪表盘，展示统计数据 |
| `/knowledge` | `knowledge/page.tsx` | 知识库列表 + 创建表单 |
| `/knowledge/[id]` | `knowledge/[id]/page.tsx` | 知识库详情，包含文档列表 |
| `/chat` | `chat/page.tsx` | 问答聊天界面 |

### 4.2 NestJS 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| **AuthModule** | `modules/auth/` | JWT 认证、登录接口 |
| **UsersModule** | `modules/users/` | 用户 CRUD |
| **DocumentsModule** | `modules/documents/` | 文档上传、提取、入库 |
| **KnowledgeBaseModule** | `modules/knowledge-base/` | 知识库 CRUD |
| **ChatModule** | `modules/chat/` | 聊天问答、历史记录 |
| **AiModule** | `modules/ai/` | 调用 FastAPI AI 服务 |

### 4.3 数据库模型

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  chats     Chat[]    // 用户与聊天一对多
}

model KnowledgeBase {
  id          String     @id @default(cuid())
  name        String     @unique
  description String?
  documents   Document[] // 知识库与文档一对多
}

model Document {
  id              String        @id @default(cuid())
  title           String
  content         String
  status          DocumentStatus // PENDING | PROCESSING | INDEXED | FAILED
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase @relation
}

model Chat {
  id        String   @id @default(cuid())
  question  String
  answer    String
  userId    String
  user      User     @relation
}
```

### 4.4 FastAPI API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/ingest` | POST | 文档入库（切片 + 向量化） |
| `/api/chat` | POST | RAG 问答 |

---

## 五、开发要点

### 5.1 环境变量配置

```bash
# apps/api/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_knowledge_base"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
API_PORT=3001
AI_SERVICE_URL="http://localhost:8000"

# apps/ai-service/.env
OPENAI_API_KEY="sk-..."        # 用于真实 LLM 调用
EMBEDDING_MODEL="text-embedding-3-small"
```

### 5.2 常用开发命令

```bash
# 数据库操作
pnpm db:studio       # 打开 Prisma Studio 可视化数据库
pnpm db:seed         # 填充种子数据
pnpm db:reset        # 重置数据库
pnpm db:reset:seed   # 重置并重新填充

# 单独启动服务
cd apps/web && pnpm dev      # 启动前端 (端口 3000)
cd apps/api && pnpm dev      # 启动后端 (端口 3001)
cd apps/ai-service && ...    # 启动 AI 服务 (端口 8000)
```

### 5.3 知识库完整使用流程

1. 访问 `http://localhost:3000`
2. 进入登录页，使用 `admin / admin` 登录
3. 前往知识库页面，创建第一个知识库
4. 上传文档（支持 PDF、TXT、MD 等格式）
5. 进入聊天页面，选择知识库后提问
6. 观察回答中是否引用了文档内容

---

## 六、学习路径建议

### 第一阶段：前端（1-2天）

1. 阅读 `apps/web/app` 下的各个页面组件
2. 理解 Server Components 和 Client Components 的区别
3. 理解 `apiRequest` 工具函数如何封装 API 调用
4. 尝试修改页面样式或添加新功能

### 第二阶段：后端（2-3天）

1. 阅读 `apps/api/src/main.ts` 理解 NestJS 启动流程
2. 阅读 `app.module.ts` 理解模块组织
3. 阅读 `modules/auth/` 理解 JWT 认证流程
4. 阅读 `modules/documents/` 理解文件上传和 PDF 解析
5. 尝试添加新的 API 端点

### 第三阶段：AI 服务（2-3天）

1. 阅读 `apps/ai-service/app/main.py` 理解 FastAPI 启动
2. 阅读 `rag/` 目录下的文件，理解 RAG 完整流程
3. 阅读 `vectorstore/faiss_store.py` 理解向量存储
4. 阅读 `core/llm.py` 了解如何接入真实 LLM
5. 尝试接入 OpenAI 或其他 LLM 提供商

---

## 七、扩展方向

项目已经预留了以下扩展点，方便你继续学习：

| 扩展方向 | 当前状态 | 升级建议 |
|----------|----------|----------|
| **真实 LLM 调用** | 占位符 | 接入 OpenAI GPT-4 / Claude |
| **真实 Embedding** | 简单哈希 | 接入 OpenAI text-embedding-3-small |
| **向量数据库** | JSON 文件 | 升级到 FAISS/Pinecone/Milvus |
| **文件存储** | 本地文件 | 升级到 S3/MinIO |
| **实时问答** | HTTP | 升级到 WebSocket/Server-Sent Events |
| **权限系统** | 无 | 添加多用户、角色、权限 |
| **文档解析** | 基础 PDF | 添加 OCR、图片识别 |

---

## 八、常见问题

### Q: 为什么前端报 500 错误？

检查 `apps/api` 是否正常运行，确保 PostgreSQL 已启动：
```bash
docker compose up -d postgres redis
pnpm --filter @ai-kb/api dev
```

### Q: 为什么聊天回答是示例内容？

这是因为 `ai-service` 尚未启动或 `LLM` 尚未配置真实 API Key。
```bash
cd apps/ai-service
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Q: 如何查看数据库内容？

```bash
pnpm db:studio
```

---

*文档版本: v1.0 | 最后更新: 2026-04-28*
