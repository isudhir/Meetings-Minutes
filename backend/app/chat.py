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


def answer_question(transcript: str, messages: list[ChatMessage]) -> str:
    """Answer the latest user question, grounded in the meeting transcript."""
    client, model = get_chat_client()

    transcript = transcript.strip()
    if len(transcript) > MAX_TRANSCRIPT_CHARS:
        transcript = transcript[:MAX_TRANSCRIPT_CHARS] + "\n[transcript truncated]"

    convo = [{"role": "system", "content": SYSTEM_PROMPT.format(transcript=transcript)}]
    convo += [{"role": m.role, "content": m.content} for m in messages]

    completion = client.chat.completions.create(model=model, messages=convo)
    return (completion.choices[0].message.content or "").strip()
