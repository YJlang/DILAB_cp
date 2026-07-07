"""UI가 읽는 모든 테이블 Supabase → Oracle 마이그레이션 (Phase 3 앱 통합).

chunks 는 이미 적재됨. 나머지 10종을 재실행 가능하게(DROP→CREATE→LOAD) 이관.
JSON/배열(jsonb, text[], uuid[]) 컬럼은 CLOB 에 JSON 문자열로 저장 → TS 에서 JSON.parse.

실행: source .venv/bin/activate && python scripts/migrate_all_tables.py
"""
from __future__ import annotations

import json
import os

import oracledb
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")
PAGE = 1000


def env(k): return os.environ[k]


SPECS = [
    dict(name="domains",
         ddl="id VARCHAR2(36) PRIMARY KEY, slug VARCHAR2(64), name VARCHAR2(200), "
             "categories VARCHAR2(4000), rating_axes VARCHAR2(4000), journey_stages VARCHAR2(4000)",
         sel="id, slug, name, categories, rating_axes, journey_stages",
         cols=["id", "slug", "name", "categories", "rating_axes", "journey_stages"],
         jsoncols={"categories", "rating_axes", "journey_stages"}),
    dict(name="products",
         ddl="id VARCHAR2(36) PRIMARY KEY, domain_id VARCHAR2(36), name VARCHAR2(300), "
             "brand VARCHAR2(200), category VARCHAR2(200), metadata VARCHAR2(4000)",
         sel="id, domain_id, name, brand, category, metadata",
         cols=["id", "domain_id", "name", "brand", "category", "metadata"],
         jsoncols={"metadata"}),
    dict(name="ratings",
         ddl="id VARCHAR2(36) PRIMARY KEY, product_id VARCHAR2(36), axis VARCHAR2(64), "
             "score NUMBER, evidence_chunk_ids VARCHAR2(4000), generated_by VARCHAR2(100), "
             "generated_at VARCHAR2(40)",
         sel="id, product_id, axis, score, evidence_chunk_ids, generated_by, generated_at",
         cols=["id", "product_id", "axis", "score", "evidence_chunk_ids", "generated_by", "generated_at"],
         jsoncols={"evidence_chunk_ids"}, numcols={"score"}),
    dict(name="documents",
         ddl="id VARCHAR2(36) PRIMARY KEY, domain_id VARCHAR2(36), product_id VARCHAR2(36), "
             "source_type VARCHAR2(32), author VARCHAR2(200), author_credibility NUMBER, "
             "source_url VARCHAR2(1000), title VARCHAR2(500)",
         sel="id, domain_id, product_id, source_type, author, author_credibility, source_url, title",
         cols=["id", "domain_id", "product_id", "source_type", "author", "author_credibility",
               "source_url", "title"],
         numcols={"author_credibility"}),
    dict(name="sentiments",
         ddl="chunk_id VARCHAR2(36) PRIMARY KEY, sentiment VARCHAR2(16), intensity NUMBER",
         sel="chunk_id, sentiment, intensity",
         cols=["chunk_id", "sentiment", "intensity"], numcols={"intensity"}),
    dict(name="topics",
         ddl="id VARCHAR2(36) PRIMARY KEY, domain_id VARCHAR2(36), topic_index NUMBER, "
             "label VARCHAR2(400), keywords VARCHAR2(4000), doc_count NUMBER",
         sel="id, domain_id, topic_index, label, keywords, doc_count",
         cols=["id", "domain_id", "topic_index", "label", "keywords", "doc_count"],
         jsoncols={"keywords"}, numcols={"topic_index", "doc_count"}),
    dict(name="topic_assignments",
         ddl="chunk_id VARCHAR2(36), topic_id VARCHAR2(36)",
         sel="chunk_id, topic_id", cols=["chunk_id", "topic_id"]),
    dict(name="journey_assignments",
         ddl="chunk_id VARCHAR2(36), product_id VARCHAR2(36), stage_key VARCHAR2(40), "
             "confidence NUMBER, is_estimated NUMBER(1)",
         sel="chunk_id, product_id, stage_key, confidence, is_estimated",
         cols=["chunk_id", "product_id", "stage_key", "confidence", "is_estimated"],
         numcols={"confidence"}, boolcols={"is_estimated"}),
    dict(name="ask_queries",
         ddl="id VARCHAR2(36) PRIMARY KEY, domain_id VARCHAR2(36)",
         sel="id, domain_id", cols=["id", "domain_id"]),
]


def fetch(sb, spec) -> list[dict]:
    rows, start = [], 0
    while True:
        batch = sb.table(spec["name"]).select(spec["sel"]).range(start, start + PAGE - 1).execute().data
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows
        start += PAGE


def to_tuple(spec, r):
    out = []
    for c in spec["cols"]:
        v = r.get(c)
        if c in spec.get("jsoncols", set()):
            out.append(json.dumps(v, ensure_ascii=False) if v is not None else "[]")
        elif c in spec.get("boolcols", set()):
            out.append(1 if v else 0)
        elif c in spec.get("numcols", set()):
            out.append(float(v) if v is not None else None)
        else:
            out.append(v)
    return tuple(out)


def main():
    sb = create_client(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"))
    conn = oracledb.connect(
        user=env("ORACLE_USER"), password=env("ORACLE_PASSWORD"), dsn=env("ORACLE_DSN"),
        config_dir=env("ORACLE_WALLET_DIR"), wallet_location=env("ORACLE_WALLET_DIR"),
        wallet_password=env("ORACLE_WALLET_PASSWORD"),
    )
    cur = conn.cursor()
    for spec in SPECS:
        name = spec["name"]
        try:
            cur.execute(f"DROP TABLE {name} CASCADE CONSTRAINTS")
        except oracledb.DatabaseError:
            pass  # 없으면 무시
        cur.execute(f"CREATE TABLE {name} ({spec['ddl']})")
        data = fetch(sb, spec)
        if data:
            binds = ",".join(f":{i+1}" for i in range(len(spec["cols"])))
            cur.executemany(
                f"INSERT INTO {name} ({', '.join(spec['cols'])}) VALUES ({binds})",
                [to_tuple(spec, r) for r in data],
            )
        conn.commit()
        (cnt,) = cur.execute(f"SELECT COUNT(*) FROM {name}").fetchone()
        print(f"  ✅ {name:20} {cnt} 행")
    conn.close()
    print("\n마이그레이션 완료 (chunks 는 기존 적재분 유지)")


if __name__ == "__main__":
    main()
