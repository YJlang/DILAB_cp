# DILAB → Oracle AI Vector Search 전환 작업계획

> **이 저장소는 운영 repo가 아니라 Oracle 전환 R&D용 *분리된 복제본*입니다.**
> 원본(운영 중): `/Users/junha/Desktop/DILAB` · `github.com/YJlang/DILAB` · `dilab.sean111400.workers.dev`
> 이 복제본: git remote = `github.com/YJlang/DILAB_cp` (운영 repo와 분리된 별도 private repo) · 프로덕션 MCP(supabase·cloudflare) 제거됨.
> 작성 AS_OF 2026-06-23. 근거: 옵시디언 「DILAB Oracle AI Vector Search 전환 타당성」(AS_OF 2026-06, 교수님 제안).

---

## 0. 왜 이 작업인가 (배경)

수요기업(한국콜마·테팔 등)이 **보안성 높고 검증된** 솔루션을 원함. 현재 DILAB의 벡터 레이어는
오픈소스 **pgvector**(Supabase)로 구현돼 있어, 이를 **Oracle AI Vector Search(23ai)** 로
대체하는 산학 과제를 검토 중(오라클 협력 과제 제안). 성능이 아니라 **엔터프라이즈 보안·거버넌스·
검증된 벤더**가 전환의 명분이다.

## 1. 현재 아키텍처 (이식 대상)

| 레이어 | 현재 | 비고 |
|---|---|---|
| 프론트 | Next.js 16 → Cloudflare Workers (OpenNext) | 벡터 무관, 거의 영향 없음 |
| 백엔드 DB | **Supabase PostgreSQL + pgvector 0.8.0** | `chunks.embedding vector(1024)` + HNSW(cosine) |
| 검색 | SQL 함수 `match_chunks` (코사인 `<=>` + 도메인/제품/출처 필터 + 전문가 우선) | 호출부 2곳: `prototype/lib/rag.ts`, `ai-worker/src/rag/answer.py` |
| 임베딩 | **BGE-M3 1024d** (외부 생성: CF Workers AI / sentence-transformers) | DB 밖에서 생성·저장 |
| AI 워커 | Modal serverless (BGE-M3 · BERTopic · DeepSeek) | |
| 관측 | Sentry (Modal Python 계측) | 유지 |
| 규모 | chunks **~1,347행·17MB**, 16테이블, RLS 18개 | 이전 부담 거의 0 |

## 2. Oracle 23ai 대응 — 벡터는 거의 1:1

| pgvector (현재) | Oracle 23ai | 난이도 |
|---|---|---|
| `vector(1024)` | `VECTOR(1024, FLOAT32)` | 쉬움 |
| HNSW (cosine) | HNSW (cosine) — 정식 지원 (`VECTOR_MEMORY_SIZE` 필요) | 쉬움 |
| `embedding <=> q` | `VECTOR_DISTANCE(embedding, q, COSINE)` | 쉬움 |
| 외부 BGE-M3 벡터 INSERT | `python-oracledb` / `node-oracledb` 로 그대로 INSERT | 쉬움 — **임베딩 파이프라인 변경 거의 없음** |

→ 상세: 옵시디언 「Oracle AI Vector Search (23ai)」

## 3. 진짜 비용은 "부가기능 이전" (벡터가 아님)

> 원칙: "벡터를 옮길 수 있나?"가 아니라 **"Supabase 부가기능을 어디로 옮길까?"** 를 먼저 산정.

| Supabase 종속기능 | Oracle 이전 방향 | 난관도 |
|---|---|---|
| **RLS 18개** | VPD(Virtual Private Database) 또는 앱 계층 권한 | ★★★ 최대 난관 |
| **Auth** | Oracle 자체 인증/외부 IdP 대체 설계 | ★★★ |
| RPC / SQL 함수 (`match_chunks`) | PL/SQL 또는 앱 계층 쿼리로 재작성 | ★★ |
| PostgREST 자동 REST | `oracledb` 직접 쿼리 (자동 REST 없음) | ★★ |
| JSONB / 배열 컬럼 | `JSON` 타입 / JSON 배열 | ★ |
| 클라이언트 (`supabase-js`/`supabase-py`) | `node-oracledb` / `python-oracledb` | ★★ |

## 4. 시나리오

