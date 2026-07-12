# Meeting Minutes AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable web app where a user uploads a meeting recording and gets structured minutes + insights in a polished UI, with export (copy/Markdown/PDF) and a feature-showcase homepage.

**Architecture:** Single Railway service. A Vite + React + TypeScript + Tailwind SPA builds to static files that a FastAPI backend serves alongside its API. Backend transcribes audio with OpenAI and generates structured minutes with an OpenAI-SDK-compatible provider (`openai` now, `openrouter` later) selected by config. Stateless — no database.

**Tech Stack:** FastAPI, Uvicorn, Pydantic v2, `openai` SDK, `pydantic-settings`, pytest (backend); Vite, React 18, TypeScript, Tailwind CSS, React Router, react-markdown (frontend); Docker + Railway (deploy).

## Global Constraints

- Python 3.14 available as `python`; Node 24 / npm 11 available. Git and Docker available.
- Platform is Windows; use PowerShell-friendly commands. Repo path has a space (`Meetings Minutes`) — quote paths.
- Transcription ALWAYS uses OpenAI (`OPENAI_API_KEY`); OpenRouter has no audio endpoint.
- Generation provider is chosen by `LLM_PROVIDER` = `openai` (default) or `openrouter`. Same `openai` SDK, only base_url/key/model change.
- Upload cap: `MAX_UPLOAD_MB` (default 25). Allowed extensions: `.mp3 .wav .m4a .mp4 .webm .mpga`.
- Output is a fixed structured JSON schema (see Task 2). No secrets in error messages sent to the client.
- No database, no auth, no saved history (stateless).
- Frontend dev proxies `/api` → `http://localhost:8000`. Production: FastAPI serves `frontend/dist`.
- Never commit real API keys. `.env` is gitignored; only `.env.example` is committed.
- Tests must not make real network calls — mock the OpenAI/OpenRouter clients.

---

## File Structure

```
Meetings Minutes/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # FastAPI app, routes, serves frontend dist
│   │   ├── config.py       # env-driven settings
│   │   ├── llm.py          # provider abstraction (which client + model)
│   │   ├── analyzer.py     # transcribe() + analyze()
│   │   └── schemas.py      # Pydantic models
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_config_llm.py
│   │   ├── test_analyzer.py
│   │   └── test_api.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/          # Home.tsx, Analyze.tsx
│   │   ├── components/     # Navbar.tsx, UploadZone.tsx, Results.tsx, Progress.tsx
│   │   ├── lib/            # api.ts, export.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── Dockerfile
├── railway.json
├── .dockerignore
├── .gitignore
├── .env.example
└── README.md
```

---

### Task 1: Repo scaffold, git, config files

**Files:**
- Create: `.gitignore`, `.env.example`, `.dockerignore`, `backend/app/__init__.py`, `backend/tests/__init__.py`

**Interfaces:**
- Produces: repo initialized with git; ignore rules; `.env.example` documenting all env vars consumed by `config.py` (Task 2).

- [ ] **Step 1: Initialize git**

Run (from repo root):
```bash
git init
git branch -M main
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Create `.gitignore`**

```
# Python
__pycache__/
*.pyc
.venv/
venv/
.pytest_cache/
*.egg-info/

# Node / frontend build
node_modules/
frontend/dist/

# Env & secrets
.env
*.local

# OS / editor
.DS_Store
Thumbs.db
.vscode/
.idea/
```

- [ ] **Step 3: Create `.dockerignore`**

```
node_modules
frontend/node_modules
frontend/dist
.venv
venv
__pycache__
.git
.pytest_cache
.env
docs
```

- [ ] **Step 4: Create `.env.example`**

```
# Which provider generates the minutes: openai (default) or openrouter
LLM_PROVIDER=openai

# OpenAI key — ALWAYS required (used for transcription; and generation when provider=openai)
OPENAI_API_KEY=

# OpenRouter key — only needed when LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=

# Chat model that writes the minutes
# openai example: gpt-4o-mini
# openrouter example: openai/gpt-4o-mini  or  meta-llama/llama-3.3-70b-instruct
GENERATION_MODEL=gpt-4o-mini

# Audio transcription model (OpenAI)
TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe

