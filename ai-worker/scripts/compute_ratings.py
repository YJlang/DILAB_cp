"""CLI: product 단위 5축 ratings 계산 + Supabase upsert.

사용:
  python scripts/compute_ratings.py --product anua-heartleaf-77
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, cast

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.db import supabase  # noqa: E402
from src.ratings import upsert_ratings  # noqa: E402


def _find_product_id(domain_slug: str, product_slug: str) -> str:
    dom = cast(
        dict[str, Any],
        supabase.table("domains").select("id").eq("slug", domain_slug).single().execute().data,
    )
    rows = cast(
        list[dict[str, Any]],
        supabase.table("products")
        .select("id, metadata")
        .eq("domain_id", dom["id"])
        .execute()
        .data,
    )
    for r in rows:
        if (r.get("metadata") or {}).get("slug") == product_slug:
            return r["id"]
    raise SystemExit(f"product not found: {product_slug}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", default="cosmetics")
    ap.add_argument("--product", required=True)
    args = ap.parse_args()

    product_id = _find_product_id(args.domain, args.product)
    print(f"[ratings] product_id={product_id}")
    result = upsert_ratings(product_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
