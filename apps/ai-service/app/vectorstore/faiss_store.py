"""
向量存储实现 - JSON 文件版本

【为什么先从 JSON 开始？】

在学习和开发阶段，使用简单的 JSON 文件存储有以下优点：
1. 零配置：不需要安装数据库服务
2. 直观可见：可以直接打开文件查看数据结构
3. 调试友好：修改数据不需要 SQL 或 ORM

【向量相似度搜索原理】

1. 将文本转为向量（Embedding）
   "如何创建项目" → [0.23, -0.45, 0.67, ...] （假设 1536 维）

2. 计算相似度
   - 余弦相似度：衡量两个向量方向的接近程度
   - 点积：简单快速的相似度指标

3. 返回 Top-K 最相似的结果

【生产环境升级路径】

当前（开发阶段）          →         生产环境
┌──────────────────┐                 ┌──────────────────┐
│  JSON 文件存储     │  ─────────▶   │  FAISS / Pinecone │
│  简单的相似度计算  │               │  百万级向量检索   │
└──────────────────┘                 └──────────────────┘

其他可选方案：
- Milvus（开源，国产）
- Weaviate（支持混合搜索）
- Qdrant（Rust 编写，高性能）
- Chroma（专为 LLM 设计）
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Set


# 【存储路径】
# 所有数据存放在 data/knowledge_store.json
# 使用 Path 处理跨平台路径兼容性
STORE_PATH = Path(__file__).resolve().parents[1] / ".." / "data" / "knowledge_store.json"


def _ensure_store_file() -> None:
    """确保存储文件存在，必要时创建空数组文件"""
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        STORE_PATH.write_text("[]", encoding="utf-8")


def _load_entries() -> List[Dict]:
    """从文件加载所有条目"""
    _ensure_store_file()
    return json.loads(STORE_PATH.read_text(encoding="utf-8"))


def _save_entries(entries: List[Dict]) -> None:
    """将条目写入文件"""
    STORE_PATH.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _normalize_text(text: str) -> str:
    """压缩多余空白，便于展示拼接后的连续上下文。"""
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(text: str) -> Set[str]:
    """
    轻量级分词器

    【设计决策】
    使用简单的正则表达式分词，而非完整的 NLP 分词库（如 jieba）

    - 英文：按单词边界切分 "How to create" → {"how", "to", "create"}
    - 中文：按单字切分 "如何创建" → {"如", "何", "创", "建"}

    【局限性】
    - 英文效果较好（单词本身有语义）
    - 中文单字效果有限（"创建"作为一个词比单字更有意义）

    【生产环境建议】
    使用 jieba 分词或直接调用 Embedding API 让模型处理语义
    """
    normalized = text.lower()
    words = set(re.findall(r"[A-Za-z0-9_]+", normalized))

    # 为中文补充“词组级”召回，避免只按单字命中导致目录和正文难以区分。
    chinese_segments = re.findall(r"[\u4e00-\u9fff]{2,}", normalized)
    for segment in chinese_segments:
        words.add(segment)
        for size in (2, 3, 4):
            if len(segment) < size:
                continue
            for start in range(0, len(segment) - size + 1):
                words.add(segment[start : start + size])

    # 保留单字，兼容短问题，但不作为唯一信号。
    words.update(re.findall(r"[\u4e00-\u9fff]", normalized))
    return {word for word in words if word.strip()}


def _is_toc_like(chunk: str) -> bool:
    """
    判断片段是否更像目录、页码导航，而不是正文答案。
    """
    normalized = chunk.replace(" ", "")
    question_count = len(re.findall(r"第\d+题", normalized))
    dotted_leader_count = len(re.findall(r"[.。·…]{6,}", normalized))
    has_catalog = "目录" in normalized
    has_many_page_numbers = len(re.findall(r"\n?\d{1,3}\n", chunk)) >= 3
    return has_catalog or question_count >= 3 or dotted_leader_count >= 2 or has_many_page_numbers


def _quality_score(chunk: str) -> int:
    """
    片段质量分，正文高，目录/导航低。
    """
    score = 0
    if _is_toc_like(chunk):
        score -= 12

    if "function" in chunk.lower() or "=>" in chunk or "return" in chunk:
        score += 2

    if any(keyword in chunk for keyword in ["区别", "实现", "步骤", "原理", "作用"]):
        score += 2

    return score


def _trim_to_question_anchor(text: str, question: str) -> str:
    """
    把拼接后的上下文裁剪到真正与问题相关的起点，避免把上一题的尾巴一起带出来。
    """
    normalized_text = text.strip()
    if not normalized_text:
        return normalized_text

    candidate_tokens = sorted(
        {
            token
            for token in _tokenize(question)
            if len(token) >= 2 and not token.isdigit()
        },
        key=len,
        reverse=True,
    )

    anchor_index = -1
    for token in candidate_tokens:
        token_index = normalized_text.find(token)
        if token_index != -1 and (anchor_index == -1 or token_index < anchor_index):
            anchor_index = token_index

    if anchor_index == -1:
        return normalized_text

    heading_matches = list(re.finditer(r"第\d+题[:：]?", normalized_text))
    line_start = -1
    for match in heading_matches:
        if match.start() <= anchor_index:
            line_start = match.start()
        else:
            break

    if line_start == -1:
        line_start = normalized_text.rfind("\n", 0, anchor_index)
    if line_start == -1:
        line_start = normalized_text.rfind("。", 0, anchor_index)
    if line_start == -1:
        line_start = 0
    elif line_start != 0:
        line_start += 1

    return normalized_text[line_start:].strip()


class FaissStore:
    """
    向量存储抽象类

    【命名说明】
    类名叫 FaissStore 是因为它模拟了 FAISS 的接口设计。
    FAISS（Facebook AI Similarity Search）是 Facebook 开源的向量检索库，
    这个项目预留了升级到真正 FAISS 的接口。
    """

    def upsert(
        self,
        document_id: Optional[str],
        knowledge_base_id: str,
        title: str,
        chunks: List[str],
        vectors: List[List[float]],
    ) -> None:
        """
        插入或更新文档片段

        【参数说明】
        - document_id: 文档唯一标识，用于去重更新
        - knowledge_base_id: 知识库 ID，支持多租户隔离
        - title: 文档标题
        - chunks: 切分后的文本片段
        - vectors: 每个片段对应的向量

        【去重逻辑】
        如果传入 document_id，则删除该文档的旧版本
        否则按 knowledge_base_id + title 组合去重
        """
        entries = _load_entries()

        # 【去重】删除旧版本
        if document_id:
            # 按 document_id 精确匹配
            filtered_entries = [
                entry for entry in entries if entry.get("documentId") != document_id
            ]
        else:
            # 按知识库+标题组合匹配
            filtered_entries = [
                entry
                for entry in entries
                if not (
                    entry["knowledgeBaseId"] == knowledge_base_id
                    and entry["title"] == title
                )
            ]

        # 【批量插入】将新片段和向量添加到列表
        chunk_count = len(chunks)
        filtered_entries.extend(
            {
                "documentId": document_id,
                "knowledgeBaseId": knowledge_base_id,
                "title": title,
                "chunk": chunk,
                "vector": vector,
                "chunkIndex": index,
                "chunkCount": chunk_count,
            }
            for index, (chunk, vector) in enumerate(zip(chunks, vectors))
        )

        _save_entries(filtered_entries)

    def _group_entries_by_document(self, entries: List[Dict]) -> Dict[str, List[Dict]]:
        grouped_entries: Dict[str, List[Dict]] = {}

        for fallback_index, entry in enumerate(entries):
            document_key = (
                entry.get("documentId")
                or f"{entry['knowledgeBaseId']}::{entry['title']}"
            )
            grouped_entries.setdefault(document_key, []).append(
                {
                    **entry,
                    "_fallbackIndex": fallback_index,
                }
            )

        for document_entries in grouped_entries.values():
            document_entries.sort(
                key=lambda item: (
                    item.get("chunkIndex", item["_fallbackIndex"]),
                    item["_fallbackIndex"],
                )
            )

        return grouped_entries

    def _expand_context(self, matched_entry: Dict, document_entries: List[Dict], question: str) -> str:
        """
        将命中的片段与前后相邻片段拼接，避免只返回答案的开头一小截。
        """
        matched_chunk_index = matched_entry.get("chunkIndex")
        matched_document_id = matched_entry.get("documentId")
        matched_title = matched_entry.get("title")
        matched_chunk = matched_entry.get("chunk")

        matched_index = 0
        for index, entry in enumerate(document_entries):
            if matched_chunk_index is not None and entry.get("chunkIndex") == matched_chunk_index:
                matched_index = index
                break

            if (
                entry.get("documentId") == matched_document_id
                and entry.get("title") == matched_title
                and entry.get("chunk") == matched_chunk
            ):
                matched_index = index
                break

        start_index = max(matched_index - 1, 0)
        end_index = min(matched_index + 3, len(document_entries))
        window_entries = document_entries[start_index:end_index]
        merged_chunk = "\n".join(
            entry["chunk"].strip()
            for entry in window_entries
            if entry.get("chunk")
        ).strip()
        merged_chunk = _trim_to_question_anchor(merged_chunk, question)
        merged_chunk = _normalize_text(merged_chunk)

        return f"[{matched_entry['knowledgeBaseId']}] {matched_entry['title']}: {merged_chunk}"

    def search(
        self,
        question: str,
        knowledge_base_id: Optional[str],
        limit: int = 3
    ) -> List[str]:
        """
        检索与问题最相关的片段

        【搜索算法】
        使用简单的词集合交集计算相似度：
        1. 将问题分词
        2. 将每个片段分词
        3. 计算问题词集合与片段词集合的交集大小
        4. 按交集大小排序，返回 Top-K

        【生产环境升级】
        这只是演示用的轻量实现。
        真正的向量检索应该：
        - 使用余弦相似度或内积计算向量距离
        - 利用 FAISS/Pinecone 的近似最近邻（ANN）算法
        - 考虑语义相似度而非字面匹配
        """
        entries = _load_entries()
        question_tokens = _tokenize(question)

        # 【过滤】只搜索指定知识库（如果有）
        candidate_entries = [
            entry
            for entry in entries
            if knowledge_base_id is None or entry["knowledgeBaseId"] == knowledge_base_id
        ]

        if not candidate_entries:
            return []

        grouped_entries = self._group_entries_by_document(candidate_entries)

        # 【评分】计算每个片段与问题的相似度
        scored_entries = []
        for entry in candidate_entries:
            chunk_tokens = _tokenize(entry["chunk"])
            # 相似度 = 共同词的数量
            score = len(question_tokens & chunk_tokens)
            title_tokens = _tokenize(entry.get("title", ""))
            title_bonus = len(question_tokens & title_tokens)
            phrase_bonus = 1 if question.strip() and question.strip() in entry["chunk"] else 0
            quality_bonus = _quality_score(entry["chunk"])
            final_score = score * 2 + title_bonus + phrase_bonus + quality_bonus
            scored_entries.append((final_score, quality_bonus, entry))

        # 【排序】按分数降序，分数相同则按片段长度升序（短片段通常更精准）
        scored_entries.sort(
            key=lambda item: (
                item[0],                 # 综合分数（越高越好）
                item[1],                 # 正文质量（越高越好）
                -len(item[2]["chunk"]),  # 略偏向更完整的正文片段
            ),
            reverse=True,
        )

        # 【取 Top-K】优先返回有匹配的，否则返回前 K 个
        top_entries = [entry for score, _, entry in scored_entries if score > 0][:limit]

        if not top_entries:
            top_entries = [entry for _, _, entry in scored_entries[:limit]]

        merged_contexts: List[str] = []
        seen_documents: Set[str] = set()
        seen_contexts: Set[str] = set()

        for entry in top_entries:
            document_key = (
                entry.get("documentId")
                or f"{entry['knowledgeBaseId']}::{entry['title']}"
            )
            if document_key in seen_documents:
                continue

            document_entries = grouped_entries.get(document_key, [entry])
            merged_context = self._expand_context(entry, document_entries, question)
            normalized_context = _normalize_text(merged_context)
            if normalized_context in seen_contexts:
                continue

            merged_contexts.append(merged_context)
            seen_documents.add(document_key)
            seen_contexts.add(normalized_context)

        return merged_contexts[:limit]
