"""
backend/routers/impact.py — Global Impact Stats
=================================================
GET /impact/stats   public platform-wide impact metrics
"""

from fastapi import APIRouter
from backend.config import get_supabase

router = APIRouter()


@router.get("/stats")
def impact_stats():
    """
    Returns global platform impact metrics.
    Formula: 1 kg food = 4 meals = 0.5 kg CO₂ prevented
    """
    supabase = get_supabase()

    # Get all claimed listings
    resp = supabase.table("food_listings") \
        .select("quantity_kg") \
        .eq("is_claimed", True) \
        .execute()

    listings = resp.data or []
    total_kg = sum(l["quantity_kg"] for l in listings)

    # Get total donors count
    donors_resp = supabase.table("users") \
        .select("id") \
        .eq("role", "donor") \
        .execute()

    # Get total claims count
    claims_resp = supabase.table("claims") \
        .select("id") \
        .execute()

    return {
        "kg_saved": round(total_kg, 1),
        "meals_served": int(total_kg * 4),
        "co2_prevented_kg": round(total_kg * 0.5, 1),
        "total_claims": len(claims_resp.data or []),
        "total_donors": len(donors_resp.data or []),
        "total_listings_claimed": len(listings),
    }
