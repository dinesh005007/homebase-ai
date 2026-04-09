"""Entity-linking service: link documents to home entities using gemma3:4b."""

import json

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.models.document_entity_link import DocumentEntityLink
from services.api.src.services.ollama import OllamaClient
from services.api.src.services.router import get_model_router

logger = structlog.get_logger()

ENTITY_TYPES = ["room", "system", "asset", "vendor"]

LINKING_PROMPT = """You are an entity linker for a home management system.
Given document text, identify which home entities this document relates to.

Entity types: room, system, asset, vendor

Examples:
- "HVAC filter replacement" → system: HVAC
- "Kitchen faucet manual" → room: Kitchen, asset: faucet
- "Roof warranty" → system: Roofing
- "Home Depot receipt" → vendor: Home Depot

Respond with ONLY a JSON array of objects, no other text:
[{{"entity_type": "<type>", "entity_name": "<name>", "link_type": "<about|covers|services|installed_in>", "confidence": <0.0-1.0>}}]

If no entities can be identified, return an empty array: []

Document type: {doc_type}
Document title: {title}
Document text (first 1000 chars):
{text}"""


class EntityLinkingService:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()
        self._model = get_model_router().get_model_name("classifier")

    async def link(
        self,
        text: str,
        doc_type: str,
        title: str,
        document_id: str,
        db: AsyncSession,
    ) -> list[dict]:
        """Identify and store entity links for a document."""
        sample = text[:1000].strip()
        if not sample:
            return []

        prompt = LINKING_PROMPT.format(
            doc_type=doc_type,
            title=title,
            text=sample,
        )

        # Call Ollama — catch all errors from the LLM / network layer
        try:
            raw = await self.client.generate(
                prompt=prompt,
                model=self._model,
            )
        except Exception as e:
            logger.warning("entity_linking_llm_error", error=str(e), error_type=type(e).__name__)
            return []

        # Parse response — catch JSON / value errors
        try:
            links = json.loads(raw.strip())
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("entity_linking_parse_error", error=str(e))
            return []

        if not isinstance(links, list):
            return []

        created: list[dict] = []
        for link in links:
            entity_type = link.get("entity_type", "")
            if entity_type not in ENTITY_TYPES:
                continue

            db_link = DocumentEntityLink(
                document_id=document_id,
                entity_type=entity_type,
                entity_name=link.get("entity_name", "unknown"),
                link_type=link.get("link_type", "about"),
                confidence=max(0.0, min(1.0, float(link.get("confidence", 0.5)))),
            )
            db.add(db_link)
            created.append({
                "entity_type": db_link.entity_type,
                "entity_name": db_link.entity_name,
                "link_type": db_link.link_type,
            })

        # flush() may raise DB errors — let them propagate to the caller's
        # savepoint so the session stays clean.
        if created:
            await db.flush()
            logger.info("entity_links_created", document_id=document_id, count=len(created))

        return created
