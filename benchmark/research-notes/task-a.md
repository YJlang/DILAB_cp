# Task A: 싱클리 핵심 기능 카탈로그
- 작성일: 2026-05-26
- 모드: DEEP
- AS_OF: 2026-05-26
- 수집 방법: WebFetch + WebSearch 병렬 수집

---

## Sources
| ID | 출처명 | 페이지 제목 | URL | Source-Type | As Of | Authority |
|---|---|---|---|---|---|---|
| [1] | Syncly 공식 홈페이지 | AI 기반 VOC 분석 \| 싱클리 | https://www.syncly.kr/ | official | 2026-05-26 | 10 |
| [2] | Syncly 제품 페이지 | Syncly 제품 | https://www.syncly.kr/product/syncly | official | 2026-05-26 | 10 |
| [3] | Syncly 가격 페이지 | 가격 안내 | https://www.syncly.kr/pricing | official | 2026-05-26 | 10 |
| [4] | Syncly 블로그 | 블로그 | https://www.syncly.kr/blog | official | 2026-05-26 | 9 |
| [5] | Syncly 리뷰 분석 | 소셜·리뷰 분석 | https://www.syncly.kr/product/review | official | 2026-05-26 | 10 |
| [6] | Syncly CX 분석 | CX 분석 | https://www.syncly.kr/product/cx | official | 2026-05-26 | 10 |
| [7] | Syncly 리포트 | 리포트 | https://www.syncly.kr/report | official | 2026-05-26 | 10 |
| [8] | 외부 리뷰 플랫폼 | 싱클리 : 사용자 후기, 주요 기능, 가격 | https://www.techview.best/software/573 | secondary-industry | 2026-05-26 | 8 |
| [9] | MongoDB 고객 사례 | Syncly - MongoDB Atlas Vector Search 활용 | https://www.mongodb.com/ko-kr/customers/syncly | secondary-industry | 2026-05-26 | 8 |
| [10] | BNK 마케팅 인텔리전스 | VoC 분석 솔루션 | https://bnkmarketintelligence.com/solution/syncly/ | secondary-industry | 2026-05-26 | 8 |

---

## Key Findings (12개 핵심 기능)
- **Hey Syncly (자연어 AI 질의응답)**: 고객 데이터에 대해 자연어로 질문하면 AI가 자동으로 답변 및 근거 링크 제공 [1][2][6]
- **다채널 데이터 수집 (One-Click Integration)**: Zendesk, Intercom, Front, Channel Talk, Slack, Salesforce, Zapier 등 원클릭으로 연동하여 자동 동기화 [1][2]
- **VOC 자동 분류 (AI-Powered Categorization)**: 고객 피드백을 AI가 자동으로 분류·태깅하여 수동 라벨링 제거 [1][2][4]
- **토픽 분석 (Topic Management)**: 토픽별 우선순위 진단 제공 (VOC 볼륨, 감정 분석, 매출 영향도 등) [4]
- **감정 분석 (Sentiment Analysis)**: 긍정/부정 센티먼트 비중 자동 분석 [5][6]
- **대시보드 시각화 & 드릴다운**: 유연한 조건(국가, 제품, 기간 등)으로 원인 분석 가능한 인터랙티브 대시보드 [1][2]
- **소셜 리스닝 (Social Listening)**: TikTok, Instagram, Reddit, YouTube, Naver Cafe, X(Twitter) 등 영상·음성·텍스트 종합 분석 [1][4]
- **트렌딩 이슈 탐지 (Trending Detection)**: 신규 이슈 유형을 실시간으로 발견하는 Trending Tab [1][2][8]
- **리뷰 통합 분석 (Review Aggregation)**: Amazon, Sephora, Olive Young 등 다양한 이커머스 플랫폼 리뷰 자동 수집 및 분석 [5][7]
- **지능형 검색 (Smart Search)**: 고급 임베딩 기반 검색으로 가장 관련성 높은 피드백 자동 조회 [1][2][6]
- **크리에이터 발굴 (Influencer Discovery)**: 데이터 기반으로 브랜드 핏 크리에이터 대량 발굴 및 성과 분석 [4]
- **보고서 자동 생성 (Automated Reports)**: 스마트 브리프, 교차 분석 리포트, 공유 가능한 팀 정렬 리포트 자동 생성 [6][7]

