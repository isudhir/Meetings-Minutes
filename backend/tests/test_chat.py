import pytest
from fastapi.testclient import TestClient
from app import chat, main
from app.schemas import ChatMessage


@pytest.fixture
def client():
    return TestClient(main.app)


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


def test_chat_endpoint_rejects_empty_transcript(client, monkeypatch):
    monkeypatch.setattr(main.settings, "openrouter_api_key", "or-test")
    r = client.post(
        "/api/chat",
        json={"transcript": "   ", "messages": [{"role": "user", "content": "hi"}]},
    )
    assert r.status_code == 400
