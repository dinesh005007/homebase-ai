"""Ollama client wrapping httpx for embeddings and generation."""

import asyncio
from collections.abc import AsyncGenerator

import httpx
import structlog

from services.api.src.config import settings

logger = structlog.get_logger()

MAX_RETRIES = 3
EMBED_TIMEOUT = 30.0
GENERATE_TIMEOUT = 180.0
MAX_CONCURRENT_EMBEDS = 5


class OllamaClient:
    def __init__(self, host: str | None = None) -> None:
        self.host = host or settings.OLLAMA_HOST

    async def _request_with_retry(
        self, method: str, path: str, json: dict, timeout: float
    ) -> dict:
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.request(method, f"{self.host}{path}", json=json)
                    resp.raise_for_status()
                    return resp.json()
            except (httpx.HTTPError, httpx.TimeoutException) as e:
                last_error = e
                if attempt < MAX_RETRIES:
                    wait = 2 ** (attempt - 1)
                    logger.warning("ollama_retry", attempt=attempt, wait=wait, error=str(e))
                    await asyncio.sleep(wait)
        raise last_error  # type: ignore[misc]

    async def embed(self, text: str) -> list[float]:
        data = await self._request_with_retry(
            "POST", "/api/embed",
            json={"model": "nomic-embed-text", "input": text},
            timeout=EMBED_TIMEOUT,
        )
        return data["embeddings"][0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_EMBEDS)

        async def _embed_one(t: str) -> list[float]:
            async with semaphore:
                return await self.embed(t)

        return await asyncio.gather(*[_embed_one(t) for t in texts])

    async def generate(
        self,
        prompt: str,
        model: str = "qwen2.5:7b",
        system: str | None = None,
        stream: bool = False,
    ) -> str | AsyncGenerator[str, None]:
        if stream:
            return self._generate_stream(prompt, model, system)

        body: dict = {"model": model, "prompt": prompt, "stream": False}
        if system:
            body["system"] = system

        data = await self._request_with_retry(
            "POST", "/api/generate", json=body, timeout=GENERATE_TIMEOUT
        )
        return data["response"]

    async def _generate_stream(
        self, prompt: str, model: str, system: str | None
    ) -> AsyncGenerator[str, None]:
        body: dict = {"model": model, "prompt": prompt, "stream": True}
        if system:
            body["system"] = system

        async with httpx.AsyncClient(timeout=GENERATE_TIMEOUT) as client:
            async with client.stream("POST", f"{self.host}/api/generate", json=body) as resp:
                resp.raise_for_status()
                import json
                async for line in resp.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        if chunk.get("response"):
                            yield chunk["response"]

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.host}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False
