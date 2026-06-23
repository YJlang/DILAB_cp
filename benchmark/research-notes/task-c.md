# Task C: 싱클리 AI/ML 기술 스택

- 작성일: 2026-05-26
- 모드: DEEP
- AS_OF: 2026-05-26

## Sources

[1] Syncly — Product Page | https://www.syncly.kr/product/syncly | Source-Type: official | As Of: 2026-05-26 | Authority: 9
[2] Syncly — About | https://www.syncly.kr/about | Source-Type: official | As Of: 2026-05-26 | Authority: 8
[3] Syncly Blog — 메인 | https://www.syncly.kr/blog | Source-Type: official | As Of: 2026-05-26 | Authority: 8
[4] Syncly Blog — Update: Category | https://www.syncly.kr/blog/syncly-update-category | Source-Type: official | As Of: 2026-?? | Authority: 8
[5] Syncly Blog — Insight Beta | https://www.syncly.kr/blog/syncly-update-insight-beta | Source-Type: official | As Of: 2026-?? | Authority: 8
[6] MongoDB — Customer Story: Syncly | https://www.mongodb.com/customers/syncly | Source-Type: secondary-industry (vendor case study) | As Of: 2024-?? | Authority: 7
[7] Syncly — Integrations | https://www.syncly.kr/product/integrations | Source-Type: official | As Of: 2026-05-26 | Authority: 8
[8] 머니투데이 — 딥블루닷 35억 시드펀딩 보도 | https://news.mt.co.kr/mtview.php?no=2023050909235277382 | Source-Type: journalism | As Of: 2023-05-09 | Authority: 6
[9] Rallit — Syncly 소프트웨어 엔지니어 채용공고 | https://www.rallit.com/positions/3889/syncly-software-engineer | Source-Type: official (recruiting) | As Of: 2026-?? | Authority: 6

## Findings (9개)

- 모회사 **딥블루닷(DeepBlueDot)** — Y Combinator W23 배치, SoftBank Ventures 등으로부터 35억원 시드 라운드 [8]
- **벡터 DB로 MongoDB Atlas Vector Search 공식 사용** — 사례 연구에서 "10,000+ 유사도 비교를 단일 벡터 검색으로 대체"라고 명시, 10배+ 성능 개선 [6]
- **자동 분류 5가지 카테고리**: Feature Request / Bug / Churn / Pricing & Payment / How-To [4]
- **Semantic Unit Analysis**(의미 단위 분석) — Insight 베타 기능, 텍스트 → 의미 클러스터 3단 구조 [5]
- **다국어 NLP** — 한국어·영어 중심, 다국어 감성분석/태깅 지원 [1][3]
- **Hey Syncly** — 자연어 질의응답 인터페이스. 벡터 검색과 LLM 결합 (RAG 패턴 강력 시사) [1][6]
- **처리 성능 정성 증언** — 글로벌 리뷰 분석을 "월 4-8주 → 1-2주"로 단축한 사례 보유 [3]
- **자체 웹 스크래핑 시스템** — 채용 공고에 "Scalable Web Scraping System" 언급 [9]
- **카테고리 분류와 클러스터링은 자체 모델 라인을 가진 것으로 추정**, LLM 백엔드(OpenAI/Anthropic 추정)는 공식 미명시 [unverified]

## AI/ML 단계별 스택

