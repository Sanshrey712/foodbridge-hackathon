"""
backend/routers/listings.py — Food Listings CRUD
=================================================
POST   /listings            donor posts surplus food
GET    /listings/nearby     geo search
GET    /listings/{id}       single listing
PATCH  /listings/{id}       donor updates listing
DELETE /listings/{id}       donor removes listing
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from backend.config import get_supabase
from backend.middleware.auth import get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    title:       str   = Field(..., min_length=3, max_length=200)
    category:    str   = Field(..., pattern="^(cooked|raw|packaged|bakery|dairy)$")
    quantity_kg: float = Field(..., gt=0, le=1000)
    lat:         float
    lng:         float
    description: str | None = None
    expires_in_hours: float = Field(default=8.0, gt=0, le=168)


class ListingUpdate(BaseModel):
    title:            str | None   = None
    quantity_kg:      float | None = None
    description:      str | None   = None
    is_claimed:       bool | None  = None
    expires_in_hours: float | None = None


class ListingOut(BaseModel):
    id:           str
    donor_id:     str | None
    title:        str
    category:     str
    quantity_kg:  float
    lat:          float
    lng:          float
    expires_at:   str
    is_claimed:   bool
    description:  str | None
    created_at:   str


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("", response_model=ListingOut)
def create_listing(
    req: ListingCreate,
    current_user: dict = Depends(get_current_user)
):
    supabase   = get_supabase()
    now        = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=req.expires_in_hours)

    row = {
        "id":          str(uuid.uuid4()),
        "donor_id":    current_user["sub"],
        "title":       req.title,
        "category":    req.category,
        "quantity_kg": req.quantity_kg,
        "lat":         req.lat,
        "lng":         req.lng,
        "description": req.description,
        "expires_at":  expires_at.isoformat(),
        "is_claimed":  False,
        "created_at":  now.isoformat(),
    }

    resp = supabase.table("food_listings").insert(row).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create listing")

    return resp.data[0]


@router.get("/nearby", response_model=List[ListingOut])
def get_nearby_listings(
    lat:          float = Query(..., example=12.9716),
    lng:          float = Query(..., example=80.2209),
    radius_km:    float = Query(default=10.0, ge=0.5, le=50.0),
    category:     str | None = Query(default=None),
    limit:        int   = Query(default=50, ge=1, le=100),
):
    """
    Returns unclaimed, non-expired listings within radius_km.
    Uses bounding box pre-filter for speed.
    """
    supabase = get_supabase()
    deg      = radius_km / 111.0
    now      = datetime.now(timezone.utc).isoformat()

    query = supabase.table("food_listings") \
        .select("*") \
        .eq("is_claimed", False) \
        .gt("expires_at", now) \
        .gte("lat", lat - deg) \
        .lte("lat", lat + deg) \
        .gte("lng", lng - deg) \
        .lte("lng", lng + deg) \
        .limit(limit)

    if category:
        query = query.eq("category", category)

    resp = query.execute()
    return resp.data or []


@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: str):
    supabase = get_supabase()
    resp = supabase.table("food_listings") \
        .select("*") \
        .eq("id", listing_id) \
        .execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    return resp.data[0]


@router.patch("/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: str,
    req: ListingUpdate,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()

    # Ownership check
    existing = supabase.table("food_listings") \
        .select("donor_id") \
        .eq("id", listing_id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    if existing.data[0]["donor_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not your listing")

    updates = {k: v for k, v in req.model_dump().items() if v is not None}

    if "expires_in_hours" in updates:
        hours = updates.pop("expires_in_hours")
        updates["expires_at"] = (
            datetime.now(timezone.utc) + timedelta(hours=hours)
        ).isoformat()

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = supabase.table("food_listings") \
        .update(updates) \
        .eq("id", listing_id) \
        .execute()

    return resp.data[0]


@router.delete("/{listing_id}")
def delete_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()

    existing = supabase.table("food_listings") \
        .select("donor_id") \
        .eq("id", listing_id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    if existing.data[0]["donor_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not your listing")

    supabase.table("food_listings").delete().eq("id", listing_id).execute()
    return {"message": "Listing deleted"}
