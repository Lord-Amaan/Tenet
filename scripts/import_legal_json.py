import json
from pathlib import Path

from langchain_chroma import Chroma

from add_legal_pdf import deterministic_vector


DATA = Path(__file__).resolve().parent.parent
DOCUMENT_DIR = DATA / "legal_documents"
INDEX_DIR = DATA / "chroma_db_legal_bot_part1"


def item_text(item: dict) -> str:
    text = item.get("text") or item.get("description") or item.get("section_desc")
    if not text:
        return ""
    label = item.get("source_label") or item.get("section_title") or item.get("title")
    return f"[{label}]\n{text}" if label else text


def item_metadata(item: dict, filename: str) -> dict:
    act = item.get("act") or Path(filename).stem
    title = item.get("source_label") or item.get("section_title") or item.get("title") or act
    metadata = {
        "source": str((DOCUMENT_DIR / filename).resolve()),
        "source_name": title,
        "title": title,
        "act": act,
        "jurisdiction": "India",
        "document_type": "primary legal source",
    }
    for key in ("chapter", "section", "section_number", "article", "chunk_id"):
        if item.get(key) is not None:
            metadata[key] = item[key]
    return metadata


def import_json_documents() -> tuple[int, int]:
    store = Chroma(persist_directory=str(INDEX_DIR))
    existing = store.get(include=["metadatas"])
    greeting_ids = [
        item_id
        for item_id, metadata in zip(existing["ids"], existing["metadatas"])
        if (metadata or {}).get("source") == "english greeting words"
    ]
    if greeting_ids:
        store._collection.delete(ids=greeting_ids)

    texts = []
    metadatas = []
    ids = []
    for path in sorted(DOCUMENT_DIR.glob("*.json")):
        items = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(items, list):
            raise ValueError(f"Expected a list in {path.name}")
        for index, item in enumerate(items):
            text = item_text(item).strip()
            if not text:
                continue
            texts.append(text)
            metadatas.append(item_metadata(item, path.name))
            ids.append(f"json-{path.stem}-{index}")

    store._collection.upsert(
        ids=ids,
        documents=texts,
        metadatas=metadatas,
        embeddings=[deterministic_vector(text) for text in texts],
    )
    return len(texts), len(greeting_ids)


if __name__ == "__main__":
    imported, removed = import_json_documents()
    print(f"Imported or updated {imported} JSON legal chunks")
    print(f"Removed {removed} greeting test chunks")