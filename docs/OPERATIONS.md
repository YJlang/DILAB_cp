# DILAB 운영 가이드

> **AS_OF**: 2026-05-28 (Phase 1·2·3 완료 후)
> **데모 URL**: `https://dilab.sean111400.workers.dev` (24/7, 노트북 무관)
> **이전 운영법** (Quick Tunnel + uvicorn) 은 §8 *Legacy* 섹션에 archive.

[DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) 의 *Phase 1·2 후* 운영 절차. Modal + Cloudflare + Supabase 하이브리드.

---

## 0. 한눈에 보는 토폴로지

```
[브라우저]
   ↓
[Cloudflare Workers]  ── Next.js 16 (OpenNext) — 24/7
   │   - 모든 SSR 페이지 (/, /products/[slug], /ask, /dashboard, /topics, /compare)
   │   - /api/ask     → env.AI.run("@cf/baai/bge-m3") → Supabase RPC → DeepSeek
   │   - /api/analyze → Supabase analysis_jobs INSERT → Modal trigger (fire&forget)
   │   - /api/analyze/status/[job_id] → Supabase SELECT (polling)
   │
   ├── env.AI                  Cloudflare Workers AI binding (BGE-M3, 일 10k neurons 무료)
   ├── env.MODAL_TRIGGER_URL   https://yjlang--dilab-analyze-trigger.modal.run
   ├── env.MODAL_COMPARE_URL   https://yjlang--dilab-analyze-compare.modal.run
   └── env.MODAL_PROXY_TOKEN   (secret) Modal 호출 인증
        ↓ HTTPS
[Modal serverless]  ── 사용 시간만 과금 ($30/월 무료 크레딧 안)
   │  - analyze_product_task: cpu=1 / mem=8GiB / timeout 900s — 백그라운드 분석
   │  - compare:               cpu=0.5 / mem=2GiB / timeout 60s — sync 비교
   │  - dilab-models volume:  BGE-M3 가중치 ~2GB 캐싱
   │  - Secret dilab-env:     12 keys (SUPABASE / DeepSeek / NAVER / MODAL_PROXY_TOKEN)
        ↓
[Supabase]  ── managed, 24/7
   - products / documents / chunks / ratings / topics / ...
   - analysis_jobs (Phase 2 큐 테이블)
   - pgvector HNSW, RLS, 16 정책
```

핵심 변화 (Phase 1·2 후):
1. **사용자 노트북 + cloudflared tunnel 영구 폐기** — 끄지 않아도 사이트 정상 작동
2. **사이트 24/7 모든 기능 작동** — Ask·조회·비교·분석 시연 모두 가능
3. **월 비용 $0** — Cloudflare Free + Supabase Free + Modal Starter $30 크레딧 안

---

## 1. 일상 운영 — 할 일 없음

평소엔 *접속해서 사이트 동작 확인* 외 할 일 없음. PC 끄고 켜도 무관.

---

## 2. 코드 변경 시 — 배포 한 줄

### 2.1 Cloudflare (Next.js · UI · API routes)

```powershell
cd C:\dilab\prototype
npm run deploy
```

`npm run deploy` 가 자동으로:
1. `.next` + `.open-next` 강제 삭제 (clean script)
2. `opennextjs-cloudflare build` (Next.js 빌드 + Cloudflare 어댑터)
3. `wrangler deploy` (worker + assets upload)

### 2.2 Modal (분석·비교 함수 변경 시)

```powershell
cd C:\dilab
modal deploy modal_app/analyze.py
```

배포 후 endpoint URL 이 바뀌면 `prototype/wrangler.jsonc` 의 `vars.MODAL_TRIGGER_URL` / `MODAL_COMPARE_URL` 갱신 + `npm run deploy`.

### 2.3 환경 변수 추가

**Cloudflare**: `prototype/wrangler.jsonc` 의 `vars` 에 직접 (평문) 또는 `npx wrangler secret put NAME` (비밀).
**Modal**: `modal secret create dilab-env --from-dotenv <path> --force` 로 한 번에 덮어쓰기, 또는 Modal Dashboard.

---

## 3. 헬스체크 (30초)

