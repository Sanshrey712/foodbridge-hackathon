"""
backend/routers/claims.py — Claims
====================================
POST  /claims                  recipient claims a listing
GET   /claims/mine             recipient's claim history
PATCH /claims/{id}/pickup      mark as picked up
"""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.config import get_supabase
from backend.middleware.auth import get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────

class ClaimCreate(BaseModel):
    listing_id: str


class ClaimOut(BaseModel):
    id:           str
    listing_id:   str
    recipient_id: str
    claimed_at:   str
    picked_up:    bool
    picked_up_at: str | None = None


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("", response_model=ClaimOut)
def create_claim(
    req: ClaimCreate,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()

    # Check listing exists and is unclaimed
    listing_resp = supabase.table("food_listings") \
        .select("id,is_claimed,expires_at") \
        .eq("id", req.listing_id) \
        .execute()

    if not listing_resp.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_resp.data[0]

    if listing["is_claimed"]:
        raise HTTPException(status_code=409, detail="Listing already claimed")

    now = datetime.now(timezone.utc)
    expires_at = datetime.fromisoformat(
        listing["expires_at"].replace("Z", "+00:00")
        if listing["expires_at"].endswith("Z")
        else listing["expires_at"]
    )
    if expires_at < now:
        raise HTTPException(status_code=410, detail="Listing has expired")

    # Check if this recipient already claimed it
    dupe = supabase.table("claims") \
        .select("id") \
        .eq("listing_id", req.listing_id) \
        .eq("recipient_id", current_user["sub"]) \
        .execute()

    if dupe.data:
        raise HTTPException(status_code=409, detail="You already claimed this listing")

    claim_id = str(uuid.uuid4())
    claim_row = {
        "id":           claim_id,
        "listing_id":   req.listing_id,
        "recipient_id": current_user["sub"],
        "claimed_at":   now.isoformat(),
        "picked_up":    False,
    }

    supabase.table("claims").insert(claim_row).execute()

    # Mark listing as claimed
    supabase.table("food_listings") \
        .update({"is_claimed": True}) \
        .eq("id", req.listing_id) \
        .execute()

    return claim_row


@router.get("/mine", response_model=List[ClaimOut])
def my_claims(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    resp = supabase.table("claims") \
        .select("*") \
        .eq("recipient_id", current_user["sub"]) \
        .order("claimed_at", desc=True) \
        .execute()
    return resp.data or []


@router.patch("/{claim_id}/pickup")
def mark_picked_up(
    claim_id: str,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()

    existing = supabase.table("claims") \
        .select("recipient_id,picked_up") \
        .eq("id", claim_id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim = existing.data[0]

    if claim["recipient_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not your claim")

    if claim["picked_up"]:
        raise HTTPException(status_code=409, detail="Already marked as picked up")

    now = datetime.now(timezone.utc).isoformat()
    supabase.table("claims") \
        .update({"picked_up": True, "picked_up_at": now}) \
        .eq("id", claim_id) \
        .execute()

    return {"message": "Marked as picked up", "picked_up_at": now}
