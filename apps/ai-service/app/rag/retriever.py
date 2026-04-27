def retrieve_context(question: str, knowledge_base_id: str | None) -> list[str]:
    # In production this module would query FAISS, pgvector, Pinecone, or
    # another vector store using the question embedding.
    scope = knowledge_base_id or "default"
    return [
        f"[{scope}] 命中文档片段 A，与问题“{question}”主题接近。",
        f"[{scope}] 命中文档片段 B，补充了实现思路和工程上下文。",
    ]
