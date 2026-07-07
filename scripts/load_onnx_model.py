"""Oracle in-DB 임베딩 모델 적재 — pre-built multilingual-e5-small ONNX.

Oracle이 배포한 augmented ONNX(토크나이저·풀링·정규화 내장)를 BLOB 으로 올려
DBMS_VECTOR.LOAD_ONNX_MODEL 로 DB에 심는다. 이후 VECTOR_EMBEDDING(모델 USING text) 로
DB 안에서 임베딩 생성 → 외부 임베더 불필요.

실행: source .venv/bin/activate && python scripts/load_onnx_model.py
"""
from __future__ import annotations

import os

import oracledb
from dotenv import load_dotenv

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")

ONNX = os.path.expanduser("~/.dilab/models/multilingual_e5_small.onnx")
MODEL = "DILAB_E5"
META = '{"function":"embedding","embeddingOutput":"embedding","input":{"input":["DATA"]}}'


def env(k): return os.environ[k]


def main():
    conn = oracledb.connect(
        user=env("ORACLE_USER"), password=env("ORACLE_PASSWORD"), dsn=env("ORACLE_DSN"),
        config_dir=env("ORACLE_WALLET_DIR"), wallet_location=env("ORACLE_WALLET_DIR"),
        wallet_password=env("ORACLE_WALLET_PASSWORD"),
    )
    cur = conn.cursor()

    # 기존 모델 있으면 제거(재실행 대비)
    cur.execute(
        "BEGIN DBMS_VECTOR.DROP_ONNX_MODEL(model_name => :m, force => true); "
        "EXCEPTION WHEN OTHERS THEN NULL; END;",
        m=MODEL,
    )

    print(f"① ONNX 업로드({os.path.getsize(ONNX)//1024//1024}MB) → BLOB…")
    lob = conn.createlob(oracledb.DB_TYPE_BLOB)
    with open(ONNX, "rb") as f:
        while chunk := f.read(4 * 1024 * 1024):
            lob.write(chunk, lob.size() + 1)

    print("② DBMS_VECTOR.LOAD_ONNX_MODEL …")
    cur.execute(
        "BEGIN DBMS_VECTOR.LOAD_ONNX_MODEL("
        "model_name => :name, model_data => :blob, metadata => JSON(:meta)); END;",
        name=MODEL, blob=lob, meta=META,
    )
    conn.commit()
    print(f"   ✅ 모델 '{MODEL}' 적재")

    print("③ VECTOR_EMBEDDING 테스트 (한국어)…")
    (v,) = cur.execute(
        f"SELECT VECTOR_EMBEDDING({MODEL} USING :t AS data) FROM dual",
        t="query: 수분크림 진정 효과",
    ).fetchone()
    dim = len(v) if v is not None else 0
    print(f"   ✅ 임베딩 생성됨 — 차원 {dim} (외부 임베더 없이 DB가 직접)")
    conn.close()


if __name__ == "__main__":
    main()
