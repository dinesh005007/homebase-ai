"""RAG query engine: embed question, vector search, assemble prompt, generate answer."""

import time
from uuid import UUID

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.models.document import Document, DocumentChunk
from services.api.src.services.embeddings import EmbeddingService
from services.api.src.services.ollama import OllamaClient

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are HomeBase AI, a knowledgeable home assistant.

STRICT RULES — you must follow all of these:
1. Answer ONLY using the provided context. Do NOT use outside knowledge.
2. If the context does not contain enough information to answer, say:
   "I don't have enough information in your documents to answer this."
   Do NOT guess or speculate.
3. Always cite your sources with [Source: document_title, page X].
4. If you are unsure, say you are unsure. Never fabricate details.
5. Do not answer questions unrelated to the user's home, property, or documents.
6. Keep answers concise and factual."""

TOP_K = 5
MIN_SIMILARITY = 0.3
LOW_CONFIDENCE_THRESHOLD = 0.5


class RAGService:
    def __init__(
        self,
        embedding_service: EmbeddingService | None = None,
        ollama_client: OllamaClient | None = None,
    ) -> None:
        self.embedding_service = embedding_service or EmbeddingService()
        self.ollama_client = ollama_client or OllamaClient()

    async def ask(
        self,
        question: str,
        property_id: UUID,
        db: AsyncSession,
    ) -> dict:
        start = time.monotonic()
        logger.info("rag_query_start", question=question[:100], property_id=str(property_id))

        # Embed the question
        query_embedding = await self.embedding_service.embed_text(question)

        # Vector search for similar chunks
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"
        stmt = text("""
            SELECT
                dc.id,
                dc.document_id,
                dc.content,
                dc.page_number,
                dc.section_header,
                1 - (dc.embedding <=> :embedding::vector) as similarity
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.property_id = :property_id
            ORDER BY dc.embedding <=> :embedding::vector
            LIMIT :top_k
        """)
        result = await db.execute(
            stmt,
            {"embedding": embedding_str, "property_id": property_id, "top_k": TOP_K},
        )
        rows = result.fetchall()

        if not rows:
            latency_ms = int((time.monotonic() - start) * 1000)
            return {
                "answer": "I don't have any documents for this property yet. Please upload some documents first.",
                "sources": [],
                "model_used": "none",
                "latency_ms": latency_ms,
                "confidence": "none",
            }

        # Filter out chunks below minimum similarity threshold
        rows = [r for r in rows if float(r.similarity) >= MIN_SIMILARITY]

        if not rows:
            latency_ms = int((time.monotonic() - start) * 1000)
            logger.info("rag_no_relevant_chunks", property_id=str(property_id))
            return {
                "answer": "I found documents for this property, but none of them seem relevant to your question. Try rephrasing or uploading more specific documents.",
                "sources": [],
                "model_used": "none",
                "latency_ms": latency_ms,
                "confidence": "none",
            }

        # Determine confidence based on best similarity score
        best_similarity = max(float(r.similarity) for r in rows)
        confidence = "high" if best_similarity >= LOW_CONFIDENCE_THRESHOLD else "low"

        # Fetch parent document titles for source attribution
        doc_ids = list({row.document_id for row in rows})
        docs_result = await db.execute(
            select(Document.id, Document.title).where(Document.id.in_(doc_ids))
        )
        doc_titles = {row.id: row.title for row in docs_result.fetchall()}

        # Assemble context
        context_parts: list[str] = []
        sources: list[dict] = []
        for row in rows:
            doc_title = doc_titles.get(row.document_id, "Unknown")
            page_info = f", page {row.page_number}" if row.page_number else ""
            context_parts.append(
                f"[Source: {doc_title}{page_info}]\n{row.content}"
            )
            sources.append({
                "title": doc_title,
                "page": row.page_number,
                "similarity": round(float(row.similarity), 4),
            })

        context = "\n\n---\n\n".join(context_parts)
        prompt = f"Context:\n{context}\n\nQuestion: {question}"

        # Generate answer
        model = "qwen2.5:7b"
        answer = await self.ollama_client.generate(
            prompt=prompt,
            model=model,
            system=SYSTEM_PROMPT,
        )

        # Prepend low-confidence disclaimer
        if confidence == "low":
            answer = (
                "**Note:** The retrieved documents have low relevance to your question. "
                "This answer may not be fully accurate.\n\n" + answer
            )

        latency_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "rag_query_complete",
            latency_ms=latency_ms,
            sources=len(sources),
            best_similarity=best_similarity,
            confidence=confidence,
        )

        return {
            "answer": answer,
            "sources": sources,
            "model_used": model,
            "latency_ms": latency_ms,
            "confidence": confidence,
        }
