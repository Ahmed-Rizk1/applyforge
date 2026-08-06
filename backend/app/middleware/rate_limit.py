import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory IP-based rate limiting middleware for resource-intensive LLM endpoints."""

    def __init__(self, app):
        super().__init__(app)
        self.ip_requests: Dict[str, List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        # Rate limit applies to resource-heavy AI generation and parsing endpoints
        if path.startswith("/api/generate") or path.startswith("/api/parse-profile"):
            client_ip = request.client.host if request.client else "127.0.0.1"
            now = time.time()
            window_seconds = settings.rate_limit_window_seconds
            window_start = now - window_seconds

            # Filter out timestamps outside the active window
            timestamps = [ts for ts in self.ip_requests[client_ip] if ts > window_start]
            max_allowed = settings.rate_limit_requests if not settings.is_production else settings.rate_limit_per_day

            if len(timestamps) >= max_allowed:
                retry_after = int(timestamps[0] + window_seconds - now) + 1
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Rate limit exceeded ({max_allowed} requests/{window_seconds // 3600}h limit). Please try again later.",
                        "rate_limit_exceeded": True,
                        "retry_after_seconds": max(1, retry_after)
                    },
                    headers={"Retry-After": str(max(1, retry_after))}
                )

            timestamps.append(now)
            self.ip_requests[client_ip] = timestamps

        return await call_next(request)
