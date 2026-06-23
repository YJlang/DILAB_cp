# Task B: 싱클리 데이터 수집 채널

- 작성일: 2026-05-26
- 모드: DEEP
- AS_OF: 2026-05-26

## Sources

[1] Syncly — Syncly Product Page | https://www.syncly.kr/product/syncly | Source-Type: official | As Of: 2026-05-26 | Authority: 9
[2] Syncly — Review Analysis Product | https://www.syncly.kr/product/review | Source-Type: official | As Of: 2026-05-26 | Authority: 9
[3] Syncly — CX Analysis Product | https://www.syncly.kr/product/cx | Source-Type: official | As Of: 2026-05-26 | Authority: 9
[4] BNK Market Intelligence — Syncly 솔루션 정리 | https://bnkmarketintelligence.com/solution/syncly/ | Source-Type: secondary-industry | As Of: 2026-04-?? | Authority: 5
[5] Zendesk Marketplace — Syncly Integration | https://www.zendesk.com/marketplace/apps/support/1055852/syncly/ | Source-Type: official (Zendesk) | As Of: 2026-?? | Authority: 8

## Findings (최대 10개)

- Syncly는 CS/리뷰/소셜 채널을 단일 워크스페이스로 통합하는 "다채널 VOC" 포지셔닝 [1][3]
- CS 채널: 채널톡(Channeltalk), Zendesk(공식 마켓플레이스 앱), Intercom 등 1-click 연동 [1][5]
- 앱 리뷰: App Store, Google Play 자동 수집 [1][2]
- 이커머스: 쿠팡, 아마존, 세포라(Sephora), 올리브영, 네이버 등 한·미 주요 플랫폼 리뷰 수집 [2][4]
- SNS/소셜 리스닝: TikTok, YouTube, Instagram, X(Twitter), Naver 블로그 — 영상·음성 콘텐츠도 분석 가능하다고 명시 [3][4]
- 슬랙(Slack), Excel 업로드, 설문(Survey) 임포트도 지원 [1][4]
- 다국어 처리: 한국어·영어를 핵심으로 다국어 자동 분석. 글로벌 플랫폼 리뷰 처리 시 자동 번역+분류 [1][2]
- 통합 개수: 공식 "15+" 또는 "주요 통합" 표현 (정확한 카탈로그는 영업·데모를 통해 제공되는 듯) [unverified]
- 수집 방식: 1차 채널(CS/슬랙/Zendesk)은 공식 API. 이커머스/SNS는 크롤링 또는 비공식 수집 추정 [unverified]
- 갱신 주기: 실시간~일일로 추정. 공식 SLA는 공개되지 않음 [unverified]

## 채널 분류 표

| 카테고리 | 채널명 | 공식 통합 여부 | 수집 방식 추정 | 다국어 지원 | 갱신 주기 | 출처 |
|---|---|---|---|---|---|---|
| CS 채널 | 채널톡 | O (1-click) | API | 한국어 중심 | 실시간 추정 | [1] |
| CS 채널 | Zendesk | O (마켓플레이스 앱) | API | 다국어 | 실시간 추정 | [5] |
| CS 채널 | Intercom | O (추정) | API | 다국어 | 실시간 추정 | [1][unverified] |
| 앱 리뷰 | App Store / Google Play | O | API/공식 RSS | O | 일/주 | [1][2] |
| 이커머스 | 쿠팡, 네이버스토어 | O (지원 명시) | 크롤링 추정 | 한국어 | 일/주 추정 | [2][4][unverified] |
| 이커머스 | Amazon, Sephora, 올리브영 | O (지원 명시) | 크롤링 추정 | 다국어 | 일/주 추정 | [2][4][unverified] |
| SNS | TikTok, YouTube, Instagram | O (소셜 리스닝) | API/크롤링 혼합 추정 | 다국어 | 시간/일 추정 | [3][4][unverified] |
| SNS | X(Twitter), Naver 블로그 | O | API/크롤링 혼합 추정 | 다국어 | 시간/일 추정 | [3][unverified] |
| 협업 | Slack | O | API + Webhook | - | 실시간 | [1] |
| 임포트 | Excel/CSV 업로드, 설문 | O | 파일 업로드 | - | 수동 | [1][4] |

## Deep Read Notes

### 페이지 1: https://www.syncly.kr/product/syncly
- "고객 피드백을 한 곳에서 통합 관리" — 다채널 통합이 핵심 가치 제안
- 다양한 CS 툴/SNS/이커머스를 단일 워크스페이스로 묶는다는 메시지 반복

### 페이지 2: https://www.syncly.kr/product/review
- 이커머스·앱 리뷰 분석 특화 제품 라인 별도 운영
- "쿠팡, 아마존, 세포라, 올리브영, App Store, Google Play" 등 구체 채널명 노출

### 페이지 3: https://www.zendesk.com/marketplace/apps/support/1055852/syncly/
- Zendesk 공식 마켓플레이스에 Syncly 앱 등재 → CS 채널은 정식 API 통합이 확실
- 설치형 통합이라는 점은 엔터프라이즈 신뢰도에 도움

## 다국어/지역 커버리지

- 한국어·영어가 1차 타겟. 글로벌 이커머스(아마존, 세포라) 분석 시 자동 번역+분류 동작
- 동남아·일본·중국어 등의 처리 품질은 공식 명시 부족 [unverified]
- 한국 SaaS 중 다국어 리뷰 처리 사례로 자주 인용됨 (Y Combinator W23)

## 보안·개인정보 단서

- 별도의 trust/security 페이지는 명확히 발견되지 않음 (페이지 위치 변경 가능성)
- Enterprise 플랜에서 API 접근, 전담 매니저, SLA 제공 — 보안 상세는 영업 계약 단계에서 명시되는 패턴 [unverified]

## Gaps (못 찾은 정보)

- 공식 채널 전체 카탈로그(정확한 통합 개수, 채널별 API/크롤링 명세) 미공개
- 이커머스/SNS 수집의 합법성·플랫폼 정책 준수 방식 미공개
- 갱신 주기 SLA, 데이터 소유권, 삭제·보관 기간 미공개
- 한국어 외 언어(일본어·중국어 등) 처리 품질 단서 부족
- 사용 가능한 데이터 export 형식(API, CSV, BI 커넥터) 미공개