```powershell
# 페이지 SSR
curl https://dilab.sean111400.workers.dev/                            # 200
curl https://dilab.sean111400.workers.dev/products/anua-heartleaf-77  # 200

# Ask
curl -X POST https://dilab.sean111400.workers.dev/api/ask `
     -H "Content-Type: application/json" `
     -d '{"query":"보습 어때?","domain":"cosmetics","product":"anua-heartleaf-77"}'
# → HTTP 200, JSON { answer, recommendation, citations, ... }, latency ~3초

# Analyze (실제 분석 트리거 — 새 제품)
curl -X POST https://dilab.sean111400.workers.dev/api/analyze `
     -H "Content-Type: application/json" `
     -d '{"product_query":"신제품명"}'
# → HTTP 200, JSON { job_id, status: "pending" }
# 이후 GET /api/analyze/status/{job_id} 폴링 → 60~120초 후 status=done
```

---

## 4. 환경 변수 — 어디에 무엇이 있는가

| 변수 | Cloudflare | Modal | ai-worker/.env (legacy) |
|---|---|---|---|
| `SUPABASE_URL` | vars (평문) | secret `dilab-env` | ✓ |
| `SUPABASE_ANON_KEY` | vars (publishable, RLS 보호) | — | — |
| `SUPABASE_SERVICE_ROLE_KEY` | — *(Cloudflare 에 안 둠)* | secret `dilab-env` | ✓ |
| `DEEPSEEK_API_KEY` | secret (`wrangler secret put`) | secret `dilab-env` | ✓ |
| `DEEPSEEK_BASE_URL` / `LLM_MODEL` | vars | secret | ✓ |
| `MODAL_TRIGGER_URL` / `MODAL_COMPARE_URL` | vars | — | — |
| `MODAL_PROXY_TOKEN` | secret | secret (자기참조) | — |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | — | secret | ✓ |
| `EMBEDDING_MODEL_NAME` / `EMBEDDING_DIMENSION` | — | secret | ✓ |

> `ai-worker/.env` 는 *legacy 개발용*. 운영에는 안 씀.

---

## 5. MCP 서버 (디버깅 핵심)

`.mcp.json` 에 등록. Claude Code 안에서 `/mcp → 인증`.

| 서버 | 용도 | 운영 디버그 사용 |
|---|---|---|
| `supabase` | DB SQL·마이그레이션 | `analysis_jobs` 작업 상태 직접 조회 |
| `cloudflare-bindings` | Worker 조회 | scriptVersion·deployments |
| `cloudflare-builds` | Workers Builds 로그 | Git 연동 없으니 거의 무관 |
| `cloudflare-observability` | Worker logs/metrics | **5xx 디버그 1순위** — `query_worker_observability` |

---

## 6. 시나리오별 처방

### 6.1 사이트가 500 (모든 페이지)

거의 항상 **stale build chunk** 또는 **Server Component 의 sync `getCloudflareContext()` throw**.

```powershell
# observability 확인
# → "ChunkLoadError" 면 stale build, "TypeError: handler is not a function" 면 RSC cfEnv 호출 의심

# 캐시 강제 정리 + 재배포 (npm run deploy 가 자동 처리)
cd C:\dilab\prototype
npm run deploy
```

### 6.2 `/api/ask` 만 500

`lib/embeddings.ts` 의 `env.AI.run` 응답 schema 확인. observability 의 error 메시지에 상세.

### 6.3 분석 폼이 영원히 `running`

