"""DeepSeek LLM 클라이언트 (OpenAI 호환 API).

DILAB B5 — DILAB Ask 답변 합성, B3 분류·감성 zero-shot, B4 여정 매핑.
"""
from functools import lru_cache

from openai import OpenAI

from ..config import settings


@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    """프로세스당 1회만 생성."""
    return OpenAI(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
    )


def chat(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 3000,  # 추론모델(v4-pro)은 reasoning 토큰을 먹으므로 여유 확보
) -> str:
    """채팅 보완 호출. messages 는 OpenAI 형식 [{"role":"system|user|assistant","content":"..."}]."""
    client = get_client()
    # [리뷰] 타임아웃·재시도(retry) 정책이 없음. DeepSeek 이 느리거나 끊기면 그대로 예외 전파.
    #        라벨링 루프(label_domain)는 청크 단위 try/except 로 1건만 버리지만, ask/compare 는 통째 실패.
    response = client.chat.completions.create(
        model=model or settings.llm_model,
        messages=messages,  # type: ignore[arg-type]
        temperature=temperature,
        max_tokens=max_tokens,
    )
    # [리뷰] 응답이 비면 예외가 아니라 빈 문자열 "". 호출부의 JSON 파서가 이를 받아
    #        기본값으로 흘리므로, "조용한 실패"가 어디까지 번지는지 호출부와 같이 볼 것.
    return response.choices[0].message.content or ""
