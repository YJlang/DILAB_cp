"""5축 평가 점수 계산 — product 단위.

점수 공식: 해당 axis 의 청크들의 *부호 있는 감성 강도* 가중 평균 → [0, 10] 스케일
  signed = +intensity (positive) / -intensity (negative) / 0 (neutral)
  weighted = signed * classification_confidence
  axis_score = ((mean(weighted) + 1) / 2) * 10

evidence_chunk_ids: classification_confidence 상위 5개 청크 ID (★1 hover 근거).
"""
from __future__ import annotations

import time
from typing import Any, cast

from ..config import settings
from ..db import supabase

Row = dict[str, Any]


def _rows(res: Any) -> list[Row]:
    return cast(list[Row], res.data)


def compute_product_ratings(product_id: str, *, top_evidence: int = 5) -> list[Row]:
    # 1) product 가 속한 도메인 + axes 정의
    prod = cast(
        Row,
        supabase.table("products")
        .select("domain_id")
        .eq("id", product_id)
        .single()
        .execute()
        .data,
    )
    domain_id = prod["domain_id"]
    dom = cast(
        Row,
        supabase.table("domains")
        .select("rating_axes")
        .eq("id", domain_id)
        .single()
        .execute()
        .data,
    )
    axes: list[str] = dom.get("rating_axes") or []

    # 2) product 의 documents → chunks
    docs = _rows(
        supabase.table("documents").select("id").eq("product_id", product_id).execute()
    )
    if not docs:
        return []
    doc_ids = [d["id"] for d in docs]
    chunks = _rows(
        supabase.table("chunks").select("id").in_("document_id", doc_ids).execute()
    )
    chunk_ids = [c["id"] for c in chunks]
    if not chunk_ids:
        return []

    # 3) classifications + sentiments
    cls = _rows(
        supabase.table("classifications")
        .select("chunk_id, category, confidence")
        .in_("chunk_id", chunk_ids)
        .execute()
    )
    sent_rows = _rows(
        supabase.table("sentiments")
        .select("chunk_id, sentiment, intensity")
        .in_("chunk_id", chunk_ids)
        .execute()
    )
    sent_map = {s["chunk_id"]: s for s in sent_rows}

    # 4) axis 별 집계
    out: list[Row] = []
    for axis in axes:
        axis_cls = [c for c in cls if c["category"] == axis]
        if not axis_cls:
            out.append(
                {
                    "product_id": product_id,
                    "axis": axis,
                    "score": None,  # 데이터 없음
                    "evidence_chunk_ids": [],
                    "generated_by": settings.llm_model,
                    "n_chunks": 0,
                }
            )
            continue

        scored: list[tuple[str, float, float]] = []  # (chunk_id, weighted_signed, cls_conf)
        for c in axis_cls:
            s = sent_map.get(c["chunk_id"])
            if not s:
                continue
            label = s["sentiment"]
            intensity = float(s.get("intensity") or 0)
            # [리뷰] 감성을 부호 있는 수로: 긍정 +강도 / 부정 -강도 / 중립 0  → 범위 [-1, +1].
            signed = (
                intensity if label == "positive" else (-intensity if label == "negative" else 0)
            )
            # [리뷰] 분류 confidence 로 가중 → "이 청크가 이 축에 해당한다"는 확신이 낮으면 영향 축소.
            weighted = signed * float(c.get("confidence") or 0.5)
            scored.append((c["chunk_id"], weighted, float(c.get("confidence") or 0.5)))

        if not scored:
            continue
        # [리뷰] ★ 핵심 수식. 평균(weighted)은 [-1,+1] → (+1)/2*10 으로 [0,10] 에 매핑.
        #        중립이 많으면 평균이 0 근처 → 점수가 5점(중간)으로 끌려감(의도된 동작인지 확인).
        #        또 "긍정 1건(강도1.0)"과 "긍정 다수(강도0.5)"가 비슷해질 수 있음 — 표본 수(n)는
        #        점수에 직접 반영 안 됨(n_chunks 로 따로 노출만). 신뢰구간 개념의 부재가 리뷰 논점.
        avg = sum(w for _, w, _ in scored) / len(scored)
        score = round(((avg + 1) / 2) * 10, 1)
        # [리뷰] 화면 ★ hover 에 보여줄 근거 = 분류 confidence 상위 top_evidence(기본 5)개 청크.
        evidence = [cid for cid, _, _ in sorted(scored, key=lambda x: -x[2])[:top_evidence]]
        out.append(
            {
                "product_id": product_id,
                "axis": axis,
                "score": score,
                "evidence_chunk_ids": evidence,
                "generated_by": settings.llm_model,
                "n_chunks": len(scored),
            }
        )
    return out


def upsert_ratings(product_id: str, *, top_evidence: int = 5) -> dict[str, Any]:
    """기존 rating 행 삭제 후 새로 insert (generated_at unique 회피)."""
    payload = compute_product_ratings(product_id, top_evidence=top_evidence)
    # n_chunks 는 DB 컬럼 아니라 분리
    db_payload = [
        {
            k: v
            for k, v in p.items()
            if k in {"product_id", "axis", "score", "evidence_chunk_ids", "generated_by"}
            and v is not None
        }
        for p in payload
        if p["score"] is not None
    ]
    if not db_payload:
        return {"product_id": product_id, "ratings": 0, "note": "no labels yet"}

    # [리뷰] 삭제 후 삽입(트랜잭션 아님). 두 호출 사이 아주 짧은 순간 "점수 없음" 상태가 생김.
    #        같은 제품을 동시에 두 번 분석하면 경쟁 조건 가능 → 동시성 리뷰 포인트.
    supabase.table("ratings").delete().eq("product_id", product_id).execute()
    inserted = _rows(supabase.table("ratings").insert(db_payload).execute())
    return {
        "product_id": product_id,
        "ratings": len(inserted),
        "detail": [
            {"axis": p["axis"], "score": p["score"], "n_chunks": p["n_chunks"]} for p in payload
        ],
    }
