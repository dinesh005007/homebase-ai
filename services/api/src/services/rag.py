"""RAG query engine: embed question, vector search, assemble prompt, generate answer."""

import time
from uuid import UUID

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.models.document import Document, DocumentChunk
from services.api.src.services.context import ContextAssemblyService
from services.api.src.services.embeddings import EmbeddingService
from services.api.src.services.intent import IntentService
from services.api.src.services.ollama import OllamaClient
from services.api.src.services.safety import get_safety_engine
from services.api.src.services.search import HybridSearchService

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
        self.intent_service = IntentService()
        self.search_service = HybridSearchService(self.embedding_service)
        self.context_service = ContextAssemblyService()

    async def ask(
        self,
        question: str,
        property_id: UUID,
        db: AsyncSession,
    ) -> dict:
        start = time.monotonic()
        logger.info("rag_query_start", question=question[:100], property_id=str(property_id))

        # Classify intent
        intent_result = await self.intent_service.classify(question)
        intent = intent_result["intent"]
        doc_type_filter = intent_result["doc_type_filter"]

        # Emergency: return safety instructions immediately
        if intent == "emergency":
            latency_ms = int((time.monotonic() - start) * 1000)
            return {
                "answer": (
                    "**EMERGENCY DETECTED — Take immediate action:**\n\n"
                    "1. **Gas smell**: Leave the house immediately. Do NOT use switches/phones inside. Call 911 and your gas company from outside.\n"
                    "2. **Fire**: Evacuate everyone. Call 911. Do NOT re-enter.\n"
                    "3. **Flooding**: Turn off water main if safe. Turn off electricity to affected areas. Call a plumber.\n"
                    "4. **Electrical shock/sparks**: Do NOT touch. Turn off breaker if safe. Call 911.\n\n"
                    "After ensuring safety, contact your insurance company to file a claim."
                ),
                "sources": [],
                "model_used": "safety_engine",
                "latency_ms": latency_ms,
                "confidence": "high",
                "intent": intent,
            }

        # Hybrid search (semantic + keyword with RRF fusion)
        search_results = await self.search_service.search(
            question=question,
            property_id=property_id,
            db=db,
            doc_type_filter=doc_type_filter or None,
            top_k=TOP_K,
        )

        # Fallback: if filtered search returns nothing, retry without filter
        if not search_results and doc_type_filter:
            logger.info("rag_filter_fallback", intent=intent, filter=doc_type_filter)
            search_results = await self.search_service.search(
                question=question,
                property_id=property_id,
                db=db,
                doc_type_filter=None,
                top_k=TOP_K,
            )

        if not search_results:
            latency_ms = int((time.monotonic() - start) * 1000)
            return {
                "answer": "I don't have any documents for this property yet. Please upload some documents first.",
                "sources": [],
                "model_used": "none",
                "latency_ms": latency_ms,
                "confidence": "none",
                "intent": intent,
            }

        # Filter out chunks below minimum similarity threshold
        search_results = [r for r in search_results if r["similarity"] >= MIN_SIMILARITY or r.get("rrf_score", 0) > 0]

        if not search_results:
            latency_ms = int((time.monotonic() - start) * 1000)
            logger.info("rag_no_relevant_chunks", property_id=str(property_id))
            return {
                "answer": "I found documents for this property, but none of them seem relevant to your question. Try rephrasing or uploading more specific documents.",
                "sources": [],
                "model_used": "none",
                "latency_ms": latency_ms,
                "confidence": "none",
                "intent": intent,
            }

        # Determine confidence based on best similarity score
        best_similarity = max(r["similarity"] for r in search_results)
        confidence = "high" if best_similarity >= LOW_CONFIDENCE_THRESHOLD else "low"

        # Fetch parent document titles for source attribution
        doc_ids = list({r["document_id"] for r in search_results})
        docs_result = await db.execute(
            select(Document.id, Document.title).where(Document.id.in_(doc_ids))
        )
        doc_titles = {row.id: row.title for row in docs_result.fetchall()}

        # Assemble context
        context_parts: list[str] = []
        sources: list[dict] = []
        for r in search_results:
            doc_title = doc_titles.get(r["document_id"], "Unknown")
            page_info = f", page {r['page_number']}" if r["page_number"] else ""
            context_parts.append(
                f"[Source: {doc_title}{page_info}]\n{r['content']}"
            )
            sources.append({
                "title": doc_title,
                "page": r["page_number"],
                "similarity": round(r["similarity"], 4),
            })

        context = "\n\n---\n\n".join(context_parts)

        # Assemble home graph context
        home_context = await self.context_service.build_context(property_id, db)

        prompt = f"Home Profile:\n{home_context}\n\nDocument Context:\n{context}\n\nQuestion: {question}"

        # Generate answer
        from services.api.src.services.router import get_model_router
        model = get_model_router().get_model_name("rag")
        try:
            answer = await self.ollama_client.generate(
                prompt=prompt,
                model=model,
                system=SYSTEM_PROMPT,
            )
        except Exception as e:
            logger.error("rag_generation_error", error=str(e))
            latency_ms = int((time.monotonic() - start) * 1000)
            return {
                "answer": f"I couldn't generate an answer right now. Error: {type(e).__name__}. Please check that Ollama is running with the {model} model.",
                "sources": sources,
                "model_used": model,
                "latency_ms": latency_ms,
                "confidence": "none",
                "intent": intent,
                "safety_level": "safe",
            }

        # Prepend low-confidence disclaimer
        if confidence == "low":
            answer = (
                "**Note:** The retrieved documents have low relevance to your question. "
                "This answer may not be fully accurate.\n\n" + answer
            )

        # Post-generation safety check
        safety = get_safety_engine().evaluate(question, answer)
        safety_level = safety["level"]
        if safety["modified_answer"]:
            answer = safety["modified_answer"]

        latency_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "rag_query_complete",
            latency_ms=latency_ms,
            sources=len(sources),
            best_similarity=best_similarity,
            confidence=confidence,
            safety_level=safety_level,
        )

        return {
            "answer": answer,
            "sources": sources,
            "model_used": model,
            "latency_ms": latency_ms,
            "confidence": confidence,
            "intent": intent,
            "safety_level": safety_level,
        }
