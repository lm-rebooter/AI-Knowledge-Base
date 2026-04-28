"""
文档切片器 - 将长文本切分为小块

【为什么需要切片？】

1. LLM 上下文限制
   - GPT-4 Turbo: 128K tokens ≈ 10万汉字
   - Claude 100K: 100K tokens ≈ 8万汉字
   - 但检索小块比检索整篇文档更精准

2. 精准检索
   - 一篇 10页的 PDF 不应该作为一个整体被检索
   - 切片后，每个小块可以独立被检索和引用

3. 成本控制
   - 把整篇文档都放入上下文很贵
   - 只检索相关小块可以节省 token

【切片策略】

当前实现：固定长度滑动窗口
```python
chunk_size = 200  # 每个片段 200 字符
step = 200        # 不重叠
```

问题：
- 可能在句子中间切断
- 可能丢失语义完整性

改进方案：
```python
# 1. 按段落切分（更语义化）
chunks = content.split('\n\n')

# 2. 滑动窗口 + 重叠（保留上下文）
step = 100
overlap = 20
chunks = [content[i:i+chunk_size] for i in range(0, len(content), step)]

# 3. 递归字符切分（LangChain 默认策略）
# 保持语义单元完整性
from langchain.text_splitter import RecursiveCharacterTextSplitter
splitter = RecursiveCharacterTextSplitter(
    chunk_size=200,
    chunk_overlap=20,  # 20字符重叠，保持上下文连续性
    separators=["\n\n", "\n", "。", "!", "?", ""]
)
```
"""
from typing import List, Optional


def _chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    normalized_text = text.strip()
    if not normalized_text:
        return []

    step = max(chunk_size - chunk_overlap, 1)
    chunks = []

    for start in range(0, len(normalized_text), step):
        chunk = normalized_text[start : start + chunk_size].strip()
        if not chunk:
            continue
        chunks.append(chunk)

        if start + chunk_size >= len(normalized_text):
            break

    return chunks


def split_document(
    content: str,
    chunk_size: int = 360,
    chunk_overlap: int = 80,
    page_texts: Optional[List[str]] = None,
) -> List[str]:
    """
    将文档内容切分为小块

    【参数】
    - content: 原始文本内容
    - chunk_size: 每个块的目标长度（字符数），默认 200

    【返回】
    文本块列表

    【示例】
    输入: "ABCDEFGHIJ" (10个字符), chunk_size=3
    输出: ["ABC", "DEF", "GHI", "J"]

    【当前实现】
    - 简单固定步长切分
    - 步长 = chunk_size（无重叠）

    【后续可优化】
    - 添加重叠（chunk_overlap）
    - 智能断句（按段落、按句子）
    - 合并过小的片段
    - 添加元数据（来源页码、标题等）
    """
    if page_texts:
        page_chunks: List[str] = []

        for page_index, page_text in enumerate(page_texts, start=1):
            normalized_page_text = page_text.strip()
            if not normalized_page_text:
                continue

            for chunk in _chunk_text(normalized_page_text, chunk_size, chunk_overlap):
                page_chunks.append(f"第{page_index}页\n{chunk}")

        if page_chunks:
            return page_chunks

    return _chunk_text(content, chunk_size, chunk_overlap)
