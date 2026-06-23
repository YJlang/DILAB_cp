"""CLI 데모: DILAB Ask.

사용:
  python scripts/ask.py --query "민감성 피부에 괜찮나요?" --k 5
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.rag.answer import answer  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", required=True)
    ap.add_argument("--domain", default="cosmetics")
    ap.add_argument("--product", default=None, help="product slug (예: anua-heartleaf-77)")
    ap.add_argument("--expert-k", type=int, default=3, dest="expert_k")
    ap.add_argument("--public-k", type=int, default=3, dest="public_k")
    ap.add_argument(
        "--persist", action="store_true", help="ask_queries/responses/citations Supabase 저장"
    )
    args = ap.parse_args()

    result = answer(
        args.query,
        domain_slug=args.domain,
        product_slug=args.product,
        expert_k=args.expert_k,
        public_k=args.public_k,
        persist=args.persist,
    )

    print(f"\n💬 Q: {result.query}\n")
    print(f"💡 A  [{result.llm_model}  ·  {result.latency_ms}ms]")
    print(result.answer)
    print(f"\n✅ 추천: {result.recommendation}")
    print(f"\n📚 출처 — 전문가 {result.expert_count}건 · 일반 {result.public_count}건")
    for c in result.citations:
        text_preview = c.text[:120] + ("..." if len(c.text) > 120 else "")
        cred = f"  cred={c.author_credibility}/10" if c.author_credibility else ""
        print(f"  [{c.rank}] {c.cite_type:7}  sim={c.similarity:.3f}  {c.author}{cred}")
        print(f'      "{text_preview}"')
    if result.query_id:
        print(f"\n💾 saved  query_id={result.query_id}  response_id={result.response_id}")


if __name__ == "__main__":
    main()
