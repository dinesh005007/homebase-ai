import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from services.api.src.models.base import Base, TimestampMixin


class SensorReading(Base):
    """Sensor data from Home Assistant. Designed for time-series with downsampling."""
    __tablename__ = "sensor_readings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default="gen_random_uuid()"
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True
    )
    entity_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(20))
    state: Mapped[str | None] = mapped_column(String(100))
    room: Mapped[str | None] = mapped_column(String(100))
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)


class Alert(TimestampMixin, Base):
    """Alerts generated from sensor data or manual triggers."""
    __tablename__ = "alerts"

    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True
    )
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    entity_id: Mapped[str | None] = mapped_column(String(255))
    room: Mapped[str | None] = mapped_column(String(100))
    acknowledged: Mapped[bool] = mapped_column(default=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved: Mapped[bool] = mapped_column(default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)
