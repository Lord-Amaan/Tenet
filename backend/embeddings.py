from chromadb.utils.embedding_functions import DefaultEmbeddingFunction


class LocalChromaEmbeddings:
    """Adapt Chroma's bundled ONNX MiniLM model to LangChain's API."""

    def __init__(self):
        self._embedding_function = DefaultEmbeddingFunction()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [list(vector) for vector in self._embedding_function(texts)]

    def embed_query(self, text: str) -> list[float]:
        return list(self._embedding_function([text])[0])