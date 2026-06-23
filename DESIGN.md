# DILAB 디자인 규칙 (DESIGN.md)

> 이 파일은 Claude Code 가 자동으로 읽는 **디자인 규칙** 입니다. `CLAUDE.md` 가 *프로젝트 정체성·정책* 이라면, 이 파일은 *시각·UI 의 헌법*. 모든 디자인·리팩토링 작업은 이 규칙을 우선합니다.
>
> **AS_OF**: 2026-05-30
> **상태**: v2.0 (Research Editorial 리디자인 — SaaS 정식 서비스 기준선)
> **적용 범위**: `prototype/` (Next.js 16 + Tailwind 4 + Recharts)
>
> **v2.0 비주얼 방향**: *Research Editorial* — 애널리스트 리포트 감성. warm ivory surface + deep ink, 영문 serif 디스플레이 + 한글 Pretendard 본문, 절제된 데이터 컬러. "전문가급 신뢰성" 포지셔닝과 1:1. 레퍼런스(시각 모방 아님): Stripe·Mixpanel·Amplitude 류의 *editorial data* 톤. **싱클리 시각 모방 금지(§1.1)는 v1.0과 동일하게 유효.**

---

## 1. 디자인 헌법 (Hard Rules — 절대 위반 금지)

### 1.1 싱클리 시각 모방 금지 (CLAUDE.md 2.1 의 재명시)
- 싱클리(Syncly) 의 UX/UI 를 시각적으로 모방·복제 X.
- 화면 구성·컬러 토큰·인터랙션 패턴은 *글로만* 서술.
- 스크린샷 복제 X, 디자인 토큰 추출 X, "이 화면처럼 만들어줘" 식 지시 거부.
- 기능·정보 구조는 차용 가능 — `docs/design/syncly-info-architecture.md` 참조.

### 1.2 모바일 반응형 = 필수, 데스크탑 우선 금지
- **mobile-first**: 모든 CSS 는 모바일 기본값에서 시작, `sm:` `md:` `lg:` 으로 *확장*.
- 데스크탑 전용 (`max-md:hidden` 식으로 모바일에서 숨김) 컴포넌트는 *예외* 로만 허용 — 해당 정보가 모바일에서 다른 위치에 *반드시* 보여야 함.
- 가로 스크롤 (`overflow-x-auto`) 은 차트·테이블에 한정. 일반 콘텐츠가 모바일에서 가로 스크롤되면 버그.

### 1.3 일관성 > 새로움
- 기존 컬러·간격·라운드 토큰을 *이미 있는 것에서 골라* 사용. 새 hex 추가 시 §3 의 토큰 표에 등록 후 사용.
- 두 페이지에서 같은 정보 (예: 5축 점수) 는 *동일한 컴포넌트* 로 표현. 페이지마다 다르게 그리지 않는다.
- "이 페이지만 특별히" 식 일회성 스타일링은 *최후의 수단*.

### 1.4 정보 위계 우선
- **★1 출처 카드 가시화** (citations / evidence_chunk_ids) 는 *언제나 답변·점수 옆* 에 표시. 접혀있더라도 클릭 한 번에 펼쳐져야 함.
- 5축 점수, 사용자 여정, 토픽은 *DILAB 의 핵심 차별점* 이므로 페이지에서 시각적 비중을 충분히 가져야 한다 (작은 위젯으로 묻히면 안 됨).

---

## 2. 현재 스택 (기준선 — 변경 시 이 파일도 함께 갱신)

