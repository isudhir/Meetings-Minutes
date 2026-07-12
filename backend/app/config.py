from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_provider: str = "openai"
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    generation_model: str = "gpt-4o-mini"
    transcription_model: str = "gpt-4o-mini-transcribe"
    max_upload_mb: int = 25

    # Follow-up chat about a meeting. Always runs on OpenRouter (that's where the
    # free models live), independent of LLM_PROVIDER. Set CHAT_MODEL to any slug.
    chat_model: str = "meta-llama/llama-3.3-70b-instruct:free"

    # Upload rate limit, keyed by client IP + browser id. Set the window to 0 to
    # disable (handy for local development).
    rate_limit_uploads: int = 1
    rate_limit_window_seconds: int = 600


settings = Settings()
