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
import os
import re
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Dict, List, Optional, Set

import fcntl


# 【存储路径】
# 所有数据存放在 data/knowledge_store.json
# 使用 Path 处理跨平台路径兼容性
STORE_PATH = Path(__file__).resolve().parents[1] / ".." / "data" / "knowledge_store.json"
LOCK_PATH = STORE_PATH.with_suffix(".lock")

QUESTION_STOPWORDS = {
    "一下",
    "一下子",
    "一下吧",
    "一下呢",
    "一下呀",
    "一下下",
    "什么",
    "为什么",
    "怎么",
    "怎样",
    "如何",
    "请问",
    "这个",
    "那个",
    "说说",
    "介绍",
    "讲讲",
    "说一下",
    "讲一下",
    "区别",
    "实现",
    "方法",
    "方式",
    "吗",
    "呢",
    "吧",
    "的",
    "了",
    "和",
    "与",
    "或",
}


def _ensure_store_file() -> None:
    """确保存储文件存在，必要时创建空数组文件"""
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        STORE_PATH.write_text("[]", encoding="utf-8")
    if not LOCK_PATH.exists():
        LOCK_PATH.write_text("", encoding="utf-8")


def _repair_corrupted_store_text(raw_text: str) -> Optional[List[Dict]]:
    """
    尝试修复已知的 JSON 索引损坏模式。

    目前最常见的是数组中间被误写入 `] },`，把后续对象挤到了数组外面。
    这里优先做保守修复；修复成功后会落盘，避免服务反复启动失败。
    """
    sanitized_text = raw_text

    # 把意外出现在数组中间的结束符修回逗号分隔。
    sanitized_text = re.sub(r"\]\s*},\s*(\{)", r",\n\1", sanitized_text)

    # 某些坏写入会把逗号单独留在行上，顺便规范一下。
    sanitized_text = re.sub(r"\n\s*,\s*\n", ",\n", sanitized_text)

    if sanitized_text == raw_text:
        return None

    try:
        return json.loads(sanitized_text)
    except json.JSONDecodeError:
        return None


@contextmanager
def _store_lock():
    """
    为 JSON 向量库提供进程级文件锁，避免并发重建/删除时把文件写坏。
    """
    _ensure_store_file()
    with LOCK_PATH.open("r+", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def _load_entries_unlocked() -> List[Dict]:
    raw_text = STORE_PATH.read_text(encoding="utf-8").strip()
    if not raw_text:
        return []
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        repaired_entries = _repair_corrupted_store_text(raw_text)
        if repaired_entries is None:
            raise

        _save_entries_unlocked(repaired_entries)
        return repaired_entries


def _load_entries() -> List[Dict]:
    """从文件加载所有条目"""
    with _store_lock():
        return _load_entries_unlocked()


def _save_entries_unlocked(entries: List[Dict]) -> None:
    serialized = json.dumps(entries, ensure_ascii=False, indent=2)
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=str(STORE_PATH.parent),
        delete=False,
    ) as temp_file:
        temp_file.write(serialized)
        temp_path = temp_file.name

    os.replace(temp_path, STORE_PATH)


def _save_entries(entries: List[Dict]) -> None:
    """将条目原子写入文件"""
    with _store_lock():
        _save_entries_unlocked(entries)


def _normalize_text(text: str) -> str:
    """压缩多余空白，便于展示拼接后的连续上下文。"""
    return re.sub(r"\s+", " ", text).strip()


def _canonical_search_text(text: str) -> str:
    """
    生成更适合检索的紧凑文本，解决 PDF 抽取中空格、全角符号和换行造成的短语错位。
    """
    normalized = text.lower()
    normalized = normalized.replace("．", ".").replace("。", ".")
    normalized = re.sub(r"\s+", "", normalized)
    return normalized


def _measure_terms(text: str) -> Set[str]:
    canonical = _canonical_search_text(text)
    return set(re.findall(r"\d+(?:\.\d+)?(?:px|rem|em|%)", canonical))


def _ascii_terms(text: str) -> Set[str]:
    canonical = _canonical_search_text(text)
    return set(re.findall(r"[a-z][a-z0-9_#.-]{1,}", canonical))


