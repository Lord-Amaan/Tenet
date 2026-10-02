from dataclasses import asdict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.retrieval import agent_invoke


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str
    session_id: str | None = None


def query_response(query: str, session_id: str | None = None):
    answer, citations, session_id = agent_invoke(
        query=query,
        session_id=session_id,
    )
    return {
        "answer": answer,
        "citations": [asdict(citation) for citation in citations],
        "session_id": session_id,
    }


@app.post("/query")
def post_query(request: QueryRequest):
    return query_response(request.query, request.session_id)


@app.get("/query")
def send_query(query: str, session_id: str | None = None):
    return query_response(query, session_id)


