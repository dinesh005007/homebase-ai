import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from services.api.src.models.base import Base, TimestampMixin


class Warranty(TimestampMixin, Base):
    __tablename__ = "warranties"

    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True
    )
    provider: Mapped[str] = mapped_column(String(255), nullable=False)
    warranty_type: Mapped[str] = mapped_column(String(100), nullable=False)
    coverage_summary: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    claim_phone: Mapped[str | None] = mapped_column(String(50))
    claim_email: Mapped[str | None] = mapped_column(String(255))
    transferable: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)


class InsurancePolicy(TimestampMixin, Base):
    __tablename__ = "insurance_policies"

    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True
    )
    carrier: Mapped[str] = mapped_column(String(255), nullable=False)
    policy_number: Mapped[str | None] = mapped_column(String(100))
    premium_annual: Mapped[float | None] = mapped_column(Float)
    deductible: Mapped[float | None] = mapped_column(Float)
    dwelling_coverage: Mapped[float | None] = mapped_column(Float)
    liability_coverage: Mapped[float | None] = mapped_column(Float)
    personal_property_coverage: Mapped[float | None] = mapped_column(Float)
    effective_date: Mapped[date | None] = mapped_column(Date)
    expiration_date: Mapped[date | None] = mapped_column(Date)
    endorsements: Mapped[dict | None] = mapped_column(JSONB)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)
