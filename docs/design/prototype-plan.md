# DILAB 디자인 프로토타입 계획서 v0.1

- **작성일 / AS_OF**: 2026-05-26
- **목적**: PRD 의 6 큰 기능(B1~B6) 이 *말로만* 보면 감이 안 잡힘. 백엔드 없이 **mock data 로 화면을 먼저 뽑아** 톤·인터랙션·정보 구조를 빠르게 검증.
- **백엔드 의존도**: **0** — 모든 데이터는 정적 JSON / TypeScript 하드코딩. API 콜·DB·LLM 호출 일체 없음.
- **목표 산출물**: Next.js 앱 (`prototype/` 하위) — 로컬에서 `npm run dev` 로 띄워 시연 가능한 5개 화면.

---

## 1. 만들 화면 — 5개 (우선순위 순)

| 화면 | 매핑 기능 | 핵심 인터랙티브 요소 |
|---|---|---|
| **S1 — 단일 제품 평가 리포트** | B6 + ★1 출처 카드 | ★ **육각형(레이더) 그래프** 5축 평가 / 감성 막대 그래프 / 출처 카드 / 여정 미니맵 |
| **S2 — DILAB Ask (질의 응답)** | B5 | 자연어 입력 → 타이핑 애니메이션 답변 → **출처 카드** 클릭 → 원문 인용 사이드패널 |
| **S3 — BERTopic 토픽 클러스터** | B2 | 인터랙티브 **2D 클러스터 맵** (D3 force-directed 또는 UMAP scatter) — 점 hover → 토픽 키워드·대표 인용 표시 |
| **S4 — 사용자 여정 지도** | B4 | 인지→구매→사용→재구매 4단계 **수평 플로우** + 각 단계 카드(주요 토픽·감성·인용) |
| **S5 — 도메인 대시보드** | B6 | 도메인 선택 드롭다운 + KPI 카드 + 토픽 분포 도넛 + 감성 시계열 막대 |

**우선순위**: S1 → S2 → S3 → S4 → S5. **S1·S2 만 완성해도** 핵심 가치 제안(*신뢰성 가시화*) 시연 가능.

---

## 2. 인터랙티브 시각화 요소 (사용자 요청 반영)

| 차트 종류 | 사용 위치 | 라이브러리 |
|---|---|---|
| **육각형(레이더) 그래프** | S1 — 5축 평가 (예: 효능·성분·가격·사용감·안전성) | **D3.js** (커스텀) 또는 Recharts RadarChart |
| **막대 그래프** | S1, S5 — 감성 분포·카테고리 분포 | Recharts BarChart |
| **2D 클러스터 맵** | S3 — BERTopic 토픽 시각화 | **D3 force-directed** 또는 Plotly scatter |
| **도넛 차트** | S5 — 토픽 점유율 | Recharts PieChart |
| **시계열 막대** | S5 — 감성 흐름 | Recharts BarChart |
| **수평 플로우 다이어그램** | S4 — 여정 지도 | 커스텀 React + Tailwind (라이브러리 없이 가능) |
| **출처 카드 (★)** | S1, S2 — "전문가 N건 / 일반 M건" | 커스텀 shadcn/ui Card |
| (선택) **three.js 3D 클러스터** | S3 — BERTopic 3D 버전 | three.js + react-three-fiber |

> **three.js 권장 여부**: MVP 프로토타입에서는 **선택사항**. D3 2D 클러스터로 *충분히 인상적*. three.js 3D는 *진짜 시연용 화제성* 이 필요한 경우만(예: 교수님/협력사 대표 초기 시연). 화면 한 곳에 옵션으로 두는 정도가 적절.

---

## 3. 기술 스택

