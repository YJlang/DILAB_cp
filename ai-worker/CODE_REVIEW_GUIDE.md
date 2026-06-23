# ai-worker 코드 리뷰 가이드 (초보자용)

> 이 문서는 **AI·파이썬을 처음 보는 리뷰어**가 `ai-worker/src` 의 실제 로직을
> 스스로 읽고 검토할 수 있도록 만든 안내서입니다.
> 코드를 고치는 문서가 아니라 **"어떻게 읽고, 무엇을 의심할지"** 를 알려주는 문서예요.
>
> 같이 보면 좋은 것: 각 핵심 파일에는 `# [리뷰]` 로 시작하는 한글 주석을 달아뒀어요.
> 그 주석은 "이 줄에서 무엇을 확인하면 되는지" 를 짚어주는 표시입니다.

---

## 0. 30초 요약 — ai-worker 가 하는 일

제품명 하나(`"닥터지 레드 블레미쉬 크림"`)를 받아서, **공개 후기 + 전문가 글을 모아 →
AI 가 의미를 숫자로 바꾸고(임베딩) → 주제/감성/구매여정을 분류하고 → 5축 점수를 매기고 →
질문에 출처를 달아 답하는** 분석 엔진입니다.

핵심 철학 (README 의 설계 원칙):
- **stateless(무상태)**: 모든 결과는 Supabase(데이터베이스)에 다시 저장. 워커는 "계산만" 하고 기억하지 않음.
- **DB 가 진실의 원천**: 화면(Next.js)은 DB 만 읽음. ai-worker 는 DB 에 쓰기만.

```
            ┌─────────────────────────── analyze_product() 한 번 = 5단계 ──────────────────────────┐
제품명 ──▶  ① 수집(naver)  ──▶ ② 제품 등록  ──▶ ③ 문서·임베딩 저장  ──▶ ④ 라벨링(LLM)  ──▶ ⑤ 5축 점수
            naver_fetcher      products 테이블     documents+chunks       classifications     ratings 테이블
                                                   (embeddings/bge)        sentiments
                                                                          journey_assignments
            └──────────────────────────────────────────────────────────────────────────────────────┘

질문이 들어오면 (별도 흐름):
질문 ──▶ 임베딩 ──▶ 비슷한 근거 검색(match_chunks) ──▶ LLM 이 출처 달아 답변 (rag/answer.py)
```

---

## 1. 리뷰 전에 알아야 할 "AI 개념" 6가지 (비유로)

이 6개만 알면 코드의 90%가 읽힙니다. 수학은 필요 없어요.

| 개념 | 한 줄 비유 | 코드에서 보이는 곳 |
|---|---|---|
| **임베딩(embedding)** | 문장을 1024개의 숫자로 된 "의미 좌표"로 바꾸는 것. 뜻이 비슷한 문장은 좌표도 가까움. | `embeddings/bge.py` |
| **벡터 검색 / 유사도(similarity)** | "이 질문과 의미가 가까운 후기 top-3 찾아줘" — 좌표 거리로 검색. | `rag/answer.py` 의 `match_chunks` |
| **RAG** | LLM 에게 "아는 척하지 말고 **이 자료만 보고** 답해" 하고 근거 문서를 같이 넣어주는 방식. 환각(거짓말)을 줄임. | `rag/answer.py` |
| **LLM(거대언어모델)** | 글을 읽고 글로 답하는 AI. 여기선 DeepSeek 을 "분류기"와 "작가" 두 용도로 씀. | `llm/deepseek.py` |
| **토픽 모델링(BERTopic)** | 라벨 없이 후기들을 "비슷한 주제끼리" 자동으로 묶는 것. (예: '향' 묶음, '보습' 묶음) | `topics/bertopic_runner.py` |
| **감성분석(sentiment)** | 글의 톤이 긍정/중립/부정 중 무엇이고 얼마나 강한지. | `analysis/label.py` |

