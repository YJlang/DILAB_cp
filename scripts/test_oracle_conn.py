"""Oracle 26ai 연결 + 벡터 기능 점검 (PoC 1단계).

python-oracledb **thin 모드** + Autonomous DB mTLS(wallet).
.env 의 자격으로 접속해 버전·VECTOR 지원만 확인한다. 비밀값은 출력하지 않는다.

실행:
    source .venv/bin/activate
    python scripts/test_oracle_conn.py
"""
from __future__ import annotations

import os
import sys

import oracledb
from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    v = os.environ.get(key, "").strip()
    if not v:
        sys.exit(f"[.env 누락] {key} 가 비어 있습니다.")
    return v


def main() -> None:
    wallet_dir = _require("ORACLE_WALLET_DIR")
    if not os.path.isdir(wallet_dir):
        sys.exit(f"[wallet 경로 오류] {wallet_dir} 디렉토리가 없습니다.")

    # thin 모드: config_dir 로 tnsnames.ora 를, wallet_location/password 로 mTLS 인증서를 읽음.
    conn = oracledb.connect(
        user=_require("ORACLE_USER"),
        password=_require("ORACLE_PASSWORD"),
        dsn=_require("ORACLE_DSN"),
        config_dir=wallet_dir,
        wallet_location=wallet_dir,
        wallet_password=_require("ORACLE_WALLET_PASSWORD"),
    )
    print("✅ 접속 성공 (thin 모드)")

    with conn.cursor() as cur:
        (banner,) = cur.execute(
            "SELECT banner_full FROM v$version WHERE banner_full LIKE 'Oracle%'"
        ).fetchone()
        print("DB 버전:", banner.splitlines()[0])

        # VECTOR 타입/검색 가용성 — 26ai 면 통과해야 함.
        try:
            (d,) = cur.execute(
                "SELECT VECTOR_DISTANCE("
                "TO_VECTOR('[1,0,0]'), TO_VECTOR('[0,1,0]'), COSINE) FROM dual"
            ).fetchone()
            print(f"✅ VECTOR_DISTANCE 동작 — cosine([1,0,0],[0,1,0]) = {d}")
            print("→ AI Vector Search 사용 가능. PoC 벡터 적재로 진행 가능.")
        except oracledb.DatabaseError as e:
            print("⚠️ VECTOR 기능 미동작:", e)
            print("→ DB 버전이 26ai(벡터 지원)인지 확인 필요.")

    conn.close()


if __name__ == "__main__":
    main()
