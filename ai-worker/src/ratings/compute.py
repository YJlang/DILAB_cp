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
        supabase.table("chunks")
        .select("id, source_type, author_credibility")
        .in_("document_id", doc_ids)
        .execute()
    )
    chunk_ids = [c["id"] for c in chunks]
    if not chunk_ids:
        return []
    # 전문가 가중용 메타 (source_type·author_credibility)
    chunk_meta = {c["id"]: c for c in chunks}

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

        # (chunk_id, signed[-1..+1], weight). weight = 분류확신 × 전문가배수.
        scored: list[tuple[str, float, float]] = []
        for c in axis_cls:
            s = sent_map.get(c["chunk_id"])
            if not s:
                continue
            label = s["sentiment"]
            intensity = float(s.get("intensity") or 0)
            # 감성을 부호 있는 수로: 긍정 +강도 / 부정 -강도 / 중립 0 → [-1, +1].
            signed = (
                intensity if label == "positive" else (-intensity if label == "negative" else 0)
            )
            conf = float(c.get("confidence") or 0.5)
            # [개선] 전문가 가중 — 전문가 근거는 author_credibility(1~10)만큼 더 크게 반영.
            #        DILAB 차별화(전문가급 신뢰성)를 점수에 실제로 싣는다(기존 공식엔 없던 것).
            meta = chunk_meta.get(c["chunk_id"], {})
            if meta.get("source_type") == "expert":
                cred = meta.get("author_credibility")
                expert_mult = 1.0 + (float(cred) if cred else 8.0) / 10.0  # ≈1.8×
            else:
                expert_mult = 1.0
            scored.append((c["chunk_id"], signed, conf * expert_mult))

        total_w = sum(w for _, _, w in scored)
        if total_w <= 0:
            continue
        # [개선] 가중 평균: Σ(signed×w)/Σw → 확신·전문가 큰 근거가 점수를 주도.
        raw = sum(sg * w for _, sg, w in scored) / total_w  # [-1, +1]
        # [개선] 표본수 수축(shrinkage): 유효 근거량(Σw)이 적으면 중립(0)으로 끌어당겨
        #        "근거 1건짜리 축이 만점" 같은 과신을 억제. k=사전강도(≈근거 3건).
        k = 3.0
        shrunk = raw * (total_w / (total_w + k))
        score = round(((shrunk + 1) / 2) * 10, 1)
        # 근거 = 가중치(전문가·확신) 상위 top_evidence 개 → 전문가 근거 우선 노출.
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