# Max upload size in MB (OpenAI hard limit is 25)
MAX_UPLOAD_MB=25
```

- [ ] **Step 5: Create empty package markers**

Create `backend/app/__init__.py` (empty) and `backend/tests/__init__.py` (empty).

- [ ] **Step 6: Commit**

```bash
git add .gitignore .dockerignore .env.example backend/app/__init__.py backend/tests/__init__.py docs
git commit -m "chore: scaffold repo, git ignore rules, and env template"
```

---

### Task 2: Backend settings + schemas

**Files:**
- Create: `backend/app/config.py`, `backend/app/schemas.py`, `backend/requirements.txt`
- Test: `backend/tests/test_config_llm.py` (schema part)

**Interfaces:**
- Produces:
  - `settings` object (instance of `Settings`) with attributes: `llm_provider: str`, `openai_api_key: str`, `openrouter_api_key: str`, `generation_model: str`, `transcription_model: str`, `max_upload_mb: int`.
  - Pydantic models: `ActionItem{owner:str, task:str}`, `Sentiment{overall:str, note:str}`, `Minutes{...}`, `AnalyzeResponse{transcript:str, minutes:Minutes, provider:str}`.

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.139.0
uvicorn[standard]==0.51.0
python-multipart==0.0.32
openai==2.45.0
pydantic==2.13.4
pydantic-settings==2.14.2
pytest==9.1.1
httpx==0.28.1
```

> These versions are verified to install as prebuilt wheels on Python 3.14
> (the local interpreter) and Python 3.12 (the Docker runtime). Do not
> downgrade `pydantic` below 2.13 — older pydantic-core has no 3.14 wheel and
> fails to compile.

- [ ] **Step 2: Install backend deps**

Run (from repo root):
```bash
python -m pip install -r backend/requirements.txt
```
Expected: installs succeed. (If a pinned version has no Python 3.14 wheel, relax that single pin to the newest compatible release and note it.)

- [ ] **Step 3: Write the failing test** — `backend/tests/test_config_llm.py`

```python
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_config_llm.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.schemas'`.

- [ ] **Step 5: Create `backend/app/schemas.py`**

```python
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ActionItem(BaseModel):
    owner: str = "Unassigned"
    task: str


class Sentiment(BaseModel):
    overall: Literal["positive", "neutral", "negative", "mixed"] = "neutral"
    note: str = ""


class Minutes(BaseModel):
    title: str = "Meeting Minutes"
    date: Optional[str] = None
    location: Optional[str] = None
    attendees: list[str] = Field(default_factory=list)
    summary: str = ""
    discussion_points: list[str] = Field(default_factory=list)
    takeaways: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    key_decisions: list[str] = Field(default_factory=list)
    sentiment: Sentiment = Field(default_factory=Sentiment)
    topics: list[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    transcript: str
    minutes: Minutes
    provider: str
```

- [ ] **Step 6: Create `backend/app/config.py`**

```python
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
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_config_llm.py -v`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/requirements.txt backend/app/config.py backend/app/schemas.py backend/tests/test_config_llm.py
git commit -m "feat(backend): add settings and structured output schemas"
```

---

### Task 3: LLM provider abstraction

**Files:**
- Modify: `backend/app/llm.py` (create)
- Test: `backend/tests/test_config_llm.py` (append)

**Interfaces:**
- Consumes: `settings` from `app.config`.
- Produces:
  - `get_generation_client() -> tuple[OpenAI, str]` — returns `(client, model)`; for `openrouter` uses base_url `https://openrouter.ai/api/v1` and `openrouter_api_key`, else OpenAI default with `openai_api_key`. Model is `settings.generation_model`.
  - `get_transcription_client() -> OpenAI` — always OpenAI with `openai_api_key`.

- [ ] **Step 1: Append failing tests** to `backend/tests/test_config_llm.py`

```python
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


def test_transcription_client_is_openai(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    client = llm.get_transcription_client()
    assert "openrouter" not in str(client.base_url)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_config_llm.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.llm'`.

- [ ] **Step 3: Create `backend/app/llm.py`**

```python
from openai import OpenAI
from .config import settings

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_generation_client() -> tuple[OpenAI, str]:
    """Return (client, model) for the configured generation provider."""
    if settings.llm_provider == "openrouter":
        client = OpenAI(
            api_key=settings.openrouter_api_key or "missing",
            base_url=OPENROUTER_BASE_URL,
        )
    else:
        client = OpenAI(api_key=settings.openai_api_key or "missing")
    return client, settings.generation_model


def get_transcription_client() -> OpenAI:
    """Transcription always uses OpenAI (OpenRouter has no audio endpoint)."""
    return OpenAI(api_key=settings.openai_api_key or "missing")
```

Note: `OpenAI(api_key=...)` raises if the key is empty, so fall back to `"missing"` to allow client construction; real calls still fail clearly and endpoint-level checks (Task 5) block empty keys before any call.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_config_llm.py -v`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/llm.py backend/tests/test_config_llm.py
git commit -m "feat(backend): add swappable openai/openrouter provider layer"
```