| 항목 | 값 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Server Components 우선) |
| 스타일링 | Tailwind CSS 4 (`@import "tailwindcss"`, PostCSS 통합) |
| 폰트 (본문) | **Pretendard** (jsdelivr CDN) — 한/영 본문·UI 전체. fallback Apple SD/Noto Sans KR |
| 폰트 (디스플레이) | **Instrument Serif** (영문·숫자 한정) — hero·페이지 타이틀의 영문/워드마크/수치. 한글 헤드라인은 Pretendard semibold 유지 (한글 serif 미사용 — 가독성·로딩 비용) |
| 차트 | Recharts 3.x (Radar / Bar 위주) |
| 컬러 모드 | **라이트 전용** — warm ivory 베이스 (`#FBFAF7`). 다크모드·`prefers-color-scheme: dark` 미사용 |
| 아이콘 | **lucide-react** (SVG, stroke 1.5~2). 이모지 아이콘 폐기 — `no-emoji-icons` 준수. 본문 내 의미 이모지(😊 감성)는 데이터 표현으로 허용 |

---

## 3. 디자인 토큰 (기준선 v1)

### 3.1 컬러 (v2.0 — warm editorial)

회색 계열을 **zinc → stone**(warm) 으로 통일. `globals.css` 의 `@theme` 에 의미 토큰을 정의하고, 의미 유틸(`bg-ivory` `text-ink` `border-line` `text-muted`)을 우선 사용. Tailwind 기본 stone/emerald/rose 병용 허용.

| 역할 | 의미 토큰 / Tailwind 클래스 | Hex |
|---|---|---|
| 페이지 배경 | `bg-ivory` *(=stone 계열 warm)* | `#FBFAF7` |
| 카드 / 컨테이너 | `bg-card` *(white)* | `#FFFFFF` |
| 본문 텍스트 | `text-ink` | `#1A1A1A` |
| 보조 텍스트 | `text-ink-soft` (강, stone-700) / `text-muted` (약, stone-500) | `#44403C` / `#78716C` |
| 보더 (가벼움) | `border-line` *(stone-200)* | `#E7E5E4` |
| **CTA (1차 액션)** | `bg-ink text-ivory` *(editorial 검정 버튼)* | `#1A1A1A` / `#FBFAF7` |
| **Brand (링크·강조)** | `text-brand` / `bg-brand-soft` *(indigo-700/50)* | `#4338CA` |
| Accent (하이라이트·한줄결론) | `text-accent` / `bg-accent-soft` *(amber-700/50, clay)* | `#B45309` |
| Positive (긍정 감성) | `bg-emerald-500` / `text-emerald-700` | `#10B981` |
| Neutral (중립 감성) | `bg-stone-400` / `text-stone-600` | `#A8A29E` |
| Negative (부정 감성) | `bg-rose-500` / `text-rose-700` | `#F43F5E` |

> 1차 CTA 는 **ink 검정 버튼** (editorial 표준), 링크·인터랙티브 강조는 **brand indigo**, 하이라이트는 **accent clay** 로 역할 분리. sentiment 3색(emerald/stone/rose)은 v1.0 의미 토큰 유지.
> 새 컬러 도입 시 *반드시* 이 표에 추가하고 사용 위치(역할)를 명시할 것. 임의 hex 인라인 금지.

### 3.2 타이포 (Tailwind 기본 scale 기반)

| 용도 | 클래스 | px |
|---|---|---|
| Display (hero 영문·수치) | `font-display` (=Instrument Serif) `text-5xl~7xl` | 48~72 |
| H1 (페이지 타이틀) | `text-3xl font-bold tracking-tight` *(모바일 `text-2xl`)*. 영문/수치 토큰은 `font-display` 가능 | 30/24 |
| H2 (섹션) | `text-xl font-semibold` | 20 |
| H3 (서브섹션) | `text-base font-semibold` | 16 |
| 본문 | `text-base` (=16) 또는 `text-sm` (=14, 보조) | 16/14 |
| 캡션·메타 | `text-xs text-muted` | 12 |
| 숫자 (점수·통계) | `font-variant-numeric: tabular-nums` (globals.css 적용). 큰 수치는 `font-display` serif 허용 | — |

> 행 높이는 `leading-relaxed` (1.625) 기본, 헤딩만 `leading-tight`.
> **`font-display`(serif) 는 영문·숫자 한정.** 한글 헤드라인은 Pretendard `font-semibold`/`font-bold` 유지 — 한·영 혼용 헤드라인은 영문 토큰만 `<span className="font-display">` 로 감싼다.

