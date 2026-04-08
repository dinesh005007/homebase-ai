"""Home graph context assembly: inject property, warranty, maintenance context into RAG prompts."""

from datetime import date, datetime, timezone
from uuid import UUID

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.models.conversation import Conversation
from services.api.src.models.document import Document
from services.api.src.models.property import Property

logger = structlog.get_logger()

SEASONS = {1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
           6: "summer", 7: "summer", 8: "summer", 9: "fall", 10: "fall",
           11: "fall", 12: "winter"}


class ContextAssemblyService:
    async def build_context(
        self,
        property_id: UUID,
        db: AsyncSession,
    ) -> str:
        """Build home graph context string for RAG prompt injection."""
        parts: list[str] = []

        # Property metadata
        prop = await db.get(Property, property_id)
        if prop:
            parts.append(f"Property: {prop.name}, {prop.address_line1}, {prop.city}, {prop.state} {prop.zip_code}")
            if prop.builder:
                parts.append(f"Builder: {prop.builder}" + (f" ({prop.builder_model})" if prop.builder_model else ""))
            if prop.purchase_date:
                days_owned = (date.today() - prop.purchase_date).days
                parts.append(f"Purchased: {prop.purchase_date.isoformat()} ({days_owned} days ago)")

                # Warranty countdowns (common new-home warranty periods)
                one_year = (prop.purchase_date.replace(year=prop.purchase_date.year + 1) - date.today()).days
                two_year = (prop.purchase_date.replace(year=prop.purchase_date.year + 2) - date.today()).days
                ten_year = (prop.purchase_date.replace(year=prop.purchase_date.year + 10) - date.today()).days
                warranty_parts = []
                if one_year > 0:
                    warranty_parts.append(f"1-year warranty: {one_year} days remaining")
                else:
                    warranty_parts.append("1-year warranty: EXPIRED")
                if two_year > 0:
                    warranty_parts.append(f"2-year systems warranty: {two_year} days remaining")
                if ten_year > 0:
                    warranty_parts.append(f"10-year structural warranty: {ten_year} days remaining")
                parts.append("Warranty status: " + "; ".join(warranty_parts))

            if prop.metadata_:
                meta = prop.metadata_
                if "climate_zone" in meta:
                    parts.append(f"Climate zone: {meta['climate_zone']}")
                if "soil_type" in meta:
                    parts.append(f"Soil type: {meta['soil_type']}")
                if "hoa" in meta:
                    parts.append(f"HOA: {meta['hoa']}")

        # Temporal context
        now = datetime.now(timezone.utc)
        season = SEASONS.get(now.month, "unknown")
        parts.append(f"Current date: {now.strftime('%B %d, %Y')}, Season: {season}")

        # Document summary
        doc_result = await db.execute(
            select(Document.doc_type, func.count())
            .where(Document.property_id == property_id)
            .group_by(Document.doc_type)
        )
        doc_counts = {row[0]: row[1] for row in doc_result.fetchall()}
        if doc_counts:
            doc_summary = ", ".join(f"{count} {dtype}" for dtype, count in doc_counts.items())
            parts.append(f"Documents on file: {doc_summary}")

        # Recent conversation context (last 3 exchanges)
        conv_result = await db.execute(
            select(Conversation)
            .where(Conversation.property_id == property_id)
            .order_by(Conversation.created_at.desc())
            .limit(3)
        )
        convs = list(reversed(conv_result.scalars().all()))
        if convs:
            history = []
            for c in convs:
                history.append(f"Q: {c.question[:100]}")
                history.append(f"A: {c.answer[:150]}")
            parts.append("Recent conversation:\n" + "\n".join(history))

        context = "\n".join(parts)
        logger.debug("context_assembled", length=len(context))
        return context
