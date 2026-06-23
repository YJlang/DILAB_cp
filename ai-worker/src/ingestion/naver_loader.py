"""data/raw/naver/<product_slug>/{reviews,expert,product}.json 로더.

네이버 API 응답 (이미 fetch 되어 저장됨) 을 ingestion pipeline 입력 형식으로 변환.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Literal


@dataclass
class NaverProduct:
    product_slug: str
    name: str
    brand: str
    maker: str | None
    category1: str
    category2: str
    category3: str
    naver_catalog_id: str | None
    metadata: dict[str, Any]


@dataclass
class NaverDocument:
    """1 블로그 항목 = 1 document."""
    title: str
    link: str
    description: str
    bloggername: str
    postdate: date | None
    source_type: Literal["public_review", "expert"]


def _parse_postdate(s: str | None) -> date | None:
    if not s or len(s) != 8:
        return None
    try:
        return datetime.strptime(s, "%Y%m%d").date()
    except ValueError:
        return None


def load_product(raw_dir: Path) -> NaverProduct:
    data = json.loads((raw_dir / "product.json").read_text(encoding="utf-8"))
    return NaverProduct(
        product_slug=data["product_slug"],
        name=data["name"],
        brand=data["brand"],
        maker=data.get("maker"),
        category1=data.get("category1", ""),
        category2=data.get("category2", ""),
        category3=data.get("category3", ""),
        naver_catalog_id=data.get("naver_catalog_id"),
        metadata={
            "price_krw": data.get("price_krw"),
            "fetched_at": data.get("fetched_at"),
            "source": data.get("source"),
        },
    )


def load_documents(raw_dir: Path) -> list[NaverDocument]:
    docs: list[NaverDocument] = []
    for fname, stype in [("reviews.json", "public_review"), ("expert.json", "expert")]:
        path = raw_dir / fname
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for it in data.get("items", []):
            docs.append(
                NaverDocument(
                    title=it["title"],
                    link=it["link"],
                    description=it["description"],
                    bloggername=it.get("bloggername", ""),
                    postdate=_parse_postdate(it.get("postdate")),
                    source_type=stype,  # type: ignore[arg-type]
                )
            )
    return docs
