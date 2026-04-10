"""Pydantic schemas for the /ask endpoint."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class AskRequest(BaseModel):
    question: str
    property_id: UUID

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


class ConversationItem(BaseModel):
    id: UUID
    question: str
    answer: str
    intent: str | None
    model_used: str | None
    latency_ms: int | None
    confidence: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    conversations: list[ConversationItem]
    total: int
