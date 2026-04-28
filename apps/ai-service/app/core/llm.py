"""
LLM 调用模块 - 与大语言模型交互

【当前状态】
这是一个占位符实现，返回模拟答案。

【为什么先占位？】
1. 开发阶段：不需要消耗 API 额度
2. 调试友好：返回结果可预测
3. 易于验证：先确保 RAG 流程正确，再接入 LLM

【接入真实 LLM 的方法】

方法一：OpenAI
```python
from openai import OpenAI

client = OpenAI(api_key=settings.openai_api_key)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "你是一个有帮助的助手。"},
        {"role": "user", "content": f"问题：{question}\n\n上下文：\n{chr(10).join(contexts)}"}
    ]
)
return response.choices[0].message.content
```

方法二：使用 LangChain（推荐）
```python
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA

chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4"),
    retriever=vectorstore.as_retriever()
)
return chain.run(question)
```

方法三：使用 LlamaIndex
```python
from llama_index import VectorStoreIndex, SimpleDirectoryReader

documents = SimpleDirectoryReader('data').load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query(question)
return str(response)
```
"""


def generate_answer(question: str, contexts: list[str]) -> str:
    """
    基于上下文生成答案

    【参数】
    - question: 用户的问题
    - contexts: 从知识库检索到的相关片段

    【返回】
    字符串形式的回答

    【提示词模板示例】
    ```
    你是一个专业的知识库助手。请基于以下上下文回答用户的问题。

    上下文：
    {contexts}

    问题：{question}

    要求：
    1. 只基于提供的上下文回答，不要编造信息
    2. 如果上下文中没有相关信息，请说明"我没有找到相关信息"
    3. 回答要清晰、有条理
    ```
    """
    # 【当前实现】返回示例答案
    context_preview = " | ".join(contexts[:2]) if contexts else "暂无命中内容"

    # 这里可以替换为真实的 LLM 调用
    return (
        f"【示例回答】\n\n"
        f"你问的是「{question}」。\n\n"
        f"根据知识库中的相关内容，我可以告诉你：{context_preview}\n\n"
        f"--- 后续升级 ---\n"
        f"这里可以替换为真实 LLM（如 GPT-4、Claude）的调用，"
        f"只需在 .env 中配置 OPENAI_API_KEY 即可。"
    )
