"""Oracle 하이브리드 검색 — Supabase `match_chunks` RPC 의 drop-in 대체 (Phase 3).

oracle_match_chunks() 는 answer.py/_retrieve() 와 같은 인자·같은 반환 shape
(chunk_id, document_id, text, source_type, author, author_credibility, similarity)를
돌려준다. 단일 테넌트 전제(RLS/VPD 없음 — 모두 공개 도메인).

__main__: 운영 match_chunks 와 필드·순위 parity 검증.
"""
from __future__ import annotations

import array
import json
import os

import oracledb
from dotenv import load_dotenv

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")
oracledb.defaults.fetch_lobs = False  # CLOB → str 로 바로 받기


def _env(k): return os.environ[k]


def connect():
    return oracledb.connect(
        user=_env("ORACLE_USER"), password=_env("ORACLE_PASSWORD"), dsn=_env("ORACLE_DSN"),
        config_dir=_env("ORACLE_WALLET_DIR"), wallet_location=_env("ORACLE_WALLET_DIR"),
        wallet_password=_env("ORACLE_WALLET_PASSWORD"),
    )


def oracle_match_chunks(
    conn, qv, domain_id, product_id=None, *, source_type=None, k=10, prefer_expert=False
):
    """match_chunks RPC 의 Oracle 판. 같은 반환 키 dict 리스트."""
    where = ["domain_id = :domain", "embedding IS NOT NULL"]
    binds = {"q": array.array("f", qv), "domain": domain_id, "k": k}
    if product_id:
        where.append("product_id = :pid"); binds["pid"] = product_id
    if source_type:
        where.append("source_type = :st"); binds["st"] = source_type
    expert_first = "CASE WHEN source_type='expert' THEN 0 ELSE 1 END, " if prefer_expert else ""
    sql = (
        "SELECT id, document_id, text, source_type, author, author_credibility, "
        "(1 - VECTOR_DISTANCE(embedding, :q, COSINE)) AS similarity "
        f"FROM chunks WHERE {' AND '.join(where)} "
        f"ORDER BY {expert_first} VECTOR_DISTANCE(embedding, :q, COSINE) "
        "FETCH FIRST :k ROWS ONLY"
    )
    with conn.cursor() as cur:
        cur.execute(sql, binds)
        cols = [c.name.lower() for c in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    # match_chunks 와 키 맞춤: id → chunk_id
    for r in rows:
        r["chunk_id"] = r.pop("id")
    return rows


if __name__ == "__main__":
    from supabase import create_client

    sb = create_client(_env("SUPABASE_URL"), _env("SUPABASE_SERVICE_ROLE_KEY"))
    conn = connect()

    s = sb.table("chunks").select("id, domain_id, embedding").limit(1).execute().data[0]
    qv = json.loads(s["embedding"]) if isinstance(s["embedding"], str) else s["embedding"]
    domain = s["domain_id"]
    K = 6

    pg = sb.rpc("match_chunks", {
        "query_embedding": qv, "match_domain_id": domain, "match_product_id": None,
        "match_source_type": None, "match_count": K, "prefer_expert": True,
    }).execute().data
    ora = oracle_match_chunks(conn, qv, domain, source_type=None, k=K, prefer_expert=True)
    conn.close()

    print("키 비교:")
    print("  pg :", sorted(pg[0].keys()))
    print("  ora:", sorted(ora[0].keys()))
    ids_match = [r["chunk_id"] for r in pg] == [r["chunk_id"] for r in ora]
    print(f"\nchunk_id 순서 일치: {'✅' if ids_match else '✗'}")
    print("\n샘플 1행 대조 (author/credibility/similarity):")
    print(f"  pg : author={pg[0]['author']!r} cred={pg[0]['author_credibility']!r} sim={float(pg[0]['similarity']):.4f}")
    print(f"  ora: author={ora[0]['author']!r} cred={ora[0]['author_credibility']!r} sim={ora[0]['similarity']:.4f}")
