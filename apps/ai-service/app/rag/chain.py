"""
RAG 问答链 - 负责构建提示词和调用 LLM

【RAG 问答的核心问题】

当用户问"如何创建项目？"时，我们已经检索到了相关片段：
- 片段1: "创建项目的第一步是..."
- 片段2: "在项目管理页面，点击新建按钮..."

现在的问题是：如何把这些片段变成一个好的答案？

【提示词工程（Prompt Engineering）】

一个好的 RAG 提示词通常包含：
1. 角色设定：你是一个有帮助的助手
2. 上下文：以下是相关的文档片段
3. 任务：基于这些片段回答问题
4. 约束：不要编造，只基于提供的内容回答

【当前实现】
因为还没接入真实 LLM，当前返回的是模拟答案。
接入 OpenAI 后，只需要修改 generate_answer 函数即可。
"""
from app.core.llm import generate_answer


def summarize_ingest_result(
    title: str, knowledge_base_id: str, chunks: list[str], vectors: list[list[float]]
) -> dict:
    """
    返回文档入库的摘要信息

    用于告知调用者入库的结果：
    - 文档标题
    - 所属知识库
    - 切片数量
    - 向量数量
    - 状态
    """
    return {
        "title": title,
        "knowledgeBaseId": knowledge_base_id,
        "chunkCount": len(chunks),
        "vectorCount": len(vectors),
        "status": "queued",  # queued = 已加入处理队列
    }


def build_answer(question: str, contexts: list[str]) -> dict:
    """
    构建 RAG 问答结果

    【数据流】
    1. receive: 用户问题 + 检索到的上下文
    2. generate: 调用 LLM 生成答案
    3. return: 答案 + 引用的上下文（用于展示来源）

    【返回数据结构】
    {
        "question": 原始问题（可能经过改写）
        "answer": LLM 生成的回答
        "contexts": 引用的片段列表
    }
    """
    answer = generate_answer(question, contexts)
    return {
        "question": question,
        "answer": answer,
        "contexts": contexts,  # 返回引用来源，便于用户溯源
    }
