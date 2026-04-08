"""Intent classification for user queries using gemma3:4b."""

import json

import structlog

from services.api.src.services.ollama import OllamaClient

logger = structlog.get_logger()

INTENTS = [
    "warranty_question",
    "insurance_question",
    "hoa_question",
    "maintenance_question",
    "diy_question",
    "project_question",
    "asset_question",
    "garden_question",
    "theater_question",
    "financial_question",
    "emergency",
    "general_home",
]

# Map intents to relevant document types for filtered retrieval
INTENT_DOC_TYPES: dict[str, list[str]] = {
    "warranty_question": ["warranty"],
    "insurance_question": ["insurance_policy"],
    "hoa_question": ["hoa_ccr", "hoa_architectural"],
    "maintenance_question": ["manual", "warranty"],
    "diy_question": ["manual"],
    "asset_question": ["manual", "receipt", "warranty"],
    "financial_question": ["closing_deed", "closing_settlement", "receipt", "invoice"],
    "emergency": [],  # skip doc filter, use safety engine
}

INTENT_PROMPT = """Classify this home-related question into exactly one intent.
Intents: {intents}

Rules:
- "emergency" = immediate safety risk (gas leak, fire, flooding, electrical shock)
- Choose the most specific match
- Default to "general_home" if unclear

Respond with ONLY JSON: {{"intent": "<intent>", "confidence": <0.0-1.0>}}

Question: {question}"""


class IntentService:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    async def classify(self, question: str) -> dict:
        """Classify a user question into an intent.

        Returns {"intent": str, "confidence": float, "doc_type_filter": list[str]}.
        """
        prompt = INTENT_PROMPT.format(
            intents=", ".join(INTENTS),
            question=question,
        )

        try:
            raw = await self.client.generate(prompt=prompt, model="gemma3:4b")
            result = json.loads(raw.strip())
            intent = result.get("intent", "general_home")
            confidence = max(0.0, min(1.0, float(result.get("confidence", 0.5))))

            if intent not in INTENTS:
                intent = "general_home"

            doc_filter = INTENT_DOC_TYPES.get(intent, [])

            logger.info("intent_classified", intent=intent, confidence=confidence)
            return {
                "intent": intent,
                "confidence": confidence,
                "doc_type_filter": doc_filter,
            }

        except (json.JSONDecodeError, ValueError) as e:
            logger.error("intent_classification_error", error=str(e))
            return {
                "intent": "general_home",
                "confidence": 0.0,
                "doc_type_filter": [],
            }
