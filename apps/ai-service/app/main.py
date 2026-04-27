from fastapi import FastAPI

from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.api.ingest import router as ingest_router

app = FastAPI(
    title="AI Knowledge Base Service",
    description="A small FastAPI service responsible for ingestion and RAG chat.",
    version="0.1.0",
)

# Mounting sub-routers keeps the service easy to scale.
# As you add reranking, OCR, or async jobs, new API groups can stay isolated.
app.include_router(health_router, prefix="/api")
app.include_router(ingest_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
