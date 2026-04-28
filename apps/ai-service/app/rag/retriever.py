"""
文档检索器 - 从向量数据库中检索相关内容

【检索流程】
1. 接收用户问题
2. 将问题转为向量（Embedding）
3. 在向量数据库中查找最相似的 Top-K 个片段
4. 返回检索结果

【为什么需要检索？】
直接把所有文档都传给 LLM 不行吗？

不行，原因：
1. 上下文长度限制：LLM 有最大 token 数（如 GPT-4 是 128K）
2. 成本考虑：token 数越多，API 调用成本越高
3. 噪声干扰：无关内容会降低回答质量
4. 速度问题：处理大量文本会更慢

【检索策略】

当前实现：简单关键词匹配
```python
# 找到包含问题中词语最多的片段
score = len(question_tokens & chunk_tokens)
```

生产环境推荐：
- 密集检索（Dense Retrieval）：使用 Embedding 向量相似度
- 稀疏检索（Sparse Retrieval）：BM25、TF-IDF 等传统算法
- 混合检索（Hybrid）：结合密集和稀疏检索
- 重排（Rerank）：先用快的方法召回，再用精准的方法重排

【向量检索的优势】
- 语义理解：不只是字面匹配，能理解同义词
- 例如：问"电脑"时，能找到包含"计算机"的文档
"""
from typing import List, Optional

from app.vectorstore.faiss_store import FaissStore


def retrieve_context(question: str, knowledge_base_id: Optional[str]) -> List[str]:
    """
    检索与问题相关的上下文片段

    【参数】
    - question: 用户的问题
    - knowledge_base_id: 可选，限定搜索特定知识库

    【返回】
    相关片段列表，最多 3 条

    【特殊情况处理】
    - 如果没有检索到任何结果，返回提示信息
    - 提示用户先上传文档并确保 AI 服务正在运行
    """
    # 【调用向量存储搜索】
    store = FaissStore()
    contexts = store.search(question, knowledge_base_id)

    # 【有结果】直接返回
    if contexts:
        return contexts

    # 【无结果】返回友好提示
    # 这样用户体验更好，而不是返回一个空答案
    scope = knowledge_base_id or "default"
    return [
        f"[{scope}] 当前还没有可检索到的入库片段。",
        "💡 提示：请先上传文档并确保 AI Service 正在运行，然后再回来提问。",
    ]