def _search_terms(text: str) -> Set[str]:
    """
    提取更稳定的检索词。

    这里刻意不再使用大量中文单字参与主排序，因为单字会把“线”“事”“用”
    这类高频字放大，导致 cloneDeep、事件委托等无关片段被误召回。
    """
    canonical = _canonical_search_text(text)
    terms = set(re.findall(r"\d+(?:\.\d+)?(?:px|rem|em|%)", canonical))
    terms.update(_ascii_terms(text))

    chinese_segments = re.findall(r"[\u4e00-\u9fff]{2,}", canonical)
    for segment in chinese_segments:
        if segment in QUESTION_STOPWORDS:
            continue
        max_size = min(6, len(segment))
        for size in range(2, max_size + 1):
            for start in range(0, len(segment) - size + 1):
                term = segment[start : start + size]
                if term not in QUESTION_STOPWORDS:
                    terms.add(term)

    return {term for term in terms if term and term not in QUESTION_STOPWORDS}


def _term_weight(term: str) -> int:
    if re.fullmatch(r"\d+(?:\.\d+)?(?:px|rem|em|%)", term):
        return 8
    if re.search(r"\d", term):
        return 5
    if len(term) >= 5:
        return 4
    if len(term) >= 3:
        return 3
    return 2


def _phrase_candidates(question: str) -> Set[str]:
    canonical = _canonical_search_text(question)
    phrases = set()

    for segment in re.findall(r"[\u4e00-\u9fff0-9a-z.%-]{3,}", canonical):
        trimmed = segment
        for stopword in QUESTION_STOPWORDS:
            trimmed = trimmed.replace(stopword, "")
        if len(trimmed) >= 3:
            phrases.add(trimmed)

    phrases.update(_measure_terms(question))
    return phrases


def _has_core_query_terms(question: str) -> bool:
    terms = _search_terms(question)
    return any(len(term) >= 2 for term in terms)


def _lexical_relevance_score(question: str, chunk: str) -> int:
    query_terms = _search_terms(question)
    if not query_terms:
        return 0

    chunk_terms = _search_terms(chunk)
    matched_terms = query_terms & chunk_terms
    matched_weight = sum(_term_weight(term) for term in matched_terms)
    total_weight = sum(_term_weight(term) for term in query_terms)
    coverage = matched_weight / max(total_weight, 1)

    score = int(matched_weight * 4 + coverage * 18)
    canonical_chunk = _canonical_search_text(chunk)

    for phrase in _phrase_candidates(question):
        if phrase and phrase in canonical_chunk:
            score += 12 if len(phrase) >= 4 else 7

    # 如果问题里有强约束项（如 0.5px、ES6、HTTP2），候选片段必须命中它们。
    question_measures = _measure_terms(question)
    if question_measures and not (question_measures & _measure_terms(chunk)):
        score -= 18

    return score


def _dedupe_lines(lines: List[str]) -> List[str]:
    """去掉连续重复的文本行，缓解 PDF 解析后的重叠切片噪音。"""
    deduped: List[str] = []
    previous_normalized = ""

    for line in lines:
        normalized = _normalize_text(line)
        if not normalized:
            continue
        if normalized == previous_normalized:
            continue
        deduped.append(line.strip())
        previous_normalized = normalized

    return deduped


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
    return _search_terms(text)


def _is_toc_like(chunk: str) -> bool:
    """
    判断片段是否更像目录、页码导航，而不是正文答案。
    """
    normalized = chunk.replace(" ", "")
    question_count = len(re.findall(r"第\d+题", normalized))
    dotted_leader_count = len(re.findall(r"[.。·…]{6,}", normalized))
    has_catalog = "目录" in normalized

    if has_catalog or question_count >= 3 or dotted_leader_count >= 2:
        return True

    # PDF 里很多正文页也包含页码和短标题；只要已经有明显解释/代码信号，
    # 就不要因为“短行多”误判成目录。
    has_answer_signal = _answer_signal_score(chunk) >= 6
    if has_answer_signal:
        return False

    has_many_page_numbers = len(re.findall(r"\n?\d{1,3}\n", chunk)) >= 3
    has_many_short_topic_lines = (
        len([line for line in chunk.splitlines() if 3 <= len(line.strip()) <= 36]) >= 10
    )
    return (
        (has_many_page_numbers and not has_answer_signal)
        or (has_many_short_topic_lines and not has_answer_signal)
    )