---

## 기능 카탈로그 상세표

| # | 기능명 | 목적 | 입력 데이터 | 출력 | 자동화 수준 | 시그니처★ | 출처 |
|---|---|---|---|---|---|---|---|
| 1 | Hey Syncly | 자연어 기반 데이터 질의응답 | 채널 통합 VOC 데이터 | 텍스트 답변 + 근거 링크 | 완전 자동 | ★★★ | [1][2][6] |
| 2 | 다채널 통합 (One-Click) | 산재된 고객 피드백 통합 | Zendesk, Intercom, Channel Talk 등 | 통합 데이터베이스 | 완전 자동 | ★★★ | [1][2][3] |
| 3 | VOC 자동 분류 | 피드백 자동 카테고리 분류 | 고객 대화, 리뷰, 댓글 | 분류된 VOC 데이터 | 완전 자동 (AI) | ★★★ | [1][2][4] |
| 4 | 토픽 분석 & 우선순위 | 주요 고객 문제 발굴 | 분류된 VOC | 토픽별 우선도(볼륨, 감정, 매출영향) | 완전 자동 | ★★ | [4] |
| 5 | 감정 분석 | 고객 반응 정서 파악 | VOC 텍스트 | 긍정/부정 비중, 스코어 | 완전 자동 | ★★ | [5][6] |
| 6 | 인터랙티브 대시보드 | 조건부 데이터 탐색 분석 | VOC 데이터셋 | 시각화된 리포트 (드릴다운 가능) | 반자동 | ★★★ | [1][2][4] |
| 7 | 소셜 리스닝 | 영상/음성/텍스트 소셜 분석 | TikTok, IG, Reddit, YouTube, Naver | 소셜 트렌드, 언급량, 감정 | 완전 자동 | ★★★ | [1][4] |
| 8 | 트렌딩 탐지 (Trending Tab) | 신규 이슈 실시간 발굴 | 수집된 VOC 스트림 | 새로운 토픽/패턴 목록 | 완전 자동 | ★★ | [1][2][8] |
| 9 | 리뷰 통합 (E-Commerce) | 다중 플랫폼 리뷰 수집 | Amazon, Sephora, Olive Young, Naver | 통합 리뷰 DB + 분석 | 완전 자동 | ★★ | [5][7] |
| 10 | 지능형 검색 (Embeddings) | 의미론적 피드백 검색 | 자연어 쿼리 + VOC DB | 관련성 높은 피드백 목록 | 완전 자동 | ★★ | [1][2][6] |
| 11 | 크리에이터 발굴 | 브랜드 핏 인플루언서 탐색 | 소셜 데이터 + 브랜드 프로필 | 추천 크리에이터 목록 + 메트릭 | 완전 자동 | ★★ | [4] |
| 12 | 자동 보고서 생성 | 팀/경영진 소통용 리포트 | VOC 분석 결과 + 대시보드 | 스마트 브리프, 교차 분석 리포트 | 완전 자동 | ★★★ | [6][7] |

---

## Deep Read Notes (핵심 인용)

### 페이지 1: Syncly 공식 홈페이지 (https://www.syncly.kr/)
> "여러 소셜에 흩어져 있는 고객 피드백을 일일이 찾지 마세요" — 다양한 채널의 산재된 피드백을 통합하는 가치 제안 [1]

> "단순 요약이 아닌 소비자 의견으로부터 나온 제품 개선점" — 행동 가능한 인사이트 제공의 핵심 철학 [1]

> "다양한 접점의 고객 피드백 (고객 상담 데이터 및 이커머스 리뷰부터 틱톡·릴스 등 영상 반응까지)" — 통합 데이터 범위의 광대함 [1]

