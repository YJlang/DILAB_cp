"""제품 slug 생성 — 한국어 brand/keyword 매핑 + hangul-romanize fallback.

전략:
  1) 자주 나오는 브랜드 영문 매핑 사전 우선
  2) 자주 나오는 화장품 키워드 영문 매핑
  3) 미매핑 한글 → hangul-romanize 로 transliterate
  4) 노이즈(용량·개수·괄호) 제거
  5) 중복 회피용 8자 hash suffix
"""
from __future__ import annotations

import hashlib
import re

# 한국 화장품 자주 나오는 브랜드 (공식/약식 영문명)
BRAND_MAP: dict[str, str] = {
    "아누아": "anua", "아비브": "abib", "닥터지": "drg",
    "이니스프리": "innisfree", "메디힐": "mediheal", "에스트라": "aestura",
    "에이프릴스킨": "april-skin", "더페이스샵": "thefaceshop",
    "토니모리": "tonymoly", "라네즈": "laneige", "마몽드": "mamonde",
    "헤라": "hera", "설화수": "sulwhasoo", "후": "whoo",
    "센텔리안24": "centellian24", "닥터자르트": "drjart",
    "에스쁘아": "espoir", "클리오": "clio",
    "키엘": "kiehls", "라로슈포제": "laroche", "비오더마": "bioderma",
    "씨엔피": "cnp", "어퓨": "apieu", "아이오페": "iope",
    "메가코스": "megacos", "엔코스": "encos",
}

# 카테고리/형용사 키워드
KEYWORD_MAP: dict[str, str] = {
    "어성초": "heartleaf", "토너": "toner", "크림": "cream",
    "세럼": "serum", "에센스": "essence", "앰플": "ampoule",
    "로션": "lotion", "마스크": "mask", "패드": "pad", "팩": "pack",
    "수딩": "soothing", "진정": "calming", "수분": "hydra",
    "보습": "moist", "클렌징": "cleansing", "폼": "foam",
    "오일": "oil", "워시": "wash", "필링": "peeling",
    "스크럽": "scrub", "선크림": "sunscreen", "비건": "vegan",
    "레드": "red", "블레미쉬": "blemish", "시카": "cica",
    "유산균": "probiotics", "히알루론산": "hyaluronic", "콜라겐": "collagen",
    "비타민": "vitamin", "나이아신아마이드": "niacinamide",
    "프로폴리스": "propolis", "센텔라": "centella",
    "녹차": "greentea", "그린티": "greentea",
    "씨드": "seed", "추출물": "extract",
    "클리어": "clear", "맑은": "clear", "수딩수분": "soothing-hydra",
    "데일리": "daily", "라이트": "light",
}

# 노이즈 패턴 — 용량·개수·괄호·콤마
_NOISE_RE = re.compile(r"(\d+\s*ml|\d+\s*g|\d+\s*kg|\d+\s*개|\d+\+\d+|\(.*?\)|\[.*?\])")
_PUNCT_RE = re.compile(r"[,.·,·]")


def _clean(name: str) -> str:
    s = _NOISE_RE.sub(" ", name)
    s = _PUNCT_RE.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def _romanize(s: str) -> str:
    """hangul-romanize 로 자모 transliterate. 영문/숫자/하이픈만 남김."""
    try:
        from hangul_romanize import Transliter
        from hangul_romanize.rule import academic

        t = Transliter(academic)
        roman = t.translit(s)
        return _normalize(roman)
    except Exception:  # noqa: BLE001
        return ""


def _normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:20]


def build_slug(name: str, brand: str | None = None) -> str:
    cleaned = _clean(name)
    parts: list[str] = []

    if brand:
        b = brand.strip()
        if b in BRAND_MAP:
            parts.append(BRAND_MAP[b])
        elif re.fullmatch(r"[A-Za-z0-9\- ]+", b):
            parts.append(_normalize(b))
        elif re.search(r"[가-힣]", b):
            r = _romanize(b)
            if r:
                parts.append(r)

    for tok in cleaned.split():
        if tok in BRAND_MAP:
            if BRAND_MAP[tok] not in parts:
                parts.append(BRAND_MAP[tok])
        elif tok in KEYWORD_MAP:
            parts.append(KEYWORD_MAP[tok])
        elif re.fullmatch(r"[A-Za-z0-9]+", tok):
            parts.append(tok.lower())
        elif re.search(r"[가-힣]", tok):
            r = _romanize(tok)
            if r:
                parts.append(r)

    # 중복 토큰 제거 (순서 유지)
    seen: set[str] = set()
    deduped: list[str] = []
    for p in parts:
        if p and p not in seen:
            seen.add(p)
            deduped.append(p)

    base = "-".join(deduped[:8])[:60] if deduped else "product"
    h = hashlib.md5(name.encode("utf-8")).hexdigest()[:6]
    return f"{base}-{h}"