### 3.3 간격 (4/8 px grid, Tailwind 기본 scale)

| 용도 | 클래스 |
|---|---|
| 컴포넌트 내부 패딩 | `p-4` (16px) 모바일 / `p-6` (24px) `sm:` |
| 카드 간 gap | `gap-4` 모바일 / `gap-6` `sm:` |
| 섹션 간 spacing | `space-y-8` 모바일 / `space-y-12` `lg:` |
| 인라인 chip gap | `gap-2` (8px) |

### 3.4 라운드 + 그림자

| 용도 | 클래스 |
|---|---|
| 카드 | `rounded-xl` (12px) + `border border-zinc-200` |
| 버튼·input | `rounded-md` (6px) |
| 칩·태그 | `rounded-full` |
| 그림자 | `shadow-sm` 기본 — 호버 시 `shadow-md`. 강한 그림자(`shadow-xl`) 금지 (잡스러움) |

### 3.5 모션
- 트랜지션 기본: `transition-colors duration-150` 또는 `transition-all duration-200`.
- `prefers-reduced-motion: reduce` 시 모든 애니메이션 *0s* 로 강제 (globals.css 에 추가 필요).
- 화려한 진입 애니메이션 (fade-up, stagger) 금지 — *기능적* 트랜지션만.

---

## 4. 모바일 반응형 정책 (mobile-first 강제)

### 4.1 브레이크포인트 (Tailwind 기본 채택)

| 별칭 | min-width | 대상 디바이스 |
|---|---|---|
| (기본) | 0 | 모바일 (~640px) |
| `sm:` | 640px | 큰 모바일 / 작은 태블릿 세로 |
| `md:` | 768px | 태블릿 |
| `lg:` | 1024px | 노트북 / 태블릿 가로 |
| `xl:` | 1280px | 데스크탑 |

### 4.2 모바일 필수 체크리스트
- [ ] 가로 스크롤 없음 (차트·테이블 제외)
- [ ] 모든 터치 타겟 ≥ **44 × 44 px** (Apple HIG / WCAG 권장)
- [ ] 폰트 ≥ 14px (=`text-sm`), 본문은 16px 권장
- [ ] safe area (`env(safe-area-inset-*)`) 고려 — bottom CTA 가 노치·홈 인디케이터에 가리지 않게
- [ ] 모바일 키보드 노출 시 input 위로 스크롤 (Recharts ResponsiveContainer 의 높이 명시 필요)
- [ ] hover 의존 인터랙션 X — 모바일에선 tap 가능 대안 필수

### 4.3 차트 (Recharts) 모바일

- `ResponsiveContainer` 부모에 *명시적 height* 필수 (`h-72` 모바일 / `h-96 lg:h-[28rem]`). 자동 0px 그림 문제.
- 모바일에서 tick 라벨이 잘리면 `interval={0}` 보다 *데이터를 짧게 가공* 하는 게 우선.
- Tooltip 은 모바일에서 *tap-to-show* 동작 확인.
- Radar/Bar 의 색은 §3.1 의 sentiment / accent 팔레트 재사용.

---

## 5. 컴포넌트 정책

### 5.1 단일 책임
- 한 파일 = 한 컴포넌트 (현재 `components/*.tsx` 구조 유지).
- 한 컴포넌트 = 한 가지 정보의 *한 가지 표현*. 데이터 로딩 + 시각 표현 + 변형 분기 다 묶지 말 것.

### 5.2 prop API 일관성
- `domain_id`, `product_slug`, `chunk_ids` 같은 도메인 키는 **모든 컴포넌트에서 동일 prop 이름**.
- size 변형은 `size="sm" | "md" | "lg"` 패턴, color 변형은 §3.1 토큰 이름 그대로.

