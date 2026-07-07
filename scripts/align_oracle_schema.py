"""Oracle 26ai 쓰기 스키마 정렬 — 분석 파이프라인(auto_ingest/label/compute)이 INSERT/UPDATE
하는 컬럼·테이블을 Oracle 쪽에 **추가**한다. 멱등(이미 있으면 조용히 무시).

기존 데이터(25제품·1347청크)는 절대 건드리지 않는다 — ALTER ADD / CREATE 만 수행.
schema.md(Supabase Postgres 원본)의 타입을 Oracle 로 매핑:
  uuid→VARCHAR2(36) · jsonb/배열→VARCHAR2(4000) JSON 문자열 · timestamptz→TIMESTAMP
  numeric→NUMBER · bool→NUMBER(1) · text(본문)→CLOB

실행:
    source .venv/bin/activate
    python scripts/align_oracle_schema.py
"""
from __future__ import annotations

import os

import oracledb
from dotenv import load_dotenv

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")


def _env(k: str) -> str:
    return os.environ[k]


def connect() -> oracledb.Connection:
    return oracledb.connect(
        user=_env("ORACLE_USER"),
        password=_env("ORACLE_PASSWORD"),
        dsn=_env("ORACLE_DSN"),
        config_dir=_env("ORACLE_WALLET_DIR"),
        wallet_location=_env("ORACLE_WALLET_DIR"),
        wallet_password=_env("ORACLE_WALLET_PASSWORD"),
    )


# 이미 존재하면 나는 오류들: 00955(이름 중복 테이블/인덱스), 01430(컬럼 이미 있음),
# 00957(중복 컬럼명), 02260/02261(PK 중복). 이런 건 멱등이므로 흡수.
_IGNORABLE = (955, 1430, 957, 2260, 2261, 1442, 1451)


def _ddl(cur: oracledb.Cursor, sql: str, label: str) -> None:
    try:
        cur.execute(sql)
        print(f"  ✅ {label}")
    except oracledb.DatabaseError as e:  # noqa: PERF203
        (err,) = e.args
        if err.code in _IGNORABLE:
            print(f"  ↷ {label} — 이미 존재 (ORA-{err.code:05d})")
        else:
            print(f"  ✗ {label} — ORA-{err.code:05d}: {err.message.splitlines()[0]}")


def main() -> None:
    conn = connect()
    cur = conn.cursor()

    print("① documents — 파이프라인 INSERT 누락 컬럼 추가")
    for col, ddl in (
        ("BODY", "ALTER TABLE documents ADD (body CLOB)"),
        ("LANGUAGE", "ALTER TABLE documents ADD (language VARCHAR2(16))"),
        ("PUBLISHED_DATE", "ALTER TABLE documents ADD (published_date DATE)"),
        ("SEED_DATA", "ALTER TABLE documents ADD (seed_data NUMBER(1))"),
        ("METADATA", "ALTER TABLE documents ADD (metadata VARCHAR2(4000))"),
        ("COLLECTED_AT", "ALTER TABLE documents ADD (collected_at TIMESTAMP DEFAULT SYSTIMESTAMP)"),
    ):
        _ddl(cur, ddl, f"documents.{col}")

    print("② sentiments — 라벨러가 쓰는 assigned_by/assigned_at 추가")
    _ddl(cur, "ALTER TABLE sentiments ADD (assigned_by VARCHAR2(100))", "sentiments.ASSIGNED_BY")
    _ddl(
        cur,
        "ALTER TABLE sentiments ADD (assigned_at TIMESTAMP DEFAULT SYSTIMESTAMP)",
        "sentiments.ASSIGNED_AT",
    )

    print("③ journey_assignments — assigned_by/assigned_at 추가")
    _ddl(
        cur,
        "ALTER TABLE journey_assignments ADD (assigned_by VARCHAR2(100))",
        "journey_assignments.ASSIGNED_BY",
    )
    _ddl(
        cur,
        "ALTER TABLE journey_assignments ADD (assigned_at TIMESTAMP DEFAULT SYSTIMESTAMP)",
        "journey_assignments.ASSIGNED_AT",
    )

    print("④ classifications — 신규 테이블")
    _ddl(
        cur,
        """CREATE TABLE classifications (
               id          VARCHAR2(36) PRIMARY KEY,
               chunk_id    VARCHAR2(36),
               category    VARCHAR2(64),
               confidence  NUMBER,
               assigned_by VARCHAR2(100),
               assigned_at TIMESTAMP DEFAULT SYSTIMESTAMP
           )""",
        "CREATE classifications",
    )
    _ddl(
        cur,
        "CREATE INDEX idx_classifications_chunk ON classifications(chunk_id)",
        "idx_classifications_chunk",
    )

    print("⑤ analysis_jobs — 신규 테이블 (Modal/route.ts 필드 매핑)")
    _ddl(
        cur,
        """CREATE TABLE analysis_jobs (
               id            VARCHAR2(36) PRIMARY KEY,
               product_query VARCHAR2(500),
               domain_slug   VARCHAR2(64),
               status        VARCHAR2(20),
               progress      VARCHAR2(4000),
               result        VARCHAR2(4000),
               result_slug   VARCHAR2(200),
               error         VARCHAR2(2000),
               created_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
               updated_at    TIMESTAMP DEFAULT SYSTIMESTAMP
           )""",
        "CREATE analysis_jobs",
    )

    conn.commit()
    cur.close()
    conn.close()
    print("\n완료 — 스키마 정렬(멱등).")


if __name__ == "__main__":
    main()
