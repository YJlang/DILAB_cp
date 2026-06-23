# DILAB 배포 재설계 계획서 (v2)

> 노트북 24/7 가동 부담 + 월 고정비 서버 임대 거부 조건 하에서, **24/7 가용성 + 월 비용 $0~5 + 운영 부담 최소** 를 동시에 만족하는 하이브리드 아키텍처로 재설계.
>
> **AS_OF**: 2026-05-28
> **이전 배포 (v1)**: PC + cloudflared Quick Tunnel ([OPERATIONS.md](OPERATIONS.md))
> **상태**: 계획 v1.0 (구현 시작 전)

---

## 1. 목표 + 제약 + 결정

### 목표
- 데모 사이트 `https://dilab.sean111400.workers.dev` **24/7 작동**
- Ask·조회·비교·대시보드 등 *모든 화면* 항상 동작
- `/analyze` (자동 분석 폼) 도 *시연 가능* — 교수님이 사이트에서 직접 제품명 입력하면 1~2분 후 결과 자동 생성

### 제약
- **비용**: 월 $0~5 이내 (월 고정 임대비 X)
- **운영**: 일상적으로 노트북 켜놓을 필요 없음
- **운영 부담**: 시스템 관리 시간 *주 30분 이내*
- **타사 노출**: Supabase + DeepSeek + Cloudflare 외 *큰 신규 종속성* 추가는 신중히 (Modal 1곳만 추가)

### 결정 (옵션 A + B 하이브리드)

| 컴포넌트 | 어디서? | 이유 |
|---|---|---|
| Next.js SSR + API routes | Cloudflare Workers | 이미 배포됨, 24/7 |
| Postgres + pgvector + RLS | Supabase | 이미 운영 중, Free tier |
| **BGE-M3 임베딩 (Ask·조회 경로)** | **Cloudflare Workers AI** `@cf/baai/bge-m3` | $0 (일 10k neurons 무료), cold start 0초, 한국어 100+ 언어 그대로 |
| **`/analyze` 무거운 파이프라인** (네이버 수집 + BERTopic + DeepSeek 라벨링 45회) | **Modal serverless (CPU)** | $30/월 무료 크레딧, 사용 시간만 과금, ~$0.5/월 예상 |
| LLM 합성 (DeepSeek) | DeepSeek API | 변경 없음 |
| 사용자 노트북 + cloudflared | 폐기 | 더 이상 필요 없음 |

---

## 2. 최종 아키텍처

```
[브라우저]
   ↓ HTTPS
[Cloudflare Workers]  ── Next.js 16 (OpenNext) ── 항상 살아있음
   │
   ├─ /ask, /products/[slug], /dashboard, /compare ...
   │     ↓ Cloudflare Workers AI binding
   │     ↓ env.AI.run("@cf/baai/bge-m3", { text })   ← 무료, 0초 cold start
   │     ↓ Supabase RPC: match_chunks(embedding, ...)
   │     ↓ DeepSeek API (외부)
   │     → 답변 + 출처 카드
   │
   ├─ /api/analyze   (POST)
   │     ↓ Modal 함수 트리거 (fire-and-forget)
   │     ↓ Supabase analysis_jobs 테이블에 작업 등록
   │     → { job_id }
   │
   └─ /api/analyze/status/[job_id]   (GET, polling 5s)
         ↓ Supabase analysis_jobs SELECT
         → { status: "pending" | "running" | "done" | "error", progress, slug }

[Modal serverless 함수]  ── BGE-M3 + BERTopic + DeepSeek + 네이버
   │  CPU 1코어 + 8GB RAM, 작업당 60~120초, 사용 시간만 과금
   │
   ↓ 끝나면
[Supabase]  ── products / documents / chunks / ratings / ...
   - analysis_jobs.status = "done"
   - 사이트가 polling 으로 즉시 화면에 반영

[사용자 노트북]
   - 없음. 가끔 코드 수정·deploy 할 때만 켬.
```

---

## 3. 비용 시뮬레이션 (AS_OF 2026-05-28)

