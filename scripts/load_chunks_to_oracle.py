"""Supabase chunks(+벡터) → Oracle 26ai 적재 (PoC Phase 1).

Supabase(운영)에서 chunks 를 **읽기 전용**으로 끌어와 Oracle CHUNKS 테이블에 적재한다.
documents 를 조인해 product_id·source_type 를 denormalize(검색 필터/전문가 우선용).
재실행 가능: 시작 시 Oracle CHUNKS 를 TRUNCATE.

전제: .env 에 ORACLE_* + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
실행:
    source .venv/bin/activate
    python scripts/load_chunks_to_oracle.py
"""
from __future__ import annotations

import array
import json
import os
import sys

import oracledb
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

PAGE = 1000  # PostgREST 기본 상한 — .range() 로 페이지네이션


def _req(k: str) -> str:
    v = os.environ.get(k, "").strip()
    if not v:
        sys.exit(f"[.env 누락] {k}")
    return v


def _to_floats(emb) -> array.array:
    """pgvector 값(문자열 '[..]' 또는 리스트) → float32 array."""
    if isinstance(emb, str):
        emb = json.loads(emb)
    return array.array("f", [float(x) for x in emb])


def fetch_supabase() -> list[dict]:
    sb = create_client(_req("SUPABASE_URL"), _req("SUPABASE_SERVICE_ROLE_KEY"))
    rows: list[dict] = []
    start = 0
    while True:
        # documents 조인으로 product_id·source_type 동반 (PostgREST embedded resource)
        batch = (
            sb.table("chunks")
            .select(
                "id, document_id, domain_id, chunk_index, text, token_count, "
                "embedding, documents(product_id, source_type, author, author_credibility)"
            )
            .range(start, start + PAGE - 1)
            .execute()
            .data
        )
        rows.extend(batch)
        print(f"  fetched {len(rows)}")
        if len(batch) < PAGE:
            return rows
        start += PAGE


def main() -> None:
    print("① Supabase 에서 chunks 읽는 중(읽기 전용)…")
    src = fetch_supabase()
    print(f"   총 {len(src)} 행")

    payload = []
    for r in src:
        doc = r.get("documents") or {}
        emb = r.get("embedding")
        if emb is None:
            continue  # 임베딩 없는 행은 검색 대상 아님 → skip
        payload.append(
            (
                r["id"],
                r.get("document_id"),
                r["domain_id"],
                doc.get("product_id"),
                doc.get("source_type"),
                r.get("chunk_index"),
                r.get("text") or "",
                r.get("token_count"),
                _to_floats(emb),
                doc.get("author"),
                doc.get("author_credibility"),
            )
        )

    print(f"② Oracle 적재 준비: {len(payload)} 행 (임베딩 있는 것만)")
    conn = oracledb.connect(
        user=_req("ORACLE_USER"),
        password=_req("ORACLE_PASSWORD"),
        dsn=_req("ORACLE_DSN"),
        config_dir=_req("ORACLE_WALLET_DIR"),
        wallet_location=_req("ORACLE_WALLET_DIR"),
        wallet_password=_req("ORACLE_WALLET_PASSWORD"),
    )
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE chunks")
        cur.executemany(
            """INSERT INTO chunks
               (id, document_id, domain_id, product_id, source_type,
                chunk_index, text, token_count, embedding, author, author_credibility)
               VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11)""",
            payload,
        )
        conn.commit()
        (cnt,) = cur.execute("SELECT COUNT(*) FROM chunks").fetchone()
        (withvec,) = cur.execute(
            "SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL"
        ).fetchone()
    conn.close()
    print(f"✅ 적재 완료 — CHUNKS {cnt} 행 (임베딩 {withvec})")


if __name__ == "__main__":
    main()
