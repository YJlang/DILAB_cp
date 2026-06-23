"""네이버 raw → Supabase products + documents + chunks 인제스션."""
from __future__ import annotations

from pathlib import Path
from typing import Any, cast

from ..db import supabase
from ..embeddings import embed_texts
from .naver_loader import NaverProduct, load_documents, load_product

Row = dict[str, Any]


def _rows(execute_result: Any) -> list[Row]:
    """supabase .execute().data 를 list[dict] 로 cast (Pyright 타이핑 narrow)."""
    return cast(list[Row], execute_result.data)


def _resolve_domain_id(domain_slug: str) -> str:
    res = supabase.table("domains").select("id").eq("slug", domain_slug).single().execute()
    return cast(Row, res.data)["id"]


def _upsert_product(p: NaverProduct, domain_id: str) -> str:
    """동일 도메인 + 동일 name 이면 기존 행 재사용."""
    existing = _rows(
        supabase.table("products")
        .select("id")
        .eq("domain_id", domain_id)
        .eq("name", p.name)
        .limit(1)
        .execute()
    )
    if existing:
        return existing[0]["id"]
    inserted = _rows(
        supabase.table("products")
        .insert(
            {
                "domain_id": domain_id,
                "name": p.name,
                "brand": p.brand,
                "category": p.category3 or p.category2,
                "metadata": {
                    "slug": p.product_slug,
                    "maker": p.maker,
                    "naver_catalog_id": p.naver_catalog_id,
                    **p.metadata,
                },
            }
        )
        .execute()
    )
    return inserted[0]["id"]


def ingest_naver(domain_slug: str, raw_dir: Path) -> dict[str, Any]:
    domain_id = _resolve_domain_id(domain_slug)
    product = load_product(raw_dir)
    product_id = _upsert_product(product, domain_id)

    naver_docs = load_documents(raw_dir)
    if not naver_docs:
        return {"product_id": product_id, "documents": 0, "chunks": 0}

    # documents 행 + body = description (네이버 API 가 준 ~200자 요약)
    doc_payloads = [
        {
            "domain_id": domain_id,
            "product_id": product_id,
            "source_type": d.source_type,
            "source_url": d.link,
            "author": d.bloggername,
            "author_credibility": None,  # M3 단계에서 DeepSeek 로 라벨링
            "title": d.title,
            "body": d.description,
            "language": "ko",
            "published_date": d.postdate.isoformat() if d.postdate else None,
            "seed_data": False,
            "metadata": {
                "source": "naver-search-mcp",
                "product_slug": product.product_slug,
            },
        }
        for d in naver_docs
    ]
    inserted_docs = _rows(supabase.table("documents").insert(doc_payloads).execute())

    # description 자체가 짧으므로 청크 = 1 (전체 body)
    texts = [d.description for d in naver_docs]
    vectors = embed_texts(texts)

    chunk_payloads = [
        {
            "document_id": row["id"],
            "domain_id": domain_id,
            "chunk_index": 0,
            "text": doc["body"],
            "token_count": len(doc["body"]),
            "embedding": vec,
        }
        for row, doc, vec in zip(inserted_docs, doc_payloads, vectors, strict=True)
    ]
    supabase.table("chunks").insert(chunk_payloads).execute()

    return {
        "product_id": product_id,
        "documents": len(inserted_docs),
        "chunks": len(chunk_payloads),
        "expert": sum(1 for d in naver_docs if d.source_type == "expert"),
        "public_review": sum(1 for d in naver_docs if d.source_type == "public_review"),
    }