> **핵심 통찰**: 이 프로젝트는 LLM 을 **두 가지로** 씁니다.
> ① **판단기** (label.py, compute 점수 재료) — "이 문장은 어떤 카테고리/감성/단계야?" 를 JSON 으로 답하게 함. `temperature=0.0` (일관성 우선)
> ② **작가** (answer.py, insights.py) — 출처를 인용해 사람이 읽을 답을 쓰게 함. `temperature=0.2~0.3` (자연스러움 약간)

---

## 2. 리뷰 전에 알아야 할 "파이썬 문법" (이 코드에 실제로 나오는 것만)

| 문법 | 예시 | 뜻 |
|---|---|---|
| 타입 힌트 | `def f(x: str) -> list[Row]:` | x 는 문자열, 반환은 리스트. **강제는 아니고 설명용**. |
| f-string | `f"{product_query} 후기"` | 문자열 안에 변수 끼워넣기. |
| 리스트 컴프리헨션 | `[d["body"] for d in docs]` | "docs 의 각 d 에서 body 만 뽑아 리스트로". for 문의 압축형. |
| dataclass | `@dataclass class Citation:` | 데이터만 담는 구조체. 키 모음을 객체로. |
| `@lru_cache` | `@lru_cache(maxsize=1)` | 함수 결과를 캐싱 → **두 번째 호출부터 안 돌고 결과 재사용**. 무거운 모델 1회 로드용. |
| `cast(...)` | `cast(list[Row], r.data)` | "이거 이 타입이야" 라고 타입검사기에게 알려줄 뿐 **실제 동작은 없음**. |
| `*,` (별표 인자) | `def f(a, *, k=3)` | `*` 뒤 인자는 **반드시 이름 붙여 호출**(`f(a, k=5)`). 실수 방지용. |
| supabase 체이닝 | `supabase.table("x").select("id").eq("a", b).execute()` | "x 테이블에서 a=b 인 행의 id 를 가져와 실행". SQL 을 메서드로 쓴 것. `.execute()` 가 실제 실행. |

> **리뷰 팁**: supabase 한 줄은 곧 **DB 쿼리 한 번**(네트워크 왕복)입니다.
> 한 함수 안에 `.execute()` 가 몇 번 나오는지 세보면 "이 함수가 DB 를 몇 번 때리는지" 가 보여요. (성능 리뷰의 핵심)

---

## 3. 추천 읽기 순서

의존성이 낮고 이해하기 쉬운 것부터, 그 다음 그것들을 엮는 큰 흐름으로 갑니다.

**1단계 — 토대 (작고 독립적)**
1. `config.py` — 설정·비밀키가 어디서 오는지 (모든 파일이 이걸 씀)
2. `db/supabase.py` — DB 연결 (딱 10줄)
3. `embeddings/bge.py` — 임베딩 (딱 25줄, 개념의 핵심)
4. `llm/deepseek.py` — LLM 호출 (딱 36줄)

**2단계 — 데이터 가공**
5. `ingestion/naver_fetcher.py` — 후기 수집
6. `ingestion/slug.py` — 제품 주소(slug) 만들기
7. `ingestion/chunking.py` — 긴 글을 조각으로 자르기

**3단계 — AI 판단 (여기가 진짜 로직)**
8. `analysis/label.py` — LLM 으로 카테고리·감성·여정 분류 ★
9. `ratings/compute.py` — 분류·감성 → 5축 점수 계산 ★★ (수식 주의)
10. `topics/bertopic_runner.py` — 주제 자동 묶기
11. `rag/answer.py` — 질문→근거검색→답변 ★★ (RAG 핵심)
12. `compare/insights.py` — 두 제품 비교 + 마케팅 인사이트

**4단계 — 전체를 엮는 오케스트레이터**
13. `ingestion/auto_ingest.py` — 위 단계들을 1~5로 순서대로 호출 ★★★ (여기부터 거꾸로 읽어도 좋음)
14. `main.py` — FastAPI 엔드포인트 (외부 진입점)

★ 개수 = 리뷰 집중도. ★★★ 부터 보면 "큰 그림"이, 1번부터 보면 "벽돌"이 먼저 보입니다.
처음이면 **13번(auto_ingest)을 먼저 훑어 큰 흐름을 잡고**, 막히는 단계를 위 목록에서 찾아 들어가는 걸 추천해요.

