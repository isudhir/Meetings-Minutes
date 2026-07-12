import logging
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from .analyzer import analyze, transcribe
from .chat import answer_question
from .config import settings
from .llm import chat_available, missing_api_key
from .ratelimit import check_and_reserve
from .schemas import AnalyzeResponse, ChatRequest, ChatResponse

logger = logging.getLogger("meeting_minutes")

app = FastAPI(title="Meeting Minutes AI")

ALLOWED_EXT = {".mp3", ".wav", ".m4a", ".mp4", ".webm", ".mpga"}

# Guardrails on the chat payload so a client can't send an unbounded prompt.
MAX_CHAT_MESSAGES = 30
MAX_CHAT_CHARS = 4_000

# frontend/dist relative to repo root: main.py -> app -> backend -> <root>
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def _client_ip(request: Request) -> str:
    """Best-effort client IP. Behind Railway's proxy the real IP is the first
    entry of X-Forwarded-For; that header is client-spoofable, which is why the
    browser id is used as a second, independent key."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit_keys(request: Request) -> list[str]:
    keys = [f"ip:{_client_ip(request)}"]
    client_id = request.headers.get("x-client-id")
    if client_id:
        keys.append(f"bid:{client_id[:100]}")
    return keys


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(
    request: Request, file: UploadFile = File(...)
) -> AnalyzeResponse:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext or 'unknown'}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}.",
        )

    # Read at most max+1 bytes so an oversized body can't exhaust memory.
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum size is {settings.max_upload_mb} MB.",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    missing = missing_api_key()
    if missing:
        raise HTTPException(status_code=500, detail=f"Server is missing {missing}.")

    # Reserve here — after validation, before the (paid) LLM calls — so a bad
    # request doesn't burn the window, but each accepted upload counts once.
    retry_after = check_and_reserve(
        _rate_limit_keys(request),
        settings.rate_limit_uploads,
        settings.rate_limit_window_seconds,
    )
    if retry_after is not None:
        minutes = max(1, round(retry_after / 60))
        raise HTTPException(
            status_code=429,
            detail=f"Upload limit reached. Try again in about {minutes} minute(s).",
            headers={"Retry-After": str(int(retry_after) + 1)},
        )

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        tmp.write(data)
        tmp.close()
        transcript = await run_in_threadpool(transcribe, tmp.name)
        result = await run_in_threadpool(analyze, transcript)
        result.chat_available = chat_available()
        return result
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - do not leak internal details
        logger.exception("Analysis failed")
        raise HTTPException(
            status_code=502, detail="Analysis failed. Please try again."
        ) from exc
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    if not chat_available():
        raise HTTPException(
            status_code=400, detail="Chat isn't configured on this server."
        )
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="No transcript to reference.")
    if not req.messages or req.messages[-1].role != "user":
        raise HTTPException(
            status_code=400, detail="The latest message must be from the user."
        )
    if len(req.messages) > MAX_CHAT_MESSAGES:
        raise HTTPException(
            status_code=400, detail="This conversation is too long. Start a new one."
        )
    if any(len(m.content) > MAX_CHAT_CHARS for m in req.messages):
        raise HTTPException(status_code=400, detail="That message is too long.")

    try:
        reply = await run_in_threadpool(answer_question, req.transcript, req.messages)
    except Exception as exc:  # noqa: BLE001 - do not leak internal details
        logger.exception("Chat failed")
        raise HTTPException(
            status_code=502, detail="Chat failed. Please try again."
        ) from exc
    return ChatResponse(reply=reply)


# Serve the built SPA (only in production, when dist exists)
if FRONTEND_DIR.exists():
    _FRONTEND_ROOT = FRONTEND_DIR.resolve()

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str) -> FileResponse:
        # Unknown /api paths should 404 as API errors, not fall back to the SPA.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found.")
        candidate = (FRONTEND_DIR / full_path).resolve()
        if (
            full_path
            and candidate.is_file()
            and candidate.is_relative_to(_FRONTEND_ROOT)
        ):
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIR / "index.html")