### 5.3 재사용 임계
- 같은 시각 패턴이 **3번 이상** 나오면 컴포넌트 추출. 2번까지는 OK.
- 추출 시 이름은 *역할 기반* (예: `EvidenceCard`, `MetricRadar`). 외관 기반 (`BlueBox`) 금지.

### 5.4 인라인 금지 목록
- `style={{ color: "#..." }}` — Tailwind 클래스로 옮길 것.
- `className={\`${x ? "bg-red-500" : "bg-green-500"}\`}` 같은 ad-hoc — 컴포넌트 내부 enum 또는 토큰 함수로.
- 매직 px (`mt-[37px]`) — 4/8 grid 에 안 맞으면 디자인 자체 재고.

### 5.5 Server Component 우선
- `"use client"` 는 *interactivity 가 필요한 컴포넌트만* (form, chart, dialog). 데이터 표시·정적 카드는 server.
- `lib/supabase.ts` 의 lazy Proxy 패턴 유지 (prototype/AGENTS.md 의 *건드리지 말 것* 1번).

---

## 6. 정보 위계 (DILAB 특화)

각 화면의 *가장 중요한 시각 요소* 를 잃지 않도록 정한다.

| 화면 | 1순위 (가장 큰 비중) | 2순위 | 3순위 |
|---|---|---|---|
| S0 `/` | 검색 / 분석 입력 form | 바로가기 칩 | 브랜드 |
| S1 `/products/[slug]` | 5축 레이더 + 종합 점수 | ★ 출처 카드 패널 | 토픽·여정 미니맵 |
| S2 `/ask` | 대화 본문 (답변 + `[n]` 인용) | 출처 카드 펼침 | 예시 질문 칩 |
| S3 `/topics` | 토픽 카드 그리드 | 키워드·대표 청크 | 메타 (n, %) |
| S4 `/journey/[slug]` | 4단계 퍼널 | 단계별 청크 인용 | 감성 분포 |
| S5 `/dashboard` | KPI 카드 줄 | 제품 비교 차트 | 도메인 통계 표 |
| S6 `/compare/[a]/[b]` | 겹친 레이더 | 차이 테이블 | 마케팅 인사이트 + 출처 |

> ★ = 차별점 (CitationCard). 어느 화면에서도 *없으면 안 됨*.

---

## 7. 접근성 (a11y) 최소 기준

| 항목 | 기준 |
|---|---|
| 키보드 네비 | 모든 interactive 요소 Tab 가능. focus ring 보임 (`focus-visible:ring-2 ring-indigo-500`). |
| 컬러 대비 | 본문 텍스트 WCAG **AA** (4.5:1) — zinc-700 on zinc-50 OK, zinc-400 on zinc-50 X |
| aria | 아이콘 only 버튼은 `aria-label` 필수. 차트는 `role="img"` + `aria-label` 요약 |
| 폼 | `<label>` 또는 `aria-labelledby`. placeholder 만으로 라벨 대체 X |
| 동작 | `prefers-reduced-motion` 존중. autoplay 캐러셀 X |
| 언어 | `<html lang="ko">` 유지 (현재 적용됨) |

---

## 8. 리팩토링 단계 (vibe coding → 실서비스 정제)

순서대로 진행. 각 단계는 *완료 후 npm run deploy* 로 모바일 실기기 확인.

1. **토큰 정리** — `globals.css` 의 `:root` 변수를 §3 의 표대로 확정. 사용 안 되는 토큰 제거.
2. **레이아웃 셸 통일** — `app/layout.tsx` 또는 `app/(marketing)/layout.tsx` 식으로 헤더·푸터·네비 공통화. 현재는 각 페이지가 자기 헤더를 그림 → 통일 필요.
3. **모바일 반응형 감사** — 각 페이지를 375 / 414 / 768 / 1024 / 1440 너비에서 확인. §4.2 체크리스트 통과.
4. **차트 (Recharts) 통일** — 모바일 height, 색 팔레트, tooltip 동작.
5. **컴포넌트 prop API 정리** — §5.2 일관성. 변형 prop 통일.
6. **a11y 패스** — 키보드 / 컬러 대비 / aria-label.
7. **마이크로카피 통일** — "5축", "출처 카드" 같은 핵심 용어를 일관되게 (한 화면은 "★1 출처", 다른 화면은 "근거" 식 X).