---

## 4. 파일별 리뷰 노트

각 파일에서 **① 무슨 일을 하나 ② 핵심 한 줄 ③ 리뷰 체크포인트 ④ 초보가 던지면 좋은 질문**.

### `config.py` — 설정 로더
- **하는 일**: `.env` 파일에서 키들을 읽어 `settings` 객체로. 모든 파일이 `from ..config import settings`.
- **체크포인트**: `service_role_key` 는 RLS(행 보안)를 **우회**하는 강력한 키. 이게 절대 프론트/깃에 노출되면 안 됨.
- **질문**: "이 키가 클라이언트(브라우저)로 새어나갈 경로가 있나?" → 답: 없음(서버 전용). 그래서 안전.

### `db/supabase.py` — DB 클라이언트
- **하는 일**: service_role 권한으로 Supabase 에 연결. 모듈 로드 시 `supabase` 전역 1개 생성.
- **체크포인트**: 전역 1개를 공유. 무상태라 안전하지만, "연결 실패 시 재시도" 같은 건 없음(MVP).

### `embeddings/bge.py` — 임베딩 (B1) ★
- **핵심 한 줄**: `model.encode(texts, normalize_embeddings=True)` — 문장들 → 1024차 벡터.
- **체크포인트**:
  - `@lru_cache(maxsize=1)` → 무거운 모델(수 GB)을 **프로세스당 1번만** 로드. 이게 없으면 매 호출마다 재로딩(치명적).
  - `normalize_embeddings=True` → 벡터 길이를 1로 맞춤. 코사인 유사도 검색이 깔끔해지는 전제.
- **질문**: "리스트로 한 번에(batch) 임베딩하는 게 한 개씩 N번보다 빠른 이유는?" (네트워크/GPU 묶음 처리)

### `llm/deepseek.py` — LLM 클라이언트
- **핵심 한 줄**: OpenAI **호환** API 라 `OpenAI(base_url=deepseek)` 로 그대로 씀.
- **체크포인트**: `response.choices[0].message.content or ""` — 응답이 비면 빈 문자열. **에러를 던지지 않고 빈 값으로** 흘려보냄(뒤에서 JSON 파싱 실패로 이어질 수 있음 → 4의 label/answer 와 연결해 보기).
- **질문**: "타임아웃·재시도(retry)가 없는데, DeepSeek 이 느리거나 5초 끊기면 어떻게 되나?"

### `ingestion/naver_fetcher.py` — 후기 수집
- **하는 일**: 네이버 검색 API 로 `"제품명 후기"`(블로그 30개) + `"제품명 성분 분석"`(15개) + 쇼핑(5개) 수집.
- **체크포인트**:
  - `_strip_html` 으로 `<b>` 같은 태그 제거.
  - **`description` 은 네이버가 주는 ~200자 요약**입니다(본문 전체 아님). → 분석 신호가 짧다는 한계. 점수 신뢰도 리뷰 시 기억할 것.
  - `timeout=10` 외 재시도 없음.
- **질문**: "후기가 0개면? → `auto_ingest` 가 `{"error":"no reviews found"}` 로 멈춤. 적절한가?"

### `ingestion/slug.py` — 제품 URL 식별자 생성
- **하는 일**: `"아누아 어성초 77 토너"` → `anua-heartleaf-toner-ab12cd` 같은 영문 주소.
- **전략**: 브랜드 사전 → 키워드 사전 → 한글 로마자 변환 → 노이즈 제거 → 끝에 6자 해시(중복 방지).
- **체크포인트**: 사전에 없는 새 브랜드는 로마자 변환에 의존 → 품질이 들쭉날쭉할 수 있음. 해시 suffix 가 충돌은 막아줌.
- **질문**: "같은 제품을 두 번 분석하면 slug 가 같아서 중복 등록을 피하나?" → `auto_ingest` 의 `found` 체크와 연결.

