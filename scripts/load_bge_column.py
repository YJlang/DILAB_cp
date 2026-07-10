"""조건 B(pgvector-parity) 실험용 — Oracle chunks 에 BGE-M3 1024d 컬럼 채우기.

논문 실험 조건 B(Oracle + BGE-M3 정확검색)는 A(pgvector + BGE-M3)와 "같은 임베딩
모델"로 스토어만 바꿔 비교해야 공정하다. Oracle chunks.embedding 은 이미
in-DB e5(384d, 조건 C용)로 재임베딩되어 있으므로(reembed_indb.py), 별도 컬럼에
Supabase 운영 DB의 기존 BGE-M3 1024d 벡터를 id 매칭으로 그대로 옮겨온다.

Supabase 는 읽기 전용(SELECT 만) — 절대 쓰기 금지.
Oracle 은 컬럼 추가 + 해당 컬럼 UPDATE 만 수행. 기존 embedding/idx_chunks_emb·
기존 행 삭제는 건드리지 않는다. 멱등: 컬럼이 이미 있으면 skip, UPDATE 는 재실행해도 안전.

실행:
    source .venv/bin/activate
    python scripts/load_bge_column.py
"""
from __future__ import annotations

import array
import json
import os
import sys

import oracledb
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")

PAGE = 1000  # PostgREST 기본 상한 — .range() 페이지네이션


def _env(k: str) -> str:
    v = os.environ.get(k, "").strip()
    if not v:
        sys.exit(f"[.env 누락] {k}")
    return v


def _oracle_connect() -> oracledb.Connection:
    return oracledb.connect(
        user=_env("ORACLE_USER"),
        password=_env("ORACLE_PASSWORD"),
        dsn=_env("ORACLE_DSN"),
        config_dir=_env("ORACLE_WALLET_DIR"),
        wallet_location=_env("ORACLE_WALLET_DIR"),
        wallet_password=_env("ORACLE_WALLET_PASSWORD"),
    )


def _to_floats(emb) -> array.array:
    """pgvector 값(문자열 '[..]' 또는 리스트) → float32 array."""
    if isinstance(emb, str):
        emb = json.loads(emb)
    return array.array("f", [float(x) for x in emb])


def fetch_supabase_embeddings() -> list[tuple[str, array.array]]:
    """Supabase chunks(id, embedding) 전량 읽기 (읽기 전용)."""
    sb = create_client(_env("SUPABASE_URL"), _env("SUPABASE_SERVICE_ROLE_KEY"))
    rows: list[tuple[str, array.array]] = []
    start = 0
    while True:
        batch = (
            sb.table("chunks")
            .select("id, embedding")
            .range(start, start + PAGE - 1)
            .execute()
            .data
        )
        for r in batch:
            emb = r.get("embedding")
            if emb is None:
                continue
            rows.append((_to_floats(emb), r["id"]))  # (vector, id) — UPDATE 바인드 순서와 일치
        print(f"  fetched {start + len(batch)} (임베딩 있는 것 누적 {len(rows)})")
        if len(batch) < PAGE:
            return rows
        start += PAGE


def ensure_column(cur: oracledb.Cursor) -> None:
    try:
        cur.execute("ALTER TABLE chunks ADD (embedding_bge VECTOR(1024, FLOAT32))")
        print("  ✅ chunks.embedding_bge 컬럼 추가")
    except oracledb.DatabaseError as e:
        (err,) = e.args
        if err.code == 1430:  # 컬럼 이미 존재
            print("  ↷ chunks.embedding_bge — 이미 존재 (ORA-01430)")
        else:
            raise


def main() -> None:
    print("① Supabase 에서 chunks(id, embedding) 읽는 중(읽기 전용)…")
    payload = fetch_supabase_embeddings()
    print(f"   총 {len(payload)} 행 (임베딩 있는 것만)")

    print("② Oracle 연결 + embedding_bge 컬럼 확보(멱등)")
    conn = _oracle_connect()
    with conn.cursor() as cur:
        ensure_column(cur)
        conn.commit()

        print(f"③ id 매칭 UPDATE (executemany, {len(payload)}건)…")
        cur.executemany(
            "UPDATE chunks SET embedding_bge = :1 WHERE id = :2",
            payload,
        )
        conn.commit()
        print(f"   ✅ UPDATE 완료 (matched rows 는 Oracle 측 id 존재 여부에 따라 0건일 수도 있음)")

        (cnt,) = cur.execute(
            "SELECT COUNT(*) FROM chunks WHERE embedding_bge IS NOT NULL"
        ).fetchone()
    conn.close()
    print(f"\n=== embedding_bge NOT NULL 행 수: {cnt} ===")


if __name__ == "__main__":
    main()
