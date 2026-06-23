"""PoC 검증: Oracle VECTOR_DISTANCE Top-K == Supabase match_chunks Top-K ?

같은 질의 임베딩으로 양쪽에서 Top-K 근접 청크를 뽑아 순위를 비교한다.
질의 벡터는 기존 chunk 의 임베딩을 그대로 사용(임베딩 모델 변동성 제거 → 순수 벡터검색 동등성만 검증).

실행:
    source .venv/bin/activate
    python scripts/validate_vector_search.py
"""
from __future__ import annotations

import array
import json
import os

import oracledb
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
K = 10
N_SAMPLES = 3


def env(k: str) -> str:
    return os.environ[k]


def to_list(emb):
    return json.loads(emb) if isinstance(emb, str) else list(emb)


def main() -> None:
    sb = create_client(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"))
    ora = oracledb.connect(
        user=env("ORACLE_USER"), password=env("ORACLE_PASSWORD"), dsn=env("ORACLE_DSN"),
        config_dir=env("ORACLE_WALLET_DIR"), wallet_location=env("ORACLE_WALLET_DIR"),
        wallet_password=env("ORACLE_WALLET_PASSWORD"),
    )

    # 서로 다른 도메인/문서에서 표본 질의 청크 N개
    samples = (
        sb.table("chunks").select("id, domain_id, embedding").limit(N_SAMPLES).execute().data
    )

    total_overlap = 0
    total_exact = 0
    for i, s in enumerate(samples, 1):
        qvec = to_list(s["embedding"])
        domain = s["domain_id"]

        # pgvector (운영 match_chunks RPC) — 순수 코사인 top-k (필터 없음, 도메인만)
        pg = sb.rpc("match_chunks", {
            "query_embedding": qvec,
            "match_domain_id": domain,
            "match_product_id": None,
            "match_source_type": None,
            "match_count": K,
            "prefer_expert": False,
        }).execute().data
        pg_ids = [r["chunk_id"] for r in pg]
        pg_sim = {r["chunk_id"]: float(r["similarity"]) for r in pg}

        # Oracle VECTOR_DISTANCE 코사인 top-k (같은 도메인 필터)
        with ora.cursor() as cur:
            rows = cur.execute(
                """SELECT id, VECTOR_DISTANCE(embedding, :q, COSINE) AS dist
                   FROM chunks WHERE domain_id = :d
                   ORDER BY dist FETCH FIRST :k ROWS ONLY""",
                q=array.array("f", qvec), d=domain, k=K,
            ).fetchall()
        ora_ids = [r[0] for r in rows]
        # 코사인 유사도 = 1 - 코사인거리 → pgvector similarity 와 같아야 함
        top_pg, top_ora = pg_ids[0], ora_ids[0]
        print(f"  최상위 코사인  pgvector sim={pg_sim.get(top_pg,0):.4f}"
              f"  Oracle sim={1-rows[0][1]:.4f}")

        overlap = len(set(pg_ids) & set(ora_ids))
        exact = pg_ids == ora_ids
        total_overlap += overlap
        total_exact += int(exact)
        print(f"\n[표본 {i}] domain={domain[:8]}…  질의=chunk {s['id'][:8]}…")
        print(f"  pgvector Top{K}: {[x[:8] for x in pg_ids]}")
        print(f"  Oracle   Top{K}: {[x[:8] for x in ora_ids]}")
        print(f"  → 집합 겹침 {overlap}/{K} · 순서 완전일치: {'✅' if exact else '✗'}")

    ora.close()
    print(f"\n=== 요약: 표본 {len(samples)}개 / 평균 겹침 {total_overlap/len(samples):.1f}/{K}"
          f" / 순서 완전일치 {total_exact}/{len(samples)} ===")


if __name__ == "__main__":
    main()
