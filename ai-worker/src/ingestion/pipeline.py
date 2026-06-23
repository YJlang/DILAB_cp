"""인제스션 파이프라인: SeedDocument → documents 1행 + chunks N행(embedding 포함)."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..db import supabase
from ..embeddings import embed_texts
from .chunking import chunk_markdown
from .seed_loader import SeedDocument, load_seed_documents


def _resolve_domain_id(domain_slug: str) -> str:
    result = (
        supabase.table("domains").select("id").eq("slug", domain_slug).single().execute()
    )
    return result.data["id"]


def ingest_document(doc: SeedDocument, domain_id: str) -> dict[str, Any]:
    chunks = chunk_markdown(doc.body)
    if not chunks:
        return {"path": str(doc.path), "skipped": "empty body"}

    # 1. documents 행
    doc_payload = {
        "domain_id": domain_id,
        "source_type": doc.metadata.get("source_type", "expert"),
        "author": doc.author,
        "author_credibility": doc.author_credibility,
        "title": doc.title,
        "body": doc.body,
        "language": doc.metadata.get("language", "ko"),
        "seed_data": doc.is_seed,
        "metadata": {
            "id_slug": doc.metadata.get("id"),
            "category": doc.metadata.get("category"),
            "product_type": doc.metadata.get("product_type"),
            "tags": doc.metadata.get("tags", []),
            "sources_referenced": doc.metadata.get("sources_referenced", []),
            "source_path": str(doc.path),
        },
    }
    inserted = supabase.table("documents").insert(doc_payload).execute().data
    document_id = inserted[0]["id"]

    # 2. 임베딩 배치 호출
    texts = [c.text for c in chunks]
    vectors = embed_texts(texts)

    # 3. chunks batch insert
    chunk_payload = [
        {
            "document_id": document_id,
            "domain_id": domain_id,
            "chunk_index": c.index,
            "text": c.text,
            "token_count": c.char_count,  # 근사치 (실 토큰화는 M3 이후)
            "embedding": vec,
        }
        for c, vec in zip(chunks, vectors, strict=True)
    ]
    supabase.table("chunks").insert(chunk_payload).execute()

    return {
        "path": str(doc.path),
        "document_id": document_id,
        "chunks": len(chunks),
        "headings": sorted({c.heading_path for c in chunks}),
    }


def ingest_domain(domain_slug: str, seed_dir: Path) -> list[dict[str, Any]]:
    domain_id = _resolve_domain_id(domain_slug)
    docs = load_seed_documents(seed_dir)
    return [ingest_document(d, domain_id) for d in docs]