def _answer_signal_score(chunk: str) -> int:
    """
    判断片段是否真的像“答案正文”。

    轻量检索没有真正语义理解，所以这里用解释词、实现词和代码痕迹给正文加权，
    避免题目清单、目录页仅凭命中标题就排到最前。
    """
    normalized = _canonical_search_text(chunk)
    score = 0

    keyword_groups = [
        ["是", "指", "称为", "称之为", "直译成", "相当于", "属于", "表示"],
        ["可以", "能够", "会", "不会", "需要", "用于", "通过", "采用"],
        ["原因", "作用", "方式", "方法", "步骤", "例如", "比如", "主要", "包括"],
        ["优化", "避免", "减少", "触发", "频率", "保证", "执行", "渲染", "布局"],
    ]
    for keywords in keyword_groups:
        if any(_canonical_search_text(keyword) in normalized for keyword in keywords):
            score += 2

    if re.search(r"(?:^|\n).{1,24}[:：]", chunk):
        score += 2

    if any(keyword in normalized for keyword in ["function", "return", "const", "let", "settimeout", "cleartimeout"]):
        score += 4

    if any(keyword in normalized for keyword in ["<meta", "viewport", "border-image", "scale()", "display", "position"]):
        score += 3

    sentence_like_count = len(re.findall(r"[。；;]|，|,", chunk))
    score += min(sentence_like_count, 4)

    if len(chunk.strip()) >= 120:
        score += 1
    if len(chunk.strip()) >= 260:
        score += 1

    lines = [line.strip() for line in chunk.splitlines() if line.strip()]
    short_lines = [line for line in lines if 3 <= len(line) <= 42]
    has_code_signal = any(keyword in normalized for keyword in ["function", "return", "const", "let", "<meta"])
    has_definition_signal = bool(re.search(r"(?:^|\n).{1,24}[:：]", chunk))
    if (
        len(short_lines) >= 10
        and len(short_lines) / max(len(lines), 1) >= 0.7
        and sentence_like_count <= 2
        and not has_code_signal
        and not has_definition_signal
    ):
        score = min(score, 4)

    return score


def _is_question_list_like(chunk: str) -> bool:
    """
    判断片段是否更像题目清单，而不是答案正文。
    """
    normalized = chunk.replace(" ", "")
    numbered_items = len(re.findall(r"\n?\d+[、.．]", normalized))
    short_question_lines = len(
        [
            line
            for line in chunk.splitlines()
            if 4 <= len(line.strip()) <= 40
            and any(marker in line for marker in ["什么", "区别", "如何", "为什么", "吗？", "吗?"])
        ]
    )
    return numbered_items >= 4 or short_question_lines >= 4


def _topic_list_penalty(chunk: str, question: str) -> int:
    """
    对“只列题目、没有答案”的片段降权。
    """
    lines = [line.strip() for line in chunk.splitlines() if line.strip()]
    if not lines:
        return 0

    answer_score = _answer_signal_score(chunk)
    short_lines = [line for line in lines if 3 <= len(line) <= 42]
    questionish_lines = [
        line
        for line in short_lines
        if _is_question_heading(line)
        or any(marker in line for marker in ["什么", "区别", "如何", "为什么", "吗", "了解"])
    ]

    penalty = 0
    has_code_signal = any(
        keyword in _canonical_search_text(chunk)
        for keyword in ["function", "return", "const", "let", "<meta", "settimeout", "cleartimeout"]
    )
    has_definition_signal = bool(re.search(r"(?:^|\n).{1,24}[:：]", chunk))
    sentence_like_count = len(re.findall(r"[。；;]|，|,", chunk))

    if len(questionish_lines) >= 4 and answer_score < 10:
        penalty += 18
    if len(short_lines) >= 10 and len(short_lines) / max(len(lines), 1) >= 0.72:
        penalty += 24 if not has_code_signal and not has_definition_signal and sentence_like_count <= 2 else 8
    if _is_question_list_like(chunk) and answer_score < 10:
        penalty += 12

    canonical_question = _canonical_search_text(question)
    canonical_chunk = _canonical_search_text(chunk)
    exact_match_only_title = (
        canonical_question
        and canonical_question in canonical_chunk
        and answer_score < 6
        and any(canonical_question in _canonical_search_text(line) and len(line) <= 42 for line in short_lines)
    )
    if exact_match_only_title:
        penalty += 10

    return penalty


