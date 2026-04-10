"""Pydantic schemas for the /ask and /conversations endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class AskRequest(BaseModel):
    question: str
    property_id: UUID
    conversation_id: UUID | None = None  # None = start new thread

    @field_validator("question")
    @classmethod
    def question_length(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Question must not be empty")
        if len(v) > 5000:
            raise ValueError("Question must be 5000 characters or fewer")
        return v


class AskSource(BaseModel):
    title: str
    page: int | None
    similarity: float


class AskResponse(BaseModel):
    answer: str
    sources: list[AskSource]
    model_used: str
    latency_ms: int
    confidence: str
    intent: str | None = None
    safety_level: str | None = None
    conversation_id: str | None = None  # thread ID for follow-ups


class MessageItem(BaseModel):
    id: UUID
    role: str
    content: str
    intent: str | None = None
    model_used: str | None = None
    latency_ms: int | None = None
    confidence: str | None = None
    safety_level: str | None = None
    sources: list | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationItem(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: str | None = None  # preview of last message content

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    messages: list[MessageItem]


class ConversationListResponse(BaseModel):
    conversations: list[ConversationItem]
    total: int
