import io
import pytest
from fastapi.testclient import TestClient
from app import main
from app.schemas import AnalyzeResponse, Minutes


@pytest.fixture
def client():
    return TestClient(main.app)


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_analyze_happy_path(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openai_api_key", "sk-test")
    monkeypatch.setattr(main, "transcribe", lambda path: "Sam: deploy today")
    monkeypatch.setattr(
        main, "analyze",
        lambda t: AnalyzeResponse(transcript=t, minutes=Minutes(title="Standup"), provider="openai"),
    )
    files = {"file": ("meeting.mp3", io.BytesIO(b"fake audio"), "audio/mpeg")}
    r = client.post("/api/analyze", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["minutes"]["title"] == "Standup"
    assert body["provider"] == "openai"


def test_analyze_rejects_bad_extension(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openai_api_key", "sk-test")
    files = {"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}
    r = client.post("/api/analyze", files=files)
    assert r.status_code == 400


def test_analyze_rejects_oversized(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openai_api_key", "sk-test")
    monkeypatch.setattr(main.settings, "max_upload_mb", 0)
    files = {"file": ("meeting.mp3", io.BytesIO(b"x" * 1024), "audio/mpeg")}
    r = client.post("/api/analyze", files=files)
    assert r.status_code == 400


def test_analyze_requires_api_key(client, monkeypatch):
    monkeypatch.setattr(main.settings, "llm_provider", "openai")
    monkeypatch.setattr(main.settings, "openai_api_key", "")
    files = {"file": ("meeting.mp3", io.BytesIO(b"data"), "audio/mpeg")}
    r = client.post("/api/analyze", files=files)
    assert r.status_code == 500


def test_analyze_requires_openrouter_key_when_selected(client, monkeypatch):
    monkeypatch.setattr(main.settings, "llm_provider", "openrouter")
    monkeypatch.setattr(main.settings, "openrouter_api_key", "")
    files = {"file": ("meeting.mp3", io.BytesIO(b"data"), "audio/mpeg")}
    r = client.post("/api/analyze", files=files)
    assert r.status_code == 500


def test_analyze_rejects_empty_file(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openai_api_key", "sk-test")
    files = {"file": ("meeting.mp3", io.BytesIO(b""), "audio/mpeg")}
    r = client.post("/api/analyze", files=files)
    assert r.status_code == 400


def test_unknown_api_path_returns_404(client):
    # Unknown /api routes must 404 as API errors, not fall back to the SPA.
    r = client.get("/api/does-not-exist")
    assert r.status_code == 404
