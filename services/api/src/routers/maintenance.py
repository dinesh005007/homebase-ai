"""Maintenance task CRUD endpoints."""

import json
from datetime import date, datetime, timezone
from pathlib import Path
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


PRESETS_DIR = Path("config/maintenance-presets")
SEASONS_BY_MONTH = {1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
                    6: "summer", 7: "summer", 8: "summer", 9: "fall", 10: "fall",
                    11: "fall", 12: "winter"}


@router.post("/seed-from-preset")
async def seed_from_preset(
    property_id: UUID,
    preset: str = Query("north-texas-clay"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate maintenance tasks from a regional preset for the current season."""
    preset_path = PRESETS_DIR / f"{preset}.json"
    if not preset_path.exists():
        raise HTTPException(status_code=404, detail=f"Preset '{preset}' not found")

    data = json.loads(preset_path.read_text())
    current_season = SEASONS_BY_MONTH.get(date.today().month, "spring")
    season_data = data.get("seasons", {}).get(current_season, {})
    tasks_data = season_data.get("tasks", [])

    created = 0
    for t in tasks_data:
        task = MaintenanceTask(
            property_id=property_id,
            title=t["title"],
            description=t.get("description"),
            priority=t.get("priority", "medium"),
            system=t.get("system"),
            recurring=True,
            rrule=t.get("rrule"),
            due_date=date.today(),
        )
        db.add(task)
        created += 1

    await db.commit()
    return {"preset": preset, "season": current_season, "tasks_created": created}
