import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Set


STORE_PATH = Path(__file__).resolve().parents[1] / ".." / "data" / "knowledge_store.json"


def _ensure_store_file() -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        STORE_PATH.write_text("[]", encoding="utf-8")


def _load_entries() -> List[Dict]:
    _ensure_store_file()
    return json.loads(STORE_PATH.read_text(encoding="utf-8"))


def _save_entries(entries: List[Dict]) -> None:
    STORE_PATH.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _tokenize(text: str) -> Set[str]:
    # We keep tokenization intentionally simple:
    # English words are grouped normally, and Chinese characters are used as
    # lightweight tokens so the retriever can still score overlap meaningfully.
    words = re.findall(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]", text.lower())
    return {word for word in words if word.strip()}


class FaissStore:
    # This starter uses a JSON-backed local store instead of a real FAISS index.
    # The goal is to make ingestion and retrieval observable without adding
    # heavy native dependencies too early in your learning path.
    def upsert(
        self,
        document_id: Optional[str],
        knowledge_base_id: str,
        title: str,
        chunks: List[str],
        vectors: List[List[float]],
    ) -> None:
        entries = _load_entries()
        if document_id:
            filtered_entries = [
                entry for entry in entries if entry.get("documentId") != document_id
            ]
        else:
            filtered_entries = [
                entry
                for entry in entries
                if not (
                    entry["knowledgeBaseId"] == knowledge_base_id
                    and entry["title"] == title
                )
            ]

        filtered_entries.extend(
            {
                "documentId": document_id,
                "knowledgeBaseId": knowledge_base_id,
                "title": title,
                "chunk": chunk,
                "vector": vector,
            }
            for chunk, vector in zip(chunks, vectors)
        )

        _save_entries(filtered_entries)

    def search(self, question: str, knowledge_base_id: Optional[str], limit: int = 3) -> List[str]:
        entries = _load_entries()
        question_tokens = _tokenize(question)

        candidate_entries = [
            entry
            for entry in entries
            if knowledge_base_id is None or entry["knowledgeBaseId"] == knowledge_base_id
        ]

        if not candidate_entries:
            return []

        scored_entries = []
        for entry in candidate_entries:
            chunk_tokens = _tokenize(entry["chunk"])
            score = len(question_tokens & chunk_tokens)
            scored_entries.append((score, entry))

        scored_entries.sort(
            key=lambda item: (
                item[0],
                len(item[1]["chunk"]),
            ),
            reverse=True,
        )

        top_entries = [entry for score, entry in scored_entries if score > 0][:limit]

        if not top_entries:
            top_entries = [entry for _, entry in scored_entries[:limit]]

        return [
            f"[{entry['knowledgeBaseId']}] {entry['title']}: {entry['chunk']}"
            for entry in top_entries
        ]
