"""Pydantic schemas for maintenance endpoints."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

TaskStatus = Literal["pending", "in_progress", "completed"]
TaskPriority = Literal["low", "medium", "high"]


class MaintenanceTaskCreate(BaseModel):
    property_id: UUID
    title: str
    description: str | None = None
    priority: TaskPriority = "medium"
    system: str | None = None
    room: str | None = None
    due_date: date | None = None
    recurring: bool = False
    rrule: str | None = None


class MaintenanceTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    system: str | None = None
    room: str | None = None
    due_date: date | None = None


class MaintenanceTaskResponse(BaseModel):
    id: UUID
    property_id: UUID
    title: str
    description: str | None
    status: str
    priority: str
    system: str | None
    room: str | None
    due_date: date | None
    completed_at: datetime | None
    recurring: bool
    rrule: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceTaskListResponse(BaseModel):
    tasks: list[MaintenanceTaskResponse]
    total: int