def _quality_score(chunk: str) -> int:
    """
    片段质量分，正文高，目录/导航低。
    """
    score = 0
    score += _answer_signal_score(chunk)
    score -= _topic_list_penalty(chunk, "")

    if _is_toc_like(chunk):
        score -= 18
    if _is_question_list_like(chunk):
        score -= 12

    if "function" in chunk.lower() or "=>" in chunk or "return" in chunk:
        score += 2

    if any(keyword in chunk for keyword in ["区别", "实现", "步骤", "原理", "作用"]):
        score += 2

    if any(keyword in chunk for keyword in ["原因", "方法", "优化", "避免", "减少", "例如", "比如"]):
        score += 3

    if any(keyword in chunk for keyword in ["采用", "方式", "viewport", "border-image", "scale()"]):
        score += 4

    if any(keyword in chunk for keyword in ["函数", "触发", "频率", "setTimeout", "clearTimeout", "timer"]):
        score += 3

    if len(chunk.strip()) >= 160:
        score += 1

    return score


def _intent_score(question: str, chunk: str) -> int:
    """
    针对短问题做轻量意图匹配，避免只靠散词交集把结果带偏。
    """
    score = 0
    canonical_question = _canonical_search_text(question)
    canonical_chunk = _canonical_search_text(chunk)

    question_measures = _measure_terms(question)
    chunk_measures = _measure_terms(chunk)
    if question_measures:
        if question_measures & chunk_measures:
            score += 18
        else:
            score -= 8

    phrase_candidates = [
        token
        for token in [
            "0.5px",
            "画一条",
            "一条线",
            "的线",
            "怎么画",
            "如何画",
            "如何实现",
        ]
        if token in canonical_question
    ]
    for phrase in phrase_candidates:
        if phrase in canonical_chunk:
            score += 6

    if "线" in canonical_question and "线" in canonical_chunk:
        score += 5
    if any(word in canonical_question for word in ["画", "实现"]) and any(
        word in canonical_chunk for word in ["画", "实现", "采用", "方式"]
    ):
        score += 5

    if any(word in canonical_question for word in ["怎么", "如何"]) and any(
        word in canonical_chunk for word in ["采用", "方式", "可以", "通过"]
    ):
        score += 4

    question_ascii_terms = _ascii_terms(question)
    chunk_ascii_terms = _ascii_terms(chunk)
    if question_ascii_terms:
        if not (question_ascii_terms & chunk_ascii_terms):
            score -= 18
        has_definition_signal = any(
            keyword in canonical_chunk
            for keyword in ["直译成", "是一个", "相当于", "作用", "应用", "产生", "生成"]
        )
        if has_definition_signal and question_ascii_terms & chunk_ascii_terms:
            score += 8

    return score


def _is_question_heading(line: str) -> bool:
    normalized = line.strip()
    if not normalized:
        return False
    if re.match(r"^第\d+页$", normalized):
        return False
    if re.match(r"^[、•·]\s*", normalized):
        return True
    return bool(
        re.match(r"^(?:第?\d+[、.．题:]|[一二三四五六七八九十]+[、.．])", normalized)
    )


def _line_score(line: str, question_tokens: Set[str]) -> int:
    normalized = line.strip().lower()
    if not normalized:
        return -999

    score = 0
    for token in question_tokens:
        if token in normalized:
            score += max(len(token), 1) * 2

    if any(keyword in normalized for keyword in ["重排", "回流", "重绘", "原因", "方法", "避免", "减少"]):
        score += 3

    if any(keyword in normalized for keyword in ["浏览器", "dom", "class", "fragment", "absolute", "transform"]):
        score += 2

    if len(normalized) <= 36 and any(marker in normalized for marker in ["什么", "如何", "吗", "区别", "作用"]):
        score -= 4

    if _is_question_heading(normalized):
        score -= 5

    if _is_toc_like(normalized) or _is_question_list_like(normalized):
        score -= 6

    if len(normalized) < 10:
        score -= 2

    return score


