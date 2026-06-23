# DILAB 프로젝트 — Claude Code 컨텍스트

> 이 파일은 Claude Code가 자동으로 읽는 프로젝트 지침입니다. 팀 전체에 공통 적용됩니다.

## 1. 프로젝트 정체성

- **이름**: DILAB (딜랩) — 가칭 MVP 서비스
- **소속**: 임상순 교수님 연구실
- **목표**: 협력사 대표의 정부 R&D 과제 수주 지원 → 향후 산학협력 발전
- **벤치마킹 대상**: 싱클리(Syncly) — `https://www.syncly.kr`
- **기본 파이프라인** (교수님 제시안):
  웹 크롤링 → SNS 상품 리뷰 검색 → 딥러닝 리뷰 분석(감성·다측면) → LLM 기반 제품 평가 리포트
- **DILAB의 차별화**: 전문가 리뷰 DB → 벡터 DB → RAG로 LLM과 결합 → "전문가급 신뢰성 있는 평가"

## 2. 절대 지켜야 할 정책

### 2.1 디자인 안전선 (Hard Rule)
- **싱클리의 UX/UI를 시각적으로 모방·복제하지 않는다.**
- 기능은 벤치마킹하되 화면 구성·컬러 토큰·인터랙션 패턴은 *글로만* 서술한다.
- 이유: MVP가 타사에 활용될 가능성이 있어 시각적 유사성은 법적·윤리적 리스크.
- 적용: 스크린샷 복제 금지, 디자인 토큰 추출 금지, "이 화면처럼 만들어줘"식 지시 거부.

### 2.2 출처 검증
- 모든 시간민감 주장에는 `AS_OF: YYYY-MM-DD` 명시.
- 공식 1차 출처를 우선 사용하고, 3자 출처로 교차 검증.
- 비공식·추정값은 `[unverified]` 또는 `[추정]` 태그.

### 2.3 언어
- 기본 응답·문서 작성은 **한국어**. 단, 제품명·기술 고유명사·코드 식별자는 영문 유지.

## 3. 디렉토리 구조

```
C:\dilab\
├── CLAUDE.md                       ← 이 파일 (Claude Code 자동 로드)
├── DESIGN.md                       ← 디자인 헌법 (Claude Code 자동 로드) — 디자인·UI 작업의 우선 규칙
├── README.md                       ← 팀원 온보딩
├── PLAN.MD                         ← 교수님과의 대화 원문 (수정 금지)
├── .mcp.json                       ← MCP 4종 (supabase + cloudflare-bindings/builds/observability)
├── .claude/skills/                 ← 디자인 리팩토링용 skill 3종 (designing-nextjs-ui, responsive-mobile-first, ui-ux-pro-max)
├── docs/
│   ├── OPERATIONS.md               ← Cloudflare 배포·일상 운영 (PC 재기동 시 매일 루틴)
│   ├── AGENT_HANDOFF.md            ← 다른 agent·환경에서 작업 이어받기
│   ├── HOW_IT_WORKS.md             ← 내부 동작 + 외부 설명 (30초·3분·10분 버전)
│   ├── CLAUDE_CODE_SETUP.md        ← Claude Code + skill 설치 (Win/Mac/Linux)
│   ├── AGENT_WORKFLOW.md           ← skill·agent 사용 워크플로
│   ├── prd/, research/, db/, design/  ← PRD / ADR / ERD / 와이어프레임
├── prototype/                      ← Next.js 16 — Cloudflare Workers 에 배포
│   ├── wrangler.jsonc              ← production vars 의 source-of-truth
│   └── open-next.config.ts         ← OpenNext 어댑터 설정
├── ai-worker/                      ← Python FastAPI — 사용자 PC 에서 실행
├── benchmark/                      ← 1단계 산출물 (완료)
└── .claude/
    └── settings.local.json         ← 개인별 권한 (gitignore, 공유 X)
```

## 4. 작업 단계 (현재 위치)