---

### Task 4: Analyzer (transcribe + analyze)

**Files:**
- Create: `backend/app/analyzer.py`
- Test: `backend/tests/test_analyzer.py`

**Interfaces:**
- Consumes: `get_generation_client`, `get_transcription_client` from `app.llm`; `settings`; `Minutes`, `AnalyzeResponse`.
- Produces:
  - `transcribe(file_path: str) -> str`
  - `analyze(transcript: str) -> AnalyzeResponse`
  - `_extract_json(text: str) -> dict` (helper; tolerates ```json fences)

- [ ] **Step 1: Write failing tests** — `backend/tests/test_analyzer.py`

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_analyzer.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.analyzer'`.

- [ ] **Step 3: Create `backend/app/analyzer.py`**

```python
import json
from .config import settings
from .llm import get_generation_client, get_transcription_client
from .schemas import Minutes, AnalyzeResponse

SYSTEM_PROMPT = """You produce minutes of meetings from transcripts.
Return ONLY a JSON object (no markdown, no code fences) with exactly these keys:
title, date, location, attendees, summary, discussion_points, takeaways,
action_items, key_decisions, sentiment, topics.

Rules:
- attendees, discussion_points, takeaways, key_decisions, topics: arrays of strings.
- action_items: array of objects each with "owner" (string) and "task" (string).
- sentiment: object with "overall" (one of: positive, neutral, negative, mixed) and "note" (string).
- date and location: a string, or null if not stated.
- Base everything ONLY on the transcript. If something is unknown use null or an empty array.
"""


def transcribe(file_path: str) -> str:
    client = get_transcription_client()
    with open(file_path, "rb") as audio:
        result = client.audio.transcriptions.create(
            model=settings.transcription_model,
            file=audio,
            response_format="text",
        )
    return result if isinstance(result, str) else getattr(result, "text", str(result))


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text[3:]
        if text[:4].lower() == "json":
            text = text[4:]
        text = text.strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    return json.loads(text)


def analyze(transcript: str) -> AnalyzeResponse:
    client, model = get_generation_client()
    completion = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Transcript:\n{transcript}"},
        ],
    )
    content = completion.choices[0].message.content or ""
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model did not return valid JSON: {exc}") from exc
    minutes = Minutes(**data)
    return AnalyzeResponse(
        transcript=transcript, minutes=minutes, provider=settings.llm_provider
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_analyzer.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/analyzer.py backend/tests/test_analyzer.py
git commit -m "feat(backend): transcribe audio and generate structured minutes"
```

---

### Task 5: FastAPI app + endpoints + static serving

**Files:**
- Create: `backend/app/main.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `settings`; `transcribe`, `analyze` from `app.analyzer`; `AnalyzeResponse`.
- Produces:
  - `app` (FastAPI instance)
  - `GET /api/health` → `{"status": "ok"}`
  - `POST /api/analyze` (multipart `file`) → `AnalyzeResponse` JSON; 400 on bad type/size; 500 on missing key; 502 on analysis failure.
  - SPA catch-all serving `frontend/dist` when present.
- `ALLOWED_EXT: set[str]` module constant.

- [ ] **Step 1: Write failing tests** — `backend/tests/test_api.py`

```python
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
    monkeypatch.setattr(main.settings, "openai_api_key", "")
    files = {"file": ("meeting.mp3", io.BytesIO(b"data"), "audio/mpeg")}
    r = client.post("/api/analyze", files=files)
    assert r.status_code == 500
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_api.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.main'`.

- [ ] **Step 3: Create `backend/app/main.py`**

```python
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .analyzer import analyze, transcribe
from .config import settings
from .schemas import AnalyzeResponse

app = FastAPI(title="Meeting Minutes AI")

ALLOWED_EXT = {".mp3", ".wav", ".m4a", ".mp4", ".webm", ".mpga"}

# frontend/dist relative to repo root: main.py -> app -> backend -> <root>
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(file: UploadFile = File(...)) -> AnalyzeResponse:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext or 'unknown'}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}.",
        )

    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum size is {settings.max_upload_mb} MB.",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="Server is missing OPENAI_API_KEY.")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        tmp.write(data)
        tmp.close()
        transcript = transcribe(tmp.name)
        return analyze(transcript)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - surface a safe message
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}") from exc
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


# Serve the built SPA (only in production, when dist exists)
if FRONTEND_DIR.exists():

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str) -> FileResponse:
        candidate = FRONTEND_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIR / "index.html")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest -v`
Expected: all tests pass (13 total across the three test files).

- [ ] **Step 5: Manually smoke-test the API**

Run (from repo root, in one shell):
```bash
cd backend && python -m uvicorn app.main:app --port 8000
```
In another shell:
```bash
curl http://localhost:8000/api/health
```
Expected: `{"status":"ok"}`. Stop the server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/tests/test_api.py
git commit -m "feat(backend): add analyze/health endpoints and SPA serving"
```

---

### Task 6: Frontend scaffold (Vite + React + TS + Tailwind)

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/index.css`, `frontend/src/App.tsx`, `frontend/src/components/Navbar.tsx`

**Interfaces:**
- Produces: a buildable SPA shell with routes `/` (Home) and `/app` (Analyze). Home/Analyze pages are placeholders here, filled in Tasks 8–9.

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "meeting-minutes-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
```

- [ ] **Step 2: Install frontend deps**

Run: `cd frontend && npm install`
Expected: `node_modules` created, no fatal errors.

- [ ] **Step 3: Create `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 4: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 7: Create `frontend/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meeting Minutes AI</title>
    <meta name="description" content="Turn any meeting recording into clear minutes, insights, and action items." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html { scroll-behavior: smooth; }
body { @apply bg-slate-50 text-slate-900 antialiased; }
```

- [ ] **Step 10: Create `frontend/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import Analyze from './pages/Analyze'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<Analyze />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 11: Create `frontend/src/components/Navbar.tsx`**

```tsx
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">M</span>
          Meeting Minutes AI
        </Link>
        <Link
          to="/app"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            pathname === '/app'
              ? 'bg-slate-900 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          Try it
        </Link>
      </nav>
    </header>
  )
}
```

- [ ] **Step 12: Create `frontend/src/App.tsx`**

```tsx
import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        Built with FastAPI + React · Meeting Minutes AI
      </footer>
    </div>
  )
}
```

- [ ] **Step 13: Create placeholder pages** so the build compiles.

`frontend/src/pages/Home.tsx`:
```tsx
export default function Home() {
  return <div className="p-10">Home</div>
}
```

`frontend/src/pages/Analyze.tsx`:
```tsx
export default function Analyze() {
  return <div className="p-10">Analyze</div>
}
```

- [ ] **Step 14: Verify the build compiles**

Run: `cd frontend && npm run build`
Expected: `dist/` is produced with no TypeScript errors.

- [ ] **Step 15: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.json frontend/tsconfig.node.json frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html frontend/src
git commit -m "feat(frontend): scaffold vite react app shell with routing"
```