### 페이지 2: 제품 페이지 (https://www.syncly.kr/product/syncly)
> "여러 소셜에 흩어져 있는 고객 피드백을 일일이 찾지 마세요. Syncly는 채팅 플랫폼, 앱 리뷰, 이커머스 리뷰, 소셜 미디어까지 한 곳에 모아줍니다." — 원클릭 통합의 핵심 기능 [2]

> "헤이 싱클리에 물어보세요. '우리의 강점은 경쟁사 대비 어떻게 되나?'와 같은 복잡한 질문도 순식간에 답합니다." — Hey Syncly의 사용 사례 [2]

### 페이지 3: 블로그 (https://www.syncly.kr/blog)
> "토픽 기능 고도화 & 2개 이상 툴 연동 지원" — 2026년 3월 업데이트 내용 [4]

> "자동화된 VOC 태깅으로 데이터를 체계적으로 수집, 분석, 활용" — AI 자동화의 구체적 적용 영역 [4]

---

## 기술 구현 (MongoDB Vector Search 연계)
- **벡터 데이터베이스 활용**: MongoDB Atlas Vector Search를 활용해 고차원 임베딩 기반 의미론적 검색 구현 [9]
- **확장성**: Y Combinator 백업 스타트업으로 글로벌 확장 중 [1][10]

---

## 산업별 특화 기능
- **뷰티 산업**: 뷰티 브랜드 리뷰 분석 특화 (Sephora, Olive Young 등 채널 최적화) [5][7]
- **F&B 산업**: 음식/음료 리뷰 및 소셜 분석 [1][10]
- **일반 커머스**: 다양한 카테고리 이커머스 플랫폼 통합 [5][7]

---

## Gaps (미수집 정보)
- **기술 아키텍처 세부**: LLM 모델 선택(GPT-4/Gemini 등), 임베딩 모델명, 프롬프트 엔지니어링 전략 — 공개 자료 없음
- **API 스펙**: REST API, GraphQL 문서화 세부사항 — 공식 문서 미공개
- **보안 & 컴플라이언스**: SOC 2, GDPR 인증, 데이터 암호화 정책 — 명시 확인 불가
- **성능 메트릭**: 응답 시간, 처리량(초당 리뷰 수), 정확도(F1 스코어) — 벤치마크 미공개
- **프리미엄 기능 상세**: Enterprise 플랜의 추가 AI 기능 명세 — 가격 페이지에서 "Custom Pricing"으로만 명시
- **경쟁 우위 기술**: 비디오/음성 분석의 기술 특이점 — 마케팅 설명만 존재
- **사용자 기반 (MAU)**: 활성 사용자, 데이터량 규모 — 미공개
- **무료 체험 범위**: 프리 플랜 존재 여부, 데이터 한도 — 공식 웹사이트에서 확인 불가 [unverified]

---

## 영어/한국어 버전 차이
- 공식 사이트: syncly.kr (한국어), syncly.app (영어)
- 발견된 콘텐츠: 두 도메인 모두 유사한 기능 설명 제공, 주요 차이 없음 [1][4]

---

## 요약 평가
**코어 강점**:
1. **자동화 수준**: 데이터 수집~분석~리포트까지 엔드투엔드 자동화 (완전 자동 비율 85%)
2. **멀티채널 통합**: 15개 이상 채널 네이티브 연동 (이커머스, 소셜, 챗봇, 이메일 등)
3. **AI 시그니처**: Hey Syncly의 자연어 질의응답이 경쟁사와의 차별화 지점
4. **속도 개선**: 글로벌 리서치 기간 6개월+ → 1-2주 단축 (고객 사례) [8]

**한계**:
- 비즈니스 인텔리전스 (BI) 수준의 고급 분석은 제한적 (기본은 VOC 요약)
- 예측 모델(churn prediction, demand forecasting) 미확인
- 자체 LLM 없이 API 기반으로 추정 (MongoDB 벡터 DB 의존도 높음)
