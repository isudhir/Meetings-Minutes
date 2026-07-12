import logging
import random
import time

from openai import RateLimitError

from .llm import get_chat_client
from .schemas import ChatMessage

logger = logging.getLogger("meeting_minutes")

# Keep the grounding context within reach of smaller free models. Very long
# meetings get trimmed rather than rejected.
MAX_TRANSCRIPT_CHARS = 48_000

# Free chat models on OpenRouter get rate-limited (429) frequently — both by the
# platform's free-tier caps and by the upstream provider. A short backoff
# usually recovers, so retry transient 429s before giving up.
MAX_CHAT_ATTEMPTS = 3
INITIAL_BACKOFF_SECONDS = 1.0
# Longest wait we'll absorb inline before bailing and letting the caller surface
# a 429 to the client — keeps a chat request from hanging for ~30s.
MAX_BACKOFF_SECONDS = 8.0

SYSTEM_PROMPT = """You are a helpful assistant answering questions about one specific meeting.
Answer using ONLY the transcript below. If the answer isn't in the transcript, say you don't
see it discussed in the meeting rather than guessing. Keep answers concise and to the point.

Transcript:
{transcript}
"""

GENERAL_SYSTEM_PROMPT = """You are a friendly, concise assistant inside "Minutes", a web app that turns
meeting recordings into structured minutes. Answer the user's questions helpfully and directly.
If they ask about the app, explain that they can upload a recording (mp3, wav, m4a, mp4 or webm)
and get back a summary, discussion points, key decisions, action items with owners, and sentiment —
and that once minutes are on screen they can ask follow-up questions grounded in that transcript.
Keep answers concise."""


def parse_retry_after(exc: Exception) -> int | None:
    """Seconds to wait per a 429's standard Retry-After header, if present."""
    response = getattr(exc, "response", None)
    header = response.headers.get("retry-after") if response is not None else None
    if not header:
        return None
    try:
        return max(0, int(float(header)))
    except (TypeError, ValueError):
        return None


def _complete_with_retry(client, model, convo):
    """Call the chat model, retrying transient 429s with exponential backoff and
    honoring Retry-After when present. Re-raises RateLimitError once attempts are
    exhausted, or immediately when the required wait is too long to absorb here
    (the caller then surfaces a 429 with an accurate Retry-After to the client)."""
    backoff = INITIAL_BACKOFF_SECONDS
    for attempt in range(1, MAX_CHAT_ATTEMPTS + 1):
        try:
            return client.chat.completions.create(model=model, messages=convo)
        except RateLimitError as exc:
            retry_after = parse_retry_after(exc)
            wait = retry_after if retry_after is not None else backoff
            if attempt == MAX_CHAT_ATTEMPTS or wait > MAX_BACKOFF_SECONDS:
                raise
            logger.warning(
                "Chat rate-limited (attempt %d/%d); retrying in ~%.1fs",
                attempt,
                MAX_CHAT_ATTEMPTS,
                wait,
            )
            time.sleep(wait + random.uniform(0, 0.5))
            backoff *= 2


def answer_question(transcript: str, messages: list[ChatMessage]) -> str:
    """Answer the latest user question. Grounded in the meeting transcript when
    one is provided; otherwise a general-purpose assistant."""
    client, model = get_chat_client()

    transcript = transcript.strip()
    if transcript:
        if len(transcript) > MAX_TRANSCRIPT_CHARS:
            transcript = transcript[:MAX_TRANSCRIPT_CHARS] + "\n[transcript truncated]"
        system = SYSTEM_PROMPT.format(transcript=transcript)
    else:
        system = GENERAL_SYSTEM_PROMPT

    convo = [{"role": "system", "content": system}]
    convo += [{"role": m.role, "content": m.content} for m in messages]

    completion = _complete_with_retry(client, model, convo)
    return (completion.choices[0].message.content or "").strip()