| 레이어 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js 15 (App Router) + TypeScript** | 가장 성숙한 React 메타프레임워크. 정적 배포 가능. |
| 스타일 | **Tailwind CSS** | 빠른 프로토타이핑. 디자인 토큰 관리 쉬움. |
| 컴포넌트 | **shadcn/ui** | 라이브러리가 아닌 *복붙* 방식이라 커스터마이즈 자유도 ↑. 디자인 안전선(싱클리 톤 회피)에 유리 |
| 차트 (표준) | **Recharts** | React 친화, 빠른 막대/도넛/시계열 |
| 차트 (커스텀) | **D3.js** | 육각형·클러스터 맵·여정 다이어그램 |
| 3D (선택) | **three.js + react-three-fiber** | S3 3D 클러스터 옵션 |
| 폰트 | **본문: Pretendard / 강조: Spectral or Lora (serif)** | 한국어 + serif 혼용 = 리서치 노트 무드 |
| 색 시스템 | **모노톤 + accent 1색** (다크 인디고 또는 딥 그린) | 싱클리(보라/핑크 톤) 과 의도적 차별화 |

---

## 4. 디자인 톤 (v2 — UX 친숙도 우선)

**컨셉 한 줄**: *"전문가 친구가 옆에서 차근차근 설명해주는 평가 리포트"* — 신뢰의 근거(출처 카드·통계)는 그대로, 말투·라벨·여백은 친근하게.

> v1 컨셉 *"논문 같은 SaaS"* 는 일반 사용자에게 너무 차갑게 느껴짐 → v2 로 톤 조정. 학술 무드는 *구조* 차원에서만 유지하고, *말투* 차원은 친근하게.

| 요소 | 방향 |
|---|---|
| 컬러 | 흰 배경 + 진회색 본문 + 인디고 1색 + **따뜻한 액센트 1색** (코랄 또는 머스타드 옐로우 — Level 2 에서 결정). 싱클리(보라/핑크 그라데이션)와 의도적 차별화 |
| 타이포 | serif(헤더) + sans(본문) — 단, 헤더 serif 는 *친근한 한국어 serif* (Spectral / Lora / IBM Plex Serif KR) 로 학술적이지 않게 |
| 카드 | 1px 보더 + 미세 그림자, 라운드 0.75rem (살짝 더 부드럽게) — v1 의 0.5rem 보다 호흡감 ↑ |
| 출처 카드 (★1) | 항상 본문 옆 고정. 라벨은 "📚 어디서 가져온 정보?" 같은 자연어 — 위치·역할·정책은 유지, 표기만 친숙 |
| 데이터 시각화 | 색은 2~3색 + 부정은 회색 (빨강 X — 비판이 아닌 *안내* 톤). 라벨에 이모지 1개 허용 (정보 위계 보조용) |
| 마이크로카피 | "~해요", "~할 수 있어요", "잠깐, 이런 분은?", "그래서 당신에게?" 같은 *직접 어필* 톤 |
| 이모지 | 기능 라벨에 1개씩 허용 (👩‍🔬 전문가, 👥 사용자, 💡 추천, ⚠️ 주의, 🗺️ 여정 등). 본문 안에는 절제 |
| 인터랙션 | hover 상태 미세, transition 200ms — 큰 모션 회피 (이건 v1 그대로) |

CLAUDE.md 2.1 디자인 안전선 100% 준수 — 스크린샷 복제 X, 토큰 추출 X. *친숙해진 말투* 가 *싱클리 모방* 을 의미하지 않음 (싱클리도 친숙하지만 톤·색·말투가 다름).

---

## 5. Mock Data 구조

### 5.1 디렉토리

```
mock_data/cosmetics/
├── products.json              # 가상 제품 5~10개
├── expert-reviews/
│   ├── exp-cosmetics-001.md   # 이미 1건 작성됨
│   └── ... (총 10건)
├── public-reviews.json        # 가상 공개 리뷰 200~500건 (BERTopic 동작 가능 규모)
├── topics.json                # BERTopic 결과 mock (토픽 8~12개)
├── sentiment.json             # 감성 분석 결과 mock
├── journey.json               # 여정 4단계별 매핑 결과 mock
└── ask-responses.json         # S2 데모용 미리 작성한 Q&A 3~5건
```

### 5.2 스키마 예시 (간략)

