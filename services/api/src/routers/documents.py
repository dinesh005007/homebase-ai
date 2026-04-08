"""Document upload and listing endpoints."""

import tempfile
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.document import Document, DocumentChunk
from services.api.src.schemas.document import (
    DocumentListItem,
    DocumentListResponse,
    DocumentUploadResponse,
)
from services.api.src.services.ingestion import IngestionService

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    property_id: UUID = Form(...),
    doc_type: str = Form("auto"),
    title: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    # Write uploaded file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    service = IngestionService()
    doc = await service.ingest_document(
        file_path=tmp_path,
        filename=file.filename or "upload.pdf",
        property_id=property_id,
        doc_type=doc_type,
        title=title,
        db=db,
    )

    # Count chunks
    result = await db.execute(
        select(func.count()).where(DocumentChunk.document_id == doc.id)
    )
    chunks_created = result.scalar_one()

    return DocumentUploadResponse(
        document_id=doc.id,
        title=doc.title,
        doc_type=doc.doc_type,
        chunks_created=chunks_created,
        status="processed",
        classification_confidence=doc.metadata_.get("classification_confidence") if doc.metadata_ else None,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DocumentListResponse:
    result = await db.execute(
        select(Document).where(Document.property_id == property_id).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    return DocumentListResponse(
        documents=[DocumentListItem.model_validate(d) for d in docs],
        total=len(docs),
    )
