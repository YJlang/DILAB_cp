"""논문 실험용 질의셋 구축 — 실사용 ask_queries + LLM 합성 질의 → 고정 파일.

실사용 19건(Supabase 읽기 전용) + 합성 ~30건(v4-pro 생성, 5축·여정 커버) →
docs/research/paper-results/queryset.json 에 고정(재현성). 이미 있으면 덮지 않음.

실행: source .venv/bin/activate && python scripts/build_queryset.py
"""
from __future__ import annotations

import json
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")
OUT = "/Users/junha/Desktop/DILAB 복사본/docs/research/paper-results/queryset.json"

if os.path.exists(OUT):
    qs = json.load(open(OUT, encoding="utf-8"))
    sys.exit(f"이미 고정된 질의셋 존재({len(qs['real'])+len(qs['synthetic'])}건) — 재생성 안 함: {OUT}")

from supabase import create_client  # noqa: E402

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
real = [r["query"] for r in sb.table("ask_queries").select("query").execute().data]
real = sorted(set(q.strip() for q in real if q and len(q.strip()) >= 5))
print(f"실사용 질의 {len(real)}건")

GEN_PROMPT = """한국 화장품 리뷰 RAG 시스템 평가용 검색 질의 30개를 만들어줘.
조건:
- 실제 소비자가 물을 법한 자연스러운 한국어 질문
- 5개 평가축(효능/성분/가격/사용감/안전성)을 각각 최소 4개씩 커버
- 구매 여정 단계(인지/검토/사용/재구매) 관점도 섞을 것
- 짧은 것(6자)부터 긴 것(40자)까지 길이 다양하게
- 중복·유사 표현 금지
JSON 배열만 출력: ["질문1", "질문2", ...]"""

r = httpx.post(
    f"{os.environ['DEEPSEEK_BASE_URL']}/v1/chat/completions",
    headers={"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
    json={"model": "deepseek-chat", "messages": [{"role": "user", "content": GEN_PROMPT}],
          "temperature": 0.7, "max_tokens": 3000},  # 단순 생성 → 비추론 모델(추론토큰 함정 회피)
    timeout=180,
)
r.raise_for_status()
msg = r.json()["choices"][0]["message"]
text = (msg.get("content") or "").strip()
if not text:
    sys.exit(f"[LLM 응답 비어있음] reasoning만 오고 content 없음 — max_tokens 부족 가능. usage={r.json().get('usage')}")
start, end = text.find("["), text.rfind("]")
if start < 0 or end <= start:
    sys.exit(f"[JSON 배열 못 찾음] 응답 앞부분: {text[:300]}")
synthetic = json.loads(text[start: end + 1])
synthetic = [q.strip() for q in synthetic if isinstance(q, str) and q.strip()][:30]
print(f"합성 질의 {len(synthetic)}건 생성")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"real": real, "synthetic": synthetic}, open(OUT, "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print(f"✅ 질의셋 고정: {OUT} (총 {len(real)+len(synthetic)}건)")
print("\n[검수용] 합성 질의 목록:")
for i, q in enumerate(synthetic, 1):
    print(f"  {i:2}. {q}")
