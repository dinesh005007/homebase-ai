"""RAG question-answering endpoint with streaming and conversation history."""

import json
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from services.api.src.database import get_db
from services.api.src.models.conversation import Conversation, Message
from services.api.src.schemas.ask import (
    AskRequest,
    AskResponse,
    ConversationDetail,
    ConversationItem,
    ConversationListResponse,
    MessageItem,
)
from services.api.src.services.rag import RAGService
from services.api.src.utils.rate_limit import sse_limiter

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1", tags=["ask"])

# Max conversation history exchanges to include in RAG context
MAX_HISTORY_EXCHANGES = 3


async def _get_or_create_conversation(
    request: AskRequest, db: AsyncSession
) -> Conversation:
    """Get existing conversation thread or create a new one."""
    if request.conversation_id:
        conv = await db.get(Conversation, request.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.property_id != request.property_id:
            raise HTTPException(status_code=400, detail="Conversation belongs to a different property")
        return conv

    # Create new conversation thread, titled from first question
    title = request.question[:100].strip()
    conv = Conversation(property_id=request.property_id, title=title)
    db.add(conv)
    await db.flush()  # get the ID
    return conv


async def _get_conversation_history(conv_id: UUID, db: AsyncSession) -> list[dict]:
    """Get recent messages from conversation for RAG context."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc())
        .limit(MAX_HISTORY_EXCHANGES * 2)  # user + assistant pairs
    )
    messages = list(reversed(result.scalars().all()))
    return [{"role": m.role, "content": m.content} for m in messages]


async def _save_messages(
    conv: Conversation, question: str, result: dict, db: AsyncSession
) -> None:
    """Save both user question and assistant answer as messages."""
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=question,
    )
    assistant_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=result["answer"],
        intent=result.get("intent"),
        model_used=result.get("model_used"),
        latency_ms=result.get("latency_ms"),
        confidence=result.get("confidence"),
        safety_level=result.get("safety_level"),
        sources=result.get("sources"),
    )
    db.add(user_msg)
    db.add(assistant_msg)
    # Update conversation timestamp
    conv.updated_at = func.now()
    await db.commit()


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
) -> AskResponse:
    try:
        conv = await _get_or_create_conversation(request, db)

        # Get conversation history for context
        history = await _get_conversation_history(conv.id, db)

        service = RAGService()
        result = await service.ask(
            question=request.question,
            property_id=request.property_id,
            db=db,
            conversation_history=history,
        )

        await _save_messages(conv, request.question, result, db)
        return AskResponse(**result, conversation_id=str(conv.id))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("ask_endpoint_error", error=str(e), error_type=type(e).__name__)
        raise HTTPException(
            status_code=500,
            detail="Failed to process question. Please try again.",
        )


@router.post("/ask/stream")
async def ask_stream(
    request: AskRequest,
    raw_request: Request,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """SSE streaming endpoint for real-time token delivery."""
    client_ip = raw_request.client.host if raw_request.client else "unknown"
    if not sse_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment before asking again.",
        )

    conv = await _get_or_create_conversation(request, db)
    history = await _get_conversation_history(conv.id, db)

    async def event_generator():
        try:
            service = RAGService()
            result = await service.ask(
                question=request.question,
                property_id=request.property_id,
                db=db,
                conversation_history=history,
            )

            # Stream the answer token-by-token (simulated chunking for now)
            answer = result["answer"]
            words = answer.split(" ")
            for word in words:
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
                "conversation_id": str(conv.id),
            }
            yield f"data: {json.dumps(final)}\n\n"

            await _save_messages(conv, request.question, result, db)

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
    # Count total
    count_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.property_id == property_id)
    )
    total = count_result.scalar_one()

    # Get conversations with message count and last message preview
    result = await db.execute(
        select(Conversation)
        .where(Conversation.property_id == property_id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    convs = result.scalars().all()

    items = []
    for c in convs:
        # Count messages
        msg_count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == c.id)
        )
        msg_count = msg_count_result.scalar_one()

        # Get last message preview
        last_msg_result = await db.execute(
            select(Message.content)
            .where(Message.conversation_id == c.id, Message.role == "assistant")
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()

        items.append(ConversationItem(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=msg_count,
            last_message=last_msg[:150] if last_msg else None,
        ))

    return ConversationListResponse(conversations=items, total=total)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        messages=[MessageItem.model_validate(m) for m in conv.messages],
    )


@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update conversation title."""
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if "title" in body:
        conv.title = str(body["title"])[:200]
        await db.commit()

    return {"status": "updated", "id": str(conv.id), "title": conv.title}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)  # cascade deletes messages
    await db.commit()
    return {"status": "deleted"}


@router.delete("/conversations")
async def clear_conversations(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        delete(Conversation).where(Conversation.property_id == property_id)
    )
    await db.commit()
    return {"status": "cleared", "deleted": result.rowcount}
