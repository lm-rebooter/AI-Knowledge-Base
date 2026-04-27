def embed_chunks(chunks: list[str]) -> list[list[float]]:
    # Instead of hitting an embedding API during scaffold setup, we return
    # tiny deterministic vectors that make the data flow easy to inspect.
    return [[float(len(chunk)), float(index)] for index, chunk in enumerate(chunks)]
