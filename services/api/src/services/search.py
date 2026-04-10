"""Hybrid search: semantic (pgvector) + keyword (tsvector) with RRF fusion."""

from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.services.embeddings import EmbeddingService

logger = structlog.get_logger()

RRF_K = 40  # Reciprocal Rank Fusion constant (lower = more weight to top results)
TOP_K = 7


class HybridSearchService:
    def __init__(self, embedding_service: EmbeddingService | None = None) -> None:
        self.embedding_service = embedding_service or EmbeddingService()

    async def search(
        self,
        question: str,
        property_id: UUID,
        db: AsyncSession,
        doc_type_filter: list[str] | None = None,
        top_k: int = TOP_K,
    ) -> list[dict]:
        """Run semantic + keyword search and fuse with RRF.

        Returns list of {chunk_id, document_id, content, page_number,
        section_header, similarity, rrf_score}.
        """
        query_embedding = await self.embedding_service.embed_text(question)
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        doc_type_clause = ""
        params: dict = {"embedding": embedding_str, "property_id": property_id, "limit": top_k * 2}
        if doc_type_filter:
            doc_type_clause = "AND d.doc_type = ANY(:doc_types)"
            params["doc_types"] = doc_type_filter

        # Semantic search (pgvector cosine distance)
        semantic_stmt = text(f"""
            SELECT
                dc.id as chunk_id,
                dc.document_id,
                dc.content,
                dc.page_number,
                dc.section_header,
                1 - (dc.embedding <=> CAST(:embedding AS vector)) as similarity
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.property_id = :property_id {doc_type_clause}
            ORDER BY dc.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
        """)
        semantic_result = await db.execute(semantic_stmt, params)
        semantic_rows = semantic_result.fetchall()

        # Keyword search (tsvector full-text)
        keyword_params: dict = {"query": question, "property_id": property_id, "limit": top_k * 2}
        if doc_type_filter:
            keyword_params["doc_types"] = doc_type_filter

        keyword_stmt = text(f"""
            SELECT
                dc.id as chunk_id,
                dc.document_id,
                dc.content,
                dc.page_number,
                dc.section_header,
                ts_rank(dc.search_vector, websearch_to_tsquery('english', :query)) as rank
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.property_id = :property_id
              AND dc.search_vector @@ websearch_to_tsquery('english', :query)
              {doc_type_clause}
            ORDER BY rank DESC
            LIMIT :limit
        """)
        keyword_result = await db.execute(keyword_stmt, keyword_params)
        keyword_rows = keyword_result.fetchall()

        # RRF Fusion
        rrf_scores: dict[str, float] = {}
        chunk_data: dict[str, dict] = {}

        for rank, row in enumerate(semantic_rows):
            cid = str(row.chunk_id)
            rrf_scores[cid] = rrf_scores.get(cid, 0) + 1.0 / (RRF_K + rank + 1)
            chunk_data[cid] = {
                "chunk_id": row.chunk_id,
                "document_id": row.document_id,
                "content": row.content,
                "page_number": row.page_number,
                "section_header": row.section_header,
                "similarity": float(row.similarity),
            }

        for rank, row in enumerate(keyword_rows):
            cid = str(row.chunk_id)
            rrf_scores[cid] = rrf_scores.get(cid, 0) + 1.0 / (RRF_K + rank + 1)
            if cid not in chunk_data:
                chunk_data[cid] = {
                    "chunk_id": row.chunk_id,
                    "document_id": row.document_id,
                    "content": row.content,
                    "page_number": row.page_number,
                    "section_header": row.section_header,
                    "similarity": 0.0,
                }

        # Sort by RRF score, return top_k
        sorted_ids = sorted(rrf_scores, key=rrf_scores.get, reverse=True)[:top_k]
        results = []
        for cid in sorted_ids:
            entry = chunk_data[cid]
            entry["rrf_score"] = round(rrf_scores[cid], 6)
            results.append(entry)

        logger.info(
            "hybrid_search_complete",
            semantic_hits=len(semantic_rows),
            keyword_hits=len(keyword_rows),
            fused=len(results),
        )
        return results
