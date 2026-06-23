"""CLI: 네이버 raw 데이터를 Supabase 로 인제스션.

사용:
  python scripts/ingest_naver.py --domain cosmetics --product anua-heartleaf-77
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.ingestion.naver_pipeline import ingest_naver  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_BASE = REPO_ROOT / "data" / "raw" / "naver"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", required=True)
    ap.add_argument("--product", required=True, help="product slug (raw dir 이름)")
    args = ap.parse_args()

    raw_dir = RAW_BASE / args.product
    if not raw_dir.exists():
        raise SystemExit(f"raw dir not found: {raw_dir}")

    print(f"[ingest_naver] domain={args.domain}  raw_dir={raw_dir}")
    result = ingest_naver(args.domain, raw_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
