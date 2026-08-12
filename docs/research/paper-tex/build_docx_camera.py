"""PyGeek 2026 카메라레디 DOCX 빌더.

심사본 빌더(`build_docx.py`)를 그대로 재사용하고 **달라지는 것만** 여기서 덮어쓴다.
본문을 복사해 두 벌로 관리하면 한쪽만 고쳐져 어긋나므로, 원본을 import 해서
델타만 적용한다. 그래서 이 파일 자체가 "심사본 → 카메라레디 수정 내역"이 된다.

달라지는 것은 두 갈래다.

1) 억셉 후 추가되는 절 (Author Guidelines §9)
   - 저자명·소속·교신저자 (첫 페이지 제목 블록)
   - Conflict of Interest (본문 끝)
   ※ Acknowledgement 와 Author Information 은 지도교수 판단으로 넣지 않는다
     (2026-08-11 회신). 따라서 저자 사진·약력·연구관심사도 불필요.

2) 리뷰어 지적 반영 (둘 다 accept, minor)
   - #1·#2 "용어·약어 일관성"
   - #2 "인용 형식·간격 일관성"
   구체적인 항목은 아래 PATCHES 에 하나씩 근거와 함께 적어 두었다.

산출물은 `pygeek2026-en-camera.tex` 를 컴파일한 PDF 와 문자 단위로 같아야 한다.
검증은 `verify_docx.py --camera` 가 한다.
"""

import shutil
import sys
from pathlib import Path

import build_docx as B

HERE = Path(__file__).resolve().parent
STEM = "PyGeek2026_EN_카메라레디_최종"


def sub(text: str, old: str, new: str) -> str:
    """치환 대상이 실제로 있을 때만 바꾼다.

    원문이 조금이라도 달라지면 치환은 조용히 실패하고 옛 표현이 그대로 남는다.
    그 상태로 빌드되면 PDF 와 DOCX 가 어긋나므로 여기서 즉시 멈춘다.
    """
    if old not in text:
        raise AssertionError(f"치환 대상을 찾지 못했다:\n  {old!r}")
    return text.replace(old, new)


# ==========================================================================
# 1) 억셉 후 추가되는 절
# ==========================================================================
B.TEMPLATE = B.ROOT / "docs/reference/pygeek-templates/PyGeek_Template_Camera-ready.docx"
B.OUT = HERE / f"{STEM}.docx"

B.AUTHORS = (
    r"Junha Yoon\textsuperscript{1}, Ohhyeon Gwon\textsuperscript{2}, "
    r"Junhaeng Lee\textsuperscript{3}, Hyeji Roh\textsuperscript{3}, "
    r"Soowan Cho\textsuperscript{4}, Suhee Kim\textsuperscript{4}, "
    r"and SangSoon Lim\textsuperscript{5}"
)

# 템플릿 형식: `직위/과정, 학과, 기관, 국가`.
# 3번과 5번은 같은 학부지만 과정/직위가 달라 번호를 나눈다.
# 4번은 회사라 학과가 없고, 직위는 본인들이 표기하지 않기로 해 기관만 적는다.
# 기관명 `Deep Insight Lab` 은 공식 사이트(deepinsightlab.co.kr) 표기와 대조 확인함.
B.AFFILIATIONS = [
    r"\textsuperscript{1}BS Course, Department of Media Software, Sungkyul University, South Korea",
    r"\textsuperscript{2}BS Course, Department of Computer Engineering, Sungkyul University, South Korea",
    r"\textsuperscript{3}MS Course, College of Art \& Technology, Chung-Ang University, South Korea",
    r"\textsuperscript{4}Deep Insight Lab, South Korea",
    r"\textsuperscript{5}Professor, College of Art \& Technology, Chung-Ang University, South Korea",
]

B.CORRESPONDING = r"Corresponding author: SangSoon Lim (slim@cau.ac.kr)"

B.COI = ("The authors declare that there are no potential conflicts of "
         "interest related to this paper.")

# 심사본은 `Keywords:` 라벨을 9pt 로 냈지만 템플릿 실측값은 12pt bold 다.
# 카메라레디는 서식 준수가 곧 심사 통과 조건이므로 템플릿에 맞춘다.
B.KEYWORD_LABEL_PT = 12


# ==========================================================================
# 2) 리뷰어 지적 반영 — 표기 일관성
# ==========================================================================

# (a) 같은 개념을 다섯 가지로 부르고 있었다:
#     "model-size constraint" / "model-file size limit" / "file-size limit" /
#     "model-capacity limit" / "capacity limit of the model" → "model size limit"
B.INTRO[1] = sub(B.INTRO[1],
                 "a database that hosts a model limits the size of the model file",
                 "a database that hosts a model imposes a model size limit")
B.INTRO[2] = sub(B.INTRO[2],
                 "a different instance class or model-size constraint",
                 "a different instance class or model size limit")
B.SEC22 = sub(B.SEC22,
              "a built-in model follows the model-file size limit the database allows",
              "a built-in model must satisfy the model size limit the database allows")
