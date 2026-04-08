"""Pydantic schemas for smart home endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SmartHomeStatusResponse(BaseModel):
    ha_connected: bool
    ha_url: str | None
    entities: list[dict]


class SensorHistoryItem(BaseModel):
    state: str
    last_changed: str
    attributes: dict


class SmartHomeActionRequest(BaseModel):
    domain: str
    service: str
    entity_id: str | None = None
    data: dict | None = None


class SmartHomeActionResponse(BaseModel):
    success: bool
    message: str


class AlertResponse(BaseModel):
    id: UUID
    alert_type: str
    severity: str
    title: str
    description: str | None
    entity_id: str | None
    room: str | None
    acknowledged: bool
    resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


class CameraAnalyzeResponse(BaseModel):
    available: bool
    analysis: str | None
    entity_id: str
