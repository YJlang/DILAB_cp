"""B3 + B4 통합 라벨러 — DeepSeek 단일 호출로 청크당 categories + sentiment + journey 라벨링.

도메인 정의(categories, journey_stages JSONB) 를 system/user prompt 에 주입 → 도메인-플렉시블.
"""
from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, cast

from ..config import settings
from ..db import supabase
from ..llm import chat

try:  # Modal 이미지엔 있고, 로컬 dev 엔 없을 수 있어 흡수. 미초기화 시 capture 는 no-op.
    import sentry_sdk
except ImportError:  # pragma: no cover
    sentry_sdk = None  # type: ignore[assignment]

Row = dict[str, Any]

# 청크 라벨링 동시 호출 수 — DeepSeek 호출이 I/O 바운드라 병렬화로 지연 흡수.
LABEL_CONCURRENCY = 8


SYSTEM_PROMPT = """\
당신은 화장품 도메인 리뷰를 **정밀하게 라벨링하는 분석기**입니다. 소비자·전문가 리뷰 한 청크를 읽고, 텍스트에 담긴 근거에 충실하게 세 가지를 판정합니다. 뒤에서 이 라벨로 제품의 5축 점수가 매겨지므로 **정확도가 곧 신뢰도**입니다.

판정 항목:
1. categories: 이 청크가 *실제로 다루는* 도메인 카테고리를 0~3개. 텍스트에 근거가 뚜렷한 것만(스치듯 언급은 제외). 각 category에 confidence(그 축을 다룬다는 확신).
2. sentiment: 청크 전체 톤을 positive|neutral|negative 하나 + intensity(감정 세기 0~1).
3. journey: 소비자 구매 여정 단계 중 가장 잘 맞는 1개.

반드시 다음 JSON 만 출력 (다른 텍스트·코드블록 X):
{
  "categories": [{"category": "<도메인 카테고리>", "confidence": 0.0-1.0}, ...],
  "sentiment": {"label": "positive|neutral|negative", "intensity": 0.0-1.0},
  "journey": {"stage_key": "<도메인 stage key>", "confidence": 0.0-1.0}
}

정확도 규칙:
- **근거 없으면 넣지 마세요** — 카테고리는 텍스트가 명확히 다룰 때만. 애매하면 confidence를 낮추고 0.5 미만이면 제외(빈 배열 OK).
- category·stage_key 는 **도메인 정의 문자열을 글자 그대로**. 새로 만들지 마세요.
- sentiment 는 톤 전체를 반영. 단순 사실·성분 나열은 neutral, 칭찬/불만이 뚜렷하면 intensity를 높게.
- **광고·홍보성 문구는 신중히** — 과장된 긍정을 그대로 믿지 말고 근거의 실제 강도로 판정.
- 짧거나(<50자) 모호한 텍스트는 전반적으로 confidence를 낮춥니다.
"""


def _build_user_prompt(text: str, categories: list[str], journey_stages: list[Row]) -> str:
    stages_desc = ", ".join(f'{s["key"]}({s.get("label","")})' for s in journey_stages)
    return f"""\
[도메인 정의]
categories: {", ".join(categories)}
journey_stages: {stages_desc}

[청크]
{text}
"""


@dataclass
class ChunkLabels:
    chunk_id: str
    categories: list[tuple[str, float]]
    sentiment_label: str
    sentiment_intensity: float
    journey_stage: str
    journey_confidence: float


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


def label_chunk(chunk_id: str, text: str, domain_meta: dict[str, Any]) -> ChunkLabels:
    user_prompt = _build_user_prompt(
        text=text,
        categories=domain_meta.get("categories", []),
        journey_stages=domain_meta.get("journey_stages", []),
    )
    raw = chat(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=settings.label_model,  # 라벨링은 빠른 v4-flash (Ask 는 v4-pro)
        temperature=0.0,
        max_tokens=2500,  # 추론모델은 reasoning 이 토큰을 소모 → 작으면 content 가 비어 라벨이 조용히 깨짐
    )
    obj = _parse_json(raw)
    cats = obj.get("categories", []) or []
    sent = obj.get("sentiment", {}) or {}
    jou = obj.get("journey", {}) or {}

    # [리뷰] LLM 이 형식을 안 지켜 파싱이 비면 여기서 "조용히" 기본값으로 채움:
    #        감성=neutral, 여정=use, 카테고리=[]. 에러를 안 내므로 데이터 품질이 silent 하게
    #        떨어질 수 있음 → 실패율을 어디선가 집계/경보할지가 리뷰 논점.
    #        (label_domain 은 failed 카운트만 셈, 기본값으로 채워진 건 성공으로 잡힘)
    return ChunkLabels(
        chunk_id=chunk_id,
        categories=[
            (c["category"], float(c.get("confidence", 0.5)))
            for c in cats
            if isinstance(c, dict) and c.get("category")
        ],
        sentiment_label=str(sent.get("label") or "neutral"),
        sentiment_intensity=float(sent.get("intensity", 0.5)),
        journey_stage=str(jou.get("stage_key") or "use"),
        journey_confidence=float(jou.get("confidence", 0.5)),
    )


def _rows(execute_result: Any) -> list[Row]:
    return cast(list[Row], execute_result.data)


