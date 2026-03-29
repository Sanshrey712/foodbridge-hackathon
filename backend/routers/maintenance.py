"""
backend/routers/maintenance.py — Maintenance Tasks
=====================================================
POST /maintenance/archive-expired   Archive expired food listings
GET  /maintenance/stats             System health stats
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from backend.config import get_supabase

router = APIRouter()


@router.post("/archive-expired")
def archive_expired_listings():
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    # Find all unclaimed listings past their expiry
    expired = supabase.table("food_listings") \
        .select("id") \
        .eq("is_claimed", False) \
        .lt("expires_at", now) \
        .execute()

    expired_ids = [row["id"] for row in (expired.data or [])]

    if not expired_ids:
        return {"message": "No expired listings found", "archived": 0}

    # Mark them as expired (using is_claimed as archive flag)
    count = 0
    for eid in expired_ids:
        supabase.table("food_listings") \
            .update({"is_claimed": True}) \
            .eq("id", eid) \
            .execute()
        count += 1

    return {
        "message": f"Archived {count} expired listings",
        "archived": count,
        "ids": expired_ids[:10],  # return first 10 for reference
    }


@router.get("/stats")
def system_stats():
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    total = supabase.table("food_listings").select("id", count="exact").execute()
    active = supabase.table("food_listings") \
        .select("id", count="exact") \
        .eq("is_claimed", False) \
        .gt("expires_at", now) \
        .execute()
    claims = supabase.table("claims").select("id", count="exact").execute()

    return {
        "total_listings": total.count or 0,
        "active_listings": active.count or 0,
        "total_claims": claims.count or 0,
        "system_time": now,
    }
