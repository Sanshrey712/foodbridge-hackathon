"""
ml/api.py — FoodBridge ML API
================================
FastAPI app exposing matching engine + demand forecaster.

Run: uvicorn ml.api:app --reload --port 8000

Endpoints:
  GET  /ml/health           liveness + model status
  POST /ml/match            rank listings for a recipient
  POST /ml/forecast         demand forecast grid
  GET  /ml/forecast/quick   quick forecast for map overlay
"""

import os
import pandas as pd
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml.config import get_supabase, CATEGORIES
from ml.matching_engine import MatchingEngine
from ml.demand_forecast import DemandForecaster

# ── App setup ─────────────────────────────────────────────────────

app = FastAPI(
    title="FoodBridge ML API",
    description="Matching engine + demand forecast for FoodBridge",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load models at startup ────────────────────────────────────────

engine     = MatchingEngine()
forecaster = DemandForecaster()

@app.on_event("startup")
def load_models():
    try:
        engine.load()
        print("Matching engine loaded")
    except Exception as e:
        print(f"WARNING: Matching engine not loaded — {e}")
        print("Run: python -m ml.train")

    try:
        forecaster.load()
        print("Demand forecaster loaded")
    except Exception as e:
        print(f"WARNING: Forecaster not loaded — {e}")


# ── Optional API key auth ─────────────────────────────────────────

ML_API_KEY = os.getenv("ML_API_KEY", "")

def check_api_key(x_api_key: Optional[str] = Header(None)):
    if ML_API_KEY and x_api_key != ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Request / Response schemas ────────────────────────────────────

class MatchRequest(BaseModel):
    lat:                   float = Field(..., example=12.9229)
    lng:                   float = Field(..., example=80.1275)
    preferred_categories:  List[str] = Field(default=[], example=["cooked", "bakery"])
    max_distance_km:       float = Field(default=10.0, ge=0.5, le=50.0)
    top_n:                 int   = Field(default=10, ge=1, le=50)

class MatchResult(BaseModel):
    id:               str
    title:            str
    category:         str
    quantity_kg:      float
    distance_km:      float
    hours_to_expiry:  float
    match_score:      float
    lat:              float
    lng:              float

class ForecastRequest(BaseModel):
    lat:         float = Field(..., example=12.9716)
    lng:         float = Field(..., example=80.2209)
    hours_ahead: int   = Field(default=12, ge=1, le=48)

class ForecastRow(BaseModel):
    hour:        str
    hour_offset: int
    category:    str
    forecast_kg: float

class HealthResponse(BaseModel):
    status:           str
    matching_engine:  bool
    demand_forecaster: bool
    timestamp:        str


# ── Endpoints ─────────────────────────────────────────────────────

@app.get("/ml/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        matching_engine=engine._fitted,
        demand_forecaster=forecaster.model is not None,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/ml/match", response_model=List[MatchResult])
def match_listings(req: MatchRequest):
    """
    Fetch live unclaimed listings from Supabase within range,
    then score + rank them for this recipient.
    """
    if not engine._fitted:
        raise HTTPException(503, "Matching engine not loaded. "
                                 "Run python -m ml.train first.")

    supabase = get_supabase()

    # Bounding box pre-filter (faster than pure PostGIS for small ranges)
    deg = req.max_distance_km / 111.0
    resp = supabase.table("food_listings") \
        .select("id,title,category,quantity_kg,lat,lng,expires_at,is_claimed") \
        .eq("is_claimed", False) \
        .gte("lat", req.lat - deg) \
        .lte("lat", req.lat + deg) \
        .gte("lng", req.lng - deg) \
        .lte("lng", req.lng + deg) \
        .execute()

    if not resp.data:
        return []

    df  = pd.DataFrame(resp.data)
    now = datetime.now(timezone.utc)
    df["expires_at"]      = pd.to_datetime(df["expires_at"], utc=True)
    df["hours_to_expiry"] = (
        (df["expires_at"] - now).dt.total_seconds() / 3600
    ).clip(lower=0)

    # Filter out already-expired listings
    df = df[df["hours_to_expiry"] > 0]
    if df.empty:
        return []

    recipient = {
        "lat":                  req.lat,
        "lng":                  req.lng,
        "preferred_categories": req.preferred_categories,
        "max_distance_km":      req.max_distance_km,
    }

    matches = engine.top_matches(df, recipient, n=req.top_n)

    return [
        MatchResult(
            id=row["id"],
            title=row["title"],
            category=row["category"],
            quantity_kg=round(row["quantity_kg"], 1),
            distance_km=round(row["distance_km"], 2),
            hours_to_expiry=round(row["hours_to_expiry"], 1),
            match_score=float(row["match_score"]),
            lat=float(row["lat"]),
            lng=float(row["lng"]),
        )
        for _, row in matches.iterrows()
    ]


@app.post("/ml/forecast", response_model=List[ForecastRow])
def get_forecast(req: ForecastRequest):
    """Return demand forecast for next N hours at a location."""
    if forecaster.model is None:
        raise HTTPException(503, "Forecaster not loaded. "
                                 "Run python -m ml.train first.")

    grid = forecaster.forecast_grid(
        lat=req.lat, lng=req.lng, hours_ahead=req.hours_ahead
    )

    return [
        ForecastRow(
            hour=row["hour"],
            hour_offset=int(row["hour_offset"]),
            category=row["category"],
            forecast_kg=float(row["forecast_kg"]),
        )
        for _, row in grid.iterrows()
    ]


@app.get("/ml/forecast/quick")
def quick_forecast(lat: float, lng: float):
    """
    Quick single-call forecast summary — total expected kg
    per category for the next 6 hours. Used for map overlay.
    """
    if forecaster.model is None:
        return {"error": "Forecaster not loaded"}

    grid = forecaster.forecast_grid(lat=lat, lng=lng, hours_ahead=6)
    summary = (
        grid.groupby("category")["forecast_kg"]
        .sum()
        .round(1)
        .to_dict()
    )
    return {
        "location": {"lat": lat, "lng": lng},
        "next_6_hours_kg": summary,
        "total_kg": round(sum(summary.values()), 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
