import io

import pytest
from fastapi.testclient import TestClient
from app import main, ratelimit
from app.schemas import AnalyzeResponse, Minutes


# --- the limiter itself ---------------------------------------------------

def test_first_reserve_allowed_then_blocked(monkeypatch):
    monkeypatch.setattr(ratelimit, "_now", lambda: 1000.0)
    assert ratelimit.check_and_reserve(["ip:a"], 1, 600) is None
    blocked = ratelimit.check_and_reserve(["ip:a"], 1, 600)
    assert blocked is not None and blocked > 0


def test_reserve_allows_after_window(monkeypatch):
    t = {"now": 1000.0}
    monkeypatch.setattr(ratelimit, "_now", lambda: t["now"])
    assert ratelimit.check_and_reserve(["ip:a"], 1, 600) is None
    t["now"] += 601
    assert ratelimit.check_and_reserve(["ip:a"], 1, 600) is None


def test_reserve_blocks_if_either_key_over_limit(monkeypatch):
    monkeypatch.setattr(ratelimit, "_now", lambda: 0.0)
    # ip A + browser X uses its slot
    assert ratelimit.check_and_reserve(["ip:a", "bid:x"], 1, 600) is None
    # same ip, new browser -> blocked by ip
    assert ratelimit.check_and_reserve(["ip:a", "bid:y"], 1, 600) is not None
    # new ip, same browser -> blocked by browser
    assert ratelimit.check_and_reserve(["ip:b", "bid:x"], 1, 600) is not None
    # fully fresh identity -> allowed
    assert ratelimit.check_and_reserve(["ip:c", "bid:z"], 1, 600) is None


def test_disabled_when_window_zero():
    for _ in range(5):
        assert ratelimit.check_and_reserve(["ip:a"], 1, 0) is None


# --- enforced through the endpoint ---------------------------------------

@pytest.fixture
def client():
    return TestClient(main.app)


def _mock_analyze(monkeypatch):
    monkeypatch.setattr(main.settings, "llm_provider", "openai")
    monkeypatch.setattr(main.settings, "openai_api_key", "sk-test")
    monkeypatch.setattr(main.settings, "rate_limit_uploads", 1)
    monkeypatch.setattr(main.settings, "rate_limit_window_seconds", 600)
    monkeypatch.setattr(main, "transcribe", lambda path: "hello")
    monkeypatch.setattr(
        main, "analyze",
        lambda t: AnalyzeResponse(transcript=t, minutes=Minutes(), provider="openai"),
    )


def _audio():
    return {"file": ("m.mp3", io.BytesIO(b"audio"), "audio/mpeg")}


def test_second_upload_within_window_is_rate_limited(client, monkeypatch):
    _mock_analyze(monkeypatch)
    headers = {"X-Client-Id": "abc"}
    assert client.post("/api/analyze", files=_audio(), headers=headers).status_code == 200
    blocked = client.post("/api/analyze", files=_audio(), headers=headers)
    assert blocked.status_code == 429
    assert "retry-after" in {k.lower() for k in blocked.headers}


def test_distinct_identities_are_not_limited(client, monkeypatch):
    _mock_analyze(monkeypatch)
    r1 = client.post(
        "/api/analyze", files=_audio(),
        headers={"X-Client-Id": "one", "X-Forwarded-For": "1.1.1.1"},
    )
    r2 = client.post(
        "/api/analyze", files=_audio(),
        headers={"X-Client-Id": "two", "X-Forwarded-For": "2.2.2.2"},
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