### Cloudflare Workers AI (Ask·조회 경로)
| 일일 호출 | 토큰 추정 | Neurons / 일 | 무료 한도 (10,000/일) 사용률 |
|---|---|---|---|
| Ask 100건 × 30 tokens | 3,000 | ~0.003 | 0.00003% |
| 조회 페이지 임베딩 0 (캐싱) | 0 | 0 | 0% |
| **합계** | 3,000 | **~0.003 neurons** | **무료의 0.00003%** |

→ **사실상 영원히 $0**. MAU 10,000+ 까지 무료 한도 안.

### Modal (분석 큐)
| 항목 | 값 |
|---|---|
| CPU 1코어 단가 | $0.047 / hr |
| 메모리 1 GiB 단가 | $0.008 / hr |
| 우리 함수 사양 | 1 CPU + 8 GiB = $0.047 + $0.064 = **$0.111 / hr** |
| 분석 1회 처리 시간 | 60~120초 (평균 90초) |
| 분석 1회 비용 | $0.111 / hr × 90s / 3600s = **$0.0028** |
| 일 5건 분석 시 | $0.014 / 일 = **$0.42 / 월** |
| 일 50건 분석 시 | $0.14 / 일 = **$4.2 / 월** |
| Modal Starter 크레딧 | **$30 / 월 자동 차감 후 0** |

→ **데모 + 본격 운영 모두 $0**. 크레딧 한도(=$30) 까지 *월 ~1,000건 분석* 가능. Production 워크로드 3× multiplier 가 붙어도 $1~12/월 = 여전히 크레딧 안.

### 합산 비용 (월)
| 항목 | 데모 | 본격 운영 (MAU 1,000) |
|---|---|---|
| Cloudflare Workers (Free) | $0 | $0 |
| Cloudflare Workers AI | $0 | $0 |
| Supabase (Free) | $0 | $0~5 (egress 초과 시) |
| Modal (Starter 크레딧 안) | $0 | $0 |
| DeepSeek API | ~$0.1 | ~$2 |
| **합계** | **~$0** | **~$2~7** |

---

## 4. 마이그레이션 단계

각 phase 는 **독립적으로 commit + 배포**. 이전 phase 가 안정될 때까지 다음 phase 미진행.

### Phase 1 — Cloudflare 임베딩 도입 (Ask·조회 경로) ✅ **완료** (2026-05-28)

**목표**: ai-worker 의 `/ask` 호출을 끊고, Cloudflare Workers 안에서 직접 BGE-M3 임베딩 + Supabase RPC + DeepSeek 호출.

**검증 결과 (2026-05-28 02:50 UTC)**:
- BGE-M3 차원: **1024d** (Cloudflare AI 응답 `length=1024`) — pgvector 마이그레이션 불필요
- `/api/ask`: HTTP 200, latency 3.16~3.62s (DeepSeek 시간만)
- ai-worker + cloudflared 모두 종료한 상태에서도 정상 작동 → Cloudflare 독립 작동 확정
- 모든 SSR 페이지 (`/`, `/products/[slug]`, `/dashboard`, `/ask` 등) 200
- 산출물: `lib/cf-env.ts`, `lib/embeddings.ts`, `lib/rag.ts`, `app/api/ask/route.ts` 재작성, `wrangler.jsonc` 의 `ai` binding + `DEEPSEEK_BASE_URL`/`LLM_MODEL` vars + `DEEPSEEK_API_KEY` secret

#### 1.1 wrangler.jsonc 에 AI binding 추가
```jsonc
"ai": { "binding": "AI" }
```

#### 1.2 차원 검증 (1줄 코드)
`/api/_debug/embed` route 임시 추가 → `env.AI.run("@cf/baai/bge-m3", { text: "테스트" })` → 응답의 `data[0].length` 확인. **1024 이면 통과**, 다르면 §7 의 차원 변경 SQL 적용.

#### 1.3 `/api/ask` route handler 재구현
- 기존: `fetch(AI_WORKER_URL + "/ask", { body: { query, domain_id } })`
- 신규: 
  1. `env.AI.run("@cf/baai/bge-m3", { text: query })` → query_embedding
  2. Supabase RPC `match_chunks(query_embedding, domain_id, ...)` → top-K 청크
  3. DeepSeek API (`fetch`) → 합성된 답변 + 출처 청크 ID
- 응답 형식 기존과 동일 유지 → UI 변경 0.

