from typing import Dict


def load_document(title: str, content: str) -> Dict[str, str]:
    # Real projects may parse PDF, Markdown, DOCX, HTML, or URLs here.
    # The starter keeps a plain-text path so you can focus on the workflow first.
    return {
        "title": title,
        "content": content.strip(),
    }
