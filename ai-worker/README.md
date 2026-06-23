# DILAB AI Worker

> ⚠️ **2026-05-28 이후 — 운영 모드 변경**:
> - 이 폴더는 더 이상 **uvicorn 으로 24/7 실행하지 않습니다**. [DEPLOYMENT_PLAN.md](../docs/DEPLOYMENT_PLAN.md) Phase 1·2 로 옮겨졌습니다.
> - `src/` 의 코드 (`ingestion/`, `analysis/`, `topics/`, `ratings/`, `compare/` 등) 는 **Modal 함수의 source** 로 그대로 사용됩니다. [`modal_app/analyze.py`](../modal_app/analyze.py) 의 `add_local_dir("./ai-worker/src", ...)` 참조.
> - `src/rag/`, `src/embeddings/` 의 로직은 **Cloudflare Workers 안의 [`prototype/lib/rag.ts`](../prototype/lib/rag.ts) 로 port** 되어 있습니다 (BGE-M3 → `@cf/baai/bge-m3` Workers AI binding).
> - **로컬 `uvicorn` / `cloudflared tunnel` 띄울 필요 없음.** 사이트(https://dilab.sean111400.workers.dev) 가 노트북과 무관하게 24/7 작동합니다.
> - 이 README 아래 절차는 **legacy 개발용**. 새로운 분석 파이프라인 개발 시는 Modal 함수 직접 수정 → `modal deploy`.

Python 기반 AI 워커 — DILAB MVP 의 B1~B5 (임베딩·토픽·분류·감성·여정·RAG) 담당. Supabase 는 상태, 본 워커는 연산.

## 빠른 시작

```powershell
cd ai-worker
Copy-Item .env.example .env   # SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY 채우기

# 가상환경 (uv 또는 venv)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"

# FastAPI 띄우기
uvicorn src.main:app --reload --port 8000

# 헬스 체크
curl http://localhost:8000/health
```

응답 예시 (Supabase 연결되면):

```json
{"ok": true, "supabase_connected": true, "domains": [{"slug":"cosmetics","name":"화장품"}]}
```

## 디렉토리

```
src/
├── main.py        FastAPI 진입점
├── config.py      Pydantic Settings (.env 자동 로드)
├── db/            Supabase client (service_role)
├── embeddings/    BGE-M3 (1024 dim) — B1
├── llm/           DeepSeek 클라이언트 (OpenAI 호환) — B3·B4·B5
├── ingestion/     문서 → 청크 → 임베딩 → 저장 (M2 구현)
├── topics/        BERTopic — B2 (M3)
├── analysis/      분류·감성·여정 — B3·B4 (M3)
├── rag/           DILAB Ask — B5 (M4)
└── ratings/       5축 평가 + evidence — ★1 (M4)
```

## 환경 변수

[`.env.example`](.env.example) 참조.

| 변수 | 어디서 |
|---|---|
| `SUPABASE_URL` | `https://mxofuzhfdthqpzhzctwd.supabase.co` (고정) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → **service_role secret** (절대 git 에 X) |
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com (OpenAI 호환) |
| `LLM_MODEL` | `deepseek-chat` (기본), dashboard 표기 모델 ID 그대로 |

## 설계 원칙

- **stateless** — 모든 결과는 Supabase 로 다시 쓰기. 워커 재시작에도 안전
- **service_role 사용** — RLS 우회. anon/authenticated 권한으론 쓰기 불가
- **LangChain/LlamaIndex 미사용** — 의존성 최소 (supabase·sentence-transformers·anthropic·bertopic 4개)
- **모델 1회 로드** — `@lru_cache` 로 BGE-M3 프로세스당 한 번만

## 관련 문서

- [기술 스택 ADR](../docs/research/tech-stack-decision.md)
- [DB 스키마 / ERD](../docs/db/schema.md)
- [PRD](../docs/prd/dilab-mvp-prd.md)
