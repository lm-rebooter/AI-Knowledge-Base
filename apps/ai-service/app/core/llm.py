from app.core.config import settings


def generate_answer(question: str, contexts: list[str]) -> str:
    # This is a placeholder for a real LLM call.
    # Keeping a deterministic local implementation helps the starter run
    # before you configure any external model provider.
    context_preview = " | ".join(contexts[:2]) if contexts else "暂无命中内容"
    return (
        f"示例回答：你问的是“{question}”。"
        f" 我当前基于知识片段给出的总结线索是：{context_preview}。"
        f" 后续你可以在这里替换成 OpenAI、Azure OpenAI 或其他模型调用。"
    )
