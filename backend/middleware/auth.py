"""
backend/middleware/auth.py — JWT helpers + FastAPI dependency
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Header
from backend.config import JWT_SECRET, JWT_ALGO, JWT_EXPIRE_HOURS


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub":   user_id,
        "email": email,
        "role":  role,
        "exp":   datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat":   datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency — extracts user from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    return decode_token(token)


def require_role(role: str):
    """Factory dependency — ensures user has a specific role."""
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") != role:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires role: {role}"
            )
        return user
    return checker
