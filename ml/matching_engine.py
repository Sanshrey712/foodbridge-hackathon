"""
ml/matching_engine.py — Matching Engine
========================================
Given a recipient's location + preferences, scores and ranks
live food listings from Supabase using a weighted multi-criteria
formula. No black-box model — fully interpretable for judges.

Scoring weights:
  urgency        35%  (expiring soon = higher priority)
  distance       30%  (closer = better)
  category_match 20%  (matches recipient preferences)
  quantity       15%  (larger donation)
"""

from math import radians, sin, cos, sqrt, atan2
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import MinMaxScaler
from ml.config import SCALER_PATH, CATEGORIES


# ── Haversine distance ────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float,
                 lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in km."""
    R = 6371.0
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


# ── Feature engineering ───────────────────────────────────────────

def build_features(listings_df: pd.DataFrame,
                   recipient: dict) -> pd.DataFrame:
    """
    Build a scored feature DataFrame for one recipient.

    recipient keys:
      lat, lng, preferred_categories (list[str]), max_distance_km (float)
    """
    df = listings_df.copy()

    if df.empty:
        return df

    # Distance
    df["distance_km"] = df.apply(
        lambda r: haversine_km(
            recipient["lat"], recipient["lng"], r["lat"], r["lng"]
        ),
        axis=1,
    )

    # Filter: only listings within max range and not yet claimed
    max_dist = recipient.get("max_distance_km", 10.0)
    df = df[
        (df["distance_km"] <= max_dist) &
        (df["is_claimed"] == False)
    ].copy()

    if df.empty:
        return df

    # Category match (1.0 = preferred, 0.5 = not preferred)
    prefs = set(recipient.get("preferred_categories", []))
    df["category_match"] = df["category"].apply(
        lambda c: 1.0 if c in prefs else 0.5
    )

    # Hours to expiry (already computed in api.py; fallback here)
    if "hours_to_expiry" not in df.columns:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        df["expires_at"] = pd.to_datetime(df["expires_at"], utc=True)
        df["hours_to_expiry"] = (
            (df["expires_at"] - now).dt.total_seconds() / 3600
        ).clip(lower=0)

    df["hours_to_expiry"] = df["hours_to_expiry"].clip(0, 72)

    keep = [
        "id", "title", "category", "quantity_kg",
        "lat", "lng", "distance_km",
        "hours_to_expiry", "category_match",
    ]
    return df[keep].reset_index(drop=True)


# ── Matching engine ───────────────────────────────────────────────

class MatchingEngine:
    """
    Weighted multi-criteria scoring engine.
    Interpretable, fast, works with any size listing pool.
    """

    WEIGHTS = {
        "urgency":        0.35,
        "distance":       0.30,
        "category_match": 0.20,
        "quantity":       0.15,
    }

    def __init__(self):
        self.scaler   = MinMaxScaler()
        self._fitted  = False

    # ── Fit / persist ─────────────────────────────────────────────

    def fit(self, df: pd.DataFrame) -> "MatchingEngine":
        """
        Fit scaler on a representative listing pool (e.g. Supabase data).
        Call once after seeding.
        """
        features = df[["hours_to_expiry", "distance_km",
                        "quantity_kg"]].copy()
        # Fill placeholder distance for fitting (0–50 km range)
        if "distance_km" not in df.columns:
            features["distance_km"] = 10.0
        self.scaler.fit(features)
        self._fitted = True
        joblib.dump(self.scaler, SCALER_PATH)
        print(f"Scaler saved → {SCALER_PATH}")
        return self

    def save(self):
        joblib.dump(self.scaler, SCALER_PATH)

    def load(self) -> "MatchingEngine":
        self.scaler  = joblib.load(SCALER_PATH)
        self._fitted = True
        return self

    # ── Scoring ───────────────────────────────────────────────────

    def score(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """Add match_score column and sort descending."""
        if features_df.empty:
            return features_df

        df  = features_df.copy()
        raw = df[["hours_to_expiry", "distance_km", "quantity_kg"]].values

        if not self._fitted:
            # Auto-fit on this batch if scaler not loaded
            self.scaler.fit(raw)
            self._fitted = True

        scaled = self.scaler.transform(raw)

        # Invert urgency & distance — lower raw = higher score
        urgency_score   = 1.0 - scaled[:, 0]
        distance_score  = 1.0 - scaled[:, 1]
        quantity_score  = scaled[:, 2]
        category_score  = df["category_match"].values

        w = self.WEIGHTS
        df["match_score"] = (
            w["urgency"]        * urgency_score  +
            w["distance"]       * distance_score +
            w["category_match"] * category_score +
            w["quantity"]       * quantity_score
        ).round(4)

        return df.sort_values("match_score", ascending=False) \
                 .reset_index(drop=True)

    def top_matches(self,
                    listings_df: pd.DataFrame,
                    recipient:   dict,
                    n:           int = 10) -> pd.DataFrame:
        """End-to-end: build features → score → return top N."""
        features = build_features(listings_df, recipient)
        scored   = self.score(features)
        return scored.head(n)


# ── Standalone test ───────────────────────────────────────────────

if __name__ == "__main__":
    from ml.config import get_supabase
    import pandas as pd
    from datetime import datetime, timezone

    print("Loading listings from Supabase...")
    supabase  = get_supabase()
    resp      = supabase.table("food_listings").select("*") \
                        .eq("is_claimed", False).execute()

    if not resp.data:
        print("No listings found. Run: python -m ml.seeder first.")
        exit(1)

    df  = pd.DataFrame(resp.data)
    now = datetime.now(timezone.utc)
    df["expires_at"]     = pd.to_datetime(df["expires_at"], utc=True)
    df["hours_to_expiry"] = (
        (df["expires_at"] - now).dt.total_seconds() / 3600
    ).clip(lower=0)

    # Fit scaler on all listings (use 10 km placeholder distance)
    df["distance_km"] = 10.0
    engine = MatchingEngine()
    engine.fit(df)

    # Test against a sample recipient (Tambaram area)
    sample_recipient = {
        "lat":                  12.9229,
        "lng":                  80.1275,
        "preferred_categories": ["cooked", "bakery"],
        "max_distance_km":      15.0,
    }

    matches = engine.top_matches(df, sample_recipient, n=5)
    print("\nTop 5 matches for Tambaram recipient:")
    print(matches[[
        "title", "category", "quantity_kg",
        "distance_km", "hours_to_expiry", "match_score"
    ]].to_string(index=False))
