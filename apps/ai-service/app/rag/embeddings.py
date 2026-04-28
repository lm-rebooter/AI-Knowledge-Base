"""
文本向量化 - 将文本转换为向量表示

【什么是 Embedding？】

Embedding（嵌入）是将文本转换为数值向量的过程：
- 语义相似的文本 → 向量空间中距离相近
- 语义不同的文本 → 向量空间中距离较远

示例：
```
"如何创建项目" → [0.23, -0.45, 0.67, 0.12, ...]  (1536维向量)
"新建项目的步骤" → [0.24, -0.44, 0.68, 0.11, ...]  (向量A)
"今天天气不错" → [-0.10, 0.30, -0.20, 0.50, ...]  (向量B)

计算相似度：
- 向量A vs 向量A: 0.99 (非常相似)
- 向量A vs 向量B: 0.12 (不太相似)
```

【当前实现】
返回简单的占位向量：`(len(chunk), index)`
这不是真正的语义向量，只是为了展示数据流

【生产环境接入】

1. OpenAI Embedding
```python
from openai import OpenAI

client = OpenAI()
response = client.embeddings.create(
    model="text-embedding-3-small",  # 或 text-embedding-3-large
    input=text
)
return response.data[0].embedding
```

2. 本地模型（国产方案）
```python
# 智谱 ChatGLM Embedding
from zhipuai import ZhipuAI
client = ZhipuAI(api_key="your-api-key")
response = client.create_embeddings(
    model="embedding-2",
    input=text
)
```

3. 开源模型
```python
# Sentence Transformers
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
vectors = model.encode(texts)  # 批量编码
```
"""


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """
    将文本块列表转换为向量列表

    【参数】
    - chunks: 文本块列表

    【返回】
    向量列表，每个向量是 float 数组

    【当前实现】
    返回占位向量，不是真正的语义向量

    【向量维度说明】
    - text-embedding-3-small: 1536 维
    - text-embedding-3-large: 3072 维
    - paraphrase-multilingual-MiniLM-L12-v2: 384 维
    """
    # 【占位实现】
    # 目的：让数据流可观察，不需要真实 API 调用
    #
    # 生成规则：(块长度, 块索引)
    # 例如：["hello", "world"] → [[5.0, 0.0], [5.0, 1.0]]
    #
    # 注意：这只是占位符，没有语义意义！
    # 真实场景下应该使用 OpenAI/本地 Embedding 模型
    return [[float(len(chunk)), float(index)] for index, chunk in enumerate(chunks)]
