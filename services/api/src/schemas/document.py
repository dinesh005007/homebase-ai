"""Pydantic schemas for document endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    document_id: UUID
    title: str
    doc_type: str
    chunks_created: int
    status: str
    classification_confidence: float | None = None


class DocumentListItem(BaseModel):
    id: UUID
    title: str
    doc_type: str
    file_size_bytes: int | None
    mime_type: str | None
    page_count: int | None
    ingested_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentListItem]
    total: int
