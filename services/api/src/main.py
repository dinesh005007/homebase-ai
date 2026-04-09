from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from services.api.src.config import settings
from services.api.src.database import engine
from services.api.src.routers import ask, auth, coverage, documents, health, maintenance, properties, smarthome, system

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: verify database connection
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("database_connected", url=settings.DATABASE_URL.split("@")[-1])
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))

    yield

    # Shutdown
    await engine.dispose()
    logger.info("shutdown_complete")


app = FastAPI(
    title="HomeBase AI",
    description="Local-first family home operating system",
    version="0.1.0",
    lifespan=lifespan,
)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
# In dev, allow wildcard so any LAN IP works
if "*" in cors_origins:
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if "*" not in cors_origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(documents.router)
app.include_router(ask.router)
app.include_router(maintenance.router)
app.include_router(smarthome.router)
app.include_router(coverage.router)
app.include_router(system.router)
