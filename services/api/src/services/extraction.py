"""Structured field extraction per document type using gemma3:4b."""

import json

import structlog

from services.api.src.services.ollama import OllamaClient
from services.api.src.services.router import get_model_router

logger = structlog.get_logger()

EXTRACTION_SCHEMAS: dict[str, dict] = {
    "warranty": {
        "fields": "coverage_items (list of {item, covered_until}), warranty_start_date, warranty_end_date, claim_phone, claim_email, transferable (bool), exclusions (list)",
        "example": '{"coverage_items": [{"item": "HVAC", "covered_until": "2028-03-25"}], "warranty_start_date": "2026-03-25", "warranty_end_date": "2027-03-25", "claim_phone": "800-555-0100", "claim_email": null, "transferable": true, "exclusions": ["cosmetic damage"]}',
    },
    "insurance_policy": {
        "fields": "policy_number, carrier, premium_annual, deductible, dwelling_coverage, liability_coverage, personal_property_coverage, endorsements (list), effective_date, expiration_date",
        "example": '{"policy_number": "HO-123456", "carrier": "State Farm", "premium_annual": 2400, "deductible": 2500, "dwelling_coverage": 450000, "liability_coverage": 300000, "personal_property_coverage": 150000, "endorsements": ["water backup", "equipment breakdown"], "effective_date": "2026-03-25", "expiration_date": "2027-03-25"}',
    },
    "hoa_ccr": {
        "fields": "hoa_name, monthly_fee, rules (list of {category, description}), meeting_schedule, architectural_review_required (bool), fence_restrictions, paint_restrictions, parking_rules",
        "example": '{"hoa_name": "Celina Hills HOA", "monthly_fee": 75, "rules": [{"category": "fencing", "description": "Max 6ft, wood or iron only"}], "meeting_schedule": "quarterly", "architectural_review_required": true, "fence_restrictions": "6ft max", "paint_restrictions": "earth tones", "parking_rules": "no street overnight"}',
    },
    "closing_deed": {
        "fields": "purchase_price, loan_amount, interest_rate, loan_type, down_payment, closing_date, legal_description, easements (list), survey_notes",
        "example": '{"purchase_price": 485000, "loan_amount": 388000, "interest_rate": 6.25, "loan_type": "conventional 30yr", "down_payment": 97000, "closing_date": "2026-03-25", "legal_description": "Lot 42, Block A", "easements": ["utility easement 10ft rear"], "survey_notes": null}',
    },
    "manual": {
        "fields": "brand, model_number, serial_number, asset_type, installation_date, maintenance_schedule (list of {task, interval}), parts_list (list of {part, part_number})",
        "example": '{"brand": "Carrier", "model_number": "24ACC636A003", "serial_number": null, "asset_type": "HVAC", "installation_date": null, "maintenance_schedule": [{"task": "filter change", "interval": "90 days"}], "parts_list": [{"part": "filter", "part_number": "MERV-13"}]}',
    },
    "receipt": {
        "fields": "vendor, amount, date, items (list of {description, amount}), payment_method, linked_asset, linked_project",
        "example": '{"vendor": "Home Depot", "amount": 245.67, "date": "2026-04-01", "items": [{"description": "MERV-13 filters x4", "amount": 89.96}], "payment_method": "credit card", "linked_asset": "HVAC", "linked_project": null}',
    },
}

EXTRACTION_PROMPT = """You are extracting structured data from a home document.
Document type: {doc_type}
Extract these fields: {fields}

Example output format:
{example}

Respond with ONLY a valid JSON object. If a field is not found in the text, use null.
Do NOT guess or fabricate values — only extract what is explicitly stated.

Document text:
{text}"""


class ExtractionService:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()
        self._model = get_model_router().get_model_name("extractor")

    async def extract(self, text: str, doc_type: str) -> dict | None:
        """Extract structured fields from document text based on its type.

        Returns dict of extracted fields, or None if doc_type has no schema.
        """
        schema = EXTRACTION_SCHEMAS.get(doc_type)
        if not schema:
            logger.debug("no_extraction_schema", doc_type=doc_type)
            return None

        # Use first 3000 chars for extraction
        sample = text[:3000].strip()
        if not sample:
            return None

        prompt = EXTRACTION_PROMPT.format(
            doc_type=doc_type,
            fields=schema["fields"],
            example=schema["example"],
            text=sample,
        )

        try:
            raw = await self.client.generate(
                prompt=prompt,
                model=self._model,
            )

            result = json.loads(raw.strip())
            logger.info("extraction_complete", doc_type=doc_type, fields=len(result))
            return result

        except (json.JSONDecodeError, ValueError) as e:
            logger.error("extraction_parse_error", doc_type=doc_type, error=str(e))
            return None
