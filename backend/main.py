from dataclasses import asdict
import json
import os
from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from typing import Literal
from backend.retrieval import agent_invoke


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_ROOT = Path(__file__).resolve().parent.parent

Language = Literal[
    "English",
    "Hindi",
    "Malayalam",
    "Tamil",
    "Telugu",
    "Kannada",
    "Bengali",
    "Marathi",
]


class QueryRequest(BaseModel):
    query: str
    session_id: str | None = None
    language: Language = "English"


def query_response(
    query: str, session_id: str | None = None, language: Language = "English"
):
    answer, citations, session_id = agent_invoke(
        query=query,
        session_id=session_id,
        language=language,
    )
    return {
        "answer": answer,
        "citations": [asdict(citation) for citation in citations],
        "session_id": session_id,
    }


@app.post("/query")
def post_query(request: QueryRequest):
    return query_response(request.query, request.session_id, request.language)


@app.get("/query")
def send_query(query: str, session_id: str | None = None):
    return query_response(query, session_id)


@app.get("/lawyers")
def list_lawyers():
    """Return the clearly labeled demo lawyer directory for the client UI."""
    directory = json.loads((DATA_ROOT / "data" / "lawyers.json").read_text(encoding="utf-8"))
    return {
        "metadata": directory["metadata"],
        "lawyers": directory["lawyers"],
    }


@app.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Language = Form("English"),
):
    """Transcribe a short voice question with Groq's Whisper model."""
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=503, detail="Whisper is not configured.")

    allowed_types = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"}
    if audio.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported audio format.")

    contents = await audio.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The audio recording was empty.")
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The recording is too large.")

    language_codes = {
        "English": "en",
        "Hindi": "hi",
        "Malayalam": "ml",
        "Tamil": "ta",
        "Telugu": "te",
        "Kannada": "kn",
        "Bengali": "bn",
        "Marathi": "mr",
    }

    try:
        result = Groq(api_key=os.environ["GROQ_API_KEY"]).audio.transcriptions.create(
            file=(audio.filename or "voice.webm", contents, audio.content_type),
            model="whisper-large-v3-turbo",
            language=language_codes[language],
            response_format="json",
            temperature=0,
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail="Whisper could not transcribe the recording.") from error

    return {"text": result.text.strip(), "language": language}


