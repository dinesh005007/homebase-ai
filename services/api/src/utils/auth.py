"""Simple JWT auth middleware. Bypassable in dev mode.

In production, replace with Supabase Auth JWT verification.
For now, uses a shared secret to sign/verify JWTs.
"""

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "false").lower() == "true"

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """Auth dependency. Returns user dict or None if auth is disabled."""
    if not AUTH_ENABLED:
        return {"sub": "dev-user", "email": "dev@homebase.local"}

    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return verify_token(credentials.credentials)
