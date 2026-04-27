from fastapi import APIRouter
from pydantic import BaseModel

from app.rag.chain import build_answer
from app.rag.retriever import retrieve_context

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    knowledge_base_id: str | None = None


@router.post("/chat")
def ask_question(payload: ChatRequest) -> dict:
    contexts = retrieve_context(payload.question, payload.knowledge_base_id)
    return build_answer(payload.question, contexts)
