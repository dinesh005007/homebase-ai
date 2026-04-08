"""Coverage endpoints — warranties and insurance policies."""

from datetime import date
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.coverage import InsurancePolicy, Warranty
from services.api.src.schemas.coverage import (
    ClaimCheckRequest,
    ClaimCheckResponse,
    InsuranceListResponse,
    InsurancePolicyCreate,
    InsurancePolicyResponse,
    WarrantyCreate,
    WarrantyListResponse,
    WarrantyResponse,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/coverage", tags=["coverage"])


def _warranty_to_response(w: Warranty) -> WarrantyResponse:
    days_remaining = (w.end_date - date.today()).days
    return WarrantyResponse(
        id=w.id,
        property_id=w.property_id,
        provider=w.provider,
        warranty_type=w.warranty_type,
        coverage_summary=w.coverage_summary,
        start_date=w.start_date,
        end_date=w.end_date,
        claim_phone=w.claim_phone,
        claim_email=w.claim_email,
        transferable=w.transferable,
        days_remaining=max(days_remaining, 0),
        is_active=days_remaining > 0,
        created_at=w.created_at,
    )


def _insurance_to_response(p: InsurancePolicy) -> InsurancePolicyResponse:
    days_until_renewal = None
    if p.expiration_date:
        days_until_renewal = max((p.expiration_date - date.today()).days, 0)
    return InsurancePolicyResponse(
        id=p.id,
        property_id=p.property_id,
        carrier=p.carrier,
        policy_number=p.policy_number,
        premium_annual=p.premium_annual,
        deductible=p.deductible,
        dwelling_coverage=p.dwelling_coverage,
        liability_coverage=p.liability_coverage,
        personal_property_coverage=p.personal_property_coverage,
        effective_date=p.effective_date,
        expiration_date=p.expiration_date,
        endorsements=p.endorsements,
        days_until_renewal=days_until_renewal,
        created_at=p.created_at,
    )


# --- Warranties ---

@router.post("/warranties", response_model=WarrantyResponse)
async def create_warranty(
    request: WarrantyCreate,
    db: AsyncSession = Depends(get_db),
) -> WarrantyResponse:
    warranty = Warranty(**request.model_dump())
    db.add(warranty)
    await db.commit()
    await db.refresh(warranty)
    return _warranty_to_response(warranty)


@router.get("/warranties", response_model=WarrantyListResponse)
async def list_warranties(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> WarrantyListResponse:
    result = await db.execute(
        select(Warranty).where(Warranty.property_id == property_id)
        .order_by(Warranty.end_date.asc())
    )
    warranties = result.scalars().all()
    return WarrantyListResponse(
        warranties=[_warranty_to_response(w) for w in warranties],
        total=len(warranties),
    )


# --- Insurance ---

@router.post("/insurance", response_model=InsurancePolicyResponse)
async def create_insurance(
    request: InsurancePolicyCreate,
    db: AsyncSession = Depends(get_db),
) -> InsurancePolicyResponse:
    policy = InsurancePolicy(
        **request.model_dump(exclude={"endorsements"}),
        endorsements={"items": request.endorsements} if request.endorsements else None,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return _insurance_to_response(policy)


@router.get("/insurance", response_model=InsuranceListResponse)
async def list_insurance(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> InsuranceListResponse:
    result = await db.execute(
        select(InsurancePolicy).where(InsurancePolicy.property_id == property_id)
        .order_by(InsurancePolicy.expiration_date.asc().nullslast())
    )
    policies = result.scalars().all()
    return InsuranceListResponse(
        policies=[_insurance_to_response(p) for p in policies],
        total=len(policies),
    )


# --- Claim Check ---

@router.post("/claim-check", response_model=ClaimCheckResponse)
async def claim_check(
    request: ClaimCheckRequest,
    db: AsyncSession = Depends(get_db),
) -> ClaimCheckResponse:
    """AI-assisted claim check: warranty first, then insurance comparison."""
    today = date.today()

    # Check active warranties
    warranty_result = await db.execute(
        select(Warranty).where(
            Warranty.property_id == request.property_id,
            Warranty.end_date >= today,
        )
    )
    active_warranties = warranty_result.scalars().all()

    warranty_applicable = False
    warranty_details = None
    if active_warranties:
        details = []
        for w in active_warranties:
            days_left = (w.end_date - today).days
            details.append(
                f"{w.provider} {w.warranty_type}: {days_left} days remaining"
                + (f" — call {w.claim_phone}" if w.claim_phone else "")
            )
        warranty_applicable = True
        warranty_details = "\n".join(details)

    # Check insurance
    insurance_result = await db.execute(
        select(InsurancePolicy).where(
            InsurancePolicy.property_id == request.property_id,
        ).limit(1)
    )
    policy = insurance_result.scalar_one_or_none()

    insurance_applicable = policy is not None
    deductible = policy.deductible if policy else None

    # Build recommendation
    if warranty_applicable:
        recommendation = "Check warranty coverage first — filing a warranty claim costs nothing."
        if request.estimated_repair_cost and deductible and request.estimated_repair_cost < deductible:
            recommendation += f" Repair cost (${request.estimated_repair_cost:,.0f}) is below your insurance deductible (${deductible:,.0f}), so insurance likely isn't worth filing."
    elif insurance_applicable and request.estimated_repair_cost:
        if deductible and request.estimated_repair_cost > deductible:
            recommendation = f"No active warranty covers this. Repair cost (${request.estimated_repair_cost:,.0f}) exceeds your deductible (${deductible:,.0f}) — consider filing an insurance claim."
        else:
            recommendation = f"No active warranty. Repair cost (${request.estimated_repair_cost:,.0f}) is below your deductible (${deductible:,.0f}) — pay out of pocket."
    else:
        recommendation = "No warranty or insurance data found. Upload your warranty and insurance documents for coverage analysis."

    return ClaimCheckResponse(
        warranty_applicable=warranty_applicable,
        warranty_details=warranty_details,
        insurance_applicable=insurance_applicable,
        deductible=deductible,
        recommendation=recommendation,
    )
