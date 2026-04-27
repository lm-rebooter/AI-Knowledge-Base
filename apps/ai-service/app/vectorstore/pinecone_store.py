class PineconeStore:
    # Keeping Pinecone in a separate file makes it obvious that cloud vector
    # storage is an implementation choice, not a hard dependency.
    def upsert(self, _vectors: list[list[float]]) -> None:
        return None
