"""System monitoring and status endpoints."""

import os
import shutil
import time

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.audit import AIRun, AuditEvent
from services.api.src.models.conversation import Conversation
from services.api.src.models.document import Document
from services.api.src.services.ollama import OllamaClient

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/system", tags=["system"])

_start_time = time.monotonic()


@router.get("/status")
async def system_status(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """System health dashboard with disk, DB, Ollama, and usage stats."""

    # Uptime
    uptime_seconds = int(time.monotonic() - _start_time)

    # Database
    db_status = "unavailable"
    db_size = None
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
        size_result = await db.execute(text(
            "SELECT pg_size_pretty(pg_database_size('homebase'))"
        ))
        db_size = size_result.scalar()
    except Exception:
        pass

    # Ollama
    ollama_status = "unavailable"
    ollama_models: list[str] = []
    try:
        client = OllamaClient()
        if await client.health():
            ollama_status = "connected"
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as http:
                resp = await http.get(f"{client.host}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    ollama_models = [m["name"] for m in data.get("models", [])]
    except Exception:
        pass

    # Disk
    disk = shutil.disk_usage("/")
    disk_info = {
        "total_gb": round(disk.total / (1024**3), 1),
        "used_gb": round(disk.used / (1024**3), 1),
        "free_gb": round(disk.free / (1024**3), 1),
        "percent_used": round(disk.used / disk.total * 100, 1),
    }

    # Usage stats
    doc_count = (await db.execute(select(func.count()).select_from(Document))).scalar_one()
    conv_count = (await db.execute(select(func.count()).select_from(Conversation))).scalar_one()
    ai_run_count = (await db.execute(select(func.count()).select_from(AIRun))).scalar_one()
    audit_count = (await db.execute(select(func.count()).select_from(AuditEvent))).scalar_one()

    return {
        "version": "0.1.0",
        "uptime_seconds": uptime_seconds,
        "database": {"status": db_status, "size": db_size},
        "ollama": {"status": ollama_status, "models": ollama_models},
        "disk": disk_info,
        "usage": {
            "documents": doc_count,
            "conversations": conv_count,
            "ai_runs": ai_run_count,
            "audit_events": audit_count,
        },
    }
