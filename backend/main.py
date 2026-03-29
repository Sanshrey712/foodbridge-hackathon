"""
backend/main.py — FoodBridge Core Backend API
==============================================
FastAPI app exposing auth, listings, and claims endpoints.

Run: uvicorn backend.main:app --reload --port 8001
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.routers import auth, listings, claims, donors, impact, leaderboard, notifications, maintenance, websocket

# ── Rate Limiter ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="FoodBridge Backend API",
    description="Auth + Listings + Claims for FoodBridge",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth.router,           prefix="/auth",           tags=["Auth"])
app.include_router(listings.router,       prefix="/listings",       tags=["Listings"])
app.include_router(claims.router,         prefix="/claims",         tags=["Claims"])
app.include_router(donors.router,         prefix="/donors",         tags=["Donors"])
app.include_router(impact.router,         prefix="/impact",         tags=["Impact"])
app.include_router(leaderboard.router,    prefix="/leaderboard",    tags=["Leaderboard"])
app.include_router(notifications.router,  prefix="/notifications",  tags=["Notifications"])
app.include_router(maintenance.router,    prefix="/maintenance",    tags=["Maintenance"])
app.include_router(websocket.router,      tags=["WebSocket"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "FoodBridge Backend API", "rate_limiting": True}