```typescript
// products.json
type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  radar: { axis: string; score: number }[];  // 5축 평가 (육각형 그래프용)
  sentiment: { positive: number; negative: number; neutral: number };
  journey: { stage: 'aware' | 'buy' | 'use' | 'rebuy'; topics: string[]; insights: string[] }[];
  citations: { expert: string[]; public: string[] };  // 출처 카드용
};

// topics.json
type Topic = {
  id: number;
  label: string;
  keywords: string[];
  doc_count: number;
  coords: { x: number; y: number };  // 2D 클러스터 맵용
  representative_quote: string;
};
```

---

## 6. 일정 (4주, 2026-06)

| 주차 | 범위 | 산출물 |
|---|---|---|
| W1 (06-01~07) | Next.js + shadcn + Tailwind 세팅 + 디자인 토큰(색·폰트·간격) + Mock data 1차 생성 | `prototype/` 부팅 |
| W2 (06-08~14) | **S1 단일 제품 평가 리포트** + 육각형·막대·출처 카드 | S1 완성 |
| W3 (06-15~21) | **S2 DILAB Ask** + 인용 사이드패널, **S3 토픽 클러스터** | S2·S3 완성 |
| W4 (06-22~28) | **S4 여정 지도** + **S5 대시보드** + 디자인 안전선 체크리스트 통과 | 5화면 모두 완성, 데모 가능 |

종료 후: **2026-07 부터 M2(데이터 파이프라인 동작)** 로 전환 — 프로토타입과 결과 화면이 같은 모양이 되도록 진짜 데이터로 교체.

---

## 7. 추천 스킬 (skillsmp MCP 검색 결과)

DILAB 프로토타입에 가장 적합한 스킬 5개를 골랐습니다.

### 7.1 P0 — 반드시 설치 (3개)

| 스킬 | 출처 | 이유 |
|---|---|---|
| **frontend-prototype** | [PaulHellweg/dark-factory-studio](https://github.com/PaulHellweg/dark-factory-studio/tree/main/.claude/skills/frontend-prototype) | 정확히 "**Next.js + Tailwind + mock data 로 UI 프로토타입 빌드**" — 본 계획서 목적과 1:1 일치 |
| **shadcn-ui** | [MadAppGang/claude-code](https://github.com/MadAppGang/claude-code/tree/main/plugins/dev/skills/frontend/shadcn-ui) (280★) | shadcn CLI·테마·다크모드·React Hook Form + Zod. 컴포넌트 라이브러리 표준 |
| **data-visualizer** | [oakoss/agent-skills](https://github.com/oakoss/agent-skills/tree/main/skills/data-visualizer) (12★) | Recharts·Chart.js·D3 차트 가이드. 차트 종류 선택·데이터 스토리텔링·접근성·반응형 |

### 7.2 P1 — 추천 (2개)

| 스킬 | 출처 | 이유 |
|---|---|---|
| **d3-visualization** | [lyndonkl/claude](https://github.com/lyndonkl/claude/tree/main/skills/d3-visualization) (103★) | 육각형 그래프(레이더)·force-directed 클러스터·커스텀 SVG. Recharts 가 못 해주는 것 채움 |
| **ui-mockup** | [mvschwarz/openrig](https://github.com/mvschwarz/openrig/tree/main/packages/daemon/specs/agents/shared/skills/pm/ui-mockup) (35★) | ASCII wireframe → HTML mockup → live prototype 3단계 fidelity. 화면 설계 단계에서 빠르게 톤 확인 |

### 7.3 의도적 제외

- **frontend-design**, **frontend** — shadcn-ui 와 중복
- **wireframe**, **ux-wireframing** — ui-mockup 과 중복
- **storefront-next** — 이커머스 전용, 우리 컨텍스트 아님
- **muapi-ui-design** — muapi.ai 외부 서비스 의존

---

## 8. 변경 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v0.1 | 2026-05-26 | 초안. PRD 의 B1~B6 + ★1·★2 를 5개 화면(S1~S5)으로 매핑. Mock data 구조·기술 스택·디자인 톤·스킬 추천 정리. |

---

*문서 끝 — 다음 단계: P0 스킬 3개 설치 → W1 부팅 작업.*