Modal 함수 에러일 가능성. Modal Dashboard (https://modal.com/apps/yjlang/main/deployed/dilab-analyze) 의 로그 확인. 또는:

```sql
-- Supabase MCP 로 직접
select id, status, progress, error, updated_at
from analysis_jobs
where status in ('running','error')
order by created_at desc limit 5;
```

### 6.4 `/compare` 가 자주 cold start (~16초)

알려진 한계. Modal 함수가 짧은 idle 후 자동 종료. 비용 우선 → 그대로 두기. 비용 감수하고 warm 유지 시 Modal 함수에 `min_containers=1` 추가 (~$3/월).

---

## 7. 알려진 함정 + 트러블슈팅

| # | 증상 | 진짜 원인 | 해결 |
|---|---|---|---|
| 1 | 페이지 500 + `TypeError: components.ComponentMod.handler is not a function` | Server Component 에서 `cfEnv()` (sync `getCloudflareContext`) 호출 → RSC eval 시 throw → worker bundle 전체 깨짐 | Server Component 에선 `process.env` 만 사용. `cfEnv()` 는 route handler / server action 안에서만. AI binding 만 예외 (객체 binding 이라 cfEnv 필수) |
| 2 | 페이지 500 + `ChunkLoadError` | `.open-next/` stale | `npm run deploy` 가 매번 `.next` + `.open-next` clean → 발생 안 함. 그래도 나면 수동 `rm -rf` 후 재배포 |
| 3 | `NEXT_PUBLIC_*` 환경 변수 inline 됨 | DefinePlugin build-time | server-only 변수는 `NEXT_PUBLIC_` 접두사 X. AI binding 같은 객체는 `cfEnv()` (route handler) |
| 4 | Cloudflare dashboard 에 vars 직접 추가했는데 deploy 마다 사라짐 | `wrangler.jsonc` 의 `vars` 가 source-of-truth | 변수는 `wrangler.jsonc` 에 박기. secrets 는 `wrangler secret put` (deploy 영향 X) |
| 5 | Modal 함수에서 ai-worker `src/` import 실패 | `add_local_dir("./ai-worker/src", ...)` 의 path 가 *modal deploy 실행 디렉토리 기준* | 항상 `cd C:\dilab` 후 `modal deploy modal_app/analyze.py` |
| 6 | Modal deploy 시 unicode codec 에러 | PowerShell cp949 콘솔이 ✓ 같은 문자 표시 못함 | `chcp 65001; $env:PYTHONIOENCODING="utf-8"` 후 deploy |
| 7 | 분석 5분 timeout | Modal 함수 timeout=900s 이지만 BGE-M3 cold start + 처리 ~3분. 정상 범위. 단 운영자가 *모든 secret 등록 후 첫 호출* 이 가장 오래 | 두 번째부터 ~90초. 정상. |
| 8 | Deploy 직후 ~30초간 요청이 500 (`TypeError: handler is not a function` 또는 `ChunkLoadError`) — observability 에 떨어지고 자연 안정화 | OpenNext bundle 의 module-evaluation cold-start race. chunk graph 가 바뀐 직후 (예: layout.tsx 변경, 새 의존성 추가) 첫 isolate 들이 chunks 를 race 로 lazy-load → 실패. 코드 자체는 정상 (v2.0 리디자인 배포에서 전 페이지 ~30초 ChunkLoadError 후 자기안정화 확인) | `npm run deploy` 끝의 `npm run smoke` 가 **각 페이지를 200 될 때까지 최대 60초 polling** → cold-start 윈도우를 흡수하며 warm-up, 전부 200 이어야 종료(아니면 exit 1). `smoke FAILED` 면 실제 런타임 에러 의심 → observability 확인 |

---

## 8. Legacy 운영법 (Phase 1·2 이전) — 참고용

> ⚠️ 아래는 *2026-05-28 이전* 의 운영 절차. **현재 안 씀**.

```powershell
# (legacy) ai-worker 기동
cd C:\dilab\ai-worker
.\.venv\Scripts\Activate.ps1
uvicorn src.main:app --host 0.0.0.0 --port 8000

# (legacy) cloudflared Quick Tunnel
cloudflared tunnel --url http://localhost:8000
# → URL 받아 wrangler.jsonc 의 AI_WORKER_URL 갱신 → npm run deploy
```

폐기 이유:
- 노트북 24/7 부담
- Quick Tunnel URL 매번 변경
- 사용자 PC 가 꺼지면 분석·Ask 모두 다운

Phase 1 (Cloudflare AI 임베딩) + Phase 2 (Modal serverless 분석) 로 완전 대체.

---

## 9. 비용 (월, AS_OF 2026-05-28)

| 항목 | 데모 규모 | MAU 1,000 |
|---|---|---|
| Cloudflare Workers Free | $0 (일 100k req) | $0 |
| Cloudflare Workers AI Free | $0 (일 10k neurons) | $0 |
| Supabase Free | $0 (500MB) | $0~5 (egress) |
| Modal Starter | $0 (월 $30 크레딧) | $0 |
| DeepSeek API | ~$0.1 | ~$2 |
| **합계** | **~$0** | **~$2~7** |

---

## 10. 관련 문서

- [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) — Phase 1·2·3 설계서 + 검증 결과
- [AGENT_HANDOFF.md](AGENT_HANDOFF.md) — 전체 컨텍스트 + 부팅 절차
- [HOW_IT_WORKS.md](HOW_IT_WORKS.md) — 내부 동작 (외부 설명용)
- [`modal_app/README.md`](../modal_app/README.md) — Modal 가입·시크릿·배포
- [`prototype/AGENTS.md`](../prototype/AGENTS.md) — Next.js 16 + Cloudflare 환경 코딩 규칙
