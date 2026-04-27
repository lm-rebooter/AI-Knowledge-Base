from typing import List, Optional

from app.vectorstore.faiss_store import FaissStore


def retrieve_context(question: str, knowledge_base_id: Optional[str]) -> List[str]:
    # In a production setup this would query a true vector index.
    # For the starter, we use a tiny JSON-backed retriever so you can see
    # "ingest -> retrieve -> answer" really work on your own content.
    store = FaissStore()
    contexts = store.search(question, knowledge_base_id)

    if contexts:
        return contexts

    scope = knowledge_base_id or "default"
    return [
        f"[{scope}] 当前还没有可检索到的入库片段。",
        "你可以先新增文档并确保 ai-service 正在运行，然后再回来提问。",
    ]
