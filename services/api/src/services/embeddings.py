"""Embedding service wrapping OllamaClient for text vectorization."""

import structlog

from services.api.src.services.ollama import OllamaClient

logger = structlog.get_logger()


class EmbeddingService:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def embed_text(self, text: str) -> list[float]:
        logger.debug("embedding_text", length=len(text))
        return await self.client.embed(text)

    async def embed_chunks(self, chunks: list[str]) -> list[list[float]]:
        logger.info("embedding_chunks", count=len(chunks))
        return await self.client.embed_batch(chunks)
