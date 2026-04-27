from app.core.llm import generate_answer


def summarize_ingest_result(
    title: str, knowledge_base_id: str, chunks: list[str], vectors: list[list[float]]
) -> dict:
    return {
        "title": title,
        "knowledgeBaseId": knowledge_base_id,
        "chunkCount": len(chunks),
        "vectorCount": len(vectors),
        "status": "queued",
    }


def build_answer(question: str, contexts: list[str]) -> dict:
    answer = generate_answer(question, contexts)
    return {
        "question": question,
        "answer": answer,
        "contexts": contexts,
    }