---

### Task 7: Frontend types + API client + export helpers

**Files:**
- Create: `frontend/src/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/export.ts`

**Interfaces:**
- Produces:
  - Types `ActionItem`, `Sentiment`, `Minutes`, `AnalyzeResponse` (mirror backend schema exactly).
  - `analyzeRecording(file: File): Promise<AnalyzeResponse>`
  - `minutesToMarkdown(m: Minutes): string`
  - `minutesToHtml(m: Minutes): string`
  - `copyMarkdown(m: Minutes): Promise<void>`
  - `downloadMarkdown(m: Minutes): void`
  - `downloadPdf(m: Minutes): void` (opens a print-ready window → browser "Save as PDF")

- [ ] **Step 1: Create `frontend/src/types.ts`**

```ts
export interface ActionItem {
  owner: string
  task: string
}

export interface Sentiment {
  overall: 'positive' | 'neutral' | 'negative' | 'mixed'
  note: string
}

export interface Minutes {
  title: string
  date: string | null
  location: string | null
  attendees: string[]
  summary: string
  discussion_points: string[]
  takeaways: string[]
  action_items: ActionItem[]
  key_decisions: string[]
  sentiment: Sentiment
  topics: string[]
}

export interface AnalyzeResponse {
  transcript: string
  minutes: Minutes
  provider: string
}
```

- [ ] **Step 2: Create `frontend/src/lib/api.ts`**

```ts
import type { AnalyzeResponse } from '../types'

export async function analyzeRecording(file: File): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/analyze', { method: 'POST', body: form })
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      /* keep default */
    }
    throw new Error(detail)
  }
  return res.json()
}
```

- [ ] **Step 3: Create `frontend/src/lib/export.ts`**