#### 1.4 검증
- `https://dilab.sean111400.workers.dev/ask?product=anua-heartleaf-77` 에서 5개 질문 실행
- 응답 품질·출처 카드 정상 비교
- ai-worker 끄고도 Ask 가 동작하는지 확인 → **Phase 1 성공 기준**

#### 1.5 산출물
- `prototype/wrangler.jsonc` — AI binding 추가
- `prototype/app/api/ask/route.ts` — Cloudflare AI + Supabase + DeepSeek 통합
- `prototype/lib/embeddings.ts` (신규) — `embedQuery(text): Promise<number[]>`
- `docs/AGENT_HANDOFF.md` — 임베딩 layer 변경 기록

### Phase 2 — Modal 분석 큐 구축 ✅ **완료** (2026-05-28)

**목표**: 사이트의 `/analyze` 폼이 Modal 함수를 fire-and-forget 으로 트리거 → 백그라운드 처리 → 클라이언트 polling 으로 진행률 표시.

**검증 결과 (2026-05-28 04:59 UTC)**:
- `/api/analyze` POST → `job_id` 반환 (HTTP 200)
- `/api/analyze/status/[job_id]` polling → `pending → running → done` 전이 정상, 진행률 메시지 표시
- 신제품 "라네즈 워터뱅크 블루 히알루로닉 크림" 실제 분석 → **114초 done**, 45 documents 수집·임베딩·라벨링
- 새 제품 페이지 `/products/laneige-cream-dac313` 즉시 200 (3.3초)
- Modal `/compare` endpoint — cold start ~16~17s, 작동 OK (warm 유지는 비용 감수 후 옵션)
- `/compare`, `/products/...` 등 Server Component 에서 `cfEnv()` (sync `getCloudflareContext`) 호출 시 worker bundle 전체가 깨지는 함정 발견 → `process.env` 사용으로 fix (`fix(rsc)` commit)
- `npm run deploy` 가 매번 `.next` + `.open-next` 강제 정리하도록 영구 fix
- 산출물: `modal_app/analyze.py` (trigger + compare + analyze_product_task 3 함수), `analysis_jobs` 테이블, `/api/analyze` 재작성, `/api/analyze/status/[job_id]` 신규, AnalyzeForm polling UI, Modal Secret 12 keys (`dilab-env`)

#### 2.1 Modal 가입 + 토큰
사용자 액션: `https://modal.com` 가입 → `pip install modal` → `modal token new` (브라우저 OAuth).

#### 2.2 Supabase 작업 큐 테이블
```sql
create table analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  product_query text not null,
  domain_id text not null,
  status text not null default 'pending',  -- pending|running|done|error
  progress jsonb default '{}',              -- {step, of_steps, message}
  result_slug text,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- RLS: 익명 INSERT 허용 (rate limit 으로 보호), 자기 작업만 SELECT
```

#### 2.3 Modal 함수
```python
# modal_app.py
import modal
app = modal.App("dilab-analyze")
image = modal.Image.debian_slim().pip_install(
    "sentence-transformers", "bertopic", "supabase",
    "openai", "httpx", "umap-learn", "hdbscan"
).add_local_python_source("ai_worker_src")
volume = modal.Volume.from_name("dilab-models", create_if_missing=True)

@app.function(
    image=image,
    cpu=1, memory=8192,
    volumes={"/cache": volume},
    timeout=600,
    secrets=[modal.Secret.from_name("dilab-env")],
)
def analyze_product(job_id: str, product_query: str, domain_id: str):
    # ai_worker_src.analyze_product 의 로직을 그대로 호출
    # 시작 시 jobs.status = "running"
    # 단계별로 jobs.progress 업데이트
    # 완료 시 jobs.status = "done", result_slug 저장
    ...
```

BGE-M3 가중치는 첫 호출에서 다운로드 후 `/cache` volume 에 저장 → 이후 cold start 시 즉시 mount.

#### 2.4 Next.js `/api/analyze` + `/api/analyze/status/[job_id]`
- POST `/api/analyze` → analysis_jobs INSERT (status=pending) → Modal `analyze_product.spawn(...)` → 즉시 `{ job_id }` 반환
- GET `/api/analyze/status/[job_id]` → analysis_jobs SELECT → JSON 응답