def _line_matches_question(line: str, question_tokens: Set[str]) -> bool:
    """
    判断一行是否命中问题关键词，同时兼容 PDF 抽取出的 `BF  C`、`0. 5px` 这类空格错位。
    """
    lowered = line.lower()
    canonical_line = _canonical_search_text(line)
    return any(token in lowered or _canonical_search_text(token) in canonical_line for token in question_tokens)


def _extract_focus_excerpt(text: str, question: str, max_chars: int = 1600) -> str:
    """
    从拼接后的上下文里截取最相关的答案段，尽量避开题纲和下一题内容。
    """
    lines = _dedupe_lines([line for line in text.splitlines() if line.strip()])
    if not lines:
        return text.strip()

    question_tokens = {
        token
        for token in _tokenize(question)
        if len(token) >= 2 and not token.isdigit()
    }

    def block_score(block_lines: List[str]) -> int:
        return sum(
            max(_line_score(line, question_tokens), 0)
            for line in block_lines
            if not _is_question_heading(line)
        )

    heading_indexes = [
        index
        for index, line in enumerate(lines)
        if _is_question_heading(line)
        and _line_matches_question(line, question_tokens)
    ]

    best_heading_excerpt = ""
    best_heading_score = -1
    for heading_index in heading_indexes:
        before_start = heading_index - 1
        while before_start > 0 and not _is_question_heading(lines[before_start - 1]):
            before_start -= 1
        before_block = lines[max(before_start, heading_index - 12) : heading_index]

        after_end = heading_index + 1
        while after_end < len(lines) and not _is_question_heading(lines[after_end]):
            after_end += 1
        after_block = lines[heading_index + 1 : min(after_end, heading_index + 9)]

        candidates = [block for block in (before_block, after_block) if block]
        for block in candidates:
            current_score = block_score(block)
            if current_score > best_heading_score:
                best_heading_score = current_score
                block_lines = _dedupe_lines(block)
                while block_lines and _is_question_heading(block_lines[-1]):
                    block_lines.pop()
                best_heading_excerpt = "\n".join(block_lines).strip()

    if best_heading_excerpt and best_heading_score > 0:
        return best_heading_excerpt[:max_chars].strip()

    question_occurrence_indexes = [
        index
        for index, line in enumerate(lines)
        if _line_matches_question(line, question_tokens)
    ]

    if question_occurrence_indexes:
        start_index = question_occurrence_indexes[0]
        while start_index > 0 and not _is_question_heading(lines[start_index]):
            start_index -= 1
            if re.match(r"^第\d+页$", lines[start_index].strip()):
                start_index += 1
                break

        selected_lines: List[str] = []
        for index in range(start_index, len(lines)):
            line = lines[index]
            if index > start_index and _is_question_heading(line):
                break
            selected_lines.append(line)
            if len("\n".join(selected_lines)) >= max_chars:
                break

        excerpt = "\n".join(_dedupe_lines(selected_lines)).strip()
        if excerpt:
            return excerpt[:max_chars].strip()

    scored_lines = [
        (_line_score(line, question_tokens), index, line)
        for index, line in enumerate(lines)
    ]
    scored_lines.sort(key=lambda item: (item[0], -item[1]), reverse=True)

    best_score, best_index, _ = scored_lines[0]
    if best_score <= 0:
        excerpt = "\n".join(lines[:8]).strip()
        return excerpt[:max_chars].strip()

    start_index = best_index
    while start_index > 0:
        candidate = lines[start_index - 1]
        candidate_score = _line_score(candidate, question_tokens)
        if _is_question_heading(candidate) or candidate_score <= 0:
            break
        start_index -= 1

    selected_lines: List[str] = []
    for index in range(start_index, len(lines)):
        line = lines[index]

        if _is_question_heading(line):
            if index <= best_index:
                continue
            break

        if (
            index > best_index
            and _is_question_heading(line)
            and not _line_matches_question(line, question_tokens)
        ):
            break

        selected_lines.append(line)
        if len("\n".join(selected_lines)) >= max_chars:
            break

    excerpt = "\n".join(_dedupe_lines(selected_lines)).strip()
    return excerpt[:max_chars].strip()