def _all_rows(make_query: Any, *, page: int = 1000) -> list[Row]:
    """PostgREST 기본 1000행 상한을 넘어 전체 행을 .range() 로 페이지네이션 수집.

    make_query 는 매 페이지마다 새 query builder 를 돌려주는 콜러블
    (예: lambda: supabase.table("sentiments").select("chunk_id")).
    """
    out: list[Row] = []
    start = 0
    while True:
        batch = _rows(make_query().range(start, start + page - 1).execute())
        out.extend(batch)
        if len(batch) < page:
            return out
        start += page


def label_domain(domain_slug: str, *, limit: int | None = None) -> dict[str, Any]:
    """도메인 전체 chunks 라벨링 → classifications + sentiments + journey_assignments insert.

    이미 라벨된 chunk (sentiments 에 행 있음) 는 skip.
    """
    dom = cast(
        Row,
        supabase.table("domains")
        .select("id, categories, journey_stages")
        .eq("slug", domain_slug)
        .single()
        .execute()
        .data,
    )
    domain_id = dom["id"]
    domain_meta = {
        "categories": dom.get("categories") or [],
        "journey_stages": dom.get("journey_stages") or [],
    }

    # [리뷰] "이미 라벨된 청크" = sentiments 테이블에 행이 있는 청크. 이 집합을 메모리에 올려
    #        아래에서 제외 → 재호출해도 새 청크만 처리(증분). sentiments 가 라벨 완료의 기준점.
    labeled_ids = {
        r["chunk_id"]
        for r in _all_rows(lambda: supabase.table("sentiments").select("chunk_id"))
    }
    chunks = _all_rows(
        lambda: supabase.table("chunks")
        .select("id, text, document_id")
        .eq("domain_id", domain_id)
    )
    chunks = [c for c in chunks if c["id"] not in labeled_ids]
    if limit:
        chunks = chunks[:limit]
    if not chunks:
        return {"labeled": 0, "note": "no unlabeled chunks"}

    doc_ids = list({c["document_id"] for c in chunks})
    docs = _rows(
        supabase.table("documents").select("id, product_id").in_("id", doc_ids).execute()
    )
    product_map = {d["id"]: d.get("product_id") for d in docs}

    cls_rows: list[Row] = []
    sent_rows: list[Row] = []
    jou_rows: list[Row] = []
    failed = 0
    started = time.perf_counter()

    # [리뷰] 청크당 LLM 1회 호출이 I/O 바운드라 ThreadPoolExecutor 로 병렬화해 지연을 흡수.
    #        label_chunk 는 순수(LLM 호출 + 파싱, 공유 상태 없음)라 스레드 안전.
    #        한 건 실패는 None 으로 격리해 전체는 계속 진행. pool.map 은 입력 순서를 보존.
    total = len(chunks)

    def _safe_label(item: tuple[int, Row]) -> tuple[Row, ChunkLabels | None]:
        i, ch = item
        try:
            lbl = label_chunk(ch["id"], ch["text"], domain_meta)
            print(
                f"  [{i}/{total}] {lbl.sentiment_label:8} {lbl.journey_stage:8} "
                f"cats={[c[0] for c in lbl.categories]}"
            )
            return ch, lbl
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{total}] FAIL: {e}")
            # [리뷰] 그동안 실패를 "조용히" 카운트만 했음(silent 품질저하). Sentry 가 초기화돼
            #        있으면 여기서 가시화. 미초기화·미설치면 no-op 라 안전.
            if sentry_sdk is not None:
                sentry_sdk.capture_exception(e)
            return ch, None

    with ThreadPoolExecutor(max_workers=LABEL_CONCURRENCY) as pool:
        results = list(pool.map(_safe_label, enumerate(chunks, 1)))

    for ch, lbl in results:
        if lbl is None:
            failed += 1
            continue
        for cat, conf in lbl.categories:
            cls_rows.append(
                {
                    "chunk_id": ch["id"],
                    "category": cat,
                    "confidence": conf,
                    "assigned_by": settings.llm_model,
                }
            )
        sent_rows.append(
            {
                "chunk_id": ch["id"],
                "sentiment": lbl.sentiment_label,
                "intensity": lbl.sentiment_intensity,
                "assigned_by": settings.llm_model,
            }
        )
        product_id = product_map.get(ch["document_id"])
        if product_id:
            jou_rows.append(
                {
                    "chunk_id": ch["id"],
                    "product_id": product_id,
                    "stage_key": lbl.journey_stage,
                    "confidence": lbl.journey_confidence,
                    "is_estimated": True,
                    "assigned_by": settings.llm_model,
                }
            )

    # [리뷰] sentiments/journey 는 chunk 단위 unique 제약이 있어 멱등 upsert-ignore 로
    #        동시 실행·재시도 시에도 크래시 없이 조용히 skip. classifications 는 (chunk_id,
    #        category) unique 제약이 없어 일반 insert — 단 위 페이지네이션 dedup 으로 이미
    #        라벨된 청크는 애초에 재처리되지 않으므로 중복이 생기지 않는다.
    if cls_rows:
        supabase.table("classifications").insert(cls_rows).execute()
    if sent_rows:
        supabase.table("sentiments").upsert(
            sent_rows, on_conflict="chunk_id", ignore_duplicates=True
        ).execute()
    if jou_rows:
        supabase.table("journey_assignments").upsert(
            jou_rows, on_conflict="chunk_id,product_id,stage_key", ignore_duplicates=True
        ).execute()

    return {
        "labeled": len(chunks) - failed,
        "failed": failed,
        "classifications": len(cls_rows),
        "sentiments": len(sent_rows),
        "journey": len(jou_rows),
        "elapsed_sec": int(time.perf_counter() - started),
    }
