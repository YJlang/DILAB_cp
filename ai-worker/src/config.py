from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str = Field(..., description="Supabase 프로젝트 URL")
    supabase_service_role_key: str = Field(
        ..., description="Supabase service_role JWT — 워커 전용, RLS 우회"
    )

    # DeepSeek (OpenAI 호환 API)
    deepseek_api_key: str = Field(..., description="DeepSeek API 키")
    deepseek_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-chat"  # (env LLM_MODEL 로 오버라이드) Ask 합성 — v4-pro(추론)
    # 라벨링(청크 분류)은 대량·단순 → 비추론 deepseek-chat(≈1초). v4 추론모델은 청크당 10초+ 라 과함.
    label_model: str = "deepseek-chat"

    # Naver Open API
    naver_client_id: str | None = None
    naver_client_secret: str | None = None

    # 임베딩
    embedding_model_name: str = "BAAI/bge-m3"
    embedding_dimension: int = 1024

    # 환경
    environment: str = "development"
    log_level: str = "info"


settings = Settings()  # type: ignore[call-arg]  # .env 에서 로드
