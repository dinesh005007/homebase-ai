"""RAG question-answering endpoint with streaming and conversation history."""

import json
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.conversation import Conversation
from services.api.src.schemas.ask import AskRequest, AskResponse, ConversationItem, ConversationListResponse
from services.api.src.services.rag import RAGService

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1", tags=["ask"])


async def _save_conversation(result: dict, request: AskRequest, db: AsyncSession) -> None:
    conv = Conversation(
        property_id=request.property_id,
        question=request.question,
        answer=result["answer"],
        intent=result.get("intent"),
        model_used=result.get("model_used"),
        latency_ms=result.get("latency_ms"),
        confidence=result.get("confidence"),
        safety_level=result.get("safety_level"),
        sources=result.get("sources"),
    )
    db.add(conv)
    await db.commit()


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
) -> AskResponse:
    try:
        service = RAGService()
        result = await service.ask(
            question=request.question,
            property_id=request.property_id,
            db=db,
        )

        await _save_conversation(result, request, db)
        return AskResponse(**result)
    except Exception as e:
        logger.error("ask_endpoint_error", error=str(e), error_type=type(e).__name__)
        raise HTTPException(
            status_code=500,
            detail="Failed to process question. Please try again.",
        )


@router.post("/ask/stream")
async def ask_stream(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """SSE streaming endpoint for real-time token delivery."""

    async def event_generator():
        try:
            service = RAGService()
            result = await service.ask(
                question=request.question,
                property_id=request.property_id,
                db=db,
            )

            # Stream the answer token-by-token (simulated chunking for now)
            answer = result["answer"]
            words = answer.split(" ")
            streamed = []
            for i, word in enumerate(words):
                streamed.append(word)
                chunk_data = {"token": word + " ", "done": False}
                yield f"data: {json.dumps(chunk_data)}\n\n"

            # Final event with full result metadata
            final = {
                "token": "",
                "done": True,
                "sources": result.get("sources", []),
                "model_used": result.get("model_used"),
                "latency_ms": result.get("latency_ms"),
                "confidence": result.get("confidence"),
                "intent": result.get("intent"),
                "safety_level": result.get("safety_level"),
            }
            yield f"data: {json.dumps(final)}\n\n"

            await _save_conversation(result, request, db)

        except Exception as e:
            logger.error("ask_stream_error", error=str(e), error_type=type(e).__name__)
            error_event = {
                "token": "",
                "done": True,
                "error": "Failed to process question. Please try again.",
            }
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    property_id: UUID,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    count_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.property_id == property_id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Conversation)
        .where(Conversation.property_id == property_id)
        .order_by(Conversation.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    convs = result.scalars().all()

    return ConversationListResponse(
        conversations=[ConversationItem.model_validate(c) for c in convs],
        total=total,
    )
