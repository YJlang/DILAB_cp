# DILAB 기술 스택 결정 (ADR) v0.1

- **작성일 / AS_OF**: 2026-05-26
- **상태**: Draft (M1 ADR — OQ2·OQ3·OQ5 일부 해소)
- **결정자**: 윤준하 (사용자가 백엔드 = Supabase, AI = Python 으로 사전 결정)
- **관련 문서**: [PRD](../prd/dilab-mvp-prd.md) · [ERD](../db/schema.md) · [디자인 계획서](../design/prototype-plan.md)

---

## 0. 결정 요약 (한 표)

| 레이어 | 선택 | 핵심 이유 |
|---|---|---|
| **DB + Auth + Storage** | **Supabase (Postgres)** | 사용자 결정. 학생 친화 가격, 한 곳에서 다 됨 |
| **벡터 DB** | **pgvector (Supabase 내장)** | 별도 Pinecone/Qdrant 불필요. SQL 메타데이터 필터링 → 도메인-플렉시블 친화 |
| **AI 워커** | **Python (FastAPI + Celery)** | 사용자 결정. BERTopic·Sentence-Transformers 가 Python 생태 |
| **임베딩 모델** | **BGE-M3 (1024 dim, 다국어)** | 한국어 + 영어 동시 지원, 무료, Sentence-Transformers 호환 |
| **토픽 모델링** | **BERTopic + BGE-M3 + UMAP + HDBSCAN** | 표준 조합 |
| **LLM** | **DeepSeek (OpenAI 호환 API)** — `deepseek-chat` 기본, V4 Pro 등 dashboard 표기 모델 ID 그대로 사용 | 사용자 결정. Claude 대비 ~10배 저렴, 한국어 품질 OK |
| **분류·감성** | **LLM zero-shot (Claude Haiku)** | 별도 KoBERT 학습 부담 없음. 코드 단순 |
| **여정 단계 매핑** | **LLM zero-shot + domain.yaml 키워드 보조** | LLM 비용 통제 + 정확도 ≥80% 목표 |
| **프론트엔드** | **Next.js 15 + TypeScript + Tailwind + shadcn/ui** | 디자인 계획서 결정 사항 |
| **시각화** | **Recharts (표준) + D3 (커스텀)** | 5각형 레이더·클러스터 맵 |
| **호스팅** | **Vercel (FE) + Supabase Cloud (BE) + Modal/Railway (Python 워커)** | 학생 친화 무료 티어 가용 |
| **CI/CD** | **GitHub Actions** | 표준 |
| **모니터링** | **Supabase Logs + Sentry (옵션)** | MVP 단계 |

---

