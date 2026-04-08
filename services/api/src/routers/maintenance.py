"""Maintenance task CRUD endpoints."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.maintenance import MaintenanceTask
from services.api.src.schemas.maintenance import (
    MaintenanceTaskCreate,
    MaintenanceTaskListResponse,
    MaintenanceTaskResponse,
    MaintenanceTaskUpdate,
)

router = APIRouter(prefix="/api/v1/maintenance", tags=["maintenance"])


@router.post("/tasks", response_model=MaintenanceTaskResponse)
async def create_task(
    request: MaintenanceTaskCreate,
    db: AsyncSession = Depends(get_db),
) -> MaintenanceTaskResponse:
    task = MaintenanceTask(
        property_id=request.property_id,
        title=request.title,
        description=request.description,
        priority=request.priority,
        system=request.system,
        room=request.room,
        due_date=request.due_date,
        recurring=request.recurring,
        rrule=request.rrule,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return MaintenanceTaskResponse.model_validate(task)


@router.get("/tasks", response_model=MaintenanceTaskListResponse)
async def list_tasks(
    property_id: UUID,
    status: str | None = Query(None),
    priority: str | None = Query(None),
    system: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> MaintenanceTaskListResponse:
    stmt = select(MaintenanceTask).where(MaintenanceTask.property_id == property_id)

    if status:
        stmt = stmt.where(MaintenanceTask.status == status)
    if priority:
        stmt = stmt.where(MaintenanceTask.priority == priority)
    if system:
        stmt = stmt.where(MaintenanceTask.system == system)

    stmt = stmt.order_by(MaintenanceTask.due_date.asc().nullslast(), MaintenanceTask.created_at.desc())

    result = await db.execute(stmt)
    tasks = result.scalars().all()

    return MaintenanceTaskListResponse(
        tasks=[MaintenanceTaskResponse.model_validate(t) for t in tasks],
        total=len(tasks),
    )


@router.get("/tasks/{task_id}", response_model=MaintenanceTaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> MaintenanceTaskResponse:
    task = await db.get(MaintenanceTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return MaintenanceTaskResponse.model_validate(task)


@router.patch("/tasks/{task_id}", response_model=MaintenanceTaskResponse)
async def update_task(
    task_id: UUID,
    request: MaintenanceTaskUpdate,
    db: AsyncSession = Depends(get_db),
) -> MaintenanceTaskResponse:
    task = await db.get(MaintenanceTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = request.model_dump(exclude_unset=True)

    # Auto-set completed_at when status changes to "completed"
    if update_data.get("status") == "completed" and task.status != "completed":
        update_data["completed_at"] = datetime.now(timezone.utc)
    elif update_data.get("status") and update_data["status"] != "completed":
        update_data["completed_at"] = None

    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return MaintenanceTaskResponse.model_validate(task)


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    task = await db.get(MaintenanceTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"status": "deleted", "id": str(task_id)}
