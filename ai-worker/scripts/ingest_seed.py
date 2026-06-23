"""CLI: 도메인 단위 seed 인제스션.

사용:
  cd ai-worker
  python scripts/ingest_seed.py --domain cosmetics

기본 seed 경로는 data/seed/expert-reviews/<domain>/*.md
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# scripts/ 가 src/ 와 동급이라 sys.path 보강
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.ingestion.pipeline import ingest_domain  # noqa: E402

# ai-worker/scripts → ai-worker → DILAB
REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_BASE = REPO_ROOT / "data" / "seed" / "expert-reviews"


def main() -> None:
    ap = argparse.ArgumentParser(description="DILAB seed ingestion")
    ap.add_argument("--domain", required=True, help="도메인 slug (예: cosmetics)")
    ap.add_argument(
        "--seed-dir",
        type=Path,
        default=None,
        help=f"seed 디렉토리 (기본: {SEED_BASE}/<domain>)",
    )
    args = ap.parse_args()

    seed_dir = args.seed_dir or (SEED_BASE / args.domain)
    if not seed_dir.exists():
        raise SystemExit(f"seed dir not found: {seed_dir}")

    print(f"[ingest] domain={args.domain}  seed_dir={seed_dir}")
    results = ingest_domain(args.domain, seed_dir)
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