- **A. DB 전체 이전 (권장·깔끔)** — Supabase 클라이언트→`oracledb`, RLS→VPD/앱계층, Auth 대체,
  JSONB→JSON, 배열→JSON. **RLS·Auth 재설계가 최대 난관.** 최종 목표 아키텍처.
- **B. 벡터만 Oracle + 앱데이터 Supabase 유지** — 변경 최소지만 **이중 DB 동기화** 복잡. 시연용/중간단계.

## 5. 단계별 로드맵

### Phase 0 — 환경·분리 (완료 ✅, 2026-06-23)
- [x] 복제본을 운영 repo에서 git 분리 (remote 제거, 새 init)
- [x] 프로덕션 MCP(supabase·cloudflare×3) 제거, sentry·playwright 유지
- [ ] 23ai Free(12GB·2CPU) 인스턴스 확보 (Autonomous DB Free 또는 로컬 컨테이너)
- [ ] `python-oracledb` 연결 PoC (thin 모드)

### Phase 1 — 벡터 레이어 PoC (다음 작업)
- [ ] `chunks` 스키마를 Oracle DDL로 변환 (`VECTOR(1024, FLOAT32)` + HNSW cosine)
- [ ] 현재 Supabase의 chunks ~1,347행 + 1024d 벡터 export → Oracle INSERT
- [ ] `VECTOR_DISTANCE(..., COSINE)` Top-K 결과가 **`match_chunks`와 일치**하는지 왕복 검증 (소규모라 빠름)
- [ ] 도메인/제품/출처 필터 + 전문가 우선 로직을 Oracle 쿼리로 재현

### Phase 2 — 부가기능 이전 공수 산정 (시나리오 A)
- [ ] RLS 18개 → VPD/앱계층 매핑표 작성, 공수 산정
- [ ] Auth 대체 설계
- [ ] `match_chunks` 외 SQL 함수·RPC 인벤토리 → 재작성 계획

### Phase 3 — 앱 통합
- [ ] `lib/rag.ts`(node-oracledb) · `answer.py`(python-oracledb) 검색 호출부 교체
- [ ] 인제스트/임베딩 파이프라인 Oracle INSERT로 전환 (임베딩 생성부는 유지)

### Phase 4 — 검증·시연
- [ ] RAG 답변·5축 평가·출처 추적이 pgvector 버전과 동등한지 회귀 검증
- [ ] 보안/거버넌스 강점(TDE·VPD·감사) 시연 자료 (수요기업 설득 논리)

## 6. 트레이드오프·주의

- **운영비**: 현재 월 ≈ $0 (CF+Supabase+Modal) ↔ Oracle(Autonomous/자체호스팅). **23ai Free는 12GB 한도** — PoC엔 충분.
- **성능**: 현 규모(~1.3K행)에선 둘 다 무의미하게 빠름. Oracle 강점은 **대규모·보안·거버넌스**.
- **운영 repo 영향 금지**: 이 복제본 작업은 원본 `github.com/YJlang/DILAB`와 운영 데모에 **절대 영향 없어야 함**. push·프로덕션 백엔드 변경 금지.

## 7. 함께 진행할 문서 리팩토링 (agent md)

이 전환 방향을 Claude Code가 매 세션 인지하도록 agent 문서를 갱신한다.

| 문서 | 갱신 내용 | 상태 |
|---|---|---|
| `CLAUDE.md` | 분리된 복제본 배너 + Oracle 전환 단계(8) + MCP 현황(sentry·playwright) | 진행 |
| `README.md` | 복제본/Oracle 전환 정체성 | 대기 |
| `docs/AGENT_HANDOFF.md` | Oracle 전환 컨텍스트로 인계 절차 갱신 | 대기 |
| `docs/OPERATIONS.md` · `docs/DEPLOYMENT_PLAN.md` | 운영 절차는 원본 소유임을 명시(복제본은 R&D) | 대기 |
| `docs/HOW_IT_WORKS.md` | 벡터 레이어 Oracle 대체 반영 | 대기 |

## 8. 🔗 근거 (옵시디언 거대한 뇌)

- 「DILAB Oracle AI Vector Search 전환 타당성」 (프로젝트)
- 「Oracle AI Vector Search (23ai)」 (백엔드 reference)
- 「벡터 DB 마이그레이션의 진짜 비용은 부가기능 이전」 (백엔드 패턴)
- 「DILAB (제품평가 RAG 시스템)」 (프로젝트 허브)
