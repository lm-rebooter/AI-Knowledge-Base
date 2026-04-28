# RAG Flow

## 文档入库

### 入口

- Web: `apps/web/components/create-document-form.tsx`
- API: `apps/api/src/modules/documents/documents.controller.ts`
- AI Service: `apps/ai-service/app/api/ingest.py`

### 流程

1. 用户上传 PDF、TXT、Markdown、JSON 或 CSV。
2. NestJS 接收文件，提取文本。
3. 文本会先做一次清洗，避免控制字符把数据库写入打爆。
4. 文档元信息和正文写入 PostgreSQL。
5. API 调用 AI Service。
6. AI Service 对文档切片。
7. 切片执行 embedding。
8. 向量结果写入本地 FAISS 或 Pinecone。

## 问答

### 入口

- Web: `apps/web/components/chat-workspace.tsx`
- API: `apps/api/src/modules/chat/chat.controller.ts`
- AI Service: `apps/ai-service/app/api/chat.py`

### 流程

1. 用户输入问题。
2. Web 把问题和知识库 ID 发给 NestJS。
3. NestJS 记录问题，并把请求转给 AI Service。
4. AI Service 从向量存储召回最相关的片段。
5. 检索结果拼成上下文。
6. 大模型基于上下文生成答案。
7. API 保存问答历史和摘要，再返回给前端。

## 当前边界

这个仓库当前更偏“教学可运行版”，所以 RAG 能力边界是清楚但实现并不重：

- 有基础切片和检索
- 有本地文件与本地 JSON 存储
- 有 AI Service 与主后端分层
- 还没有做到生产级的 OCR、重排、混合检索和权限隔离
