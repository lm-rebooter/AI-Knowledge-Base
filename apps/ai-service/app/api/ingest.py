"""
文档入库 API - RAG 的第一步

【入库流程详解】
当用户在界面上传文档后，NestJS 主后端会调用这个接口：

1. load_document: 将原始文本封装成标准格式
2. split_document: 将长文本切成小块（便于精准检索）
3. embed_chunks: 将每块文本转为向量（Embedding）
4. FaissStore.upsert: 存入向量数据库

【为什么需要切片？】
- 限制：LLM 有上下文长度限制（通常 4K-128K tokens）
- 精准：小块更容易找到精确匹配的内容
- 成本：检索小块比检索整篇文档更快、更便宜

【向量化的意义】
- 把文本变成一串数字（向量）
- 相似的文本在向量空间中距离更近
- 检索时通过计算向量相似度找到相关内容
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

from app.rag.chain import summarize_ingest_result
from app.rag.loader import load_document
from app.rag.splitter import split_document
from app.rag.embeddings import embed_chunks
from app.vectorstore.faiss_store import FaissStore

router = APIRouter(tags=["ingest"])


class IngestRequest(BaseModel):
    """文档入库请求体"""
    # Pydantic 的 alias 功能让字段名可以兼容前端的 camelCase
    document_id: Optional[str] = Field(default=None, alias="documentId")
    knowledge_base_id: str = Field(alias="knowledgeBaseId", description="所属知识库 ID")
    title: str = Field(description="文档标题")
    content: str = Field(description="文档原始文本内容")


@router.post("/ingest")
def ingest_document(payload: IngestRequest) -> dict:
    """
    处理文档入库的核心入口

    请求示例：
    {
        "documentId": "doc_xxx",
        "knowledgeBaseId": "kb_yyy",
        "title": "产品使用手册",
        "content": "这是一份详细的产品使用手册..."
    }

    响应示例：
    {
        "title": "产品使用手册",
        "knowledgeBaseId": "kb_yyy",
        "chunkCount": 15,
        "vectorCount": 15,
        "status": "queued"
    }
    """
    # 【Step 1】文档加载/标准化
    # 当前实现只是简单封装，未来可扩展支持多种格式（PDF、Word 等）
    document = load_document(title=payload.title, content=payload.content)

    # 【Step 2】文档切片
    # 按固定长度（默认 200 字符）切分，便于后续精准检索
    chunks = split_document(document["content"])

    # 【Step 3】向量化
    # 将每块文本转为向量表示
    vectors = embed_chunks(chunks)

    # 【Step 4】存入向量数据库
    # FaissStore 是向量存储的抽象，当前使用 JSON 实现，可升级为 FAISS/Pinecone
    FaissStore().upsert(
        payload.document_id,
        payload.knowledge_base_id,
        payload.title,
        chunks,
        vectors
    )

    # 【Step 5】返回入库摘要
    return summarize_ingest_result(payload.title, payload.knowledge_base_id, chunks, vectors)
