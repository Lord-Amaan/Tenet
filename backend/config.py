from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from dotenv import load_dotenv
from pathlib import Path
import os

from backend.cache import RedisCache

DATA = Path(__file__).resolve().parent.parent

load_dotenv()

model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    max_tokens=600,
)
vector_store = Chroma(
    persist_directory=str(DATA / "chroma_db_legal_bot_part1"),
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))
cache = RedisCache(REDIS_URL)

memory = MemorySaver()
