"""Document ingestion pipeline: extract text, chunk, embed, store."""

import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import structlog
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.models.document import Document, DocumentChunk
from services.api.src.services.classification import ClassificationService
from services.api.src.services.embeddings import EmbeddingService
from services.api.src.services.extraction import ExtractionService
from services.api.src.utils.text import chunk_text, smart_chunk_text

logger = structlog.get_logger()

UPLOAD_DIR = Path("data/documents")


class IngestionService:
    def __init__(
        self,
        embedding_service: EmbeddingService | None = None,
        classification_service: ClassificationService | None = None,
    ) -> None:
        self.embedding_service = embedding_service or EmbeddingService()
        self.classification_service = classification_service or ClassificationService()
        self.extraction_service = ExtractionService()

    async def ingest_document(
        self,
        file_path: str,
        filename: str,
        property_id: UUID,
        doc_type: str,
        title: str,
        db: AsyncSession,
    ) -> Document:
        logger.info("ingestion_start", filename=filename, property_id=str(property_id))

        # Read file and determine mime type
        file_bytes = Path(file_path).read_bytes()
        file_size = len(file_bytes)
        mime_type = "application/pdf" if filename.lower().endswith(".pdf") else "application/octet-stream"

        # Extract text from PDF
        text = ""
        page_count = 0
        if mime_type == "application/pdf":
            reader = PdfReader(file_path)
            page_count = len(reader.pages)
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n\n"

            chars_per_page = len(text) / max(page_count, 1)
            if chars_per_page < 100:
                logger.warning("low_text_extraction", chars_per_page=chars_per_page, filename=filename)

        # Auto-classify if doc_type is "auto" or not provided
        classification_confidence = None
        if doc_type == "auto" or not doc_type:
            result = await self.classification_service.classify(text)
            doc_type = result["doc_type"]
            classification_confidence = result["confidence"]
            logger.info("auto_classified", doc_type=doc_type, confidence=classification_confidence)

        # Store file locally
        dest_dir = UPLOAD_DIR / str(property_id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / filename
        shutil.copy2(file_path, dest_path)

        # Smart chunking based on document type
        chunks = smart_chunk_text(text, doc_type)
        logger.info("chunking_complete", chunks=len(chunks), filename=filename)

        # Generate embeddings
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await self.embedding_service.embed_chunks(chunk_texts) if chunk_texts else []

        # Extract structured fields based on document type
        extracted_fields = await self.extraction_service.extract(text, doc_type)

        # Build metadata
        doc_metadata: dict = {}
        if classification_confidence is not None:
            doc_metadata["classification_confidence"] = classification_confidence
        if extracted_fields:
            doc_metadata["extracted_fields"] = extracted_fields

        # Create Document record
        doc = Document(
            property_id=property_id,
            title=title,
            doc_type=doc_type,
            file_path=str(dest_path),
            file_size_bytes=file_size,
            mime_type=mime_type,
            page_count=page_count,
            ocr_text_summary=text[:500] if text else None,
            ingested_at=datetime.now(timezone.utc),
            metadata_=doc_metadata,
        )
        db.add(doc)
        await db.flush()

        # Create DocumentChunk records
        for chunk, embedding in zip(chunks, embeddings):
            db_chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                token_count=chunk["token_count"],
                embedding=embedding,
                section_header=chunk.get("section_header"),
            )
            db.add(db_chunk)

        await db.commit()
        await db.refresh(doc)

        logger.info(
            "ingestion_complete",
            document_id=str(doc.id),
            chunks_created=len(chunks),
        )
        return doc