## 1. 시스템 구조 (한 장)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            👤  사용자 (브라우저)                              │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 ↓ HTTPS
┌─────────────────────────────────────────────────────────────────────────────┐
│        Next.js 15 (Vercel) — App Router, TypeScript, Tailwind, shadcn/ui    │
│        • 5각형 레이더 (D3) · 막대·도넛 (Recharts) · 출처 카드 (shadcn)        │
│        • Supabase JS SDK · SSR auth helpers                                  │
└────────────────────────┬────────────────────┬───────────────────────────────┘
                         ↓ supabase-js        ↓ fetch /ai/*
┌────────────────────────────────────────┐   ┌──────────────────────────────┐
│       Supabase (BaaS · 단일 진실)        │   │   Python AI 워커 (Modal·     │
│  • Postgres + pgvector                  │   │   Railway 호스팅)             │
│  • Auth (이메일·OAuth)                  │   │  • FastAPI (동기 엔드포인트) │
│  • Storage (PDF·이미지)                 │   │  • Celery (배치 잡)          │
│  • Realtime (분석 진행 상태)            │   │  • BERTopic / BGE-M3 /       │
│  • Edge Functions (가벼운 워크플로)     │   │    Sentence-Transformers     │
│  • RLS 정책 (도메인·사용자 분리)        │   │  • Claude API 호출 (langchain│
│                                         │   │    없이 직접 호출 — 단순함)  │
└─────────────────────────────────────────┘   └───────┬──────────────────────┘
                         ↑ pgvector 쓰기              ↓ Anthropic / OpenAI API
                         └─────────────────────────── ─┘
```

**역할 분리 원칙**:
- **Supabase** = *상태 (state)*. 사용자·도메인·문서·임베딩·결과 모두 저장.
- **Python 워커** = *연산 (compute)*. ML 추론, 토픽 분석, LLM 호출. **상태 보유 X** — 결과는 Supabase 로 다시 쓰기.
- **Next.js** = *UI*. 사용자 입력 받고 Supabase 직접 읽기 + AI 워커는 *비동기 잡 트리거* 만.

---

## 2. 결정 사항별 trade-off

### 2.1 벡터 DB — Qdrant vs Pinecone vs pgvector

| 후보 | 장점 | 단점 | 결정 |
|---|---|---|---|
| **pgvector (Supabase 내장)** | 별도 인프라 X / SQL 메타데이터 필터링 / RLS 도 도메인 분리에 활용 | 1M+ 벡터 가면 성능 ↓ (HNSW 인덱스 튜닝 필요) | **✅ 채택** |
| Qdrant (자체 호스팅) | 빠름, 무료 | 별도 서버 운영 부담 | ✗ |
| Pinecone | 매니지드, 빠름 | 무료 티어 작음, 별도 결제 | ✗ |

→ MVP 단계에서 **벡터 수 ≤ 100만** 예상. pgvector HNSW 인덱스로 충분. 도메인-플렉시블(★2)도 메타데이터 필터로 자연스럽게 됨.

### 2.2 LLM — DeepSeek vs Claude vs GPT

| 후보 | 장점 | 단점 | 결정 |
|---|---|---|---|
| **DeepSeek (OpenAI 호환)** | 매우 저렴 (Claude Haiku 대비 ~10배), 한국어 품질 양호, OpenAI SDK 그대로 사용 가능 | 중국 제공자 (data residency 검토 필요), 한국어 *최강* 은 아님 | **✅ 채택 (사용자 결정)** |
| Claude Haiku 4.5 | 환경 친화, Anthropic 안정성 | DeepSeek 대비 비용 ↑ | ✗ |
| GPT-4o-mini | OpenAI 생태계 | 비용 중간 | ✗ |
| 한국어 특화 (Solar, HyperCLOVA) | 한국어 최강 | API 안정성·비용·접근성 | M3 이후 비교 검토 |

→ DeepSeek 으로 시작. `openai` SDK 의 `base_url=https://api.deepseek.com` 으로 OpenAI 코드 그대로 재활용.
→ 정밀도 부족하면 Claude Haiku / GPT-4o-mini 로 escalate 가능 (코드 변경 최소).

### 2.3 임베딩 — BGE-M3 vs OpenAI vs E5

| 후보 | 장점 | 단점 | 결정 |
|---|---|---|---|
| **BGE-M3** | 다국어 (한·영), 무료, 1024 dim, dense + sparse + multi-vec | 자체 서빙 필요 | **✅ 채택** |
| OpenAI text-embedding-3-small | API 호출 간단 | 비용 누적, 1536 dim | ✗ |
| E5-large | 강함 | 한국어 도메인 평가 미흡 | ✗ |

→ Python 워커에서 Sentence-Transformers 로 로컬 추론. 무료 + 한국어 강함.

### 2.4 LangChain/LlamaIndex 사용 여부

| 옵션 | 결정 |
|---|---|
| **사용 X (직접 호출)** | **✅ 채택** — RAG 파이프라인이 단순 (chunks → embed → 검색 → LLM). 학습 곡선·의존성·버전 호환 부담 회피 |
| LangChain | 과한 추상화. 디버깅 어려움 |
| LlamaIndex | 마찬가지 |

→ Python 직접 코드 < 200줄로 RAG 가능. 의존성 = `supabase`, `sentence-transformers`, `openai` (DeepSeek base_url), `bertopic` 4개.

### 2.5 AI 워커 호스팅 — Modal vs Railway vs Cloud Run

| 후보 | 장점 | 단점 |
|---|---|---|
| **Modal** | Python 친화, GPU 옵션, 무료 크레딧 $30/월 | 익숙해질 시간 |
| **Railway** | 일반 컨테이너, 간단 | GPU X (BGE-M3 CPU 가능) |
| Cloud Run (GCP) | 표준 | 설정 부담 |

→ **Modal 우선 시도, 안 맞으면 Railway**. 둘 다 무료 티어로 MVP 가능.

---

## 3. 단계별 도입 순서 (M1~M4 매핑)

| 마일스톤 | 도입 항목 | 검증 기준 |
|---|---|---|
| M1 (이번 ADR) | Supabase 프로젝트 생성, Next.js 부팅, pgvector 활성화 | `select * from extensions where name='vector';` 통과 |
| M2 (B1) | Python 워커 부팅, 데이터 파이프라인, 임베딩 작성 → pgvector 저장 | sample 100건 임베딩이 검색됨 |
| M3 (B2·B3·B4) | BERTopic 토픽 분석, LLM zero-shot 분류·감성·여정 매핑 | 토픽 10개 분리, 라벨 부여 가능 |
| M4 (B5) | RAG Q&A 엔드포인트 + 출처 카드 반환 | 질문 1개 → 답변 + citations 배열 ≥ 5 |
| M5 (B6) | Next.js 화면 → Supabase 직접 읽기 + AI 워커 비동기 트리거 | 도메인 선택 → 리포트 ≤ 5초 |
| M6 (★2 검증) | 두 번째 도메인 (예: F&B) 추가 | domain.yaml + 코퍼스 교체로 ≤ 1주 |

---

## 4. 비용 추정 (월, AS_OF 2026-05-26)

| 항목 | MVP 단계 | 비고 |
|---|---|---|
| Supabase | $0 (Free Tier) | DB 500MB / 사용자 50,000 / 무제한 RLS |
| Vercel | $0 (Hobby) | 1 프로젝트 / 100GB 트래픽 |
| Modal | $0~$10 (무료 크레딧 $30) | GPU 안 쓰면 무료 |
| DeepSeek API | **$2~$8** | `deepseek-chat` 기준, MVP 사용량 추정. Claude Haiku 대비 ~10배 저렴 |
| Sentence-Transformers (BGE-M3) | $0 | 자체 실행 |
| 총합 | **$2~$18 / 월** | 베타 사용자 30명 가정 |

→ 학생 부담 거의 없음 수준. 정밀도 위해 Claude Haiku 또는 GPT-4o-mini 로 swap 시 +$20~$50.

---

## 5. 미해결 (PRD OQ 와 연동)

| PRD OQ | ADR 에서의 처리 |
|---|---|
| OQ2 벡터 DB | ✅ pgvector 채택 |
| OQ3 LLM·임베딩 | ✅ Claude Haiku + BGE-M3 (1차) |
| OQ4 Enhans 후속 조사 | ADR 무관, 별도 진행 |
| OQ5 BERTopic 평가 기준 | M3 시작 시 결정 (사람 라벨링 + topic coherence) |
| OQ7 데이터 소스 합법성 | AI Hub + 앱스토어 — PRD B1 명시됨 |

---

## 6. 변경 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v0.1 | 2026-05-26 | 초안. 사용자 사전 결정(Supabase, Python) 반영. pgvector·Claude·BGE-M3 1차 선택. |
| v0.2 | 2026-05-26 | **LLM 을 DeepSeek 으로 변경** (사용자 결정). 의존성 `anthropic` → `openai` (DeepSeek base_url). 비용 추정 $20-60 → $2-18/월. ai-worker .env 실제 키 채움. |

---

*문서 끝 — 다음 단계: ERD 확정 후 Supabase 프로젝트 부팅 + Python 워커 스캐폴드.*
