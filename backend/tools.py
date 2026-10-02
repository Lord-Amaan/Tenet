# Define document store
import re

from langchain_core.documents import Document

from backend.config import vector_store
from backend.citation import annotate_documents_for_citation, CITATION_MARKER_KEY
from backend.problem import expand_query
from langchain.tools import tool


def _keyword_search(query: str, k: int = 5) -> list[Document]:
    """Retrieve relevant passages without requiring an embedding API or model."""
    stored = vector_store.get(include=["documents", "metadatas"])
    query_terms = set(re.findall(r"[a-z0-9]+", expand_query(query).lower()))
    scored_documents = []

    for content, metadata in zip(stored["documents"], stored["metadatas"]):
        document_terms = set(re.findall(r"[a-z0-9]+", content.lower()))
        score = len(query_terms & document_terms)
        if score:
            scored_documents.append((score, Document(page_content=content, metadata=metadata or {})))

    scored_documents.sort(key=lambda item: item[0], reverse=True)
    return [document for _, document in scored_documents[:k]]


def retrieve_context(query: str):
    result = _keyword_search(query, k=5)
    annotated_docs, citations = annotate_documents_for_citation(result)
    content = "\n\n".join(
        f"{doc.metadata[CITATION_MARKER_KEY]}\n{doc.page_content}".strip()
        for doc in annotated_docs
    )
    return content, citations


@tool(response_format="content_and_artifact")
def retrieve_docs(query:str):
    """
    This function retrieve relevant docs from the vector store based on similarity search.
    Args:
        query:str User question for a semantic search , it should not be a keyword search. should be a full sentence search
    """

    return retrieve_context(query)

