"""Vision analysis endpoint — analyze photos via LLaVA."""

import base64
import io
import time
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.schemas.vision import VisionAnalyzeResponse
from services.api.src.services.ollama import OllamaClient
from services.api.src.services.router import get_model_router

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/vision", tags=["vision"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DIMENSION = 1280  # Resize large images to save memory

VISION_SYSTEM_PROMPT = (
    "You are HomeBase AI Vision Copilot. Analyze home-related images: "
    "identify fixtures, assess damage, read labels/model numbers, diagnose plant issues, "
    "and answer questions. Be specific and practical. "
    "If you see a model number or brand, call it out."
)


def _resize_if_needed(image_bytes: bytes, content_type: str) -> bytes:
    """Resize large images to save memory before sending to LLaVA."""
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        if max(w, h) <= MAX_DIMENSION:
            return image_bytes

        # Resize preserving aspect ratio
        ratio = MAX_DIMENSION / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)

        buf = io.BytesIO()
        fmt = "JPEG" if content_type in ("image/jpeg", "image/heic") else "PNG"
        img.save(buf, format=fmt, quality=85)
        return buf.getvalue()
    except ImportError:
        # Pillow not installed, return original
        return image_bytes


def _convert_heic(image_bytes: bytes) -> tuple[bytes, str]:
    """Convert HEIC (iPhone default) to JPEG using Pillow."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue(), "image/jpeg"
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not process HEIC image: {str(e)}. Set iPhone Camera format to 'Most Compatible' in Settings.",
        )


@router.post("/analyze", response_model=VisionAnalyzeResponse)
async def analyze_image(
    file: UploadFile = File(...),
    question: str = Form("What is this?"),
    property_id: UUID = Form(...),
    db: AsyncSession = Depends(get_db),
) -> VisionAnalyzeResponse:
    """Analyze an uploaded image using the vision model (LLaVA)."""
    start = time.monotonic()

    # Validate file type
    content_type = file.content_type or ""
    if content_type == "image/heic" or (file.filename and file.filename.lower().endswith(".heic")):
        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="Image too large. Maximum size is 10MB.")
        content, content_type = _convert_heic(content)
    elif content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {content_type}. Use JPEG, PNG, or WebP.",
        )
    else:
        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="Image too large. Maximum size is 10MB.")

    # Resize if needed
    content = _resize_if_needed(content, content_type)

    # Base64 encode
    image_b64 = base64.b64encode(content).decode("utf-8")

    # Get vision model
    model = get_model_router().get_model_name("vision")
    logger.info("vision_analyze_start", model=model, image_size=len(content), question=question[:100])

    try:
        client = OllamaClient()
        answer = await client.generate_with_image(
            prompt=question,
            image_base64=image_b64,
            model=model,
            system=VISION_SYSTEM_PROMPT,
        )
    except Exception as e:
        logger.error("vision_analyze_error", error=str(e), error_type=type(e).__name__)
        raise HTTPException(
            status_code=500,
            detail="Vision analysis failed. Ensure Ollama is running with the LLaVA model.",
        )

    latency_ms = int((time.monotonic() - start) * 1000)
    logger.info("vision_analyze_complete", latency_ms=latency_ms, answer_len=len(answer))

    return VisionAnalyzeResponse(
        answer=answer,
        model_used=model,
        latency_ms=latency_ms,
        confidence="medium",
    )
