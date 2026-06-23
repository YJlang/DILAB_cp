"""Phase 2-1: match_chunks 완전 재현 검증 (출처 필터 + 전문가 우선).

Phase 1은 순수 코사인만 봤다. 여기선 match_chunks 의 실제 인자
(match_source_type, prefer_expert)를 Oracle 하이브리드 쿼리로 재현해 대조한다.

실행: source .venv/bin/activate && python scripts/validate_match_chunks_full.py
"""
from __future__ import annotations

import array
import json
import os

import oracledb
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")
K = 8


def env(k): return os.environ[k]
def to_list(e): return json.loads(e) if isinstance(e, str) else list(e)


sb = create_client(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"))
ora = oracledb.connect(
    user=env("ORACLE_USER"), password=env("ORACLE_PASSWORD"), dsn=env("ORACLE_DSN"),
    config_dir=env("ORACLE_WALLET_DIR"), wallet_location=env("ORACLE_WALLET_DIR"),
    wallet_password=env("ORACLE_WALLET_PASSWORD"),
)

# 질의: 전문가/일반 이웃이 섞이도록 한 청크 사용
s = sb.table("chunks").select("id, domain_id, embedding").limit(1).execute().data[0]
qv, domain = to_list(s["embedding"]), s["domain_id"]
qa = array.array("f", qv)


def pg(source_type, prefer_expert):
    return sb.rpc("match_chunks", {
        "query_embedding": qv, "match_domain_id": domain, "match_product_id": None,
        "match_source_type": source_type, "match_count": K, "prefer_expert": prefer_expert,
    }).execute().data


def ora_q(sql):
    with ora.cursor() as c:
        return [r[0] for r in c.execute(sql, q=qa, d=domain, k=K).fetchall()]


print("=== Case A: 출처 필터 source_type='expert' ===")
pg_a = [r["chunk_id"] for r in pg("expert", False)]
or_a = ora_q("""SELECT id FROM chunks WHERE domain_id=:d AND source_type='expert'
               ORDER BY VECTOR_DISTANCE(embedding,:q,COSINE) FETCH FIRST :k ROWS ONLY""")
print("  pg :", [x[:8] for x in pg_a])
print("  ora:", [x[:8] for x in or_a])
print("  순서일치:", "✅" if pg_a == or_a else f"✗ (겹침 {len(set(pg_a)&set(or_a))}/{K})")

print("\n=== Case B: prefer_expert=True (필터 없음) — 의미 파악 ===")
pg_b = pg(None, True)
seq = [r["source_type"] for r in pg_b]
print("  pg source_type 순서:", seq)
# Oracle 재현: 전문가 먼저, 그 안에서 코사인
or_b = ora_q("""SELECT id FROM chunks WHERE domain_id=:d
               ORDER BY CASE WHEN source_type='expert' THEN 0 ELSE 1 END,
                        VECTOR_DISTANCE(embedding,:q,COSINE) FETCH FIRST :k ROWS ONLY""")
pg_b_ids = [r["chunk_id"] for r in pg_b]
print("  pg :", [x[:8] for x in pg_b_ids])
print("  ora:", [x[:8] for x in or_b])
print("  순서일치:", "✅" if pg_b_ids == or_b else f"✗ (겹침 {len(set(pg_b_ids)&set(or_b))}/{K})")

ora.close()
