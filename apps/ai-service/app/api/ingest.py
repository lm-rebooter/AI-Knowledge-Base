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
    document_id: Optional[str] = Field(default=None, alias="documentId")
    knowledge_base_id: str = Field(alias="knowledgeBaseId")
    title: str
    content: str


@router.post("/ingest")
def ingest_document(payload: IngestRequest) -> dict:
    # The ingestion flow is intentionally explicit so you can inspect each step:
    # raw content -> normalized document -> chunks -> embeddings -> vector storage
    document = load_document(title=payload.title, content=payload.content)
    chunks = split_document(document["content"])
    vectors = embed_chunks(chunks)
    FaissStore().upsert(payload.document_id, payload.knowledge_base_id, payload.title, chunks, vectors)
    return summarize_ingest_result(payload.title, payload.knowledge_base_id, chunks, vectors)
