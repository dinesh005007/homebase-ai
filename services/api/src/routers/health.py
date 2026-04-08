import httpx
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.config import settings
from services.api.src.database import get_db

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    # Check database
    db_status = "unavailable"
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error("database_health_check_failed", error=str(e))

    # Check Ollama
    ollama_status = "unavailable"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_HOST}/api/tags")
            if resp.status_code == 200:
                ollama_status = "connected"
    except Exception as e:
        logger.warning("ollama_health_check_failed", error=str(e))

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
        "ollama": ollama_status,
        "version": "0.1.0",
    }
