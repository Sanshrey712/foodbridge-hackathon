"""
backend/routers/leaderboard.py — Donor Leaderboard
====================================================
GET /leaderboard   top donors by kg donated this week
"""

from fastapi import APIRouter, Query
from backend.config import get_supabase

router = APIRouter()


@router.get("")
def get_leaderboard(limit: int = Query(default=10, ge=1, le=50)):
    """
    Returns top donors ranked by total kg donated (claimed listings only).
    """
    supabase = get_supabase()

    # Get all claimed listings with donor info
    resp = supabase.table("food_listings") \
        .select("donor_id,quantity_kg") \
        .eq("is_claimed", True) \
        .execute()

    listings = resp.data or []

    # Aggregate by donor
    donor_kg = {}
    donor_count = {}
    for l in listings:
        did = l["donor_id"]
        donor_kg[did] = donor_kg.get(did, 0) + l["quantity_kg"]
        donor_count[did] = donor_count.get(did, 0) + 1

    if not donor_kg:
        return []

    # Sort by kg donated
    ranked = sorted(donor_kg.items(), key=lambda x: x[1], reverse=True)[:limit]
    donor_ids = [d[0] for d in ranked]

    # Fetch donor names
    names_resp = supabase.table("users") \
        .select("id,name,email") \
        .in_("id", donor_ids) \
        .execute()

    name_map = {}
    for u in (names_resp.data or []):
        name_map[u["id"]] = u.get("name") or u.get("email", "Anonymous")

    return [
        {
            "rank": i + 1,
            "donor_id": did,
            "name": name_map.get(did, "Anonymous"),
            "kg_donated": round(kg, 1),
            "listings_claimed": donor_count.get(did, 0),
            "meals_provided": int(kg * 4),
        }
        for i, (did, kg) in enumerate(ranked)
    ]
