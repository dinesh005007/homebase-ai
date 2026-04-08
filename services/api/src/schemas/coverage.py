"""Pydantic schemas for coverage (warranty + insurance) endpoints."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class WarrantyCreate(BaseModel):
    property_id: UUID
    provider: str
    warranty_type: str
    coverage_summary: str | None = None
    start_date: date
    end_date: date
    claim_phone: str | None = None
    claim_email: str | None = None
    transferable: bool = False
    document_id: UUID | None = None


class WarrantyResponse(BaseModel):
    id: UUID
    property_id: UUID
    provider: str
    warranty_type: str
    coverage_summary: str | None
    start_date: date
    end_date: date
    claim_phone: str | None
    claim_email: str | None
    transferable: bool
    days_remaining: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WarrantyListResponse(BaseModel):
    warranties: list[WarrantyResponse]
    total: int


class InsurancePolicyCreate(BaseModel):
    property_id: UUID
    carrier: str
    policy_number: str | None = None
    premium_annual: float | None = None
    deductible: float | None = None
    dwelling_coverage: float | None = None
    liability_coverage: float | None = None
    personal_property_coverage: float | None = None
    effective_date: date | None = None
    expiration_date: date | None = None
    endorsements: list[str] | None = None
    document_id: UUID | None = None


class InsurancePolicyResponse(BaseModel):
    id: UUID
    property_id: UUID
    carrier: str
    policy_number: str | None
    premium_annual: float | None
    deductible: float | None
    dwelling_coverage: float | None
    liability_coverage: float | None
    personal_property_coverage: float | None
    effective_date: date | None
    expiration_date: date | None
    endorsements: dict | None
    days_until_renewal: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InsuranceListResponse(BaseModel):
    policies: list[InsurancePolicyResponse]
    total: int


class ClaimCheckRequest(BaseModel):
    property_id: UUID
    issue_description: str
    estimated_repair_cost: float | None = None


class ClaimCheckResponse(BaseModel):
    warranty_applicable: bool
    warranty_details: str | None
    insurance_applicable: bool
    deductible: float | None
    recommendation: str