B.SEC31[1] = sub(B.SEC31[1],
                 "because the file-size limit of Section 2.2",
                 "because the model size limit of Section 2.2")
B.SEC32[4] = sub(B.SEC32[4],
                 "the placement factor and the model-capacity limit that comes with it",
                 "the placement factor and the model size limit that comes with it")
B.CONCLUSION[0] = sub(B.CONCLUSION[0],
                      "one has to accept the capacity limit of the model and",
                      "one has to accept the model size limit and")
B.CONCLUSION[1] = sub(B.CONCLUSION[1],
                      "placement and model capacity are coupled by construction",
                      "placement and model size are coupled by construction")

# (b) 약어를 첫 등장에서 정의하지 않고 있었다 (ONNX·HNSW)
B.FIG1_TEXT = sub(B.FIG1_TEXT,
                  "with its built-in ONNX inference runtime",
                  "with its built-in Open Neural Network Exchange (ONNX) inference runtime")
B.FIG2_TEXT = sub(B.FIG2_TEXT,
                  "The store explores candidates with an HNSW approximate index",
                  "The store explores candidates with a hierarchical navigable "
                  "small world (HNSW) approximate index")
B.SEC31[4] = sub(B.SEC31[4],
                 "Confidence intervals were obtained",
                 "Confidence intervals (CIs) were obtained")   # 표의 "95% CI" 대응

# (c) 같은 동작을 서론은 "computed", 실험 설정은 "executed" 로 불렀다
B.SEC31[0] = sub(B.SEC31[0],
                 "$P$ is where the embedding is executed",
                 "$P$ is where the embedding is computed")

# (d) 지표 이름이 본문과 표에서 달랐다 ("actual time taken" vs "search latency")
B.SEC31[3] = sub(B.SEC31[3],
                 "The third is the actual time taken to process a single query.",
                 "The third is the search latency, the actual time taken to "
                 "process a single query.")

# (e) 같은 대상을 본문은 서술로, 표는 축약으로만 불러 정식 명칭이 어디에도 없었다
B.TABLE1_NOTE = sub(B.TABLE1_NOTE,
                    "e5-small denotes multilingual-e5-small.",
                    "Oracle 26ai denotes Oracle AI Database 26ai [3], and "
                    "e5-small denotes multilingual-e5-small [4].")

# (f) 초록 — 두 가지를 한꺼번에 고쳤으므로 문장째 교체한다.
#     ① 심사본은 224단어로 템플릿 규정(150~200)을 넘겼다 → 196단어로 압축.
#        수치·주장은 하나도 덜어내지 않고 늘어진 구문만 줄였다
#        ("of the system" 삭제, "one comparison in which the two factors are
#         entangled" → "the entangled comparison" 등).
#     ② 유효숫자를 표와 맞췄다 (0.52 → 0.523, 0.47 → 0.473).
_ABSTRACT_OLD_HEAD = "When the vector layer of a retrieval-augmented generation (RAG) system"
assert B.ABSTRACT.startswith(_ABSTRACT_OLD_HEAD), "초록 원문이 예상과 다르다"
B.ABSTRACT = (
    r"""When the vector layer of a retrieval-augmented generation (RAG) system is migrated to a different database, the effect is usually assessed by an end-to-end comparison before and after the migration. That comparison, however, blends two independent but co-occurring changes into a single measurement, namely substituting the store engine and relocating where the embedding is computed, so it cannot tell which factor caused the change. This paper introduces a bridge condition, in which the target store is loaded with the embeddings the source system has already produced, so that the entangled comparison splits into two comparisons that each differ in one factor only. It requires no re-embedding, so it is inexpensive and leaves the running service untouched. Applied to a Korean product-review RAG service in production (1,347 chunks, 43 queries), the store substitution showed no detectable change in retrieval quality (top-10 Jaccard 0.971, relevance difference $-$0.042, $p = 0.523$), whereas relocating the embedding into the database produced a significant, medium-sized effect ($p = 0.003$, Cohen's $d_z = 0.473$). Virtually all of the observed change therefore comes from the placement factor. The method does not judge any particular product and applies to migrations to converged databases in general."""
)

# (g) 같은 학회를 두 가지 서지 형식으로 적고 있었다 ([1] vs [8])
B.REFERENCES[7] = sub(
    B.REFERENCES[7],
    "``Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena,'' "
    "Advances in Neural Information Processing Systems 36 (NeurIPS 2023), "
    "Datasets and Benchmarks Track, 2023.",
    "``Judging LLM-as-a-judge with MT-Bench and Chatbot Arena,'' "
    "Advances in Neural Information Processing Systems, vol. 36, "
    "Datasets and Benchmarks Track, 2023.")


if __name__ == "__main__":
    B.build()
    src_pdf = HERE / "pygeek2026-en-camera.pdf"
    if src_pdf.exists():
        shutil.copy2(src_pdf, HERE / f"{STEM}.pdf")
        print(f"PDF  → {STEM}.pdf")
    else:
        print("⚠️  pygeek2026-en-camera.pdf 가 없다. xelatex 을 먼저 돌려라.", file=sys.stderr)
    print(f"DOCX → {B.OUT.name}")
