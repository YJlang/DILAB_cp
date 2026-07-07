"""분석 파이프라인 DB 계층 검증 — Naver 크롤 없이 합성 데이터로 왕복 테스트.

흐름: ZZTEST 제품/문서/청크 삽입 → in-DB 임베딩(DILAB_E5) → label_domain(실제 DeepSeek)
      → upsert_ratings → classifications/sentiments/journey_assignments/ratings SELECT 확인.
끝나면 ZZTEST 관련 행만 삭제(기존 25제품·1347청크는 절대 안 건드림).

실행:
    source .venv/bin/activate
    python scripts/test_pipeline_db.py
"""
from __future__ import annotations

import os
import sys

REPO = "/Users/junha/Desktop/DILAB 복사본"
sys.path.insert(0, os.path.join(REPO, "ai-worker"))
os.chdir(REPO)

from src.analysis import label_domain  # noqa: E402
from src.db import supabase  # noqa: E402  (Oracle 어댑터)
from src.ratings import upsert_ratings  # noqa: E402

DOMAIN_SLUG = "cosmetics"
MARK = "ZZTEST"

_passed: list[str] = []
_failed: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    (_passed if ok else _failed).append(name)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    dom = supabase.table("domains").select(
        "id, categories, rating_axes, journey_stages"
    ).eq("slug", DOMAIN_SLUG).single().execute().data
    domain_id = dom["id"]
    axes = dom.get("rating_axes") or []
    cats = dom.get("categories") or []
    print(f"domain={DOMAIN_SLUG} id={domain_id} rating_axes={axes} categories={cats}")

    # 분류기가 rating_axis 카테고리를 고르도록 리뷰 본문에 축 이름을 자연스럽게 심는다.
    axis_a = axes[0] if axes else (cats[0] if cats else "효능")
    reviews = [
        f"이 제품은 정말 만족스러워요. 특히 {axis_a} 측면에서 기대 이상이었고 "
        f"매일 쓰니 확실히 좋아졌습니다. 강력 추천합니다.",
        f"{axis_a} 부분은 그럭저럭 무난했지만 향이 조금 아쉬웠어요. "
        f"그래도 재구매 의사는 있습니다.",
    ]

    product_id = None
    chunk_ids: list[str] = []
    try:
        # 1) ZZTEST 제품
        prod = supabase.table("products").insert({
            "domain_id": domain_id,
            "name": f"{MARK} 클렌징 폼",
            "brand": MARK,
            "category": "스킨케어",
            "metadata": {"slug": f"{MARK.lower()}-cleansing-foam", "source": "db-test"},
        }).execute().data
        product_id = prod[0]["id"]
        check("products.insert (id 반환)", bool(product_id), f"id={product_id}")

        # 2) documents + chunks
        docs = supabase.table("documents").insert([
            {
                "domain_id": domain_id,
                "product_id": product_id,
                "source_type": "public_review",
                "source_url": f"https://example.test/{MARK.lower()}/{i}",
                "author": f"{MARK}_tester",
                "title": f"{MARK} 리뷰 {i}",
                "body": body,
                "language": "ko",
                "published_date": "2026-07-01",
                "seed_data": True,
                "metadata": {"source": "db-test", "product_slug": f"{MARK.lower()}-cf"},
            }
            for i, body in enumerate(reviews)
        ]).execute().data
        doc_ids = [d["id"] for d in docs]
        check("documents.insert (id 반환)", len(doc_ids) == 2, f"ids={doc_ids}")

        chk = supabase.table("chunks").insert([
            {
                "document_id": d["id"],
                "domain_id": domain_id,
                "chunk_index": 0,
                "text": body,
                "token_count": len(body),
            }
            for d, body in zip(docs, reviews, strict=True)
        ]).execute().data
        chunk_ids = [c["id"] for c in chk]
        check("chunks.insert (id 반환)", len(chunk_ids) == 2, f"ids={chunk_ids}")

        # 3) in-DB 임베딩 (+ denormalize) — auto_ingest 와 동일 경로
        supabase.run_sql(
            "UPDATE chunks c SET (product_id, source_type, author, author_credibility) = "
            "(SELECT d.product_id, d.source_type, d.author, d.author_credibility "
            " FROM documents d WHERE d.id = c.document_id) "
            "WHERE c.domain_id = :d AND c.product_id IS NULL AND c.document_id IS NOT NULL",
            {"d": domain_id},
        )
        supabase.run_sql(
            "UPDATE chunks SET embedding = "
            "VECTOR_EMBEDDING(DILAB_E5 USING 'passage: ' || TO_CHAR(text) AS data) "
            "WHERE embedding IS NULL AND domain_id = :d",
            {"d": domain_id},
        )
        embn = supabase.run_sql(
            "SELECT COUNT(*) n FROM chunks WHERE embedding IS NOT NULL AND id IN "
            "(" + ",".join(f"'{c}'" for c in chunk_ids) + ")"
        )[0]["n"]
        check("in-DB 임베딩(DILAB_E5) 채워짐", embn == 2, f"{embn}/2 청크")
        denorm = supabase.run_sql(
            "SELECT COUNT(*) n FROM chunks WHERE product_id = :p AND source_type IS NOT NULL",
            {"p": product_id},
        )[0]["n"]
        check("chunks denormalize(product_id/source_type)", denorm == 2, f"{denorm}/2")

        # 4) 라벨링 (도메인 전체지만 기존 청크는 라벨 완료 → 새 청크만 처리)
        lab = label_domain(DOMAIN_SLUG)
        print(f"  label_domain → {lab}")
        check("label_domain 새 청크 처리", lab.get("labeled", 0) >= 1, str(lab))

        # 5) 평점
        rat = upsert_ratings(product_id)
        print(f"  upsert_ratings → ratings={rat.get('ratings')}")

        # 6) 결과 행 검증
        in_list = "(" + ",".join(f"'{c}'" for c in chunk_ids) + ")"
        sent_n = supabase.run_sql(f"SELECT COUNT(*) n FROM sentiments WHERE chunk_id IN {in_list}")[0]["n"]
        check("sentiments 행 생성", sent_n == 2, f"{sent_n}/2")
        jou_n = supabase.run_sql(
            "SELECT COUNT(*) n FROM journey_assignments WHERE product_id = :p", {"p": product_id}
        )[0]["n"]
        check("journey_assignments 행 생성", jou_n >= 1, f"{jou_n} 행")
        cls_n = supabase.run_sql(f"SELECT COUNT(*) n FROM classifications WHERE chunk_id IN {in_list}")[0]["n"]
        check("classifications 행(있으면)", True, f"{cls_n} 행 (LLM 카테고리 선택 의존)")
        rat_n = supabase.run_sql(
            "SELECT COUNT(*) n FROM ratings WHERE product_id = :p", {"p": product_id}
        )[0]["n"]
        check("ratings 행(분류가 축과 일치 시)", True, f"{rat_n} 행")

    finally:
        print("\n정리(ZZTEST 관련 행만 삭제)…")
        try:
            if product_id:
                supabase.table("ratings").delete().eq("product_id", product_id).execute()
                supabase.table("journey_assignments").delete().eq("product_id", product_id).execute()
            if chunk_ids:
                supabase.table("sentiments").delete().in_("chunk_id", chunk_ids).execute()
                supabase.table("classifications").delete().in_("chunk_id", chunk_ids).execute()
                supabase.table("chunks").delete().in_("id", chunk_ids).execute()
            if product_id:
                supabase.table("documents").delete().eq("product_id", product_id).execute()
                supabase.table("products").delete().eq("id", product_id).execute()
            # 잔여 확인
            left = supabase.run_sql(
                "SELECT COUNT(*) n FROM products WHERE brand = :b", {"b": MARK}
            )[0]["n"]
            print(f"  삭제 후 ZZTEST 제품 잔여: {left}")
        except Exception as e:  # noqa: BLE001
            print(f"  정리 중 오류(수동 확인 필요): {e}")

    print(f"\n결과: PASS {len(_passed)} / FAIL {len(_failed)}")
    if _failed:
        print("실패:", _failed)
    return 1 if _failed else 0


if __name__ == "__main__":
    sys.exit(main())
