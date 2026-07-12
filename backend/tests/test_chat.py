import httpx
import pytest
from fastapi.testclient import TestClient
from openai import RateLimitError
from app import chat, main
from app.schemas import ChatMessage


@pytest.fixture
def client():
    return TestClient(main.app)


def _rate_limit_error(retry_after=None):
    headers = {} if retry_after is None else {"retry-after": str(retry_after)}
    response = httpx.Response(
        status_code=429,
        headers=headers,
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )
    return RateLimitError("rate limited", response=response, body=None)


class _FakeMessage:
    def __init__(self, content): self.content = content


class _FakeChoice:
    def __init__(self, content): self.message = _FakeMessage(content)


class _FakeCompletion:
    def __init__(self, content): self.choices = [_FakeChoice(content)]


class _FakeChat:
    def __init__(self, content): self._content = content; self.completions = self
    def create(self, **kwargs): self.kwargs = kwargs; return _FakeCompletion(self._content)


class _FakeClient:
    def __init__(self, content): self.chat = _FakeChat(content)


def test_answer_question_grounds_on_transcript(monkeypatch):
    fake = _FakeClient("The deadline is Friday.")
    monkeypatch.setattr(chat, "get_chat_client", lambda: (fake, "some/model:free"))
    reply = chat.answer_question(
        "We agreed the deadline is Friday.",
        [ChatMessage(role="user", content="When is the deadline?")],
    )
    assert reply == "The deadline is Friday."
    sent = fake.chat.kwargs["messages"]
    assert sent[0]["role"] == "system"
    assert "deadline is Friday" in sent[0]["content"]
    assert sent[-1] == {"role": "user", "content": "When is the deadline?"}


def test_answer_question_truncates_long_transcript(monkeypatch):
    fake = _FakeClient("ok")
    monkeypatch.setattr(chat, "get_chat_client", lambda: (fake, "m"))
    chat.answer_question(
        "x" * (chat.MAX_TRANSCRIPT_CHARS + 500),
        [ChatMessage(role="user", content="hi")],
    )
    assert "[transcript truncated]" in fake.chat.kwargs["messages"][0]["content"]


def test_answer_question_general_without_transcript(monkeypatch):
    fake = _FakeClient("Sure, happy to help.")
    monkeypatch.setattr(chat, "get_chat_client", lambda: (fake, "m"))
    reply = chat.answer_question("", [ChatMessage(role="user", content="hi there")])
    assert reply == "Sure, happy to help."
    system = fake.chat.kwargs["messages"][0]["content"]
    assert system == chat.GENERAL_SYSTEM_PROMPT
    assert "Transcript:" not in system


class _FlakyChat:
    """Fails with a 429 the first `fail_times` calls, then returns content."""

    def __init__(self, fail_times, content, retry_after=1):
        self._fail_times = fail_times
        self._content = content
        self._retry_after = retry_after
        self.calls = 0
        self.completions = self

    def create(self, **kwargs):
        self.calls += 1
        if self.calls <= self._fail_times:
            raise _rate_limit_error(retry_after=self._retry_after)
        return _FakeCompletion(self._content)


class _FlakyClient:
    def __init__(self, fail_times, content, retry_after=1):
        self.chat = _FlakyChat(fail_times, content, retry_after)


def test_parse_retry_after_reads_header():
    assert chat.parse_retry_after(_rate_limit_error(retry_after=42)) == 42
    assert chat.parse_retry_after(_rate_limit_error(retry_after=None)) is None


def test_answer_question_retries_transient_rate_limit(monkeypatch):
    monkeypatch.setattr(chat.time, "sleep", lambda _s: None)
    fake = _FlakyClient(fail_times=2, content="Recovered.")
    monkeypatch.setattr(chat, "get_chat_client", lambda: (fake, "m"))
    reply = chat.answer_question("", [ChatMessage(role="user", content="hi")])
    assert reply == "Recovered."
    assert fake.chat.calls == 3  # two 429s, then success


def test_answer_question_reraises_after_exhausting_retries(monkeypatch):
    monkeypatch.setattr(chat.time, "sleep", lambda _s: None)
    fake = _FlakyClient(fail_times=99, content="never")
    monkeypatch.setattr(chat, "get_chat_client", lambda: (fake, "m"))
    with pytest.raises(RateLimitError):
        chat.answer_question("", [ChatMessage(role="user", content="hi")])
    assert fake.chat.calls == chat.MAX_CHAT_ATTEMPTS


def test_answer_question_bails_when_retry_after_too_long(monkeypatch):
    slept: list[float] = []
    monkeypatch.setattr(chat.time, "sleep", lambda s: slept.append(s))
    # Retry-After longer than we're willing to absorb inline -> give up at once.
    fake = _FlakyClient(fail_times=99, content="never", retry_after=120)
    monkeypatch.setattr(chat, "get_chat_client", lambda: (fake, "m"))
    with pytest.raises(RateLimitError):
        chat.answer_question("", [ChatMessage(role="user", content="hi")])
    assert fake.chat.calls == 1
    assert slept == []


def test_chat_endpoint_returns_429_when_rate_limited(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openrouter_api_key", "or-test")

    def _raise(_t, _m):
        raise _rate_limit_error(retry_after=15)

    monkeypatch.setattr(main, "answer_question", _raise)
    r = client.post("/api/chat", json={"messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 429
    assert r.headers["retry-after"] == "15"
    assert "busy" in r.json()["detail"].lower()


def test_chat_endpoint_returns_reply(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openrouter_api_key", "or-test")
    monkeypatch.setattr(main, "answer_question", lambda t, m: "Here's the summary.")
    r = client.post(
        "/api/chat",
        json={"transcript": "some meeting", "messages": [{"role": "user", "content": "summarize"}]},
    )
    assert r.status_code == 200
    assert r.json()["reply"] == "Here's the summary."


def test_chat_endpoint_requires_config(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openrouter_api_key", "")
    r = client.post(
        "/api/chat",
        json={"transcript": "x", "messages": [{"role": "user", "content": "hi"}]},
    )
    assert r.status_code == 400


def test_chat_endpoint_rejects_non_user_last(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openrouter_api_key", "or-test")
    r = client.post(
        "/api/chat",
        json={"transcript": "x", "messages": [{"role": "assistant", "content": "hi"}]},
    )
    assert r.status_code == 400


def test_chat_endpoint_allows_empty_transcript(client, monkeypatch):
    # Empty transcript is valid: chat runs as the general assistant.
    monkeypatch.setattr(main.settings, "openrouter_api_key", "or-test")
    monkeypatch.setattr(main, "answer_question", lambda t, m: "General reply.")
    r = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert r.status_code == 200
    assert r.json()["reply"] == "General reply."


def test_config_reports_chat_available(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openrouter_api_key", "or-test")
    assert client.get("/api/config").json() == {"chat_available": True}
    monkeypatch.setattr(main.settings, "openrouter_api_key", "")
    assert client.get("/api/config").json() == {"chat_available": False}