> 각 단계마다 별도 commit. *모든 단계 한 번에 묶지 말 것* — 리뷰 가능성·롤백 안전성.

---

## 9. 사용할 Skill (설치 완료)

`.claude/skills/` 에 3개 설치됨. 작업 의도에 따라 Skill tool 로 명시적 호출 또는 자동 트리거.

| Skill | 언제 사용 | 강점 |
|---|---|---|
| **`responsive-mobile-first`** | §4 정책 검토, 모바일 깨짐 수정 | min-width breakpoint 강제, desktop-first CSS 금지 검수 |
| **`designing-nextjs-ui`** | 시각적 다듬기 — gradient, glass morphism, hover, spacing | Next.js + Tailwind 컨텍스트의 시각 표현 패턴 |
| **`ui-ux-pro-max`** | 큰 그림 디자인 결정 (스타일·팔레트·폰트 페어링·접근성) | 종합 UI/UX 인텔리전스, refactor·improve·optimize 액션. *Gen High Risk 평가 있음 — SKILL.md 검토 후 사용 권장* |

> ⚠️ Skill 출력은 *권고* 일 뿐. 본 DESIGN.md 의 §1 Hard Rules 와 충돌하면 **DESIGN.md 가 우선**.

---

## 10. 검수 체크리스트 (PR / 배포 직전)

- [ ] §1 Hard Rules 위반 0건 (특히 싱클리 시각·다크모드 자동 적용·모바일 깨짐)
- [ ] §3 토큰 외 임의 hex/매직 px 0건
- [ ] §4.2 모바일 체크리스트 통과 (실기기 1대 이상에서 확인)
- [ ] §6 정보 위계 — ★ 출처 카드가 적용 페이지에서 누락되지 않음
- [ ] §7 a11y — 키보드 Tab 으로 모든 CTA 도달 가능
- [ ] Recharts 컴포넌트의 `ResponsiveContainer` 부모에 명시 height
- [ ] `prefers-reduced-motion` 시 애니메이션 비활성

---

## 11. 건드리지 말 것 (cross-ref)

디자인 작업 중에도 *매핑·빌드 핵심 4개* 는 건드리지 않는다 — 자세한 목록은 [`prototype/AGENTS.md`](prototype/AGENTS.md) 의 "⚠️ 디자인·UI 리팩토링 시 절대 건드리지 말 것" 섹션. 요약:

1. `prototype/wrangler.jsonc` 의 `vars` 블록
2. `prototype/lib/supabase.ts` 의 lazy Proxy
3. server-only 환경 변수 참조 (`NEXT_PUBLIC_` 재도입 금지)
4. `.env.local` 의 키 이름

---

## 12. 변경 이력

| 일자 | 변경 |
|---|---|
| 2026-05-28 | v1.0 — 초안 (vibe coding → 실서비스 정제 단계의 기준선). 토큰·반응형·정보 위계·skill 트리거 정의. |
| 2026-05-30 | v2.0 — **Research Editorial 리디자인**. SaaS 정식 서비스 전환: ① warm ivory 베이스 + deep ink 토큰(§3.1), ② Instrument Serif 영문 디스플레이 폰트(§2·§3.2), ③ lucide-react SVG 아이콘(§2), ④ 회색 zinc→stone, CTA=ink 검정 버튼/링크=brand indigo/하이라이트=accent clay 역할 분리. 신규 마케팅 랜딩(`app/page.tsx`) 추가. **데이터 계약·백엔드 매핑 무손상(§11)·싱클리 모방 금지(§1.1) 유지.** |
