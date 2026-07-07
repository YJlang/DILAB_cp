"""chunks 를 in-DB e5(384d) 로 재임베딩 — 외부 임베더 제거의 핵심.

기존 embedding(VECTOR 1024, BGE-M3 외부생성)을 버리고, Oracle 안에서
VECTOR_EMBEDDING(DILAB_E5 ...) 로 384d 재생성. e5 규약: 청크='passage: ', 질문='query: '.

실행: source .venv/bin/activate && python scripts/reembed_indb.py
"""
from __future__ import annotations

import os
import time

import oracledb
from dotenv import load_dotenv

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")


def env(k): return os.environ[k]


def run(cur, sql, ignore=False):
    try:
        cur.execute(sql)
    except oracledb.DatabaseError as e:
        if ignore:
            print(f"   (skip: {str(e).splitlines()[0]})")
        else:
            raise


def main():
    conn = oracledb.connect(
        user=env("ORACLE_USER"), password=env("ORACLE_PASSWORD"), dsn=env("ORACLE_DSN"),
        config_dir=env("ORACLE_WALLET_DIR"), wallet_location=env("ORACLE_WALLET_DIR"),
        wallet_password=env("ORACLE_WALLET_PASSWORD"),
    )
    cur = conn.cursor()

    print("① 기존 인덱스·컬럼 정리 → VECTOR(384) 신설")
    run(cur, "DROP INDEX idx_chunks_emb", ignore=True)
    run(cur, "ALTER TABLE chunks DROP COLUMN embedding", ignore=True)
    cur.execute("ALTER TABLE chunks ADD embedding VECTOR(384, FLOAT32)")

    print("② in-DB 재임베딩 (VECTOR_EMBEDDING, 'passage: ' 프리픽스)…")
    t0 = time.perf_counter()
    cur.execute(
        "UPDATE chunks SET embedding = "
        "VECTOR_EMBEDDING(DILAB_E5 USING 'passage: ' || text AS data)"
    )
    n = cur.rowcount
    conn.commit()
    print(f"   ✅ {n} 행 재임베딩 ({time.perf_counter()-t0:.0f}s)")

    print("③ HNSW 코사인 인덱스 재생성")
    cur.execute(
        "CREATE VECTOR INDEX idx_chunks_emb ON chunks (embedding) "
        "ORGANIZATION INMEMORY NEIGHBOR GRAPH DISTANCE COSINE WITH TARGET ACCURACY 95"
    )
    conn.commit()

    (cnt,) = cur.execute(
        "SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL"
    ).fetchone()
    (dim,) = cur.execute(
        "SELECT VECTOR_DIMENSION_COUNT(embedding) FROM chunks WHERE embedding IS NOT NULL "
        "FETCH FIRST 1 ROWS ONLY"
    ).fetchone()
    print(f"   ✅ 임베딩 있는 청크 {cnt} · 차원 {dim}")
    conn.close()


if __name__ == "__main__":
    main()
