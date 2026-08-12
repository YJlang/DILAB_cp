# PyGeek 2026 제출 입력값 (복사용)

> 대상: `https://pygeek.acin.kr` ▸ Author Center ▸ **Submit Paper** (`/cfp/system/new`)
> 마감: **2026-08-10** (시각·시간대 미표기 → 당일 최대한 일찍)
> AS_OF 2026-08-10

---

## 0. 먼저 알아둘 것

- **제출하면 수정·재제출 불가.** `Once a paper is submitted, authors cannot edit or resubmit that submission.`
- 철회(Withdraw)는 상태가 `Submitted`일 때만 가능하고, 철회하면 **처음부터 새 submission**을 만들어야 한다.
- 그래서 **`Save as Draft` → 눈으로 확인 → `Submit Final`** 순서로 간다. Draft는 제출로 치지 않는다.
- 이번에 내는 건 **심사용 익명판**이다. 저자 이름이 박힌 camera-ready 판(`PyGeek2026_junha_영문최종.pdf`)은 **올리면 안 된다** — 채택 통보(8/15) 후 8/22 마감분이다.

---

## 1. Paper Information

**Conference Year**

```
2026
```

**Paper Title** — 업로드한 원고의 제목과 **글자 하나까지 동일해야 한다**

```
A Factor Decomposition Method for Separating Store Substitution and Embedding Placement Effects in Vector Database Migration
```

- 가이드라인 §6의 `Capitalize the first letter of major words in the English title (except articles, conjunctions, and prepositions)` 를 이미 충족한다 (`for`, `and`, `in` 만 소문자).
- 국문 제목은 넣지 않는다 (영문 원고로 확정).

**Abstract** — 원고 초록과 동일. 위첨자를 못 쓰는 칸이라 `d_z` 만 `dz` 로 적는다.

```
When the vector layer of a retrieval-augmented generation (RAG) system is migrated to a different database, the effect is usually assessed by an end-to-end comparison of the system before and after the migration. That comparison, however, blends into a single measurement two changes that are independent yet occur together in practice, namely substituting the store engine and relocating where the embedding is computed, which makes it impossible to tell which factor caused the change. This paper proposes a method that introduces a bridge condition, in which the target store is loaded with the embeddings the source system has already produced, so that one comparison in which the two factors are entangled is split into two comparisons that each differ in one factor only. The bridge condition requires no re-embedding, so it is inexpensive and leaves the running service untouched. Applied to a Korean product-review RAG service in production (1,347 chunks, 43 queries), no change in retrieval quality was detected for the store substitution (top-10 Jaccard 0.971, relevance difference -0.042, p = 0.52), whereas relocating the embedding into the database produced a significant, medium-sized effect (p = 0.003, Cohen's dz = 0.47). Virtually all of the observed change therefore originates from the embedding placement factor. The method does not judge the superiority of any particular product and applies to migrations to converged databases in general.
```

**Keywords** — `Add Keyword` 버튼으로 **하나씩** 추가 (허용 3~10개, 우리는 5개)

```
Retrieval-Augmented Generation
Vector Database
In-Database Embedding
Migration
Factor Decomposition
```

---

## 2. Authors — `+ Add Author` 로 7명, 순서대로

교신저자 체크박스는 **임상순 한 명만** (`Select exactly one corresponding author`).

| # | Title | Full Name | Notification Email | Affiliation | Country | 교신 |
|---|---|---|---|---|---|---|
| 1 | Mr | Junha Yoon | wnsgk111400@sungkyul.ac.kr | Sungkyul University | South Korea | |
| 2 | Mr | Ohhyeon Gwon | ruud5521@gmail.com | Sungkyul University | South Korea | |
| 3 | MSc | Junhaeng Lee | junang1128@gmail.com | Chung-Ang University | South Korea | |
| 4 | MSc | Hyeji Roh | shgpwl509@cau.ac.kr | Chung-Ang University | South Korea | |
| 5 | Mr | Soowan Cho | soowanc@naver.com | Deep Insight Lab | South Korea | |
| 6 | Ms | Suhee Kim | shkim8161@gmail.com | Deep Insight Lab | South Korea | |
| 7 | Prof | SangSoon Lim | slim@cau.ac.kr | Chung-Ang University | South Korea | **✓** |

- **Country**: 직접 입력이 아니라 검색형 콤보다. `Ko` 정도만 쳐서 뜨는 항목을 고른다.
- **Research Area / Address**: 필수 아님. 채우려면 Research Area 에 `Information Retrieval` 정도.
- ⚠️ **Title(호칭) 확인 필요**: 선택지가 `Mr / Mrs / Ms / Dr / Prof / PhD / MSc` 뿐이라 학부생·회사 구성원은 성별이 드러나는 호칭밖에 없다. 위 `Mr`/`Ms` 는 확인되지 않은 추정이므로 본인들에게 확인할 것. 대학원생 2명은 성별 중립인 `MSc` 로 두었다.
- 저자 이름·소속을 폼에 넣는 것은 double-blind 위반이 아니다. 익명이어야 하는 것은 **업로드 원고**이고, 폼 메타데이터는 의장단이 보는 정보다.

---

## 3. File Upload — 두 칸 모두 필수

| 칸 | 올릴 파일 | 허용 형식 |
|---|---|---|
| **Editable Source File** | `PyGeek2026_EN_심사용_익명.docx` | hwp, hwpx, doc, docx, ppt, pptx (200MB) |
| **PDF File** | `PyGeek2026_EN_심사용_익명.pdf` | pdf (200MB) |

두 파일 모두 `docs/research/paper-tex/` 에 있다. 본문이 문자 단위로 동일함은 `verify_docx.py` 로 검증됨.

---

## 4. 제출 절차

1. `https://pygeek.acin.kr` 로그인 → **Author Center ▸ Submit Paper**
2. 위 1~3 항목 입력
3. **`Save as Draft`** 클릭 → Dashboard 에서 저장 확인
4. Draft 를 열어 제목·초록·저자 순서·교신저자 체크·첨부 2개를 눈으로 재확인
5. 이상 없으면 **`Submit Final`**
6. Dashboard 의 Status 가 **`Submitted`** 로 바뀌었는지 확인 (여기까지 와야 접수된 것)

---

## 5. 제출 직전 최종 체크

- [ ] 업로드한 PDF/DOCX 에 **저자 이름·소속이 없다** (익명판이 맞다)
- [ ] Conflict of Interest / Acknowledgement 절이 **없다** (camera-ready 전용)
- [ ] 분량 **4쪽** (허용 2~5쪽)
- [ ] 폼의 Paper Title 이 원고 제목과 **완전히 동일**
- [ ] 저자 7명, 순서 정확, 교신저자 체크 **1개**
- [ ] 파일 2개 모두 첨부됨
- [ ] Status = `Submitted`

---

## 6. 이후 일정

| 일정 | 날짜 | 할 일 |
|---|---|---|
| 채택 통보 | 2026-08-15 | 결과 확인 |
| **Camera-ready 마감** | 2026-08-22 | 저자 포함판 제출 (`PyGeek2026_junha_영문최종.pdf` + 동일 내용 DOCX) |
| 학회 | 2026-08-19~21 | 홍익대학교 |
