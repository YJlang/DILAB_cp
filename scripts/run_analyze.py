"""로컬 분석 파이프라인 실행 — 제품명 → 네이버 크롤 → 분석 → Oracle 적재.

modal_app 없이 auto_ingest.analyze_product 를 로컬에서 직접 호출.
임베딩은 Oracle in-DB(DILAB_E5), 저장은 Oracle 어댑터, 라벨/평점은 DeepSeek.

실행: source .venv/bin/activate && python scripts/run_analyze.py "제품명"
"""
from __future__ import annotations

import json
import os
import sys
import time

REPO = "/Users/junha/Desktop/DILAB 복사본"
sys.path.insert(0, os.path.join(REPO, "ai-worker"))
os.chdir(REPO)

from src.ingestion.auto_ingest import analyze_product  # noqa: E402

query = sys.argv[1] if len(sys.argv) > 1 else "라운드랩 1025 독도 수분크림"
print(f"❓ 분석 대상: {query}\n크롤→분석→Oracle 적재 (수십 초~수 분)…\n")
t0 = time.perf_counter()
result = analyze_product(query, domain_slug="cosmetics")
print(f"\n✅ 완료 ({time.perf_counter()-t0:.0f}s)")
print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
