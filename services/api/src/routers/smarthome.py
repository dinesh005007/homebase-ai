"""Smart home endpoints — bridges Home Assistant API."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.database import get_db
from services.api.src.models.smarthome import Alert
from services.api.src.schemas.smarthome import (
    AlertListResponse,
    AlertResponse,
    CameraAnalyzeResponse,
    SmartHomeActionRequest,
    SmartHomeActionResponse,
    SmartHomeStatusResponse,
)
from services.api.src.services.homeassistant import HAClient

router = APIRouter(prefix="/api/v1/smarthome", tags=["smarthome"])


def _get_ha_client() -> HAClient:
    return HAClient()


@router.get("/status", response_model=SmartHomeStatusResponse)
async def smarthome_status(
    ha: HAClient = Depends(_get_ha_client),
) -> SmartHomeStatusResponse:
    connected = await ha.is_available()
    entities = await ha.get_states() if connected else []
    return SmartHomeStatusResponse(
        ha_connected=connected,
        ha_url=ha.url if ha.configured else None,
        entities=entities[:50],
    )


@router.get("/history/{entity_id}")
async def sensor_history(
    entity_id: str,
    hours: int = Query(24, le=168),
    ha: HAClient = Depends(_get_ha_client),
) -> list:
    if not ha.configured:
        return []
    return await ha.get_history(entity_id, hours)


ALLOWED_HA_DOMAINS = {"light", "switch", "climate", "fan", "cover", "lock", "media_player", "scene", "input_boolean"}
BLOCKED_HA_DOMAINS = {"homeassistant", "automation", "script", "shell_command", "persistent_notification"}


@router.post("/action", response_model=SmartHomeActionResponse)
async def execute_action(
    request: SmartHomeActionRequest,
    ha: HAClient = Depends(_get_ha_client),
) -> SmartHomeActionResponse:
    if not ha.configured:
        return SmartHomeActionResponse(success=False, message="Home Assistant not configured")

    if request.domain in BLOCKED_HA_DOMAINS:
        return SmartHomeActionResponse(success=False, message=f"Domain '{request.domain}' is blocked for safety")

    if request.domain not in ALLOWED_HA_DOMAINS:
        return SmartHomeActionResponse(success=False, message=f"Domain '{request.domain}' is not in the allowed list")

    data = request.data or {}
    if request.entity_id:
        data["entity_id"] = request.entity_id

    result = await ha.call_service(request.domain, request.service, data)
    return SmartHomeActionResponse(
        success=result is not None,
        message="Action executed" if result else "Action failed",
    )


@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    property_id: UUID,
    resolved: bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> AlertListResponse:
    stmt = select(Alert).where(
        Alert.property_id == property_id,
        Alert.resolved == resolved,
    ).order_by(Alert.created_at.desc())

    result = await db.execute(stmt)
    alerts = result.scalars().all()

    return AlertListResponse(
        alerts=[AlertResponse.model_validate(a) for a in alerts],
        total=len(alerts),
    )


@router.post("/camera/{camera_id}/analyze", response_model=CameraAnalyzeResponse)
async def analyze_camera(
    camera_id: str,
    ha: HAClient = Depends(_get_ha_client),
) -> CameraAnalyzeResponse:
    if not ha.configured:
        return CameraAnalyzeResponse(
            available=False, analysis=None, entity_id=camera_id,
        )

    snapshot = await ha.get_camera_snapshot(camera_id)
    if not snapshot:
        return CameraAnalyzeResponse(
            available=False, analysis="Could not retrieve camera snapshot", entity_id=camera_id,
        )

    # Vision analysis would go here (llava:13b) when HA is connected
    return CameraAnalyzeResponse(
        available=True,
        analysis="Camera snapshot retrieved. Vision analysis ready when llava:13b is configured.",
        entity_id=camera_id,
    )
