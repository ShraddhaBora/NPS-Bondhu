from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
from src.rag_chain import get_rag_chain_with_sources, get_sources_from_query, format_sources_for_display
from src.translator import translate_to_english, translate_from_english

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://npsbondhu.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        # HuggingFace Space URL
        "https://NilimKr-nps-bondhu-backend.hf.space",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    language: str = "en"

class ChatResponse(BaseModel):
    answer: str
    sources: str = ""

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # Translate to English if needed
        query_in_english = translate_to_english(request.message, request.language)
        
        # Get response from RAG chain
        rag_chain_func = get_rag_chain_with_sources(
            streaming=False,
            search_type="mmr", # Defaulting to MMR
            language="English"
        )
        
        result = rag_chain_func({"input": query_in_english})
        answer = result["answer"]
        sources_raw = result["sources"]
        
        # Translate back to requested language
        answer_translated = translate_from_english(answer, request.language)
        
        return ChatResponse(
            answer=answer_translated,
            sources=str(sources_raw) if sources_raw else ""
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}
