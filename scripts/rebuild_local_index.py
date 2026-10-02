from pathlib import Path
import shutil
import tempfile

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.embeddings import LocalChromaEmbeddings


DATA = Path(__file__).resolve().parent.parent
PDF_URL = (
    "https://cdnbbsr.s3waas.gov.in/s380537a945c7aaa788ccfcdf1b99b5d8f/"
    "uploads/2024/07/20240716890312078.pdf"
)
INDEX_DIR = DATA / "chroma_db_legal_bot_part1"


def rebuild_index() -> None:
    load_dotenv(DATA / ".env")
    pdf_path = Path(tempfile.gettempdir()) / "lawglance-constitution.pdf"
    staging_dir = DATA / "chroma_db_legal_bot_part1_local_new"

    if staging_dir.exists():
        shutil.rmtree(staging_dir)

    import urllib.request

    urllib.request.urlretrieve(PDF_URL, pdf_path)
    documents = PyMuPDFLoader(str(pdf_path)).load()
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    ).split_documents(documents)

    embeddings = LocalChromaEmbeddings()
    Chroma.from_documents(
        chunks,
        embedding=embeddings,
        persist_directory=str(staging_dir),
    )

    backup_dir = DATA / "chroma_db_legal_bot_part1_previous_backup"
    if backup_dir.exists():
        shutil.rmtree(backup_dir)
    if INDEX_DIR.exists():
        INDEX_DIR.rename(backup_dir)
    staging_dir.rename(INDEX_DIR)
    print(f"Created local embedding index with {len(chunks)} chunks at {INDEX_DIR}")
    print(f"Previous index backup: {backup_dir}")


if __name__ == "__main__":
    rebuild_index()