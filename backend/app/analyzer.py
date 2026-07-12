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
    client, model = get_transcription_client()
    with open(file_path, "rb") as audio:
        # Default (json) response works on both OpenAI and OpenRouter and yields
        # an object with .text; OpenRouter doesn't accept response_format="text".
        result = client.audio.transcriptions.create(model=model, file=audio)
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
