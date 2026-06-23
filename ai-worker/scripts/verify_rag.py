"""의미 검색 검증 — BGE-M3 임베딩 → match_chunks RPC → top-K 결과 출력.

사용:
  python scripts/verify_rag.py --query "비건 클렌징 폼 자극도"
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Windows cp949 콘솔에서 한글·em-dash 깨짐 회피
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.db import supabase  # noqa: E402
from src.embeddings import embed_one  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", required=True)
    ap.add_argument("--domain", default="cosmetics")
    ap.add_argument("--k", type=int, default=3)
    args = ap.parse_args()

    domain = (
        supabase.table("domains").select("id").eq("slug", args.domain).single().execute().data
    )
    domain_id = domain["id"]

    print(f"[query] {args.query!r}  domain={args.domain}  k={args.k}")
    vec = embed_one(args.query)
    print(f"[embed] dim={len(vec)}  first5={vec[:5]}")

    r = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": vec,
            "match_domain_id": domain_id,
            "match_count": args.k,
            "prefer_expert": True,
        },
    ).execute()

    for i, row in enumerate(r.data, 1):
        print(f"\n--- #{i}  similarity={row['similarity']:.4f}  source={row['source_type']}  author={row['author']}")
        print(row["text"][:300] + ("..." if len(row["text"]) > 300 else ""))


if __name__ == "__main__":
    main()
