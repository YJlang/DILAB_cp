"""DILAB AI 워커 — FastAPI 진입점.

엔드포인트:
  GET  /           — 서비스 식별
  GET  /health     — Supabase 연결 + 도메인 seed 확인
  POST /ask        — DILAB Ask: query → hybrid retrieve → DeepSeek → 답변 + 출처
"""
from dataclasses import asdict
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .compare import compare
from .config import settings
from .db.supabase import supabase
from .ingestion.auto_ingest import analyze_product
from .rag.answer import answer

app = FastAPI(title="DILAB AI Worker", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "dilab-ai-worker",
        "version": "0.2.0",
        "environment": settings.environment,
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    result = supabase.table("domains").select("slug,name").execute()
    return {
        "ok": True,
        "supabase_connected": True,
        "domains": result.data,
        "llm_model": settings.llm_model,
    }


class AskRequest(BaseModel):
    query: str = Field(..., min_length=1)
    domain_slug: str = "cosmetics"
    product_slug: str | None = None
    expert_k: int = 3
    public_k: int = 3
    persist: bool = True


@app.post("/ask")
async def ask(req: AskRequest) -> dict[str, Any]:
    result = answer(
        req.query,
        domain_slug=req.domain_slug,
        product_slug=req.product_slug,
        expert_k=req.expert_k,
        public_k=req.public_k,
        persist=req.persist,
    )
    return asdict(result)


class AnalyzeRequest(BaseModel):
    product_query: str = Field(..., min_length=2, max_length=120)
    domain_slug: str = "cosmetics"


@app.post("/analyze")
async def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    return analyze_product(req.product_query, domain_slug=req.domain_slug)


class CompareRequest(BaseModel):
    slug_a: str = Field(..., min_length=1)
    slug_b: str = Field(..., min_length=1)
    domain_slug: str = "cosmetics"


@app.post("/compare")
async def compare_endpoint(req: CompareRequest) -> dict[str, Any]:
    result = compare(req.domain_slug, req.slug_a, req.slug_b)
    return asdict(result)
