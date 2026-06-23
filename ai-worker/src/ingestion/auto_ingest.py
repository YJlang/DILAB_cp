"""제품 자동 분석 — fetch → ingest → label → ratings 5단계 묶음.

사용:
  from src.ingestion.auto_ingest import analyze_product
  result = analyze_product("닥터지 레드 블레미쉬 크림")
  # → {"product_id":..., "slug":..., "documents": 45, ...}
"""
from __future__ import annotations

import time
from typing import Any, cast

from ..analysis import label_domain
from ..config import settings
from ..db import supabase
from ..embeddings import embed_texts
from ..ratings import upsert_ratings
from .naver_fetcher import NaverClient
from .slug import build_slug

Row = dict[str, Any]


def _rows(r: Any) -> list[Row]:
    return cast(list[Row], r.data)


def _parse_postdate(s: str | None) -> str | None:
    if not s or len(s) != 8:
        return None
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}"


def analyze_product(
    product_query: str,
    *,
    domain_slug: str = "cosmetics",
) -> Row:
    started = time.perf_counter()

    if not settings.naver_client_id or not settings.naver_client_secret:
        return {"error": "NAVER_CLIENT_ID/SECRET not configured"}

    naver = NaverClient(settings.naver_client_id, settings.naver_client_secret)

    # 1. fetch
    fetched = naver.fetch_product_data(product_query)
    if not fetched["reviews"]:
        return {"error": "no reviews found", "query": product_query}

    # 2. domain + product
    dom = cast(
        Row,
        supabase.table("domains")
        .select("id")
        .eq("slug", domain_slug)
        .single()
        .execute()
        .data,
    )
    domain_id = dom["id"]

    shop = fetched["shop"] or {}
    name = (shop.get("title") or product_query).strip()
    brand = shop.get("brand") or ""
    slug = build_slug(name, brand=brand)

    # [리뷰] 같은 slug 제품이 이미 있으면 재등록하지 않음(중복 제품 방지).
    #        단 문서(documents)는 아래 ③에서 계속 추가됨 → 같은 제품 재분석 시 후기가 "누적".
    #        같은 후기를 또 넣는 것에 대한 중복 제거는 없음(리뷰 포인트).
    existing = _rows(
        supabase.table("products").select("id, metadata").eq("domain_id", domain_id).execute()
    )
    found = next(
        (p for p in existing if (p.get("metadata") or {}).get("slug") == slug),
        None,
    )
    if found:
        product_id = found["id"]
        new_product = False
    else:
        inserted = _rows(
            supabase.table("products")
            .insert(
                {
                    "domain_id": domain_id,
                    "name": name,
                    "brand": brand,
                    "category": shop.get("category3") or shop.get("category2"),
                    "metadata": {
                        "slug": slug,
                        "maker": shop.get("maker"),
                        "naver_catalog_id": shop.get("productId"),
                        "price_low_krw": shop.get("lprice"),
                        "fetched_at": time.strftime("%Y-%m-%d"),
                        "source": "naver-api-auto",
                        "query": product_query,
                    },
                }
            )
            .execute()
        )
        product_id = inserted[0]["id"]
        new_product = True

    # 3. documents + chunks
    # [리뷰] 재분석 누적 방지(C): 이미 저장된 후기는 source_url 기준으로 skip.
    #        같은 제품을 다시 분석해도 같은 링크 후기가 또 쌓이지 않아 청크 무한 증식을 차단.
    #        제품당 문서 수는 이 dedup 으로 사실상 한 배치 규모로 묶여 1000행 캡 영향 없음.
    existing_urls = {
        r["source_url"]
        for r in _rows(
            supabase.table("documents")
            .select("source_url")
            .eq("product_id", product_id)
            .execute()
        )
        if r.get("source_url")
    }
    seen_urls: set[str] = set()
    doc_payloads: list[Row] = []
    for items, source_type in (
        (fetched["reviews"], "public_review"),
        (fetched["expert"], "expert"),
    ):
        for it in items:
            body = (it.get("description") or "").strip()
            if not body:
                continue
            url = it.get("link")
            if url and (url in existing_urls or url in seen_urls):
                continue
            if url:
                seen_urls.add(url)
            doc_payloads.append(
                {
                    "domain_id": domain_id,
                    "product_id": product_id,
                    "source_type": source_type,
                    "source_url": it.get("link"),
                    "author": it.get("bloggername"),
                    "author_credibility": None,
                    "title": it.get("title"),
                    "body": body,
                    "language": "ko",
                    "published_date": _parse_postdate(it.get("postdate")),
                    "seed_data": False,
                    "metadata": {"source": "naver-api-auto", "product_slug": slug},
                }
            )

    inserted_docs: list[Row] = []
    if doc_payloads:
        inserted_docs = _rows(supabase.table("documents").insert(doc_payloads).execute())
        texts = [d["body"] for d in doc_payloads]
        vectors = embed_texts(texts)
        # [리뷰] ★ 중요한 비대칭: 여기 네이버 경로는 chunk_markdown 을 쓰지 않고
        #        문서 본문 전체를 "1청크"로 넣음(chunk_index=0, token_count=글자수).
        #        반면 seed 경로(pipeline.py)는 헤딩·500자로 잘게 쪼갬.
        #        본문이 짧은 네이버 description 이라 1청크가 합리적이지만, 두 경로의 청킹이
        #        다르다는 점은 검색·점수 일관성 리뷰 시 짚어야 할 부분.
        # [리뷰] strict=True → 문서/임베딩 개수가 어긋나면 즉시 에러. 조용한 짝 밀림 버그를 막음.
        supabase.table("chunks").insert(
            [
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
        ).execute()

    # 4. 라벨링 (도메인 전체 — 이미 라벨된 chunk 는 skip 됨)
    # [리뷰] 방금 넣은 청크만이 아니라 "도메인 전체"를 대상으로 라벨링을 호출.
    #        skip 로직(label.py) 덕에 중복 비용은 적지만, 도메인이 커질수록 매 분석마다
    #        전체를 훑는 구조라는 점은 비용 리뷰 대상.
    label_result = label_domain(domain_slug)

    # 5. ratings 갱신
    # [리뷰] ①~⑤ 는 단계마다 DB 에 즉시 커밋. 중간에 실패하면 앞 단계는 남고 롤백 안 됨(부분 저장).
    #        재실행 시 ②는 found 로, ④는 skip 으로 흡수되지만 ③ 문서는 또 쌓일 수 있음.
    rating_result = upsert_ratings(product_id)

    return {
        "product_id": product_id,
        "slug": slug,
        "name": name,
        "brand": brand,
        "new_product": new_product,
        "documents_added": len(doc_payloads),
        "label": label_result,
        "ratings": rating_result,
        "elapsed_sec": int(time.perf_counter() - started),
    }