def _excerpt_value_score(excerpt: str, question: str) -> int:
    lines = [line.strip() for line in excerpt.splitlines() if line.strip()]
    if not lines:
        return -1

    question_tokens = {
        token
        for token in _tokenize(question)
        if len(token) >= 2 and not token.isdigit()
    }
    answer_like_lines = 0
    heading_like_lines = 0

    for line in lines:
        if _is_question_heading(line):
            heading_like_lines += 1
            continue
        if _line_score(line, question_tokens) > 0:
            answer_like_lines += 1

    return answer_like_lines - heading_like_lines


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

    anchored_text = normalized_text[line_start:].strip()
    return _extract_focus_excerpt(anchored_text, question)


def _has_topic_boundary(chunk: str) -> bool:
    """
    判断片段是否进入了下一题或下一段问题清单。
    """
    normalized = chunk.strip()
    if re.match(r"^第\d+页(?:\n|$)", normalized):
        normalized = re.sub(r"^第\d+页\n?", "", normalized, count=1).strip()

    return bool(
        re.search(r"(?:^|\n)(?:第\d+题[:：]?|\d+[、.．])", normalized)
    )


def _looks_like_next_question(chunk: str, question: str) -> bool:
    normalized = chunk.strip()
    normalized = re.sub(r"^第\d+页\n?", "", normalized, count=1).strip()

    if not _has_topic_boundary(normalized):
        return False

    question_tokens = {
        token
        for token in _tokenize(question)
        if len(token) >= 2 and not token.isdigit()
    }
    return not any(token in normalized for token in question_tokens)


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
        with _store_lock():
            entries = _load_entries_unlocked()

            # 【去重】删除旧版本
            # 优先保留同一知识库下当前标题的最新版本，避免重复入库后旧切片继续参与检索。
            filtered_entries = [
                entry
                for entry in entries
                if not (
                    entry["knowledgeBaseId"] == knowledge_base_id
                    and entry["title"] == title
                )
            ]
            if document_id:
                filtered_entries = [
                    entry for entry in filtered_entries if entry.get("documentId") != document_id
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

            _save_entries_unlocked(filtered_entries)

    def delete_document(self, document_id: str) -> int:
        """
        删除某个文档对应的全部切片，避免文档删除后旧索引残留。
        """
        if not document_id:
            return 0

        with _store_lock():
            entries = _load_entries_unlocked()
            filtered_entries = [
                entry
                for entry in entries
                if entry.get("documentId") != document_id
            ]
            removed_count = len(entries) - len(filtered_entries)

            if removed_count:
                _save_entries_unlocked(filtered_entries)

            return removed_count

    def delete_knowledge_base(self, knowledge_base_id: str) -> int:
        """
        删除整个知识库下的全部切片。
        """
        if not knowledge_base_id:
            return 0

        with _store_lock():
            entries = _load_entries_unlocked()
            filtered_entries = [
                entry
                for entry in entries
                if entry.get("knowledgeBaseId") != knowledge_base_id
            ]
            removed_count = len(entries) - len(filtered_entries)

            if removed_count:
                _save_entries_unlocked(filtered_entries)

            return removed_count

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
        window_entries = []

        for index in range(start_index, len(document_entries)):
            entry = document_entries[index]
            chunk = (entry.get("chunk") or "").strip()
            if not chunk:
                continue

            if index > matched_index and _looks_like_next_question(chunk, question):
                break

            window_entries.append(entry)
            merged_text = "\n".join(item["chunk"].strip() for item in window_entries if item.get("chunk"))
            if len(merged_text) >= 1600:
                break

        merged_chunk = "\n".join(
            entry["chunk"].strip()
            for entry in window_entries
            if entry.get("chunk")
        ).strip()
        merged_chunk = _trim_to_question_anchor(merged_chunk, question)
        merged_chunk = re.sub(r"\n{3,}", "\n\n", merged_chunk).strip()

        return f"[{matched_entry['knowledgeBaseId']}] {matched_entry['title']}: {merged_chunk}"

    def search(
        self,
        question: str,
        knowledge_base_id: Optional[str],
        limit: int = 4
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
            title_tokens = _tokenize(entry.get("title", ""))
            title_bonus = len(question_tokens & title_tokens)
            lexical_score = _lexical_relevance_score(question, entry["chunk"])
            phrase_bonus = 14 if _canonical_search_text(question.strip()) in _canonical_search_text(entry["chunk"]) else 0
            quality_bonus = _quality_score(entry["chunk"])
            intent_bonus = _intent_score(question, entry["chunk"])
            answer_bonus = _answer_signal_score(entry["chunk"])
            topic_penalty = _topic_list_penalty(entry["chunk"], question)
            final_score = (
                lexical_score
                + title_bonus
                + phrase_bonus
                + quality_bonus
                + intent_bonus
                + answer_bonus
                - topic_penalty
            )
            scored_entries.append(
                {
                    "final_score": final_score,
                    "quality_bonus": quality_bonus,
                    "entry": entry,
                    "lexical_score": lexical_score,
                    "title_bonus": title_bonus,
                    "phrase_bonus": phrase_bonus,
                }
            )

        # 【排序】按分数降序，分数相同则按片段长度升序（短片段通常更精准）
        scored_entries.sort(
            key=lambda item: (
                item["final_score"],                 # 综合分数（越高越好）
                item["quality_bonus"],               # 正文质量（越高越好）
                -len(item["entry"]["chunk"]),       # 略偏向更完整的正文片段
            ),
            reverse=True,
        )

        has_strict_matches = any(
            item["lexical_score"] > 0 or item["title_bonus"] > 0 or item["phrase_bonus"] > 0
            for item in scored_entries
        )
        strict_query = _has_core_query_terms(question)

        if strict_query and has_strict_matches:
            scored_entries = [
                item
                for item in scored_entries
                if item["lexical_score"] > 0 or item["title_bonus"] > 0 or item["phrase_bonus"] > 0
            ]

        top_score = scored_entries[0]["final_score"] if scored_entries else 0
        min_relative_score = max(12, int(top_score * 0.45))

        # 【取 Top-K】优先返回强相关正文，避免把仅仅“沾边”的题纲片段送去回答层。
        preferred_entries = [
            item
            for item in scored_entries
            if item["final_score"] > 0
            and item["final_score"] >= min_relative_score
            and item["quality_bonus"] > -8
            and (not _is_toc_like(item["entry"]["chunk"]) or _answer_signal_score(item["entry"]["chunk"]) >= 8)
            and _topic_list_penalty(item["entry"]["chunk"], question) < 18
        ]
        candidate_ranked_entries = preferred_entries or [
            item
            for item in scored_entries
            if item["final_score"] > 0
            and item["final_score"] >= max(8, min_relative_score - 4)
        ]

        top_entries: List[Dict] = []
        selected_regions: Set[str] = set()

        for item in candidate_ranked_entries:
            entry = item["entry"]
            document_key = (
                entry.get("documentId")
                or f"{entry['knowledgeBaseId']}::{entry['title']}"
            )
            chunk_index = entry.get("chunkIndex", -1)
            region_key = (
                f"{document_key}::idx:{chunk_index // 2}"
                if isinstance(chunk_index, int) and chunk_index >= 0
                else f"{document_key}::fallback:{_normalize_text(entry['chunk'])[:120]}"
            )
            if region_key in selected_regions:
                continue

            top_entries.append(entry)
            selected_regions.add(region_key)
            if len(top_entries) >= limit:
                break

        if not top_entries or top_score < 8:
            return []

        merged_contexts: List[str] = []
        seen_contexts: Set[str] = set()
        question_ascii_terms = _ascii_terms(question)
        strict_query = _has_core_query_terms(question)

        for entry in top_entries:
            document_key = (
                entry.get("documentId")
                or f"{entry['knowledgeBaseId']}::{entry['title']}"
            )
            document_entries = grouped_entries.get(document_key, [entry])
            merged_context = self._expand_context(entry, document_entries, question)
            _, _, excerpt = merged_context.partition(":")
            excerpt_score = _excerpt_value_score(excerpt, question)
            excerpt_ascii_terms = _ascii_terms(excerpt)
            if (
                question_ascii_terms
                and merged_contexts
                and not (question_ascii_terms & excerpt_ascii_terms)
            ):
                continue
            if strict_query and (
                _is_question_list_like(excerpt)
                or excerpt_score < 4
            ):
                continue
            if excerpt_score <= 0 and merged_contexts:
                continue
            normalized_context = _normalize_text(merged_context)
            if normalized_context in seen_contexts:
                continue

            merged_contexts.append(merged_context)
            seen_contexts.add(normalized_context)

        return merged_contexts[:limit]