| 단계 | 상태 | 산출물 |
|---|---|---|
| 1. 싱클리 벤치마킹 리서치 | **완료** (2026-05-26) | `benchmark/syncly-benchmark.md` |
| 2. DILAB MVP PRD 작성 | **v0.2 완료** | `docs/prd/dilab-mvp-prd.md` |
| 3. 기능 우선순위(P0/P1/P2) 확정 | PRD 섹션 5 에 매핑 완료 | PRD 섹션 5 |
| 4. 기술 스택 ADR (M1) | **완료** | `docs/research/tech-stack-decision.md` |
| 5. MVP 풀스택 구현 (M2~M4) | **완료** (2026-05-27) — S1~S6 + 자동 분석 파이프라인 | `prototype/`, `ai-worker/` |
| 6. Cloudflare 배포 운영 (M5) | **완료** (2026-05-28) — Workers + OpenNext + cloudflared Quick Tunnel | [`docs/OPERATIONS.md`](docs/OPERATIONS.md) |
| 7. Cloudflare AI + Modal 하이브리드 (M6) | **완료** (2026-05-28) — BGE-M3 Workers AI + Modal 분석 큐. ai-worker 운영 폐기. 노트북 0시간, 월 $0. | [`docs/DEPLOYMENT_PLAN.md`](docs/DEPLOYMENT_PLAN.md), `modal_app/` |
| 8. 데이터 확장 + 두 번째 도메인 | 다음 | (예정) |

### 운영 정보 (AS_OF 2026-05-28, M6 완료)
- **데모 URL**: `https://dilab.sean111400.workers.dev` (24/7, **사용자 노트북 무관**)
- **모든 기능 작동**: Ask·조회·분석·비교. ai-worker / cloudflared 운영 폐기.
- **재기동·배포 절차**: [`docs/OPERATIONS.md`](docs/OPERATIONS.md), [`docs/DEPLOYMENT_PLAN.md`](docs/DEPLOYMENT_PLAN.md). 새 세션 시작 시 반드시 먼저 읽기.

## 5. Claude Code 협업 컨벤션

- **새 작업 시작 전**: `PLAN.MD`와 `benchmark/syncly-benchmark.md`를 먼저 읽어 컨텍스트 동기화.
- **디자인·UI 작업 시**: `DESIGN.md` 가 *우선 규칙*. §1 Hard Rules (싱클리 시각 모방 금지·모바일 반응형 필수·일관성) 위반 금지.
- **리서치·벤치마킹**: `deep-research`, `benchmarking` skill 사용 → 출력은 `benchmark/` 또는 `docs/research/`.
- **PRD·로드맵·SWOT**: `product-management-workflows` skill 사용 → 출력은 `docs/prd/`.
- **디자인 리팩토링**: `.claude/skills/` 의 3종 (`designing-nextjs-ui`, `responsive-mobile-first`, `ui-ux-pro-max`) 활용. 단 skill 권고와 DESIGN.md 가 충돌하면 **DESIGN.md 가 우선**.
- **벤치마킹 보고서**의 갭 분석(섹션 9) 3분류(MVP 포함 / 다음 단계 / 의도적 제외)를 PRD의 기능 우선순위와 1:1 매핑할 것.
- **코드 작성 시**: 주석은 *왜*만 작성. 무엇을 하는지는 식별자가 설명해야 함.

## 6. 새 팀원이 처음 할 일

1. `README.md`를 읽어 프로젝트 정체성 파악.
2. `docs/CLAUDE_CODE_SETUP.md`로 Claude Code + skill 설치.
3. `docs/AGENT_WORKFLOW.md`로 사용 가능한 skill과 호출 시점 학습.
4. `benchmark/syncly-benchmark.md`로 1단계 결과물 검토.
5. 본인 작업 시작 → 새 turn 시작 시 이 파일이 자동 로드됨.

## 7. 외부 참조

- 싱클리 공식: `https://www.syncly.kr`
- 싱클리 가격: `https://www.syncly.kr/pricing` (Pro 75만원~/월, Enterprise 견적)
- 싱클리 데모: `https://www.syncly.kr/demo-calendar` (영업 컨택 → 약 1주 체험)