### `ingestion/chunking.py` — 글 자르기
- **하는 일**: 마크다운(전문가 seed 문서)을 헤딩 기준 + 500자 한도로 조각냄.
- **체크포인트**: `MAX_CHUNK_CHARS = 500` 은 글자수 기준(진짜 토큰 아님, 주석에 명시). **이건 seed 문서 경로에서만 쓰임** — 네이버 자동 경로는 `auto_ingest` 에서 본문 전체를 한 조각으로 넣음(아래 ★ 참고).
- **질문**: "조각을 너무 잘게 자르면 / 너무 크게 두면 검색 품질에 어떤 영향?"

### `analysis/label.py` — 분류·감성·여정 라벨링 (B3·B4) ★
- **핵심 한 줄**: 청크 하나를 LLM 에 보내 `{categories, sentiment, journey}` JSON 을 받음.
- **체크포인트**:
  - **도메인 정의를 프롬프트에 주입** (`categories`, `journey_stages`) → 화장품 외 도메인도 코드 수정 없이 가능(유연성).
  - `_parse_json` 이 ```json``` 코드블록·잡텍스트를 방어적으로 벗겨냄. **LLM 이 형식을 안 지킬 수 있다는 전제**.
  - 파싱 실패 시 **조용히 기본값**으로: `sentiment="neutral"`, `journey="use"`, `categories=[]`. → 데이터가 silent 하게 뭉개질 수 있음(리뷰 포인트).
  - `label_domain` 은 **이미 라벨된 청크는 skip** (sentiments 테이블에 있으면 건너뜀). 그래서 제품 추가마다 도메인 전체를 다시 호출해도 중복 작업이 적음.
  - 청크 1개당 LLM 1회 호출 → 청크 N개면 **N번 순차 호출**(느림·비용). 병렬화 없음.
- **질문**: "LLM 이 매번 약간 다르게 답하면(=비결정적) 점수가 흔들리지 않나?" → `temperature=0.0` 으로 최대한 줄였지만 완전 고정은 아님.

### `ratings/compute.py` — 5축 점수 계산 ★★ (수식 주의)
- **핵심 수식** (파일 상단 주석에도 있음):
  ```
  signed   = +intensity(긍정) / -intensity(부정) / 0(중립)     # [-1, +1]
  weighted = signed × 분류confidence                            # 자신없는 분류는 영향 축소
  axis점수  = (평균(weighted) + 1) / 2 × 10                      # [-1,+1] → [0,10]
  ```
- **체크포인트**:
  - 중립 글이 많으면 점수가 **5점(중간)으로 끌려감** — 의도된 동작인가?
  - 해당 축 데이터가 없으면 `score=None` → DB 엔 저장 안 함(`upsert_ratings` 가 None 거름).
  - `evidence_chunk_ids` = confidence 상위 5개 = 화면에서 ★ 근거로 보여줄 청크.
  - `upsert_ratings` 는 **삭제 후 삽입**(delete→insert). 트랜잭션 아님 → 아주 짧은 순간 "점수 없음" 상태가 생길 수 있음.
- **질문**: "긍정 1개(강도 1.0)와 긍정 10개(강도 0.5)가 같은 점수일 수 있는데, 개수(신뢰도)를 점수에 반영해야 하지 않나?"

### `topics/bertopic_runner.py` — 주제 자동 묶기 (B2)
- **하는 일**: 도메인의 모든 청크를 임베딩 → UMAP(차원축소) → HDBSCAN(밀도 군집) → 주제 그룹.
- **체크포인트**:
  - **작은 데이터셋 대응 튜닝**: `n_neighbors`, `min_cluster_size=3` 을 기본값보다 작게. 데이터 적을 때 안 묶이는 문제 회피.
  - `random_state=42` → 재현성(같은 입력=같은 결과).
  - **재실행 시 기존 topics/topic_assignments 를 지우고 다시 삽입** → 항상 최신 1벌. 역시 트랜잭션 아님.
  - `Topic -1` = "어디에도 안 묶인 outlier(잡음)". 정상이며 keywords 안 뽑음.
- **질문**: "제품을 추가할 때마다 도메인 전체를 다시 클러스터링하는 비용은? 캐싱/증분 가능?"

