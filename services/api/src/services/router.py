"""Config-driven model routing from model-routing.yaml.

Resolves which Ollama model + timeout to use for a given task role.
Hot-reloadable: re-reads config on each call (cached for 60s).
"""

import threading
import time
from pathlib import Path

import structlog
import yaml

logger = structlog.get_logger()

CONFIG_PATH = Path("config/model-routing.yaml")
_cache: dict | None = None
_cache_time: float = 0
_lock = threading.Lock()
CACHE_TTL = 60.0  # seconds


class ModelRoute:
    def __init__(self, model_name: str, timeout: int) -> None:
        self.model_name = model_name
        self.timeout = timeout


class ModelRouter:
    def __init__(self, config_path: Path | None = None) -> None:
        self._config_path = config_path or CONFIG_PATH

    def _load_config(self) -> dict:
        global _cache, _cache_time
        with _lock:
            now = time.monotonic()
            if _cache is not None and (now - _cache_time) < CACHE_TTL:
                return _cache

            try:
                data = yaml.safe_load(self._config_path.read_text())
                _cache = data
                _cache_time = now
                return data
            except Exception as e:
                logger.error("model_routing_config_error", error=str(e))
                return _cache or {"models": {}, "defaults": {}}

    def resolve(self, role: str) -> ModelRoute:
        """Resolve which model to use for a given role.

        Roles: classifier, extractor, entity-linker, rag, vision, embedding
        Returns ModelRoute with model_name and timeout.
        """
        config = self._load_config()
        defaults = config.get("defaults", {})
        models = config.get("models", {})

        # Look up the model tier for this role
        tier = defaults.get(role)
        if tier and tier in models:
            model_config = models[tier]
            return ModelRoute(
                model_name=model_config["name"],
                timeout=model_config.get("timeout", 60),
            )

        # Fallback: search all models for one that lists this role
        for tier_name, model_config in models.items():
            if role in model_config.get("roles", []):
                return ModelRoute(
                    model_name=model_config["name"],
                    timeout=model_config.get("timeout", 60),
                )

        # Default fallback
        logger.warning("model_route_fallback", role=role)
        return ModelRoute(model_name="qwen2.5:7b", timeout=60)

    def get_model_name(self, role: str) -> str:
        return self.resolve(role).model_name

    def get_timeout(self, role: str) -> int:
        return self.resolve(role).timeout

    def list_models(self) -> dict[str, str]:
        """Return all configured model tiers and their model names."""
        config = self._load_config()
        return {
            tier: info["name"]
            for tier, info in config.get("models", {}).items()
        }


# Singleton
_router: ModelRouter | None = None


def get_model_router() -> ModelRouter:
    global _router
    if _router is None:
        _router = ModelRouter()
    return _router
