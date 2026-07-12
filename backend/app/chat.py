from .llm import get_chat_client
from .schemas import ChatMessage

# Keep the grounding context within reach of smaller free models. Very long
# meetings get trimmed rather than rejected.
MAX_TRANSCRIPT_CHARS = 48_000

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

    completion = client.chat.completions.create(model=model, messages=convo)
    return (completion.choices[0].message.content or "").strip()
