"""Audit logging utilities for tracking API actions and AI provenance."""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.models.audit import AIRun, AuditEvent

logger = structlog.get_logger()


async def log_audit_event(
    db: AsyncSession,
    action: str,
    user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    property_id: str | None = None,
    ip_address: str | None = None,
    details: dict | None = None,
) -> None:
    """Log an audit event to the append-only audit trail."""
    event = AuditEvent(
        action=action,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        property_id=property_id,
        ip_address=ip_address,
        details=details,
    )
    db.add(event)
    await db.flush()
    logger.info("audit_event", action=action, entity_type=entity_type, entity_id=entity_id)


async def log_ai_run(
    db: AsyncSession,
    model_used: str,
    property_id: str | None = None,
    question: str | None = None,
    intent: str | None = None,
    is_cloud_fallback: bool = False,
    chunks_retrieved: int | None = None,
    best_similarity: float | None = None,
    confidence: str | None = None,
    safety_level: str | None = None,
    latency_ms: int | None = None,
    tool_calls: dict | None = None,
    details: dict | None = None,
) -> None:
    """Log an AI run for provenance tracking."""
    run = AIRun(
        property_id=property_id,
        question=question[:500] if question else None,
        intent=intent,
        model_used=model_used,
        is_cloud_fallback=is_cloud_fallback,
        chunks_retrieved=chunks_retrieved,
        best_similarity=best_similarity,
        confidence=confidence,
        safety_level=safety_level,
        latency_ms=latency_ms,
        tool_calls=tool_calls,
        details=details,
    )
    db.add(run)
    await db.flush()