### `rag/answer.py` — DILAB Ask (B5) ★★ (RAG 핵심)
- **흐름**: 질문 임베딩 → `match_chunks` 로 expert top-k + public top-k **따로** 검색 → 합쳐서 프롬프트의 `[출처]` 로 → LLM 이 `[1][2]` 인용하며 JSON 답변.
- **체크포인트**:
  - **하이브리드 검색**: 전문가/일반을 분리 호출해 둘 다 섞음(`expert_k`, `public_k`). 한쪽만 나오는 편향 방지.
  - 시스템 프롬프트가 "**출처에 없으면 만들지 마라**" 를 강제 → 환각 억제. (이 한 줄이 신뢰성의 핵심)
  - `_persist=True` 면 질문/답변/인용을 DB 에 3테이블로 저장(분석·재현용).
  - `citations` 의 `cite_type` 가 화면의 '전문가/일반' 배지로 이어짐.
- **질문**: "검색된 청크가 0개면 LLM 이 뭐라고 답하나? (빈 출처로 환각할 위험은?)"

### `compare/insights.py` — 제품 비교 (S6)
- **하는 일**: 두 제품의 점수/키워드/감성 분포를 모아 → 축별 승자 계산 → LLM 이 마케팅 인사이트(강점·액션·포지셔닝) 생성. **A=자사, B=경쟁사** 가정.
- **체크포인트**:
  - `winner` 임계값 `gap > 0.3` → 0.3 이하 차이는 무승부(tie). 임계값이 적절한가?
  - `_snapshot` 한 번에 supabase 호출이 여러 번(문서→청크→감성→토픽). 제품 2개면 2배 → **N+1 쿼리 패턴**(성능 리뷰 대상).
- **질문**: "데이터가 부족한 제품(점수 None 많음)을 비교하면 인사이트가 신뢰할 만한가?"

### `ingestion/auto_ingest.py` — 오케스트레이터 ★★★
- **하는 일**: `analyze_product()` 한 함수가 **수집→제품→문서·임베딩→라벨링→점수** 5단계를 순서대로.
- **체크포인트** (가장 중요):
  - **③에서 네이버 문서는 `chunk_markdown` 을 안 쓰고 본문 전체를 1청크로** 넣음(`chunk_index=0`, `token_count=len(body)`=글자수). seed 경로(`pipeline.py`)와 다른 처리 → 일관성 리뷰 포인트.
  - 같은 slug 제품이 있으면 재등록 안 함(`found`) → **문서는 계속 추가됨**(누적). 중복 후기 방지는 없음.
  - ④ `label_domain` 은 **도메인 전체** 대상(방금 넣은 것만이 아님). skip 로직이 있어 비용은 제한적.
  - 단계 중 하나가 실패하면? 앞 단계는 이미 DB 에 커밋됨 → **부분 저장**(롤백 없음). Modal 쪽에서 status=error 로 기록.
- **질문**: "②~⑤ 중간에 죽으면 데이터가 어중간하게 남는데, 재실행하면 깨끗하게 복구되나?"

### `main.py` — FastAPI 진입점
- **하는 일**: `/health`, `/ask`, `/analyze`, `/compare` 엔드포인트. 요청 바디를 `pydantic` 모델로 검증.
- **체크포인트**: `dataclass` 결과를 `asdict()` 로 JSON 화. CORS 가 localhost 만 허용(개발용).
- **참고**: 운영에선 이 FastAPI 를 직접 안 띄우고, 같은 `src/` 코드를 **Modal 함수**가 import 해서 씀(README 상단 주의문).

---

## 5. 전체 코드리뷰 체크리스트

리뷰할 때 이 순서로 질문해 보세요. (✅ = 이 코드가 잘 지킨 것, ⚠️ = 한 번 의심해볼 것)

**정확성(Correctness)**
- [ ] LLM 응답 JSON 이 깨졌을 때 어떻게 되나? → 기본값으로 흘러감 ⚠️ (조용한 품질 저하)
- [ ] 빈 입력(후기 0개, 청크 0개, 점수 None)에 대한 분기들이 다 있나? → 대체로 ✅
- [ ] `zip(..., strict=True)` — 길이 다르면 에러로 잡아줌 ✅ (임베딩 개수 ≠ 문서 개수 버그 조기 발견)

