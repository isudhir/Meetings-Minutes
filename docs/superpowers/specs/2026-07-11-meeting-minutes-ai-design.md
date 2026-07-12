# Meeting Minutes AI — Design Spec

**Date:** 2026-07-11
**Status:** Approved

## 1. Overview

A web app that turns a meeting recording into structured, shareable minutes and
insights. A user uploads an audio file; the app transcribes it, runs an LLM to
produce formatted minutes plus extra insights, and displays the result in a
clean UI with export options.

This is a portfolio-grade project designed to deploy to Railway as a single
service.

### Origin

Derived from an existing Colab script (`python.py`) that:
1. Transcribed an MP3 with OpenAI (`gpt-4o-mini-transcribe`).
2. Generated minutes with a **local 4-bit Llama-3.2-3B model on a CUDA GPU**.

The local GPU model cannot run on Railway (no GPU, multi-GB, slow), so the
analysis step moves to a cloud LLM API. The transcription approach (OpenAI) is
preserved.

## 2. Goals & Non-Goals

### Goals
- Upload a recording → get structured minutes + insights in a polished UI.
- Feature-showcase homepage suitable for a portfolio.
- Export results (copy Markdown, download `.md`, download PDF).
- LLM provider is swappable: **OpenAI now, OpenRouter later**, via config only.
- Simple, single-service deploy to Railway.
- Backend tests that mock AI calls (zero cost to run).

### Non-Goals (v1)
- No user accounts / auth.
- No database or saved meeting history (stateless).
- No real-time / live transcription.
- No speaker diarization.
- No audio files above the OpenAI 25 MB limit (no chunking in v1).

## 3. Architecture

**Single Railway service.** A multi-stage Docker build compiles the React
frontend to static assets, then copies them into the Python image. FastAPI
serves both the API and the static frontend.

```
Browser (React SPA)
   │  multipart upload
   ▼
FastAPI (/api/analyze)
   │  1. save temp file
   │  2. transcribe (OpenAI audio)
   │  3. analyze (OpenAI OR OpenRouter chat → structured JSON)
   ▼
JSON response → React renders insight cards → export
```

### Why this shape
- **Vite + React SPA (not Next.js):** app is client-heavy (upload + render).
  Vite builds to pure static files → one service, no second Node server, no
  CORS. Next.js SSR would force a second service for no benefit here.
- **Single service:** one Railway deploy, one set of env vars, no cross-origin
  config.

## 4. Tech Stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, React Router.
  - `react-markdown` for rendering any markdown text.
  - Client-side PDF export (e.g. `html2pdf.js` / `jspdf` + `html2canvas`, or a
    print-stylesheet approach — chosen during implementation for reliability).
- **Backend:** FastAPI, Uvicorn, Pydantic, `openai` Python SDK, `python-multipart`.
- **Testing:** `pytest` (backend), with the OpenAI/OpenRouter clients mocked.

## 5. Backend Design

### Modules (`backend/app/`)
- `main.py` — FastAPI app; routes; mounts/serves the built frontend (`dist/`).
- `config.py` — env-driven settings (Pydantic `BaseSettings`).
- `llm.py` — provider abstraction for the **generation** call.
- `analyzer.py` — orchestration: `transcribe()` then `analyze()`.
- `schemas.py` — Pydantic models for request/response and the structured output.

### Endpoints
- `GET  /api/health` → `{ "status": "ok" }`
- `POST /api/analyze` → multipart `file` upload.
  - Validates extension (mp3, wav, m4a, mp4, webm, mpga) and size (≤ 25 MB).
  - Returns `AnalyzeResponse` (see schema below).
- `GET  /*` → serves the built React app (SPA fallback to `index.html`).

### LLM provider abstraction (`llm.py`)
Both OpenAI and OpenRouter are OpenAI-SDK compatible, so a single code path
swaps only client config:

