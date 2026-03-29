"""
Shared config, Supabase client, and constants.
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ── Supabase ──────────────────────────────────────────────────────
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_KEY must be set in .env"
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ── ML constants ──────────────────────────────────────────────────
CATEGORIES = ["cooked", "raw", "packaged", "bakery", "dairy"]

# Chennai bounding box
CHENNAI_LAT  = 12.9716
CHENNAI_LNG  = 80.2209
SPREAD_DEG   = 0.15       # ~16 km radius

# Model paths
MODELS_DIR   = os.path.join(os.path.dirname(__file__), "models")
SCALER_PATH  = os.path.join(MODELS_DIR, "scaler.pkl")
FORECAST_PATH = os.path.join(MODELS_DIR, "demand_forecast.pkl")
ENCODER_PATH  = os.path.join(MODELS_DIR, "category_encoder.pkl")

os.makedirs(MODELS_DIR, exist_ok=True)
