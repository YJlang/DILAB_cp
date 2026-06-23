# Agent / Skill 워크플로 가이드 (DILAB)

> DILAB 작업 단계별로 **어떤 skill을 언제 호출할지**, **어떤 subagent에게 무엇을 시킬지** 정리한 운영 문서. 팀 전체가 동일한 방식으로 Claude Code를 활용해 산출물 품질·형식의 일관성을 유지하는 것이 목표.

---

## 1. 사용 중인 Skill 4종

| Skill | 트리거 시점 | 산출물 위치 |
|---|---|---|
| `deep-research` | 외부 회사·시장·기술 조사가 필요할 때 | `benchmark/` 또는 `docs/research/` |
| `benchmarking` | 경쟁사 비교, Gap Analysis, Competitive Profile Matrix | `benchmark/` |
| `product-management-workflows` | PRD, 로드맵, SWOT, 스테이크홀더 업데이트 | `docs/prd/` |
| `verify` / `run` (내장) | 코드 변경 후 동작 확인 | — |

설치 방법은 [`CLAUDE_CODE_SETUP.md`](CLAUDE_CODE_SETUP.md) 3절 참고.

---

## 2. DILAB 단계별 워크플로

### 2.1 1단계 — 벤치마킹 리서치 (완료)
```
사용 skill: deep-research + benchmarking + product-management-workflows
입력: PLAN.MD (교수님 대화), 싱클리 공식 URL
출력: benchmark/syncly-benchmark.md, sources.md, research-notes/
품질 게이트: ≥12소스, ≥5도메인, 공식 ≥30%, AS_OF 명시, counter-review ≥3
```

호출 예시 프롬프트:
> "PLAN.MD 읽고 싱클리를 deep-research skill로 벤치마킹해줘. AI/ML·데이터채널·가격을 DEEP로, 보고서는 한국어, 디자인 모방 금지 정책 준수."

### 2.2 2단계 — DILAB MVP PRD 작성 (다음)
```
사용 skill: product-management-workflows (PRD 워크플로)
입력: benchmark/syncly-benchmark.md 의 갭 분석(섹션 9)
출력: docs/prd/dilab-mvp-prd.md
핵심: 갭 분석의 3분류(MVP 포함/다음/제외)를 P0/P1/P2 우선순위에 1:1 매핑
```

호출 예시 프롬프트:
> "벤치마킹 보고서 섹션 9를 기반으로 product-management-workflows skill의 PRD 워크플로를 실행해 DILAB MVP PRD를 작성해줘."

### 2.3 3단계 — 기술 스택 결정 (향후)
```
사용 skill: deep-research (RAG·벡터DB 옵션 조사)
입력: PRD 의 비기능 요구사항
출력: docs/research/tech-stack-decision.md (ADR 형식 권장)
```

### 2.4 4단계 — 구현 (향후)
```
사용 skill: 내장 (Edit, Write, Bash, verify, code-review)
원칙: 주석은 "왜"만, 식별자가 "무엇"을 설명
출력: src/, tests/
```

---

## 3. Subagent 활용 가이드

Claude Code의 Agent 도구는 메인 컨텍스트를 보호하면서 병렬 작업이 가능합니다.

| Subagent 타입 | 도구 | 언제 쓰나 |
|---|---|---|
| `Explore` | 읽기 전용 (Write 없음) | 코드/문서 탐색, 위치 찾기, "어디에 정의돼 있나" |
| `general-purpose` | 전체 도구 | 파일 생성·수정이 필요한 다단계 작업 |
| `Plan` | 읽기 전용 | 구현 전략 설계 |

### 시행착오 기록 (1단계에서 학습)
- **Explore 에이전트는 Write 도구가 없습니다.** 파일을 *직접 저장*해야 하는 task는 `general-purpose`를 쓰세요.
- 병렬 dispatch는 한 메시지에서 여러 Agent tool을 동시에 호출하면 됩니다. 의존성 없는 task에 강력합니다.
- subagent 출력은 메인 모델에게만 보입니다 — 사용자에게 보여주려면 메인 응답에서 요약해야 합니다.

---

## 4. 출처·인용 규칙

`deep-research` skill의 인용 레지스트리 형식을 모든 외부 조사에 적용합니다.

| 컬럼 | 의미 |
|---|---|
| `ID` | 보고서 내 `[숫자]` 참조 키 |
| `Source-Type` | `official` / `secondary-industry` / `journalism` / `academic` |
| `Accessibility` | `public` / `paywalled` / `cached` |
| `Date` | 페이지 게시·수정일 또는 접근일 |
| `Authority` | 1~10 (1차 출처일수록 높음) |

품질 게이트 기준값:
- 승인 소스 ≥ 12개
- 고유 도메인 ≥ 5개
- 공식 비중 ≥ 30%
- 모든 시간민감 주장에 `AS_OF: YYYY-MM-DD`

---

## 5. 디자인 안전선 (재확인)

벤치마킹·PRD·디자인 단계 모두에서 **싱클리 UX/UI 시각적 모방을 금지**합니다.

- 허용: 정보 구조·인터랙션 패턴·기능 흐름을 *글로* 서술
- 금지: 스크린샷 복제, 컬러 토큰 추출, "이 화면처럼 만들어줘" 식 지시
- 위반 발견 시 즉시 해당 부분을 서술형으로 재작성

---

## 6. 공통 협업 체크리스트

작업을 마치기 전 다음을 확인:
- [ ] 산출물이 합의된 디렉토리에 저장됐는가
- [ ] 한국어로 작성됐는가 (코드·고유명사는 영문)
- [ ] 외부 사실 주장에 출처 인용이 붙어 있는가
- [ ] `AS_OF` 가 명시됐는가
- [ ] 싱클리 UI 시각 모방이 없는가
- [ ] `.claude/settings.local.json` 같은 개인 파일을 커밋하지 않았는가
- [ ] `CLAUDE.md` 의 단계 진행 표를 업데이트했는가 (단계가 진행됐다면)

---

## 7. 도움이 필요할 때

- 프로젝트 컨텍스트 재확인: `CLAUDE.md`
- 환경 문제: `docs/CLAUDE_CODE_SETUP.md` 6절 FAQ
- 1단계 결과물 검토: `benchmark/syncly-benchmark.md`
- Claude Code 일반 도움말: `claude` 실행 후 `/help`
