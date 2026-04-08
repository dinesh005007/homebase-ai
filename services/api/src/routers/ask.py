"""RAG question-answering endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.schemas.ask import AskRequest, AskResponse
from services.api.src.services.rag import RAGService

router = APIRouter(prefix="/api/v1", tags=["ask"])


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
) -> AskResponse:
    service = RAGService()
    result = await service.ask(
        question=request.question,
        property_id=request.property_id,
        db=db,
    )
    return AskResponse(**result)
