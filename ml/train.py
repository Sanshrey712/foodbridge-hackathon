"""
ml/train.py — One-shot training script
========================================
Fetches live data from Supabase and trains both models.

Run AFTER seeder: python -m ml.train
"""

import pandas as pd
from datetime import datetime, timezone
from ml.config import get_supabase
from ml.matching_engine import MatchingEngine
from ml.demand_forecast import DemandForecaster


def train_all():
    supabase = get_supabase()
    print("\n=== FoodBridge ML Training ===\n")

    # ── Fetch data ─────────────────────────────────────────────────
    print("Fetching listings from Supabase...")
    listings_resp = supabase.table("food_listings").select("*").execute()
    if not listings_resp.data:
        print("ERROR: No listings. Run python -m ml.seeder first.")
        return

    listings_df = pd.DataFrame(listings_resp.data)
    print(f"  {len(listings_df)} listings loaded")

    print("Fetching claims from Supabase...")
    claims_resp = supabase.table("claims").select("*").execute()
    claims_df   = pd.DataFrame(claims_resp.data) if claims_resp.data else pd.DataFrame()
    print(f"  {len(claims_df)} claims loaded")

    # ── Compute hours_to_expiry ────────────────────────────────────
    now = datetime.now(timezone.utc)
    listings_df["expires_at"] = pd.to_datetime(
        listings_df["expires_at"], utc=True
    )
    listings_df["hours_to_expiry"] = (
        (listings_df["expires_at"] - now).dt.total_seconds() / 3600
    ).clip(lower=0)

    # ── Train matching engine scaler ───────────────────────────────
    print("\n[1/2] Fitting matching engine scaler...")
    listings_df["distance_km"] = 10.0   # placeholder for scaler fit
    engine = MatchingEngine()
    engine.fit(listings_df)
    print("  Matching engine ready")

    # ── Train demand forecaster ────────────────────────────────────
    print("\n[2/2] Training demand forecast model...")
    if claims_df.empty:
        print("  WARNING: No claims data. Forecaster will use defaults.")
    else:
        forecaster = DemandForecaster()
        mae = forecaster.train(claims_df, listings_df)
        print(f"  Demand forecaster ready (MAE: {mae:.2f} kg)")

    print("\n=== Training complete ===")
    print("Start API: uvicorn ml.api:app --reload --port 8000")


if __name__ == "__main__":
    train_all()