```ts
import type { Minutes } from '../types'

function list(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join('\n') : '_None_'
}

export function minutesToMarkdown(m: Minutes): string {
  const meta = [
    m.date ? `**Date:** ${m.date}` : null,
    m.location ? `**Location:** ${m.location}` : null,
    m.attendees.length ? `**Attendees:** ${m.attendees.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('  \n')

  const actions = m.action_items.length
    ? m.action_items.map((a) => `- **${a.owner}** — ${a.task}`).join('\n')
    : '_None_'

  return `# ${m.title}

${meta}

## Summary
${m.summary || '_None_'}

## Discussion Points
${list(m.discussion_points)}

## Key Decisions
${list(m.key_decisions)}

## Takeaways
${list(m.takeaways)}

## Action Items
${actions}

## Insights
**Sentiment:** ${m.sentiment.overall}${m.sentiment.note ? ` — ${m.sentiment.note}` : ''}

**Topics:** ${m.topics.length ? m.topics.join(', ') : '_None_'}
`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function htmlList(items: string[]): string {
  if (!items.length) return '<p><em>None</em></p>'
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
}

export function minutesToHtml(m: Minutes): string {
  const actions = m.action_items.length
    ? `<ul>${m.action_items
        .map((a) => `<li><strong>${esc(a.owner)}</strong> — ${esc(a.task)}</li>`)
        .join('')}</ul>`
    : '<p><em>None</em></p>'

  return `
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; max-width: 720px; margin: 40px auto; padding: 0 24px; }
      h1 { margin-bottom: 4px; } h2 { margin-top: 28px; color: #4338ca; }
      .meta { color: #475569; font-size: 14px; }
    </style>
    <h1>${esc(m.title)}</h1>
    <p class="meta">
      ${m.date ? `Date: ${esc(m.date)} · ` : ''}
      ${m.location ? `Location: ${esc(m.location)} · ` : ''}
      ${m.attendees.length ? `Attendees: ${esc(m.attendees.join(', '))}` : ''}
    </p>
    <h2>Summary</h2><p>${esc(m.summary) || '<em>None</em>'}</p>
    <h2>Discussion Points</h2>${htmlList(m.discussion_points)}
    <h2>Key Decisions</h2>${htmlList(m.key_decisions)}
    <h2>Takeaways</h2>${htmlList(m.takeaways)}
    <h2>Action Items</h2>${actions}
    <h2>Insights</h2>
    <p><strong>Sentiment:</strong> ${esc(m.sentiment.overall)}${m.sentiment.note ? ` — ${esc(m.sentiment.note)}` : ''}</p>
    <p><strong>Topics:</strong> ${m.topics.length ? esc(m.topics.join(', ')) : '<em>None</em>'}</p>
  `
}

export async function copyMarkdown(m: Minutes): Promise<void> {
  await navigator.clipboard.writeText(minutesToMarkdown(m))
}

export function downloadMarkdown(m: Minutes): void {
  const blob = new Blob([minutesToMarkdown(m)], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${m.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadPdf(m: Minutes): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(
    `<!doctype html><html><head><title>${esc(m.title)}</title></head><body>${minutesToHtml(m)}</body></html>`,
  )
  win.document.close()
  win.focus()
  const trigger = () => win.print()
  win.onload = trigger
  setTimeout(trigger, 400)
}
```

- [ ] **Step 4: Verify types compile**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types.ts frontend/src/lib
git commit -m "feat(frontend): add api client, shared types, and export helpers"
```

---

### Task 8: Home page (feature showcase)

**Files:**
- Modify: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: `react-router-dom` `Link`.
- Produces: marketing homepage: hero + CTA, feature grid, "how it works" steps, closing CTA.

**UI note:** During implementation, invoke the `ui-ux-pro-max` skill to refine color/typography/spacing. The code below is a working, on-brand baseline (indigo/slate, Tailwind).

- [ ] **Step 1: Replace `frontend/src/pages/Home.tsx`**

```tsx
import { Link } from 'react-router-dom'

const features = [
  { icon: '🎙️', title: 'Accurate transcription', desc: 'Upload any recording and get a clean, verbatim transcript powered by OpenAI.' },
  { icon: '📝', title: 'Structured minutes', desc: 'Summary, discussion points, decisions, and takeaways — organized automatically.' },
  { icon: '✅', title: 'Action items with owners', desc: 'Every commitment captured with who owns it, so nothing slips.' },
  { icon: '📊', title: 'Extra insights', desc: 'Sentiment read and key topics surfaced from the conversation.' },
  { icon: '📤', title: 'Export anywhere', desc: 'Copy as Markdown, download a .md file, or save a polished PDF.' },
  { icon: '🔌', title: 'Swappable AI provider', desc: 'Runs on OpenAI today, switch to OpenRouter with one config change.' },
]

const steps = [
  { n: '1', title: 'Upload', desc: 'Drop in an audio file from your meeting (mp3, wav, m4a, and more).' },
  { n: '2', title: 'Analyze', desc: 'The app transcribes the audio and extracts the important parts.' },
  { n: '3', title: 'Share', desc: 'Review the minutes and export them to your team in seconds.' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">
          AI-powered meeting notes
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Turn any recording into clear, shareable minutes
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Upload a meeting recording and get an organized summary, decisions, action items, and
          insights — ready to share in seconds.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/app" className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-indigo-500">
            Analyze a recording
          </Link>
          <a href="#features" className="rounded-lg px-6 py-3 font-medium text-slate-700 hover:text-slate-900">
            See features →
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">Everything you need after a meeting</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 p-6 transition hover:shadow-md">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold">Ready to try it?</h2>
          <p className="mt-4 text-slate-300">No sign-up. Upload a recording and see the minutes.</p>
          <Link to="/app" className="mt-8 inline-block rounded-lg bg-indigo-500 px-6 py-3 font-medium text-white transition hover:bg-indigo-400">
            Get started
          </Link>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

Run backend + frontend dev servers:
```bash
# shell 1
cd backend && python -m uvicorn app.main:app --port 8000
# shell 2
cd frontend && npm run dev
```
Open `http://localhost:5173/`. Expected: full homepage renders (hero, 6 features, 3 steps, CTA) with no console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Home.tsx
git commit -m "feat(frontend): build feature-showcase homepage"
```

---

### Task 9: Analyze page (upload → progress → results → export)

**Files:**
- Modify: `frontend/src/pages/Analyze.tsx`
- Create: `frontend/src/components/UploadZone.tsx`, `frontend/src/components/Results.tsx`

**Interfaces:**
- Consumes: `analyzeRecording` (api.ts); `copyMarkdown`, `downloadMarkdown`, `downloadPdf` (export.ts); types.
- Produces: full analyze flow with drag-drop upload, status states, error handling, and rendered results + export bar.

**UI note:** invoke `ui-ux-pro-max` during implementation to polish. Baseline below is functional and styled.

- [ ] **Step 1: Create `frontend/src/components/UploadZone.tsx`**

```tsx
import { useRef, useState } from 'react'

const ACCEPT = '.mp3,.wav,.m4a,.mp4,.webm,.mpga'

export default function UploadZone({
  onSelect,
  disabled,
}: {
  onSelect: (file: File) => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    if (files && files[0]) onSelect(files[0])
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
        dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'
      } ${disabled ? 'pointer-events-none opacity-60' : 'hover:border-indigo-400'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-4xl">🎧</div>
      <p className="mt-4 font-medium text-slate-900">Drag & drop your recording here</p>
      <p className="mt-1 text-sm text-slate-500">or click to browse · mp3, wav, m4a, mp4, webm · up to 25&nbsp;MB</p>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/Results.tsx`**

```tsx
import type { AnalyzeResponse } from '../types'
import { copyMarkdown, downloadMarkdown, downloadPdf } from '../lib/export'
import { useState } from 'react'

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
        {items.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

const sentimentColor: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  neutral: 'bg-slate-100 text-slate-700',
  negative: 'bg-rose-100 text-rose-700',
  mixed: 'bg-amber-100 text-amber-700',
}

export default function Results({ data, onReset }: { data: AnalyzeResponse; onReset: () => void }) {
  const m = data.minutes
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await copyMarkdown(m)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header + export bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{m.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {[m.date, m.location, m.attendees.length ? `${m.attendees.length} attendees` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {copied ? 'Copied!' : 'Copy Markdown'}
          </button>
          <button onClick={() => downloadMarkdown(m)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Download .md
          </button>
          <button onClick={() => downloadPdf(m)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Download PDF
          </button>
          <button onClick={onReset} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            New analysis
          </button>
        </div>
      </div>

      {/* Insights row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${sentimentColor[m.sentiment.overall] ?? sentimentColor.neutral}`}>
          Sentiment: {m.sentiment.overall}
        </span>
        {m.topics.map((t) => (
          <span key={t} className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
            {t}
          </span>
        ))}
      </div>

      {/* Attendees */}
      {m.attendees.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Attendees</h3>
          <p className="mt-2 text-slate-700">{m.attendees.join(', ')}</p>
        </div>
      )}

      {/* Summary */}
      {m.summary && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
          <p className="mt-2 whitespace-pre-line text-slate-700">{m.summary}</p>
        </div>
      )}

      <Section title="Discussion Points" items={m.discussion_points} />
      <Section title="Key Decisions" items={m.key_decisions} />
      <Section title="Takeaways" items={m.takeaways} />

      {/* Action items */}
      {m.action_items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Action Items</h3>
          <ul className="mt-3 space-y-2">
            {m.action_items.map((a, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">{a.owner}</span>
                <span className="text-slate-700">{a.task}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript */}
      <details className="rounded-2xl border border-slate-200 bg-white p-6">
        <summary className="cursor-pointer text-lg font-semibold text-slate-900">Full transcript</summary>
        <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{data.transcript}</p>
      </details>
    </div>
  )
}
```

- [ ] **Step 3: Replace `frontend/src/pages/Analyze.tsx`**

```tsx
import { useState } from 'react'
import UploadZone from '../components/UploadZone'
import Results from '../components/Results'
import { analyzeRecording } from '../lib/api'
import type { AnalyzeResponse } from '../types'

type Status = 'idle' | 'working' | 'done' | 'error'

export default function Analyze() {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnalyzeResponse | null>(null)

  async function handleSelect(file: File) {
    setFileName(file.name)
    setStatus('working')
    setError('')
    try {
      const data = await analyzeRecording(file)
      setResult(data)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setError('')
    setFileName('')
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {status !== 'done' && (
        <>
          <h1 className="text-3xl font-bold text-slate-900">Analyze a recording</h1>
          <p className="mt-2 text-slate-600">Upload your meeting audio and get minutes in under a minute.</p>
          <div className="mt-8">
            <UploadZone onSelect={handleSelect} disabled={status === 'working'} />
          </div>
        </>
      )}

      {status === 'working' && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-800">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span>Transcribing & analyzing <strong>{fileName}</strong>… this can take up to a minute.</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <p className="font-medium">Analysis failed</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {status === 'done' && result && <Results data={result} onReset={reset} />}
    </div>
  )
}
```

- [ ] **Step 4: Verify build compiles**

Run: `cd frontend && npm run build`
Expected: no TypeScript errors; `dist/` produced.

- [ ] **Step 5: Manual end-to-end check (real API key)**

With a valid `OPENAI_API_KEY` in `backend/.env`, run both dev servers (as in Task 8 Step 2), open `http://localhost:5173/app`, upload a short audio clip, and confirm: progress spinner → results render → each export button works (copy, .md download, PDF print window).

If you don't have a key handy, at minimum confirm the upload UI, an invalid-type rejection message, and that the request hits `/api/analyze` (network tab).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Analyze.tsx frontend/src/components/UploadZone.tsx frontend/src/components/Results.tsx
git commit -m "feat(frontend): add analyze flow with upload, results, and export"
```

---

### Task 10: Dockerfile + Railway config (single-service deploy)

**Files:**
- Create: `Dockerfile`, `railway.json`

**Interfaces:**
- Produces: a single image that builds the frontend, then runs FastAPI serving the built SPA + API on `$PORT`.

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# ---- Stage 1: build the frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: python runtime ----
FROM python:3.12-slim AS runtime
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Note: `FRONTEND_DIR` in `main.py` resolves to `/app/frontend/dist` — matches the copy target above.

- [ ] **Step 2: Create `railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT}",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 3: Build the image locally**

Run (from repo root):
```bash
docker build -t meeting-minutes .
```
Expected: build completes through both stages with no errors.

- [ ] **Step 4: Run the container and verify serving**

Run:
```bash
docker run --rm -p 8000:8000 -e OPENAI_API_KEY=dummy meeting-minutes
```
In another shell:
```bash
curl http://localhost:8000/api/health
curl -I http://localhost:8000/
```
Expected: health returns `{"status":"ok"}`; `/` returns `200` with `text/html` (the SPA). Stop the container.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile railway.json
git commit -m "chore: add multi-stage Dockerfile and Railway config"
```

---

### Task 11: README + final verification

**Files:**
- Create: `README.md`
- Modify: keep the original `python.py` (reference) — mention it in the README as the origin notebook.

**Interfaces:**
- Produces: portfolio-quality README (overview, features, stack, architecture, local dev, env vars, deploy, project structure).

- [ ] **Step 1: Create `README.md`**

````markdown
# Meeting Minutes AI

Turn any meeting recording into clear, structured minutes — summary, discussion
points, decisions, action items with owners, plus sentiment and topic insights.
Upload audio, get shareable minutes in under a minute, and export to
Markdown or PDF.

> Built with **FastAPI + React (Vite + TypeScript + Tailwind)**, deployable to
> Railway as a single service. AI provider is swappable between **OpenAI** and
> **OpenRouter** via one env var.

## Features
- 🎙️ Audio transcription (OpenAI)
- 📝 Structured minutes: summary, discussion points, key decisions, takeaways
- ✅ Action items with owners
- 📊 Extra insights: sentiment + topics
- 📤 Export: copy Markdown, download `.md`, save PDF
- 🔌 Swappable LLM provider (OpenAI ↔ OpenRouter)
- 🖥️ Polished feature-showcase homepage

## Tech Stack
| Layer     | Tech |
|-----------|------|
| Frontend  | Vite, React, TypeScript, Tailwind CSS, React Router |
| Backend   | FastAPI, Uvicorn, Pydantic, OpenAI SDK |
| AI        | OpenAI transcription + OpenAI/OpenRouter chat |
| Deploy    | Docker, Railway |

## Architecture
Single service: the React SPA builds to static files that FastAPI serves
alongside its API.

```
Browser (React) ──upload──> FastAPI /api/analyze
                               ├── transcribe (OpenAI audio)
                               └── analyze   (OpenAI/OpenRouter chat → JSON)
                            <── structured minutes + insights
```

## Local Development

### 1. Backend
```bash
python -m pip install -r backend/requirements.txt
cp .env.example backend/.env   # then fill in OPENAI_API_KEY
cd backend && python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend && npm install && npm run dev
```
Open http://localhost:5173 (the dev server proxies `/api` to the backend).

### Run tests
```bash
cd backend && python -m pytest -v
```

## Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `LLM_PROVIDER` | `openai` | `openai` or `openrouter` for generating minutes |
| `OPENAI_API_KEY` | — | Required (transcription + OpenAI generation) |
| `OPENROUTER_API_KEY` | — | Required when `LLM_PROVIDER=openrouter` |
| `GENERATION_MODEL` | `gpt-4o-mini` | Chat model that writes the minutes |
| `TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | Audio model |
| `MAX_UPLOAD_MB` | `25` | Upload size cap |

## Deploy to Railway
1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Railway detects the `Dockerfile` (see `railway.json`).
4. Add env vars (`OPENAI_API_KEY`, optionally `LLM_PROVIDER` + `OPENROUTER_API_KEY`).
5. Deploy — Railway provides the public URL and injects `$PORT`.

## Switching to OpenRouter
Set:
```
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key
GENERATION_MODEL=openai/gpt-4o-mini   # or any OpenRouter model id
```
(Transcription still uses OpenAI — OpenRouter has no audio endpoint.)

## Project Structure
```
backend/   FastAPI app (config, llm, analyzer, schemas, main) + tests
frontend/  Vite React SPA (pages, components, lib)
Dockerfile / railway.json   single-service deploy
python.py  original Colab notebook this project grew from
```

## Origin
This started as a Colab script (`python.py`) that transcribed with OpenAI and
generated minutes on a local GPU Llama model. This project moves generation to a
cloud API so it runs anywhere, adds a real UI, insights, exports, and a
one-service deploy.
````

- [ ] **Step 2: Full backend test run**

Run: `cd backend && python -m pytest -v`
Expected: all tests pass.

- [ ] **Step 3: Full frontend build**

Run: `cd frontend && npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add portfolio-grade README"
```

- [ ] **Step 5: (Optional) create GitHub repo and push** — only when the user asks.

```bash
gh repo create meeting-minutes-ai --public --source=. --remote=origin --push
```

---

## Self-Review Notes (author checklist — completed)
- **Spec coverage:** homepage (T8), upload/analyze/results (T9), transcription+minutes (T4), extra insights = sentiment/topics/key_decisions (T2 schema, T4 prompt, T9 render), export copy/md/pdf (T7 lib, T9 UI), provider swap OpenAI/OpenRouter (T3), 25MB + type validation (T5), stateless (no DB anywhere), single-service Docker/Railway (T10), tests mock AI (T4/T5), README (T11). All covered.
- **Type consistency:** `AnalyzeResponse{transcript, minutes, provider}` and `Minutes{...}` identical across backend `schemas.py` (T2) and frontend `types.ts` (T7); `action_items[{owner, task}]` and `sentiment{overall, note}` consistent in prompt (T4), schema (T2), render (T9), export (T7).
- **Placeholders:** none — every code step is complete; placeholder pages in T6 are intentional and replaced in T8/T9.
