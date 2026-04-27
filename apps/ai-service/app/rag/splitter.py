def split_document(content: str, chunk_size: int = 200) -> list[str]:
    # This naive splitter is enough to explain the idea:
    # long text gets cut into smaller chunks so retrieval stays targeted.
    return [content[i : i + chunk_size] for i in range(0, len(content), chunk_size) if content[i : i + chunk_size]]
