import json
import pytest
from app import analyzer
from app.schemas import AnalyzeResponse


def test_extract_json_plain():
    assert analyzer._extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_with_fences():
    text = "```json\n{\"a\": 1}\n```"
    assert analyzer._extract_json(text) == {"a": 1}


class _FakeMessage:
    def __init__(self, content): self.content = content


class _FakeChoice:
    def __init__(self, content): self.message = _FakeMessage(content)


class _FakeCompletion:
    def __init__(self, content): self.choices = [_FakeChoice(content)]


class _FakeChat:
    def __init__(self, content): self._content = content; self.completions = self
    def create(self, **kwargs): return _FakeCompletion(self._content)


class _FakeClient:
    def __init__(self, content): self.chat = _FakeChat(content)


def test_analyze_builds_response(monkeypatch):
    payload = json.dumps({
        "title": "Standup",
        "summary": "Quick sync",
        "action_items": [{"owner": "Sam", "task": "deploy"}],
        "sentiment": {"overall": "positive", "note": "good"},
        "topics": ["release"],
    })
    monkeypatch.setattr(analyzer, "get_generation_client",
                        lambda: (_FakeClient(payload), "gpt-4o-mini"))
    monkeypatch.setattr(analyzer.settings, "llm_provider", "openai")
    result = analyzer.analyze("Sam: let's deploy today.")
    assert isinstance(result, AnalyzeResponse)
    assert result.minutes.title == "Standup"
    assert result.minutes.action_items[0].owner == "Sam"
    assert result.provider == "openai"


def test_analyze_raises_on_bad_json(monkeypatch):
    monkeypatch.setattr(analyzer, "get_generation_client",
                        lambda: (_FakeClient("not json at all"), "gpt-4o-mini"))
    with pytest.raises(ValueError):
        analyzer.analyze("whatever")
