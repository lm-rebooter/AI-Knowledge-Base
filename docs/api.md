# API Overview

这份文档只做“入口导航”，帮助你快速知道接口在哪一层。

## NestJS API

### Auth

- `POST /api/auth/login`

### Knowledge Bases

- `GET /api/knowledge-bases`
- `GET /api/knowledge-bases/:id`
- `POST /api/knowledge-bases`
- `PATCH /api/knowledge-bases/:id`
- `DELETE /api/knowledge-bases/:id`

### Documents

- `GET /api/documents`
- `POST /api/documents`
- `POST /api/documents/upload`
- `GET /api/documents/:id/file`
- `PATCH /api/documents/:id`
- `POST /api/documents/:id/reindex`
- `DELETE /api/documents/:id`

### Chat

- `GET /api/chat/summary`
- `POST /api/chat`
- `POST /api/chat/sessions/sync`

## FastAPI AI Service

- `GET /api/health`
- `POST /api/ingest`
- `POST /api/chat`

## 典型接口阅读顺序

如果你是新人，建议按这个顺序看：

1. `POST /api/documents/upload`
2. `POST /api/documents`
3. `POST /api/chat`
4. `POST /api/ingest`
5. `POST /api/chat`（FastAPI）
