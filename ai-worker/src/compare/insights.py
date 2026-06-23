"""S6 — 두 제품 비교 + DeepSeek 마케팅 인사이트 합성.

입력: domain_slug + slug_a + slug_b
출력: 두 제품 snapshot + 5축 차이 + DeepSeek 합성 인사이트 (전략·차별화·포지셔닝)
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, cast

from ..config import settings
from ..db import supabase
from ..llm import chat

Row = dict[str, Any]


@dataclass
class ProductSnapshot:
    id: str
    slug: str
    name: str
    brand: str | None
    ratings: dict[str, float]
    top_keywords: list[str]
    sentiment_dist: dict[str, int]
    document_count: int


@dataclass
class Differentiator:
    axis: str
    a_score: float
    b_score: float
    gap: float
    winner: str  # 'A' | 'B' | 'tie'


@dataclass
class CompareResult:
    a: ProductSnapshot
    b: ProductSnapshot
    differentiators: list[Differentiator]
    a_strengths: list[str]
    b_strengths: list[str]
    marketing_actions: list[str]
    positioning_line: str
    llm_model: str
    raw: dict[str, Any] = field(default_factory=dict)


def _rows(r: Any) -> list[Row]:
    return cast(list[Row], r.data)


def _resolve(domain_slug: str, slug: str) -> Row:
    dom = cast(
        Row,
        supabase.table("domains").select("id").eq("slug", domain_slug).single().execute().data,
    )
    rows = _rows(
        supabase.table("products")
        .select("id, name, brand, metadata")
        .eq("domain_id", dom["id"])
        .execute()
    )
    for r in rows:
        if (r.get("metadata") or {}).get("slug") == slug:
            return r
    raise ValueError(f"product not found: {slug}")


# [리뷰] 제품 1개의 스냅샷을 만드는 데 supabase 호출이 줄줄이(ratings→documents→chunks→
#        sentiments→topic_assignments→topics). compare 는 이걸 제품 2개에 대해 호출 → 호출 수 2배.
#        전형적인 N+1 쿼리 패턴. 제품 수가 늘면 join/RPC 로 묶을지가 성능 리뷰의 핵심.
def _snapshot(p: Row) -> ProductSnapshot:
    pid = p["id"]
    ratings = _rows(
        supabase.table("ratings").select("axis, score").eq("product_id", pid).execute()
    )
    rating_map = {r["axis"]: float(r["score"]) for r in ratings}

    docs = _rows(supabase.table("documents").select("id").eq("product_id", pid).execute())
    doc_ids = [d["id"] for d in docs]
    chunk_ids: list[str] = []
    if doc_ids:
        chunks = _rows(
            supabase.table("chunks").select("id").in_("document_id", doc_ids).execute()
        )
        chunk_ids = [c["id"] for c in chunks]

    sent_dist: dict[str, int] = {"positive": 0, "neutral": 0, "negative": 0}
    if chunk_ids:
        sents = _rows(
            supabase.table("sentiments")
            .select("sentiment")
            .in_("chunk_id", chunk_ids)
            .execute()
        )
        for s in sents:
            sent_dist[s["sentiment"]] = sent_dist.get(s["sentiment"], 0) + 1

    top_keywords: list[str] = []
    if chunk_ids:
        ta = _rows(
            supabase.table("topic_assignments")
            .select("topic_id")
            .in_("chunk_id", chunk_ids)
            .execute()
        )
        if ta:
            counts: dict[str, int] = {}
            for r in ta:
                counts[r["topic_id"]] = counts.get(r["topic_id"], 0) + 1
            top_tid = max(counts, key=lambda k: counts[k])
            t = (
                supabase.table("topics")
                .select("keywords")
                .eq("id", top_tid)
                .single()
                .execute()
                .data
            )
            top_keywords = ((t.get("keywords") if t else []) or [])[:6]

    slug = (p.get("metadata") or {}).get("slug", "")
    return ProductSnapshot(
        id=pid,
        slug=slug,
        name=p["name"],
        brand=p.get("brand"),
        ratings=rating_map,
        top_keywords=top_keywords,
        sentiment_dist=sent_dist,
        document_count=len(docs),
    )


SYSTEM_PROMPT = """\
당신은 화장품 마케팅 전략가입니다. 두 제품의 데이터를 비교해 *실행 가능한* 마케팅 인사이트를 도출하세요.

