"""Safety policy engine: post-generation classifier for dangerous advice.

Classifies actions as SAFE/CAUTION/ESCALATE/REFUSE based on pattern-matched
rules from config/safety-rules.yaml. Runs in <50ms (regex only, no LLM).
"""

import re
from pathlib import Path

import structlog
import yaml

logger = structlog.get_logger()

SAFETY_CONFIG_PATH = Path("config/safety-rules.yaml")

SafetyLevel = str  # "safe" | "caution" | "escalate" | "refuse"


class SafetyRule:
    def __init__(self, pattern: str, message: str) -> None:
        self.pattern = re.compile(pattern, re.IGNORECASE)
        self.message = message

    def matches(self, text: str) -> bool:
        return bool(self.pattern.search(text))


class SafetyEngine:
    def __init__(self, config_path: Path | None = None) -> None:
        self._rules: dict[SafetyLevel, list[SafetyRule]] = {
            "refuse": [],
            "escalate": [],
            "caution": [],
        }
        self._load_rules(config_path or SAFETY_CONFIG_PATH)

    def _load_rules(self, path: Path) -> None:
        try:
            data = yaml.safe_load(path.read_text())
            rules = data.get("rules", {})
            for level in ("refuse", "escalate", "caution"):
                for entry in rules.get(level, []):
                    self._rules[level].append(
                        SafetyRule(entry["pattern"], entry["message"])
                    )
            total = sum(len(v) for v in self._rules.values())
            logger.info("safety_rules_loaded", total=total)
        except Exception as e:
            logger.error("safety_rules_load_error", error=str(e))

    def evaluate(self, question: str, answer: str) -> dict:
        """Evaluate a question + answer pair for safety concerns.

        Returns {
            "level": "safe" | "caution" | "escalate" | "refuse",
            "warnings": [str],
            "modified_answer": str | None
        }
        """
        combined = f"{question}\n{answer}"
        warnings: list[str] = []
        level: SafetyLevel = "safe"

        # Check in priority order: refuse > escalate > caution
        for rule in self._rules["refuse"]:
            if rule.matches(combined):
                return {
                    "level": "refuse",
                    "warnings": [rule.message],
                    "modified_answer": rule.message,
                }

        for rule in self._rules["escalate"]:
            if rule.matches(combined):
                level = "escalate"
                warnings.append(rule.message)

        for rule in self._rules["caution"]:
            if rule.matches(combined):
                if level == "safe":
                    level = "caution"
                warnings.append(rule.message)

        modified_answer = None
        if warnings:
            warning_block = "\n".join(f"- {w}" for w in warnings)
            prefix = "**Safety Warning:**\n" if level == "escalate" else "**Note:**\n"
            modified_answer = f"{prefix}{warning_block}\n\n{answer}"

        return {
            "level": level,
            "warnings": warnings,
            "modified_answer": modified_answer,
        }


# Singleton instance
_engine: SafetyEngine | None = None


def get_safety_engine() -> SafetyEngine:
    global _engine
    if _engine is None:
        _engine = SafetyEngine()
    return _engine
