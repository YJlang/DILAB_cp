"""CLI: BERTopic 클러스터링 실행 (도메인 단위).

사용:
  python scripts/run_topics.py --domain cosmetics
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.topics.bertopic_runner import run_bertopic  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", default="cosmetics")
    ap.add_argument("--min-topic-size", type=int, default=3, dest="min_topic_size")
    args = ap.parse_args()

    print(f"[bertopic] domain={args.domain}  min_topic_size={args.min_topic_size}")
    result = run_bertopic(args.domain, min_topic_size=args.min_topic_size)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
