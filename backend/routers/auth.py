"""
backend/routers/auth.py — Register + Login
==========================================
POST /auth/register   → create donor or recipient account
POST /auth/login      → returns JWT
GET  /auth/me         → current user profile
"""

import uuid
import hashlib
import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field

from backend.config import get_supabase
from backend.middleware.auth import create_token, get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name:     str        = Field(..., min_length=2, max_length=100)
    email:    str        = Field(..., example="donor@example.com")
    password: str        = Field(..., min_length=6)
    role:     str        = Field(..., pattern="^(donor|recipient)$")
    lat:      float      = Field(..., example=12.9716)
    lng:      float      = Field(..., example=80.2209)
    # recipient-only optional fields
    org_name: str | None = None
    org_type: str | None = None   # ngo, shelter, temple, individual


class LoginRequest(BaseModel):
    email:    str
    password: str


class AuthResponse(BaseModel):
    token:   str
    user_id: str
    email:   str
    role:    str
    name:    str


# ── Helpers ───────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Simple SHA-256 hash. Good enough for hackathon."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    supabase = get_supabase()

    # Check duplicate email
    existing = supabase.table("users") \
        .select("id") \
        .eq("email", req.email) \
        .execute()

    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now     = datetime.now(timezone.utc).isoformat()

    user_row = {
        "id":              user_id,
        "name":            req.name,
        "email":           req.email,
        "password_hash":   hash_password(req.password),
        "role":            req.role,
        "lat":             req.lat,
        "lng":             req.lng,
        "created_at":      now,
    }
    supabase.table("users").insert(user_row).execute()

    # If recipient, also insert into recipients table
    if req.role == "recipient":
        supabase.table("recipients").insert({
            "id":                   user_id,
            "name":                 req.org_name or req.name,
            "type":                 req.org_type or "individual",
            "lat":                  req.lat,
            "lng":                  req.lng,
            "preferred_categories": [],
            "max_distance_km":      10.0,
            "created_at":           now,
        }).execute()

    token = create_token(user_id, req.email, req.role)
    return AuthResponse(
        token=token, user_id=user_id,
        email=req.email, role=req.role, name=req.name
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    supabase = get_supabase()

    resp = supabase.table("users") \
        .select("*") \
        .eq("email", req.email) \
        .execute()

    if not resp.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = resp.data[0]

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"], user["role"])
    return AuthResponse(
        token=token,
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        name=user["name"],
    )


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    resp = supabase.table("users") \
        .select("id,name,email,role,lat,lng,created_at") \
        .eq("id", current_user["sub"]) \
        .execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="User not found")

    return resp.data[0]
