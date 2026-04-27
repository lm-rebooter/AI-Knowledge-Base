# API Overview

## NestJS API

- `POST /api/auth/login`: 登录并返回 JWT
- `GET /api/knowledge-bases`: 获取知识库列表
- `GET /api/documents`: 获取文档列表
- `POST /api/documents`: 新增文档并触发 AI 入库
- `POST /api/chat`: 发起问答

## FastAPI AI Service

- `GET /api/health`: 健康检查
- `POST /api/ingest`: 文档切片与向量化入口
- `POST /api/chat`: RAG 问答入口
