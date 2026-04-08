"""Document classification service using gemma3:4b."""

import json

import structlog

from services.api.src.services.ollama import OllamaClient

logger = structlog.get_logger()

DOCUMENT_TYPES = [
    "warranty",
    "insurance_policy",
    "hoa_ccr",
    "hoa_architectural",
    "closing_deed",
    "closing_settlement",
    "inspection_report",
    "manual",
    "permit",
    "receipt",
    "invoice",
    "contractor_quote",
    "other",
]

CLASSIFICATION_PROMPT = """You are a document classifier for a home management system.
Given the first portion of a document's text, classify it into exactly one of these types:
{types}

Respond with ONLY a JSON object in this exact format, no other text:
{{"doc_type": "<type>", "confidence": <0.0-1.0>}}

Document text:
{text}"""


class ClassificationService:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def classify(self, text: str) -> dict[str, str | float]:
        """Classify document text into a type with confidence score.

        Uses first 500 chars of text for classification.
        Returns {"doc_type": str, "confidence": float}.
        """
        sample = text[:500].strip()
        if not sample:
            return {"doc_type": "other", "confidence": 0.0}

        prompt = CLASSIFICATION_PROMPT.format(
            types=", ".join(DOCUMENT_TYPES),
            text=sample,
        )

        try:
            raw = await self.client.generate(
                prompt=prompt,
                model="gemma3:4b",
            )

            result = json.loads(raw.strip())
            doc_type = result.get("doc_type", "other")
            confidence = float(result.get("confidence", 0.0))

            if doc_type not in DOCUMENT_TYPES:
                logger.warning("unknown_doc_type_classified", doc_type=doc_type)
                doc_type = "other"

            confidence = max(0.0, min(1.0, confidence))

            logger.info("classification_result", doc_type=doc_type, confidence=confidence)
            return {"doc_type": doc_type, "confidence": confidence}

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error("classification_parse_error", error=str(e))
            return {"doc_type": "other", "confidence": 0.0}
