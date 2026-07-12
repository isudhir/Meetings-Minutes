import logging
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from .analyzer import analyze, transcribe
from .config import settings
from .llm import missing_api_key
from .schemas import AnalyzeResponse

logger = logging.getLogger("meeting_minutes")

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

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        tmp.write(data)
        tmp.close()
        transcript = await run_in_threadpool(transcribe, tmp.name)
        return await run_in_threadpool(analyze, transcript)
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
