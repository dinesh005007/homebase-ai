"""Pydantic schemas for the /vision endpoint."""

from pydantic import BaseModel


class VisionAnalyzeResponse(BaseModel):
    answer: str
    model_used: str
    latency_ms: int
    confidence: str
