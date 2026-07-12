from app.schemas import Minutes, AnalyzeResponse, ActionItem, Sentiment


def test_minutes_defaults_are_safe():
    m = Minutes()
    assert m.title
    assert m.attendees == []
    assert m.action_items == []
    assert m.sentiment.overall == "neutral"


def test_minutes_parses_full_payload():
    m = Minutes(
        title="Q3 Sync",
        date="2026-07-11",
        location="Zoom",
        attendees=["Ana", "Ben"],
        summary="We synced.",
        discussion_points=["budget"],
        takeaways=["ship it"],
        action_items=[{"owner": "Ana", "task": "email finance"}],
        key_decisions=["approve budget"],
        sentiment={"overall": "positive", "note": "upbeat"},
        topics=["budget", "hiring"],
    )
    assert m.action_items[0] == ActionItem(owner="Ana", task="email finance")
    assert isinstance(m.sentiment, Sentiment)


def test_analyze_response_shape():
    r = AnalyzeResponse(transcript="hi", minutes=Minutes(), provider="openai")
    assert r.provider == "openai"
    assert r.transcript == "hi"


from app import llm
from app.config import settings


def test_generation_client_openai(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    monkeypatch.setattr(settings, "generation_model", "gpt-4o-mini")
    client, model = llm.get_generation_client()
    assert model == "gpt-4o-mini"
    assert "openrouter" not in str(client.base_url)


def test_generation_client_openrouter(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openrouter")
    monkeypatch.setattr(settings, "openrouter_api_key", "or-test")
    monkeypatch.setattr(settings, "generation_model", "openai/gpt-4o-mini")
    client, model = llm.get_generation_client()
    assert model == "openai/gpt-4o-mini"
    assert "openrouter.ai" in str(client.base_url)


def test_transcription_client_openai(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    monkeypatch.setattr(settings, "transcription_model", "gpt-4o-mini-transcribe")
    client, model = llm.get_transcription_client()
    assert model == "gpt-4o-mini-transcribe"
    assert "openrouter" not in str(client.base_url)


def test_transcription_client_openrouter(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openrouter")
    monkeypatch.setattr(settings, "openrouter_api_key", "or-test")
    monkeypatch.setattr(settings, "transcription_model", "openai/whisper-1")
    client, model = llm.get_transcription_client()
    assert model == "openai/whisper-1"
    assert "openrouter.ai" in str(client.base_url)


def test_missing_api_key_tracks_provider(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openrouter")
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    assert llm.missing_api_key() == "OPENROUTER_API_KEY"
    monkeypatch.setattr(settings, "openrouter_api_key", "or-test")
    assert llm.missing_api_key() is None

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "")
    assert llm.missing_api_key() == "OPENAI_API_KEY"
