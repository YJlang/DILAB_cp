"""로컬 분석 워커 — 제품명 → 네이버 크롤 → 분석 → Oracle 적재 + analysis_jobs 상태 갱신.

Modal 대체. Next.js /api/analyze 가 detached 로 spawn:
    python scripts/run_analyze.py <job_id> "<제품명>"
CLI 단독 실행(잡 없이):
    python scripts/run_analyze.py "<제품명>"

임베딩 Oracle in-DB(DILAB_E5), 저장 Oracle 어댑터, 라벨/평점 DeepSeek.
"""
from __future__ import annotations

import json
import os
import sys
import time

REPO = "/Users/junha/Desktop/DILAB 복사본"
sys.path.insert(0, os.path.join(REPO, "ai-worker"))
os.chdir(REPO)

import oracledb  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(REPO, ".env"))


def _conn():
    return oracledb.connect(
        user=os.environ["ORACLE_USER"], password=os.environ["ORACLE_PASSWORD"],
        dsn=os.environ["ORACLE_DSN"], config_dir=os.environ["ORACLE_WALLET_DIR"],
        wallet_location=os.environ["ORACLE_WALLET_DIR"],
        wallet_password=os.environ["ORACLE_WALLET_PASSWORD"],
    )


def set_job(job_id: str, status: str, *, step: int, message: str,
            result_slug: str | None = None, error: str | None = None) -> None:
    if not job_id:
        return
    prog = json.dumps({"step": step, "of_steps": 3, "message": message}, ensure_ascii=False)
    conn = _conn()
    try:
        conn.cursor().execute(
            "UPDATE analysis_jobs SET status=:s, progress=:p, result_slug=:rs, "
            "error=:e, updated_at=SYSTIMESTAMP WHERE id=:id",
            s=status, p=prog, rs=result_slug, e=(error or "")[:1900], id=job_id,
        )
        conn.commit()
    finally:
        conn.close()


def main() -> int:
    args = sys.argv[1:]
    if len(args) >= 2:
        job_id, query = args[0], args[1]
    elif len(args) == 1:
        job_id, query = "", args[0]
    else:
        job_id, query = "", "라운드랩 1025 독도 수분크림"

    from src.ingestion.auto_ingest import analyze_product

    set_job(job_id, "running", step=1, message="네이버에서 리뷰 수집·분석 중…")
    t0 = time.perf_counter()
    try:
        result = analyze_product(query, domain_slug="cosmetics")
    except Exception as e:  # noqa: BLE001
        set_job(job_id, "error", step=1, message="분석 실패", error=f"{type(e).__name__}: {e}")
        print("ERROR:", e)
        return 1

    slug = result.get("slug")
    if not slug:
        set_job(job_id, "error", step=3, message="결과 없음", error=str(result)[:500])
        return 1
    set_job(job_id, "done", step=3, message="완료", result_slug=slug)
    print(f"✅ 완료 ({time.perf_counter()-t0:.0f}s)")
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
