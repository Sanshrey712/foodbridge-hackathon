"""
backend/config.py — Shared config for backend layer
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
JWT_SECRET:   str = os.getenv("JWT_SECRET", "foodbridge-jwt-secret-change-in-prod")
JWT_ALGO:     str = "HS256"
JWT_EXPIRE_HOURS: int = 48
RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)
