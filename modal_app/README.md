# DILAB Modal 함수 — Phase 2 분석 큐

> Cloudflare Workers 30초 timeout 한계로 처리 못 하는 `/analyze` (60~120초)
> 를 Modal serverless CPU 함수로 분리. 사용 시간만 과금 (Starter 플랜 월
> $30 크레딧 안에서 데모·MAU 1,000 모두 $0).

## 처음 한 번만 (가입 + 인증 + 시크릿)

```powershell
# 1. 가입 — https://modal.com/signup (GitHub OAuth 추천)

# 2. CLI + 토큰
pip install modal
modal token new   # 브라우저 OAuth — 한 번 인증하면 ~/.modal.toml 에 저장

# 3. Secret 등록 (대시보드 또는 CLI). 한 번만.
#    Modal Dashboard → Secrets → Create Secret → Name: dilab-env
#    Key/Value 9개 + MODAL_PROXY_TOKEN 1개 (랜덤 32자, 본인이 생성):
#      SUPABASE_URL             https://mxofuzhfdthqpzhzctwd.supabase.co
#      SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard → Settings → API)
#      DEEPSEEK_API_KEY         (ai-worker/.env 에 있는 값)
#      DEEPSEEK_BASE_URL        https://api.deepseek.com
#      LLM_MODEL                deepseek-chat
#      NAVER_CLIENT_ID          (ai-worker/.env)
#      NAVER_CLIENT_SECRET      (ai-worker/.env)
#      EMBEDDING_MODEL_NAME     BAAI/bge-m3
#      EMBEDDING_DIMENSION      1024
#      MODAL_PROXY_TOKEN        (PowerShell 로: -join ((1..32) | ForEach-Object { [char](Get-Random -InputObject (48..57 + 65..90 + 97..122)) }))

# 4. 배포 (repo root 에서)
cd C:\dilab
modal deploy modal_app/analyze.py
# → 출력에서 trigger endpoint URL 받기:
#   https://<username>--dilab-analyze-trigger.modal.run
```

## 배포 후 Cloudflare 쪽 설정

위 단계 4 의 URL 과 MODAL_PROXY_TOKEN 을 Cloudflare 에:

```powershell
cd C:\dilab\prototype
# wrangler.jsonc 의 vars.MODAL_TRIGGER_URL 추가 (Claude 가 처리)
# MODAL_PROXY_TOKEN 은 secret 으로:
npx wrangler secret put MODAL_PROXY_TOKEN
# (등록 후 npm run deploy 재배포)
```

## 비용

| 항목 | 단가 | 1회 분석 (~90초) | 일 5건 / 일 50건 |
|---|---|---|---|
| CPU 1 코어 | $0.047/hr | $0.0012 | $0.006 / $0.06 |
| 메모리 8 GiB | $0.008/GiB/hr | $0.0016 | $0.008 / $0.08 |
| 합계 | — | **~$0.003** | $0.014/일 / $0.14/일 |
| 월 환산 | — | — | **$0.42 / $4.2** |

Starter 무료 크레딧 $30/월 안에서 데모는 영원히 $0. 본격 운영도 부담 없음.

## 흐름

```
[브라우저] AnalyzeForm submit
   ↓
[Cloudflare Worker] /api/analyze
   ├─ analysis_jobs INSERT (status=pending) → job_id 받음
   ├─ fetch MODAL_TRIGGER_URL { _token, job_id, product_query, domain_slug }
   ↓   (fire-and-forget, 즉시 응답)
[Modal trigger 함수]  cpu=0.25, ~10ms
   ↓ spawn
[Modal analyze_product_task]  cpu=1, 8GB, 60~120초
   ├─ analysis_jobs.status='running', progress.step=1
   ├─ ai-worker/src/ingestion/auto_ingest.analyze_product()
   │   ├─ 네이버 검색
   │   ├─ BGE-M3 임베딩 (Modal volume 캐시)
   │   ├─ BERTopic
   │   ├─ DeepSeek 라벨링
   │   └─ 5축 ratings
   └─ analysis_jobs.status='done', result_slug=..., progress.step=3
   ↑
[브라우저 polling] /api/analyze/status/[job_id]  (5초마다)
   └─ status='done' 시 router.push("/products/" + result_slug)
```