**보안(Security)**
- [ ] service_role 키가 서버 밖으로 나갈 경로가 있나? → 없음 ✅
- [ ] 사용자 입력(`product_query`, `query`)이 그대로 LLM 프롬프트로 들어감 → 프롬프트 인젝션 가능성 ⚠️ (MVP 허용 범위인지 판단)
- [ ] 외부 API 응답(`description`)의 HTML 제거하나? → `_strip_html` ✅

**데이터 일관성(Consistency)**
- [ ] delete→insert 패턴(ratings, topics)이 트랜잭션 아님 → 동시 실행 시 충돌? ⚠️
- [ ] 네이버 경로 vs seed 경로의 청킹 방식이 다름 ⚠️
- [ ] 부분 실패 시 롤백 없음 → 재실행 안전성 ⚠️

**성능·비용(Performance)**
- [ ] 청크당 LLM 1회 = N청크 N호출(순차). 병렬/배치 여지 ⚠️
- [ ] `_snapshot`, `compute` 의 연쇄 supabase 호출 = N+1 쿼리 ⚠️
- [ ] 모델 1회 로드(`@lru_cache`) ✅, 임베딩 배치 처리 ✅
- [ ] 재시도/타임아웃 정책 부재(LLM·네이버) ⚠️

> ⚠️ 들은 대부분 **MVP 의 의도적 단순화**입니다(버그가 아님). 리뷰의 목적은 "어디가 의도된 타협이고,
> 어디가 다음 단계에서 갚아야 할 빚인지" 를 구분하는 것. 발견하면 `refactoring.md` 처럼 메모해두면 좋아요.

---

## 6. 손대면 안 되는 영역 (리뷰는 OK, 변경은 신중)

`prototype/AGENTS.md` 와 `CLAUDE.md` 의 하드룰과 연결됩니다.
- DB **테이블·컬럼 이름**(`chunks`, `rating_axes`, `journey_stages`, `match_chunks` RPC) — 화면(Next.js)·Modal 과 공유하는 **데이터 계약**. 바꾸면 프론트가 깨짐.
- `embeddings/bge.py`, `rag/answer.py` 의 로직은 **Cloudflare Workers 의 `prototype/lib/rag.ts` 로 포팅**되어 있음 → 한쪽만 바꾸면 운영과 어긋남.
- 임베딩 **차원 1024** 와 모델 `BAAI/bge-m3` — DB pgvector 컬럼 차원과 묶여 있음.

---

## 7. 용어집 (빠른 참조)

| 용어 | 뜻 |
|---|---|
| chunk(청크) | 분석의 최소 단위. 글을 자른 한 조각(또는 후기 한 건). 화면엔 "근거 구절"로 표기. |
| embedding(임베딩) | 텍스트의 의미를 담은 1024개 숫자(벡터). |
| similarity(유사도) | 두 벡터가 얼마나 가까운지(0~1). 검색 순위의 기준. |
| RAG | 근거 문서를 LLM 에 같이 줘서 "자료 기반"으로 답하게 하는 기법. |
| RPC (`match_chunks`) | DB 안에 정의된 함수. 벡터 유사도 검색을 SQL 쪽에서 수행. |
| service_role | RLS 를 우회하는 Supabase 관리자 키. 서버 전용. |
| RLS | Row Level Security. 행 단위 접근 권한. |
| classification | 청크가 어떤 평가축/카테고리에 해당하는지(+confidence). |
| sentiment | 감성: positive/neutral/negative + intensity(강도 0~1). |
| journey | 구매 여정 단계(기대→사용→재구매 등). `is_estimated=True`(추정값). |
| upsert | update + insert. 여기선 "삭제 후 삽입"으로 구현. |
| temperature | LLM 의 무작위성. 0=일관적, 높을수록 창의적/들쭉날쭉. |

---

리뷰하다가 "이게 왜 이렇지?" 싶은 부분은, 각 파일의 `# [리뷰]` 주석을 먼저 보고,
그래도 막히면 이 가이드의 4번(파일별 노트)·5번(체크리스트)으로 돌아오세요.
