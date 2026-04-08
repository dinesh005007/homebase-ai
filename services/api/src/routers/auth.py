"""Authentication endpoints."""

import os
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.api.src.utils.auth import create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Dev accounts (replace with Supabase Auth in production)
DEV_ACCOUNTS = {
    "admin@homebase.local": {"password": "admin123", "name": "Admin"},
    "family@homebase.local": {"password": "family123", "name": "Family Member"},
}


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    name: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    account = DEV_ACCOUNTS.get(request.email)
    if not account or account["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, request.email))
    token = create_access_token(user_id, request.email)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user_id,
        email=request.email,
        name=account["name"],
    )
