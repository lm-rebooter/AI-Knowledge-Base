class FaissStore:
    # This file is intentionally lightweight.
    # Its purpose is to mark where local vector storage integration belongs.
    def upsert(self, _vectors: list[list[float]]) -> None:
        return None
