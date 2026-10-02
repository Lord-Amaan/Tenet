import argparse
import hashlib
import math
from pathlib import Path
import re
import uuid

from langchain_chroma import Chroma
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


DATA = Path(__file__).resolve().parent.parent
INDEX_DIR = DATA / "chroma_db_legal_bot_part1"
VECTOR_DIMENSION = 1536


def deterministic_vector(text: str) -> list[float]:
    vector = [0.0] * VECTOR_DIMENSION
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        digest = hashlib.sha256(token.encode()).digest()
        index = int.from_bytes(digest[:4], "big") % VECTOR_DIMENSION
        vector[index] += 1.0 if digest[4] % 2 else -1.0

    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / magnitude for value in vector]


def add_pdf(
    pdf_path: Path,
    title: str,
    act: str,
    jurisdiction: str,
    document_type: str = "legal source",
) -> int:
    if not pdf_path.is_file():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    documents = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    ).split_documents(PyMuPDFLoader(str(pdf_path)).load())
    metadatas = []
    texts = []
    embeddings = []
    ids = []

    for document in documents:
        metadata = {
            **document.metadata,
            "source": str(pdf_path.resolve()),
            "source_name": title,
            "title": title,
            "act": act,
            "jurisdiction": jurisdiction,
            "document_type": document_type,
        }
        text = document.page_content.strip()
        if not text:
            continue
        metadatas.append(metadata)
        texts.append(text)
        embeddings.append(deterministic_vector(text))
        ids.append(f"{act}-{uuid.uuid4()}")

    if not texts:
        return 0

    store = Chroma(persist_directory=str(INDEX_DIR))
    store._collection.add(
        ids=ids,
        documents=texts,
        metadatas=metadatas,
        embeddings=embeddings,
    )
    return len(texts)


def main() -> None:
    parser = argparse.ArgumentParser(description="Add a legal PDF to LawGlance's corpus.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--title", required=True, help="Human-readable document title")
    parser.add_argument("--act", required=True, help="Act or regulation identifier")
    parser.add_argument("--jurisdiction", default="India")
    parser.add_argument("--document-type", default="legal source")
    args = parser.parse_args()

    count = add_pdf(
        args.pdf,
        args.title,
        args.act,
        args.jurisdiction,
        args.document_type,
    )
    print(f"Added {count} chunks from {args.title}")


if __name__ == "__main__":
    main()