규칙:
- 데이터에 근거. 추측 X.
- 한국어로 답변. 친근한 톤 ("~해요").
- 짧고 구체적. 광고 카피처럼.

반드시 다음 JSON 만 출력 (다른 텍스트·코드블록 X):
{
  "a_strengths": ["A 제품의 강점 3가지 (각 한 줄)"],
  "b_strengths": ["B 제품의 강점 3가지"],
  "marketing_actions": ["A가 취해야 할 마케팅 액션 3가지 (예: '향에 민감한 사용자 대상 무향 라인 출시 검토')"],
  "positioning_line": "A 의 한 줄 포지셔닝 (광고 카피 톤)"
}
"""


def compare(domain_slug: str, slug_a: str, slug_b: str) -> CompareResult:
    pa = _resolve(domain_slug, slug_a)
    pb = _resolve(domain_slug, slug_b)
    sa = _snapshot(pa)
    sb = _snapshot(pb)

    diffs: list[Differentiator] = []
    for axis in sorted(set(sa.ratings) | set(sb.ratings)):
        va = sa.ratings.get(axis, 0.0)
        vb = sb.ratings.get(axis, 0.0)
        gap = va - vb
        # [리뷰] 0.3 이하 차이는 무승부(tie). 임계값이 마법의 숫자(magic number) — 10점 척도에서
        #        0.3 이 "의미 있는 차이"인지, 점수 없는 축(get 기본 0.0)이 비교를 왜곡하진 않는지 확인.
        winner = "A" if gap > 0.3 else ("B" if gap < -0.3 else "tie")
        diffs.append(Differentiator(axis=axis, a_score=va, b_score=vb, gap=gap, winner=winner))

    user_prompt = f"""\
[제품 A — 자사로 가정]
이름: {sa.name}
브랜드: {sa.brand}
5축 평가: {json.dumps(sa.ratings, ensure_ascii=False)}
토픽 키워드: {sa.top_keywords}
감성: {sa.sentiment_dist}
분석 문서 수: {sa.document_count}

[제품 B — 경쟁사]
이름: {sb.name}
브랜드: {sb.brand}
5축 평가: {json.dumps(sb.ratings, ensure_ascii=False)}
토픽 키워드: {sb.top_keywords}
감성: {sb.sentiment_dist}
분석 문서 수: {sb.document_count}

[축별 차이]
{json.dumps([{"axis":d.axis,"a":d.a_score,"b":d.b_score,"gap":round(d.gap,1),"winner":d.winner} for d in diffs], ensure_ascii=False)}

A를 자사 제품으로 가정하고 마케팅 인사이트를 JSON 으로.
"""

    raw = chat(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=1000,
    )
    obj = _parse_json(raw)

    return CompareResult(
        a=sa,
        b=sb,
        differentiators=diffs,
        a_strengths=list(obj.get("a_strengths", []))[:5],
        b_strengths=list(obj.get("b_strengths", []))[:5],
        marketing_actions=list(obj.get("marketing_actions", []))[:5],
        positioning_line=str(obj.get("positioning_line", "")),
        llm_model=settings.llm_model,
        raw={"prompt_chars": len(user_prompt), "raw_llm": raw[:500]},
    )


def _parse_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```", 2)
        text = parts[1] if len(parts) > 1 else raw
        if text.startswith("json"):
            text = text[4:].lstrip()
        text = text.rsplit("```", 1)[0].strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        return {}
    try:
        return cast(dict[str, Any], json.loads(text[start : end + 1]))
    except json.JSONDecodeError:
        return {}
