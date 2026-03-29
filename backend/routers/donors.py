"""
backend/routers/donors.py — Donor profile + stats
===================================================
GET /donors/me      donor profile + their active listings
GET /donors/stats   total kg donated (demo highlight)
"""

from fastapi import APIRouter, HTTPException, Depends
from backend.config import get_supabase
from backend.middleware.auth import get_current_user

router = APIRouter()


@router.get("/me")
def donor_profile(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()

    user_resp = supabase.table("users") \
        .select("id,name,email,role,lat,lng,created_at") \
        .eq("id", current_user["sub"]) \
        .execute()

    if not user_resp.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_resp.data[0]

    listings_resp = supabase.table("food_listings") \
        .select("*") \
        .eq("donor_id", current_user["sub"]) \
        .order("created_at", desc=True) \
        .execute()

    return {
        "user":     user,
        "listings": listings_resp.data or [],
    }


@router.get("/stats")
def donor_stats(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()

    listings_resp = supabase.table("food_listings") \
        .select("quantity_kg,is_claimed,category") \
        .eq("donor_id", current_user["sub"]) \
        .execute()

    listings = listings_resp.data or []

    total_kg      = sum(l["quantity_kg"] for l in listings)
    claimed_kg    = sum(l["quantity_kg"] for l in listings if l["is_claimed"])
    total_listings = len(listings)
    claimed_count  = sum(1 for l in listings if l["is_claimed"])

    # Breakdown by category
    by_category = {}
    for l in listings:
        cat = l["category"]
        by_category[cat] = by_category.get(cat, 0) + l["quantity_kg"]

    return {
        "total_listings":  total_listings,
        "claimed_listings": claimed_count,
        "total_kg_donated": round(total_kg, 1),
        "total_kg_claimed": round(claimed_kg, 1),
        "by_category":     {k: round(v, 1) for k, v in by_category.items()},
    }
