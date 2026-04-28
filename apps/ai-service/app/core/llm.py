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
import re
from typing import List, Tuple


def _strip_context_prefix(context: str) -> Tuple[str, str]:
    """
    将 `[kb] 标题: 正文` 这样的上下文拆成标题和正文。
    """
    normalized = re.sub(r"\s+", " ", context).strip()
    matched = re.match(r"^\[[^\]]+\]\s*([^:：]+)[:：]\s*(.*)$", normalized)
    if not matched:
        return ("知识片段", normalized)
    return (matched.group(1).strip(), matched.group(2).strip())


def _tokenize_question(question: str) -> List[str]:
    """
    提取问题中的关键词，兼容中英文。
    """
    tokens = re.findall(r"[A-Za-z0-9_]{2,}|[\u4e00-\u9fff]{1,6}", question.lower())
    stopwords = {
        "什么",
        "一下",
        "怎么",
        "如何",
        "一下子",
        "一下吧",
        "一下呢",
        "请问",
        "这个",
        "一下呀",
        "说说",
        "介绍",
        "一下下",
    }
    return [token for token in tokens if token not in stopwords]


def _split_sentences(text: str) -> List[str]:
    """
    按中文问答常见的标点和换行切分句子。
    """
    parts = re.split(r"(?<=[。！？；:：])\s+|\n+", text)
    return [part.strip(" \t-•·") for part in parts if part.strip()]


def _sentence_score(sentence: str, question_tokens: List[str]) -> int:
    normalized = sentence.lower()
    score = 0
    for token in question_tokens:
        if token in normalized:
            score += max(len(token), 1)

    # 带有结论性质的语句略微加权，让回答更像总结而不是随机摘录。
    if any(keyword in sentence for keyword in ["区别", "实现", "定义", "作用", "步骤", "原因"]):
        score += 2
    return score


def _collect_highlight_sentences(body: str, question_tokens: List[str], limit: int = 4) -> List[str]:
    sentences = _split_sentences(body)
    if not sentences:
        return []

    scored_sentences = []
    for index, sentence in enumerate(sentences):
        score = _sentence_score(sentence, question_tokens)
        if score > 0:
            scored_sentences.append((score, index, sentence))

    if not scored_sentences:
        return sentences[:limit]

    scored_sentences.sort(key=lambda item: (item[0], -item[1]), reverse=True)
    top_sentences = sorted(scored_sentences[:limit], key=lambda item: item[1])

    deduped: List[str] = []
    seen = set()
    for _, _, sentence in top_sentences:
        normalized = re.sub(r"\s+", " ", sentence)
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(sentence)

    return deduped


def _build_reference_section(contexts: List[str], question_tokens: List[str]) -> str:
    reference_blocks = []
    for context in contexts[:2]:
        title, body = _strip_context_prefix(context)
        highlights = _collect_highlight_sentences(body, question_tokens, limit=3)
        if not highlights:
            continue

        formatted_lines = "\n".join(f"- {sentence}" for sentence in highlights)
        reference_blocks.append(f"《{title}》\n{formatted_lines}")

    if not reference_blocks:
        return ""

    return "\n\n依据片段：\n" + "\n\n".join(reference_blocks)


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
    if not contexts:
        return "我暂时没有从知识库中找到可用内容。"

    if any("当前还没有可检索到的入库片段" in context for context in contexts):
        return (
            "当前知识库还没有可直接回答这个问题的入库片段。"
            " 你可以先检查文档是否已经完成索引，或重新执行一次入库。"
        )

    question_tokens = _tokenize_question(question)
    primary_title, primary_body = _strip_context_prefix(contexts[0])
    highlight_sentences = _collect_highlight_sentences(primary_body, question_tokens, limit=4)

    if highlight_sentences:
        summary = "\n".join(f"{index + 1}. {sentence}" for index, sentence in enumerate(highlight_sentences))
    else:
        summary = primary_body[:320]

    reference_section = _build_reference_section(contexts, question_tokens)

    return (
        f"关于「{question}」，结合知识库里的命中内容，可以先这样理解：\n\n"
        f"{summary}"
        f"\n\n来源文档：{primary_title}"
        f"{reference_section}"
    )