| 단계 | 기능 | 사용 기술 | 자체 vs 외부 | 확신도 | 출처 |
|---|---|---|---|---|---|
| 수집 | 다채널 크롤링/통합 | Scalable Web Scraping System | 자체 | 높음 | [7][9] |
| 전처리 | 다국어 정규화, 토큰화 | NLP 파이프라인 | 자체 추정 | 중간 | [3][5][unverified] |
| 감성분석 | 긍/부정/중립 분류 | 자체 NLP 모델 (한국어 특화 추정) | 자체 | 높음 | [1][3] |
| 토픽 분류 | 자동 태깅 | 5-카테고리 분류기 + 사용자 정의 Taxonomy | 자체 | 높음 | [4] |
| 의미 클러스터링 | Semantic Unit Analysis | 임베딩 + 계층적 클러스터링 추정 | 자체+외부 인프라 | 높음 | [5][6] |
| 벡터 검색 | 유사도 매칭 | MongoDB Atlas Vector Search | **외부 (MongoDB)** | 높음 | [6] |
| 자연어 쿼리 | Hey Syncly | 임베딩 + RAG + LLM | LLM은 외부 API 추정 | 중간 | [1][6][unverified] |
| 요약/액션 | 인사이트·액션아이템 생성 | LLM 기반 생성 | 외부 API 추정 | 낮음 | [5][unverified] |

## 공식 명시 vs 합리적 추정

**공식 명시:**
- MongoDB Atlas Vector Search 사용 [6]
- 5-카테고리 자동 분류 [4]
- Semantic Unit Analysis 클러스터링 [5]
- 다국어 감성분석 지원 [1][3]
- 자체 웹 스크래핑 시스템 [9]

**합리적 추정 ([unverified]):**
- Hey Syncly 백엔드: OpenAI/Anthropic 등 외부 LLM API (한국 SaaS 일반 패턴)
- 임베딩 모델: OpenAI Embedding API 또는 한국어 특화 모델
- 한국어 분류 정확도 향상을 위한 자체 fine-tuning 가능성

## RAG/벡터 DB 사용 단서

- ✅ **RAG 구조 강력 시사**: MongoDB 사례에서 "벡터화된 피드백 → 유사도 검색 → LLM 응답"의 전형적 RAG 패턴 확인 [6]
- ✅ **Hey Syncly**가 RAG의 사용자 대면 인터페이스로 추정
- Syncly는 RAG의 *데이터 소스를 자체 수집한 고객 피드백*으로 운영
- 비교: **DILAB은 RAG의 데이터 소스를 "전문가 큐레이팅 리뷰 DB"로 차별화** — 같은 RAG 패턴이지만 입력 데이터의 신뢰도가 다름

## 처리량·지연·규모 단서

- 분석 기간: 글로벌 리뷰 분석 "월 4-8주 → 1-2주" 사례 [3]
- 벡터 검색: 10,000+ 유사도 비교를 단일 쿼리로 대체 [6]
- 다국어 지원 채널 폭: 글로벌 이커머스/SNS 분석
- SLA·동시 처리량은 비공개

## Gaps

- LLM 벤더, 임베딩 모델, 프롬프트 구조 미공개 (상용 SaaS 특성상 공개 가능성 낮음)
- 한국어 분류 정확도/recall/precision 등 정량 지표 비공개
- 멀티 테넌트 격리, 데이터 잔류 정책 등 보안 상세 비공개
- "전문가 검증" 또는 휴먼 인 더 루프(HIL) 단계가 있는지 단서 부족 (Research Partners 컨설팅이 그 역할일 수 있음)

## DILAB 관점 시사점

1. **공통 아키텍처**: Syncly와 DILAB 모두 "다채널 데이터 → 벡터 DB → LLM RAG" 구조. DILAB이 이 구조를 흉내내는 것은 합리적.
2. **차별화 지점**: Syncly = 자동 수집 데이터의 *양*과 채널 커버리지로 승부.
   DILAB = "전문가 큐레이팅 리뷰 DB" + RAG로 *신뢰성·전문성*으로 승부.
3. **벡터 DB 선택**: Syncly가 MongoDB Atlas로 검증한 패턴이 있음. DILAB MVP에서는 MongoDB Atlas, Pinecone, Weaviate, Qdrant 등 선택지 비교 필요.
4. **자체 모델 vs API**: Syncly는 분류·클러스터링은 자체, 생성은 외부 API로 추정되는 하이브리드. DILAB MVP에서는 *생성은 외부 LLM API + 전문가 DB 인덱싱은 자체*가 합리적 시작점.
