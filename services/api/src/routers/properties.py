"""Property listing endpoint."""

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.property import Property

router = APIRouter(prefix="/api/v1/properties", tags=["properties"])


class PropertyResponse(BaseModel):
    id: UUID
    name: str
    address_line1: str
    city: str
    state: str
    zip_code: str
    builder: str | None
    builder_model: str | None
    purchase_date: str | None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[PropertyResponse])
async def list_properties(
    db: AsyncSession = Depends(get_db),
) -> list[PropertyResponse]:
    result = await db.execute(select(Property).order_by(Property.created_at))
    props = result.scalars().all()
    return [
        PropertyResponse(
            id=p.id,
            name=p.name,
            address_line1=p.address_line1,
            city=p.city,
            state=p.state,
            zip_code=p.zip_code,
            builder=p.builder,
            builder_model=p.builder_model,
            purchase_date=p.purchase_date.isoformat() if p.purchase_date else None,
        )
        for p in props
    ]
