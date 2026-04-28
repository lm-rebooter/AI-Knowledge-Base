"""
RAG 问答 API - 基于检索增强的生成

【RAG 是什么？】
Retrieval-Augmented Generation（检索增强生成）

传统 LLM 的问题：
- 知识截止日期限制（不知道最新信息）
- 容易产生"幻觉"（一本正经地胡说八道）
- 无法访问私有知识（内部文档、数据库）

RAG 的解决方案：
1. 检索（Retrieval）：从知识库中找到最相关的片段
2. 增强（Augmented）：把检索结果加入提示词
3. 生成（Generation）：LLM 基于上下文生成答案

【完整流程】
用户提问 ─▶ 检索相关片段 ─▶ 构建提示词 ─▶ 调用 LLM ─▶ 返回答案

【返回数据说明】
{
    "question": "原始问题",
    "answer": "LLM 生成的回答",
    "contexts": ["引用的片段1", "引用的片段2"]
}
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

from app.rag.chain import build_answer
from app.rag.retriever import retrieve_context

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    """问答请求体"""
    question: str = Field(description="用户提问")
    # 可选：指定知识库 ID，不指定则搜索所有知识库
    knowledge_base_id: Optional[str] = Field(default=None, alias="knowledgeBaseId")


@router.post("/chat")
def ask_question(payload: ChatRequest) -> dict:
    """
    RAG 问答入口

    请求示例：
    {
        "question": "如何创建新项目？",
        "knowledgeBaseId": "kb_xxx"
    }

    响应示例：
    {
        "question": "如何创建新项目？",
        "answer": "根据知识库中的文档，创建新项目的步骤如下...",
        "contexts": [
            "[kb_xxx] 产品手册: 首先登录系统，点击「新建项目」按钮..."
        ]
    }
    """
    # 【Step 1】检索相关片段
    # 从向量数据库中找到与问题最相关的文档片段
    contexts = retrieve_context(payload.question, payload.knowledge_base_id)

    # 【Step 2】构建答案
    # 将问题 + 检索到的上下文传给 LLM 生成答案
    return build_answer(payload.question, contexts)
