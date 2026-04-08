"""Document upload and listing endpoints."""

import tempfile
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.document import Document, DocumentChunk
from services.api.src.models.document_entity_link import DocumentEntityLink
from services.api.src.schemas.document import (
    BatchUploadResponse,
    BatchUploadItem,
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


@router.post("/batch-upload", response_model=BatchUploadResponse)
async def batch_upload(
    files: list[UploadFile] = File(...),
    property_id: UUID = Form(...),
    db: AsyncSession = Depends(get_db),
) -> BatchUploadResponse:
    """Upload multiple documents at once. Auto-classifies each."""
    service = IngestionService()
    results: list[BatchUploadItem] = []

    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            doc = await service.ingest_document(
                file_path=tmp_path,
                filename=file.filename or "upload.pdf",
                property_id=property_id,
                doc_type="auto",
                title=file.filename or "Untitled",
                db=db,
            )
            chunk_count = (await db.execute(
                select(func.count()).where(DocumentChunk.document_id == doc.id)
            )).scalar_one()

            results.append(BatchUploadItem(
                filename=file.filename or "upload.pdf",
                document_id=doc.id,
                doc_type=doc.doc_type,
                chunks_created=chunk_count,
                status="processed",
            ))
        except Exception as e:
            logger.error("batch_upload_item_failed", filename=file.filename, error=str(e))
            results.append(BatchUploadItem(
                filename=file.filename or "upload.pdf",
                document_id=None,
                doc_type="unknown",
                chunks_created=0,
                status=f"error: {str(e)[:100]}",
            ))

    return BatchUploadResponse(results=results, total=len(results))


@router.post("/{document_id}/reprocess", response_model=DocumentUploadResponse)
async def reprocess_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    """Re-ingest an existing document (re-classify, re-chunk, re-embed, re-link)."""
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.file_path:
        raise HTTPException(status_code=400, detail="Document has no stored file")

    # Delete existing chunks and entity links
    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
    await db.execute(delete(DocumentEntityLink).where(DocumentEntityLink.document_id == document_id))
    await db.flush()

    # Re-ingest from stored file
    service = IngestionService()
    updated_doc = await service.ingest_document(
        file_path=doc.file_path,
        filename=doc.file_path.split("/")[-1],
        property_id=doc.property_id,
        doc_type="auto",
        title=doc.title,
        db=db,
    )

    chunk_count = (await db.execute(
        select(func.count()).where(DocumentChunk.document_id == updated_doc.id)
    )).scalar_one()

    return DocumentUploadResponse(
        document_id=updated_doc.id,
        title=updated_doc.title,
        doc_type=updated_doc.doc_type,
        chunks_created=chunk_count,
        status="reprocessed",
        classification_confidence=updated_doc.metadata_.get("classification_confidence") if updated_doc.metadata_ else None,
    )
