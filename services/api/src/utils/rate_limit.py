"""Lightweight in-memory sliding-window rate limiter."""

import time
import threading
from collections import defaultdict


class SlidingWindowLimiter:
    """Per-key sliding window rate limiter.

    Args:
        max_requests: Maximum requests allowed in the window.
        window_seconds: Window duration in seconds.
    """

    def __init__(self, max_requests: int = 30, window_seconds: float = 60.0) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        """Return True if the request is within the rate limit."""
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            # Prune expired timestamps
            timestamps = self._requests[key]
            self._requests[key] = [t for t in timestamps if t > cutoff]

            if len(self._requests[key]) >= self.max_requests:
                return False

            self._requests[key].append(now)
            return True

    def remaining(self, key: str) -> int:
        """Return how many requests remain in the current window."""
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            timestamps = self._requests[key]
            active = [t for t in timestamps if t > cutoff]
            return max(0, self.max_requests - len(active))


# Singleton for SSE streaming endpoint: 30 requests/minute per IP
sse_limiter = SlidingWindowLimiter(max_requests=30, window_seconds=60.0)
