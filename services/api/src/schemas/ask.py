"""Pydantic schemas for the /ask endpoint."""

from uuid import UUID

from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    property_id: UUID


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
