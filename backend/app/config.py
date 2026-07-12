from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_provider: str = "openai"
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    generation_model: str = "gpt-4o-mini"
    transcription_model: str = "gpt-4o-mini-transcribe"
    max_upload_mb: int = 25


settings = Settings()
