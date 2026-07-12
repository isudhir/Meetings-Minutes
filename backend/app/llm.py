from openai import OpenAI
from .config import settings

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def _client_for_provider() -> OpenAI:
    """Build an OpenAI-SDK client pointed at the configured LLM_PROVIDER."""
    if settings.llm_provider == "openrouter":
        return OpenAI(
            api_key=settings.openrouter_api_key or "missing",
            base_url=OPENROUTER_BASE_URL,
        )
    return OpenAI(api_key=settings.openai_api_key or "missing")


def get_generation_client() -> tuple[OpenAI, str]:
    """Return (client, model) that writes the minutes."""
    return _client_for_provider(), settings.generation_model


def get_transcription_client() -> tuple[OpenAI, str]:
    """Return (client, model) that transcribes audio.

    Follows LLM_PROVIDER just like generation: OpenRouter now exposes an
    OpenAI-compatible /audio/transcriptions endpoint (e.g. "openai/whisper-1"),
    so the whole pipeline can run on one provider with one API key.
    """
    return _client_for_provider(), settings.transcription_model


def missing_api_key() -> str | None:
    """Name of the required API key that isn't set for the active provider, else None."""
    if settings.llm_provider == "openrouter":
        return None if settings.openrouter_api_key else "OPENROUTER_API_KEY"
    return None if settings.openai_api_key else "OPENAI_API_KEY"
