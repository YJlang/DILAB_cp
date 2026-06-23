"""네이버 Open API 직접 호출 — 제품명 → reviews + expert + shop 메타.

이전에 raw JSON 으로 수동 보존하던 fetch 단계의 자동화.
공식 API 라 합법·안정. 일 25,000 호출 quota.
"""
from __future__ import annotations

import re
from typing import Any

import httpx

NAVER_API = "https://openapi.naver.com/v1/search"

_HTML_RE = re.compile(r"<[^>]+>")


def _strip_html(s: str | None) -> str:
    return _HTML_RE.sub("", s or "")


class NaverClient:
    def __init__(self, client_id: str, client_secret: str):
        if not client_id or not client_secret:
            raise RuntimeError("NAVER_CLIENT_ID/SECRET 필요")
        self.cid = client_id
        self.csec = client_secret

    def _headers(self) -> dict[str, str]:
        return {
            "X-Naver-Client-Id": self.cid,
            "X-Naver-Client-Secret": self.csec,
        }

    def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        with httpx.Client(timeout=10) as client:
            r = client.get(f"{NAVER_API}/{path}", headers=self._headers(), params=params)
            r.raise_for_status()
            return r.json()

    def search_blog(self, query: str, display: int = 30, sort: str = "sim") -> list[dict[str, Any]]:
        return self._get("blog.json", {"query": query, "display": display, "sort": sort}).get(
            "items", []
        )

    def search_shop(self, query: str, display: int = 5, sort: str = "sim") -> list[dict[str, Any]]:
        return self._get("shop.json", {"query": query, "display": display, "sort": sort}).get(
            "items", []
        )

    def fetch_product_data(self, product_query: str) -> dict[str, Any]:
        # [리뷰] 검색어를 바꿔 두 종류를 모음: 일반 후기(public) + "성분 분석"(전문가 성격).
        #        이 분리가 뒤(answer.py)의 expert/public 하이브리드 검색의 데이터 원천.
        reviews = self.search_blog(f"{product_query} 후기", display=30)
        expert = self.search_blog(f"{product_query} 성분 분석", display=15)
        shop_items = self.search_shop(product_query, display=5)
        # [리뷰] description 은 네이버가 주는 ~200자 "요약"이지 블로그 본문 전체가 아님.
        #        분석에 들어가는 텍스트 신호가 짧다는 뜻 → 점수 신뢰도를 평가할 때 기억할 한계.
        for items in (reviews, expert):
            for it in items:
                it["title"] = _strip_html(it.get("title"))
                it["description"] = _strip_html(it.get("description"))
        if shop_items:
            for k in ("title", "brand", "maker"):
                shop_items[0][k] = _strip_html(shop_items[0].get(k))
        return {
            "reviews": reviews,
            "expert": expert,
            "shop": shop_items[0] if shop_items else None,
        }
