# GPT Image 2.0 프롬프트 — DILAB 아키텍처 구조도 (Oracle 26ai 버전)

> 제주학회 구조도(Supabase+Modal+Cloudflare, `그림 1`)를 **Oracle 26ai in-DB 아키텍처**로
> 재생성하기 위한 이미지 생성 프롬프트. (AS_OF 2026-07-07)
>
> 참조본 스타일(플랫 블루 인포그래픽·2패널)은 유지, 내용만 최종 아키텍처로 교체.

## 사용법
- GPT Image 2.0(또는 유사 이미지 모델)에 아래 프롬프트를 그대로 입력.
- 한글 라벨이 깨지면: 생성 후 Figma/Keynote 로 라벨만 덧입히기 권장.
- 반복 개선 지시 예: "make the Oracle red cylinder larger and central",
  "simplify right panel", "fix Korean text spelling".

## 프롬프트

```
A clean, professional technical architecture diagram for an academic conference paper,
overall style: modern flat vector illustration, soft isometric icons, thin rounded-corner
white panels, generous whitespace, refined blue palette (primary #2F6FED with light-blue
fills) and ONE Oracle brick-red accent (#C74634) reserved only for the central database.
Crisp legible sans-serif typography, bold panel titles. 16:9 landscape, high resolution,
uncluttered, balanced composition, no photorealism, no heavy shadows.

TOP-LEFT: a rounded pill badge, blue gradient fill, white bold text:
"DILAB Core System & AI Pipeline".

Two large rounded white panels side by side.

── LEFT PANEL — bold heading "[Oracle 26ai In-Database RAG Architecture]" ──
A left-to-right flow of flat icons joined by labeled arrows:
• "Web Browser (User)" — browser window icon with a globe.
• solid blue arrow labeled "API Request" →
• "Next.js App (Local Server)" — clean app/server icon.
• thick bidirectional blue arrows labeled "query" and "results" ↔
• CENTER and LARGEST node: a RED 3D database cylinder labeled
  "Oracle AI Database 26ai", with a small caption below:
  "Converged DB · In-DB Embedding · Vector Search", and two small chips beside it:
  "VECTOR_EMBEDDING (ONNX)" and "VECTOR_DISTANCE (cosine)". Add a subtle soft glow
  around this red cylinder to signal that embedding AND vector search happen INSIDE it.
• BELOW the flow: "Local Ingest Worker (Naver crawl + LLM labeling)" — a gear/pipeline
  icon — with a small "Naver API" cloud icon feeding into it, and a dashed blue arrow
  "Ingest" pointing UP into the Oracle cylinder.
• To the RIGHT of Oracle: a dotted arrow labeled "LLM Generation" going out to a small
  external cloud icon labeled "DeepSeek (LLM)".
• Bottom-left legend: solid arrow = "API Calls"; dashed arrow = "Vector Search / RAG (in-DB)";
  dotted arrow = "LLM Generation"; a filled soft-red region = "In-Database Processing".

── RIGHT PANEL — bold heading "[5-Axis Review Analysis Workflow]" ──
A vertical sequence of three numbered phases (blue circles 1, 2, 3), each with a mini
illustration, connected by a thin dotted vertical line:
• Phase I "Data Ingestion": a Naver "N" app icon + download-cloud → a small dashboard
  card with a tiny line chart and a green/grey/red sentiment donut, label "Total Reviews".
• Phase II "In-Database Embedding & Vector Search": short text snippets transforming into
  a small vector-point cluster INSIDE a database cylinder, with a highlighted nearest-neighbor
  search, caption "VECTOR_EMBEDDING → VECTOR_DISTANCE".
• Phase III "5-Axis Evaluation": a blue pentagon RADAR chart with five axes labeled
  "Efficacy(효능), Ingredients(성분), Price(가격), Texture(사용감), Safety(안전성)",
  next to a stacked sentiment-journey bar chart across stages
  "Awareness(인지), Consideration(검토), Use(사용), Repurchase(재구매)".
Bottom horizontal mini-flow with tiny icons and arrows:
  "Raw Reviews → In-DB Embedding (Oracle) → LLM Analysis (DeepSeek) → 5-Axis Insights".

BOTTOM CENTER: small grey caption text
"그림 1. DILAB 시스템 구조 및 분석 파이프라인 (Oracle AI Database 26ai)".

Requirements: all text crisp and correctly spelled, evenly spaced; icons flat and simple;
academic-clean infographic quality like a top-tier product architecture figure.
```

## 참조본 대비 변경점
| 참조본 (제주학회) | 이번 버전 (Oracle) |
|---|---|
| Supabase(pgvector) + Modal + Cloudflare 3분산 | **Oracle 26ai 하나로 수렴** (빨간 실린더, 글로우 강조) |
| 임베딩: Modal/CF 외부 | **in-DB** `VECTOR_EMBEDDING` (ONNX) |
| 검색: match_chunks RPC | **in-DB** `VECTOR_DISTANCE` (cosine) |
| Phase II: Topic Modeling(UMAP) | **In-DB Embedding & Vector Search** |
| 5축: 맛·가격·서비스·위치·청결 (식당) | 효능·성분·가격·사용감·안전성 (화장품) |