#### 2.5 UI 변경 — AnalyzeForm
- submit → POST → job_id 받음
- 5초 polling 시작 → progress.step 표시 ("네이버 수집 중..." 등)
- status=done 시 `router.push("/products/" + result_slug)`
- status=error 시 toast 알림

#### 2.6 검증
- 신제품(예: "라네즈 워터뱅크 크림") 입력 → 1~2분 후 자동 redirect → 정상 화면
- Supabase 의 ratings·chunks·topics 채워짐 확인
- Modal dashboard 에서 비용 확인 (~$0.003/회)

#### 2.7 산출물
- `modal_app/__init__.py`, `modal_app/analyze.py` (신규)
- `docs/db/migrations/dilab_analysis_jobs.sql` (신규)
- `prototype/app/api/analyze/route.ts` (재구현)
- `prototype/app/api/analyze/status/[job_id]/route.ts` (신규)
- `prototype/components/AnalyzeForm.tsx` (polling UI)

### Phase 3 — ai-worker + cloudflared 폐기 ✅ **완료** (2026-05-28)

**목표**: 더 이상 사용하지 않는 ai-worker 와 cloudflared 운영 폐기.

**결과**:
- `ai-worker/` 폴더는 *Modal 함수의 source* 로 유지 (`add_local_dir`). README 상단에 *legacy* 표기 추가.
- `.run/ai-worker.log` / `.run/cloudflared.log` 는 git untrack (`.gitignore` 패턴 그대로).
- `OPERATIONS.md` 완전 재작성 — 새 운영 그림(Modal + Cloudflare 24/7) + 알려진 함정 7종 + legacy 섹션 archive.
- `AGENT_HANDOFF.md`, `prototype/AGENTS.md`, `README.md`, `CLAUDE.md` 도 새 운영 모델 반영.

#### 3.1 백업
- `ai-worker/` 디렉토리를 *삭제하지 않고* `legacy-ai-worker/` 로 이름 변경.
- `docs/OPERATIONS.md` 에 *legacy 운영법* 으로 archive.

#### 3.2 의존성 정리
- `prototype/wrangler.jsonc` 의 `vars.AI_WORKER_URL` 제거
- `prototype/.env.local.example` 의 `AI_WORKER_URL` 제거
- `prototype/app/api/*` 에서 `process.env.AI_WORKER_URL` 참조 제거

#### 3.3 사용자 노트북에서 cloudflared 종료, 자동 시작 disable
- Windows 서비스 등록 안 했으면 그냥 PowerShell 창 닫기로 끝

#### 3.4 산출물
- `legacy-ai-worker/` (이름 변경)
- `docs/OPERATIONS.md` 갱신 — 새 일상 운영법으로 재작성

---

## 5. 검증 절차

각 phase 종료 직후 실행. 모두 PASS 해야 다음 phase 진행.

| # | 점검 | 기대값 |
|---|---|---|
| V1 | `https://dilab.sean111400.workers.dev/` 200 | OK |
| V2 | `/api/ask` (POST) 정상 응답 | 4~7초 내 200, 출처 carded |
| V3 | (Phase 1 이후) ai-worker 끄고 V2 재시도 | 동일 결과 |
| V4 | (Phase 2 이후) `/api/analyze` 신제품 입력 | 60~120초 후 redirect |
| V5 | Modal dashboard 의 함수 호출 로그 | 1회당 ~90초, 비용 ~$0.003 |
| V6 | Cloudflare Workers AI 사용량 dashboard | 일 10k neurons 의 1% 미만 |
| V7 | Supabase analysis_jobs RLS | 익명 INSERT OK, SELECT 자기 작업만 |

---

## 6. 롤백 플랜

각 phase 는 *git revert 1회 + 배포 1회* 로 되돌릴 수 있어야 한다.

| Phase | 롤백 방법 |
|---|---|
| Phase 1 | `/api/ask` route 의 신규 코드 revert → 기존 `fetch(AI_WORKER_URL+"/ask", ...)` 복귀. ai-worker + cloudflared 다시 띄움 ([OPERATIONS.md](OPERATIONS.md) 1절 그대로). |
| Phase 2 | `/api/analyze` route revert + AnalyzeForm 의 polling UI 제거. 임시로 *분석 폼 숨김* (UI에서 "분석은 추후 추가" 안내). |
| Phase 3 | `legacy-ai-worker/` 를 `ai-worker/` 로 되돌리고 환경 변수 복원. |