| Env var             | Purpose                                             |
|---------------------|-----------------------------------------------------|
| `LLM_PROVIDER`      | `openai` (default) or `openrouter`                  |
| `OPENAI_API_KEY`    | OpenAI key (always used for transcription)          |
| `OPENROUTER_API_KEY`| OpenRouter key (used when provider = openrouter)    |
| `GENERATION_MODEL`  | chat model id (e.g. `gpt-4o-mini`)                  |
| `TRANSCRIPTION_MODEL`| audio model (default `gpt-4o-mini-transcribe`)     |

- **Transcription always uses OpenAI** (OpenRouter has no audio endpoint).
- **Generation** uses the configured provider. For `openrouter`, base_url =
  `https://openrouter.ai/api/v1` and the OpenRouter key/model.
- The chat call requests **JSON output** so the response is structured.

### Structured output schema
```json
{
  "title": "string",
  "date": "string|null",
  "location": "string|null",
  "attendees": ["string"],
  "summary": "string",
  "discussion_points": ["string"],
  "takeaways": ["string"],
  "action_items": [{ "owner": "string", "task": "string" }],
  "key_decisions": ["string"],
  "sentiment": { "overall": "positive|neutral|negative|mixed", "note": "string" },
  "topics": ["string"]
}
```

`AnalyzeResponse` = `{ transcript: string, minutes: <above>, provider: string }`.

### Error handling
- Missing/invalid API keys → 500 with a clear message (surfaced in UI).
- File too large / unsupported type → 400 with a friendly message.
- Transcription or LLM failure → 502 with a safe message (no secrets leaked).
- LLM returns malformed JSON → one retry, then 502.

## 6. Frontend Design

### Pages
- **Home (`/`)** — hero, feature showcase (transcription, AI minutes, insights,
  export, provider-swap), "how it works" (3 steps), and a CTA to the app.
- **Analyze (`/app`)** — drag-and-drop upload zone, selected-file state, live
  progress (uploading → transcribing → analyzing), then results.

### Results view
Rendered as cards/sections:
- Header: title, date, location, attendees.
- Summary.
- Discussion points, Takeaways, Action items (owner + task), Key decisions.
- Insights row: sentiment badge + note, topic chips.
- Export bar: **Copy Markdown**, **Download .md**, **Download PDF**.

### Design quality
Use the `ui-ux-pro-max` skill during implementation for layout, color, and
typography. Responsive, accessible, light/dark friendly. Polished enough to
headline a portfolio.

## 7. Configuration

`.env.example`:
```
LLM_PROVIDER=openai
OPENAI_API_KEY=
OPENROUTER_API_KEY=
GENERATION_MODEL=gpt-4o-mini
TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
MAX_UPLOAD_MB=25
```

## 8. Deployment (Railway)

- Multi-stage `Dockerfile`:
  1. Node stage: `npm ci && npm run build` → `frontend/dist`.
  2. Python stage: install `requirements.txt`, copy `backend/` + `dist/`, run
     Uvicorn.
- `railway.json` for build/deploy config; `$PORT` respected.
- `README.md`: features, screenshots, local dev, env vars, one-click deploy.

## 9. Testing

- `pytest` backend tests with OpenAI/OpenRouter mocked:
  - `/api/health` returns ok.
  - `/api/analyze` happy path returns a valid `AnalyzeResponse`.
  - Oversized file → 400; unsupported type → 400.
  - `llm.py` selects the right client config per `LLM_PROVIDER`.
- Frontend: keep light (optional smoke test of a component).

## 10. Project Structure

```
Meetings Minutes/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── llm.py
│   │   ├── analyzer.py
│   │   └── schemas.py
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        (Home, Analyze)
│   │   ├── components/
│   │   └── lib/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── Dockerfile
├── railway.json
├── .env.example
└── README.md
```

## 11. Open Implementation Choices (decide during build)
- Exact PDF export library vs print-stylesheet (pick most reliable).
- Whether to use `gpt-4o-mini-transcribe` vs `whisper-1` (default to the former,
  fall back if needed).
