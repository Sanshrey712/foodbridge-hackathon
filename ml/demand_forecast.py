"""
ml/demand_forecast.py — Demand Forecast Model
===============================================
Predicts food surplus availability (kg) for a given:
  hour_of_day, day_of_week, category, lat_bin, lng_bin

Trained on real claim history from Supabase.
Model: Random Forest Regressor (fast, robust, no scaling needed).

Usage:
  python -m ml.demand_forecast          # train from Supabase
  forecaster = DemandForecaster()
  forecaster.load()
  forecaster.predict(hour=19, day_of_week=4, category="cooked",
                     lat=12.97, lng=80.22)
"""

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import LabelEncoder
from datetime import datetime, timezone, timedelta
from ml.config import CATEGORIES, FORECAST_PATH, ENCODER_PATH, get_supabase


# ── Feature engineering ───────────────────────────────────────────

def build_forecast_features(claims_df: pd.DataFrame,
                             listings_df: pd.DataFrame | None = None
                             ) -> tuple[pd.DataFrame, LabelEncoder]:
    """
    Build training features from claims history.
    Joins with listings to get category + quantity if not present.
    """
    df = claims_df.copy()

    # Parse claimed_at
    df["claimed_at"] = pd.to_datetime(df["claimed_at"], utc=True)
    df["hour_of_day"]  = df["claimed_at"].dt.hour
    df["day_of_week"]  = df["claimed_at"].dt.dayofweek

    # Join listings for category + quantity if needed
    if listings_df is not None and "category" not in df.columns:
        ldf = listings_df[["id", "category", "quantity_kg",
                            "lat", "lng"]].rename(
            columns={"id": "listing_id"}
        )
        df = df.merge(ldf, on="listing_id", how="left")

    df["category"]   = df["category"].fillna("cooked")
    df["quantity_kg"] = pd.to_numeric(
        df.get("quantity_kg", 5.0), errors="coerce"
    ).fillna(5.0)

    # Lat/lng from listings (use Chennai centre as fallback)
    df["lat"] = pd.to_numeric(df.get("lat", 12.9716),
                               errors="coerce").fillna(12.9716)
    df["lng"] = pd.to_numeric(df.get("lng", 80.2209),
                               errors="coerce").fillna(80.2209)

    # Bin coords into 0.05-degree grid (~5 km cells)
    df["lat_bin"] = (df["lat"] // 0.05 * 0.05).round(2)
    df["lng_bin"] = (df["lng"] // 0.05 * 0.05).round(2)

    # Encode category
    le = LabelEncoder()
    le.classes_ = np.array(CATEGORIES)
    df["category_enc"] = df["category"].apply(
        lambda c: c if c in CATEGORIES else "cooked"
    )
    df["category_enc"] = le.transform(df["category_enc"])

    # Target: kg available (demand proxy)
    df["demand"] = df["quantity_kg"].clip(0.5, 100)

    feature_cols = [
        "hour_of_day", "day_of_week", "category_enc",
        "lat_bin", "lng_bin"
    ]
    return df[feature_cols + ["demand"]].dropna(), le


# ── Forecaster ────────────────────────────────────────────────────

class DemandForecaster:

    def __init__(self):
        self.model:   RandomForestRegressor | None = None
        self.encoder: LabelEncoder          | None = None

    # ── Train ─────────────────────────────────────────────────────

    def train(self,
              claims_df:   pd.DataFrame,
              listings_df: pd.DataFrame | None = None) -> float:
        """Train on Supabase claim history. Returns MAE."""

        dataset, self.encoder = build_forecast_features(
            claims_df, listings_df
        )

        if len(dataset) < 10:
            print("WARNING: Very few training samples. "
                  "Seeding more data first is recommended.")

        X = dataset.drop("demand", axis=1)
        y = dataset["demand"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)

        mae = mean_absolute_error(y_test, self.model.predict(X_test))
        print(f"Forecast model MAE: {mae:.2f} kg")

        # Persist
        joblib.dump(self.model,   FORECAST_PATH)
        joblib.dump(self.encoder, ENCODER_PATH)
        print(f"Model saved   → {FORECAST_PATH}")
        print(f"Encoder saved → {ENCODER_PATH}")

        return mae

    # ── Load ──────────────────────────────────────────────────────

    def load(self) -> "DemandForecaster":
        self.model   = joblib.load(FORECAST_PATH)
        self.encoder = joblib.load(ENCODER_PATH)
        return self

    # ── Inference ─────────────────────────────────────────────────

    def predict(self, hour: int, day_of_week: int,
                category: str, lat: float, lng: float) -> float:
        """Predict expected surplus kg for given time + location."""
        if self.model is None:
            raise RuntimeError("Model not loaded. Call .load() first.")

        if category not in CATEGORIES:
            category = "cooked"

        cat_enc = int(np.where(self.encoder.classes_ == category)[0][0])
        lat_bin = round(lat // 0.05 * 0.05, 2)
        lng_bin = round(lng // 0.05 * 0.05, 2)

        X = np.array([[hour, day_of_week, cat_enc, lat_bin, lng_bin]])
        pred = self.model.predict(X)[0]
        return round(float(max(pred, 0)), 2)

    def forecast_grid(self, lat: float, lng: float,
                      hours_ahead: int = 12) -> pd.DataFrame:
        """
        Return a forecast table for next N hours × all categories.
        Perfect for the frontend Recharts line chart.
        """
        now  = datetime.now(timezone.utc)
        rows = []

        for h in range(hours_ahead):
            target = now + timedelta(hours=h)
            for cat in CATEGORIES:
                kg = self.predict(
                    target.hour, target.weekday(), cat, lat, lng
                )
                rows.append({
                    "hour":        target.strftime("%H:00"),
                    "hour_offset": h,
                    "category":    cat,
                    "forecast_kg": kg,
                })

        return pd.DataFrame(rows)


# ── Standalone train ──────────────────────────────────────────────

if __name__ == "__main__":
    print("Loading claim + listing data from Supabase...")
    supabase = get_supabase()

    claims_resp   = supabase.table("claims").select("*").execute()
    listings_resp = supabase.table("food_listings").select(
        "id,category,quantity_kg,lat,lng"
    ).execute()

    if not claims_resp.data:
        print("No claims found. Run: python -m ml.seeder first.")
        exit(1)

    claims_df   = pd.DataFrame(claims_resp.data)
    listings_df = pd.DataFrame(listings_resp.data) \
                  if listings_resp.data else None

    print(f"  Claims: {len(claims_df)}  Listings: "
          f"{len(listings_df) if listings_df is not None else 0}")

    forecaster = DemandForecaster()
    mae = forecaster.train(claims_df, listings_df)

    # Demo forecast
    print("\nForecast for next 6 hours near Chennai centre:")
    grid = forecaster.forecast_grid(lat=12.9716, lng=80.2209,
                                    hours_ahead=6)
    pivot = grid.pivot(index="hour", columns="category",
                       values="forecast_kg")
    print(pivot.to_string())
