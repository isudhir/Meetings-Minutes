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
    # True when the server can answer follow-up questions (OpenRouter key set).
    chat_available: bool = False


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    transcript: str
    messages: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
