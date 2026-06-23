"""CLI: 도메인 chunks 일괄 라벨링 (B3 분류·감성 + B4 여정).

사용:
  python scripts/label_chunks.py --domain cosmetics
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.analysis.label import label_domain  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", default="cosmetics")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    print(f"[label_chunks] domain={args.domain}  limit={args.limit}")
    result = label_domain(args.domain, limit=args.limit)
    print("\n=== Summary ===")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
