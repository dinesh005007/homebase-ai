"""Home Assistant API client. Gracefully handles HA being unavailable."""

import structlog
import httpx

from services.api.src.config import settings

logger = structlog.get_logger()


class HAClient:
    """Wrapper for Home Assistant REST API. Returns None/empty when HA is not configured."""

    def __init__(self) -> None:
        self.url = settings.HA_URL.rstrip("/") if settings.HA_URL else ""
        self.token = settings.HA_TOKEN
        self._available: bool | None = None

    @property
    def configured(self) -> bool:
        return bool(self.url and self.token)

    async def _request(self, method: str, path: str, json: dict | None = None) -> dict | list | None:
        if not self.configured:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.request(
                    method,
                    f"{self.url}/api{path}",
                    headers={"Authorization": f"Bearer {self.token}"},
                    json=json,
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning("ha_request_failed", path=path, error=str(e))
            return None

    async def is_available(self) -> bool:
        if not self.configured:
            return False
        result = await self._request("GET", "/")
        return result is not None and result.get("message") == "API running."

    async def get_states(self) -> list[dict]:
        result = await self._request("GET", "/states")
        return result if isinstance(result, list) else []

    async def get_state(self, entity_id: str) -> dict | None:
        result = await self._request("GET", f"/states/{entity_id}")
        return result if isinstance(result, dict) else None

    async def get_history(self, entity_id: str, hours: int = 24) -> list:
        from datetime import datetime, timedelta, timezone
        start = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        result = await self._request("GET", f"/history/period/{start}?filter_entity_id={entity_id}")
        return result[0] if isinstance(result, list) and result else []

    async def call_service(self, domain: str, service: str, data: dict | None = None) -> dict | None:
        return await self._request("POST", f"/services/{domain}/{service}", json=data or {})

    async def get_camera_snapshot(self, entity_id: str) -> bytes | None:
        if not self.configured:
            return None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{self.url}/api/camera_proxy/{entity_id}",
                    headers={"Authorization": f"Bearer {self.token}"},
                )
                resp.raise_for_status()
                return resp.content
        except Exception as e:
            logger.warning("ha_camera_snapshot_failed", entity_id=entity_id, error=str(e))
            return None