---

## 7. 알려진 함정 + 미해결

### 잠재 함정
- **차원 (1024d) 가 다르면**: `chunks.embedding` 의 vector(1024) → vector(N) 변경 SQL + 모든 기존 chunks 재임베딩 필요. *기존 87 chunks 재임베딩 비용 ~$0* (Cloudflare 무료 한도 안).
- **Modal cold start**: 분석 첫 호출 시 가중치 다운로드 ~2분. 두 번째부터 ~10초. UI 의 progress.step 메시지로 "모델 준비 중" 표시.
- **DeepSeek API rate limit**: Modal 함수 안에서 동시 호출 시 429 가능. `retry-after` 헤더 존중 + asyncio.Semaphore(5) 로 동시성 제어.
- **Modal Secret 관리**: SUPABASE_SERVICE_ROLE_KEY 와 DEEPSEEK_API_KEY 는 `modal secret create dilab-env` 로 등록. git 에 절대 X.
- **Production multiplier 3×**: Modal Starter 가 production 으로 분류되는지 확인 필요 ([Modal Pricing](https://modal.com/pricing) 의 정의 재확인). 분류돼도 비용 ~$1~5/월.

### 미해결 (Phase 2 진행 시 결정)
- BERTopic 의 토픽 재학습 주기 — 매 분석마다? 도메인당 주 1회? 비용 영향.
- 진행률 UI 의 *얼마나 상세하게* 표시할지 — 6단계 ticker vs 단일 progress bar.
- 분석 실패 시 재시도 정책 — 자동 1회 + 사용자에게 재시도 버튼.

---

## 8. 작업 시간 예측

| Phase | 코드 작업 | 검증·디버그 | 합계 |
|---|---|---|---|
| Phase 1 (Cloudflare 임베딩) | 4~6시간 | 2시간 | **1~2일** |
| Phase 2 (Modal 분석 큐) | 8~12시간 | 4시간 | **3~5일** |
| Phase 3 (폐기·정리) | 2시간 | 1시간 | **1일** |

전체 **5~8일** (한 명 part-time 기준).

---

## 9. 진행 결정 체크포인트

다음 액션 시작 전 사용자 동의 받기:

1. **Modal 가입** — 사용자가 modal.com 가입 + `modal token new` 실행 → 토큰을 Claude Code 와 공유 X (Modal CLI 가 알아서 사용)
2. **Cloudflare API Token 발급** — Workers AI binding 만 쓰면 *불필요* (wrangler.jsonc 에 binding 만 추가하면 자동). 단 외부 REST 호출 시도 시만 발급.
3. **Phase 1 시작 승인** — 위의 1.1~1.5 실제 코드 작업 시작 OK?

---

## 10. 관련 문서

- [OPERATIONS.md](OPERATIONS.md) — *이전* (v1) 운영 가이드. Phase 3 후 *legacy* 로 archive.
- [AGENT_HANDOFF.md](AGENT_HANDOFF.md) — 전체 컨텍스트. 본 계획 진행 시 §3 부팅·§4 env·§7 마일스톤 갱신 필요.
- [DESIGN.md](../DESIGN.md) — UI 변화 (AnalyzeForm polling) 는 §5 컴포넌트 정책 준수.

---

## 11. 변경 이력

| 일자 | 변경 |
|---|---|
| 2026-05-28 | v1.0 — 초안. Cloudflare 임베딩 + Modal 분석 큐 + ai-worker 폐기 그림 확정. |
| 2026-05-28 | v1.1 — Phase 1 완료. BGE-M3 차원 1024d 확정 (마이그레이션 불필요), /api/ask 가 ai-worker 없이 Cloudflare 만으로 작동 검증됨. Phase 2 (Modal) 진행 중. |
| 2026-05-28 | v1.2 — Phase 2·3 완료. Modal 분석 큐 + compare endpoint, AnalyzeForm polling, analysis_jobs 테이블. 신제품 실분석 114초 done. ai-worker / cloudflared 운영 폐기. 노트북 0시간 + 월 $0 데모 사이트 완성. 발견 함정: Server Component 의 sync `getCloudflareContext()` 호출이 worker bundle 깨뜨림 → process.env 사용으로 우회. |
