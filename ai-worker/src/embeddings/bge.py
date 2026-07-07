"""BGE-M3 임베딩 — DILAB B1.

청크 텍스트 → 1024 차 벡터 → Supabase pgvector. 한·영 다국어, 자체 호스팅.

────────────────────────────────────────────────────────────────────────
[초보자 설명] 이 파일이 하는 일 = "글을 숫자로 바꾸는 변환기".

컴퓨터는 글자가 아니라 숫자만 다룰 수 있어서, 문장의 *의미*를 숫자 목록으로
바꿔야 한다. 그 숫자 목록을 '임베딩(embedding)'이라 부른다.

  "촉촉해요"      → [0.12, -0.85, ...]  (숫자 1024개)
  "보습력 좋아요"  → [0.14, -0.81, ...]  ← 뜻이 비슷 → 숫자도 가까움
  "향이 별로"      → [-0.77, 0.40, ...]  ← 뜻이 다름 → 숫자가 멀리

핵심: *뜻이 비슷한 문장은 숫자도 가깝게* 나온다. 그래서 나중에
"이 질문과 가까운 후기 찾기"를 숫자 거리 계산으로 할 수 있다(= RAG 검색의 토대).

이 파일의 함수 3개:
  get_model()   — 변환기(AI 모델, 수 GB)를 켠다. @lru_cache 로 *한 번만* 켜고 재사용.
  embed_texts() — 문장 여러 개를 한 번에(batch) 숫자로 변환. (1개씩 N번보다 빠름)
  embed_one()   — 문장 1개만 변환하는 편의 함수.
────────────────────────────────────────────────────────────────────────
"""
from functools import lru_cache
from typing import Any

from ..config import settings

# [Oracle 전환] sentence_transformers 는 지연 import — 임베딩은 Oracle in-DB(VECTOR_EMBEDDING)로
# 이관돼 이 경로는 안 쓰인다. 패키지 import 만으로 torch 를 끌어오지 않도록 함수 안에서 import.


@lru_cache(maxsize=1)
def get_model() -> Any:
    """프로세스당 1회만 로드 (가중치 ~수 GB). (레거시 — 현재 파이프라인 미사용)"""
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.embedding_model_name)


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_model()
    # [리뷰] normalize=True → 벡터 길이를 1로. 이후 match_chunks 의 코사인 유사도 검색이
    #        깨끗하게 동작하기 위한 전제(임베딩-검색 양쪽이 같은 가정을 공유해야 함).
    #        리스트로 한 번에 넘기는 batch 처리 → 1개씩 N번보다 빠름.
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vectors.tolist()


def embed_one(text: str) -> list[float]:
    return embed_texts([text])[0]
