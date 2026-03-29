# FoodBridge — ML Layer

## Stack
- **Scikit-learn** — Matching engine (weighted scorer) + Demand forecaster (Random Forest)
- **FastAPI** — REST API exposing ML endpoints
- **Supabase** — PostgreSQL + PostGIS for live listings
- **OpenStreetMap Overpass API** — Real Chennai NGO/shelter locations (no API key needed)

---

## Setup (run in order)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure Supabase
cp .env.example .env
# Edit .env → add your SUPABASE_URL and SUPABASE_KEY

# 3. Set up Supabase schema
# Go to: supabase.com → your project → SQL Editor
# Paste contents of supabase_schema.sql → Run

# 4. Seed real data (downloads real Chennai NGO locations from OSM)
python -m ml.seeder

# 5. Train both models on real Supabase data
python -m ml.train

# 6. Start the API
uvicorn ml.api:app --reload --port 8000
```

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ml/health` | Model status check |
| POST | `/ml/match` | Rank food listings for a recipient |
| POST | `/ml/forecast` | 12-hour demand forecast grid |
| GET | `/ml/forecast/quick?lat=&lng=` | Quick 6-hour summary for map overlay |

### Match request
```bash
curl -X POST http://localhost:8000/ml/match \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 12.9229,
    "lng": 80.1275,
    "preferred_categories": ["cooked", "bakery"],
    "max_distance_km": 10,
    "top_n": 5
  }'
```

### Forecast request
```bash
curl -X POST http://localhost:8000/ml/forecast \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lng": 80.2209, "hours_ahead": 12}'
```

### Quick forecast (map overlay)
```bash
curl "http://localhost:8000/ml/forecast/quick?lat=12.9716&lng=80.2209"
```

---

## File structure

```
foodbridge_ml/
├── requirements.txt
├── .env.example
├── supabase_schema.sql
└── ml/
    ├── __init__.py
    ├── config.py            # Supabase client + constants
    ├── seeder.py            # Real data seeder (OSM + Chennai NGOs)
    ├── matching_engine.py   # Weighted KNN scorer
    ├── demand_forecast.py   # Random Forest demand model
    ├── train.py             # One-shot: fit scaler + train forecaster
    ├── api.py               # FastAPI endpoints
    └── models/              # Saved .pkl files (auto-created)
```

---

## Deploy to Render

1. Push to GitHub
2. Go to render.com → New Web Service → connect repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn ml.api:app --host 0.0.0.0 --port $PORT`
5. Add env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `ML_API_KEY`

**Note:** Run seeder + train locally first, commit the `ml/models/*.pkl`
files to the repo so Render doesn't need to retrain on cold start.

---

## For the next Claude chat — paste this

> Building FoodBridge (EcoTech, Vashisht Hackathon 3.0, solo).
> Deadline: 29 March 2026 9 PM IST.
> Stack: FastAPI + React (Vite) + Supabase + Scikit-learn.
> ML LAYER IS COMPLETE:
>   - ml/config.py        (Supabase client + constants)
>   - ml/seeder.py        (OSM real data seeder — no synthetic data)
>   - ml/matching_engine.py (weighted scorer: urgency 35%, distance 30%, category 20%, qty 15%)
>   - ml/demand_forecast.py (Random Forest, trains on Supabase claims)
>   - ml/train.py         (one-shot: seed → train both models)
>   - ml/api.py           (POST /ml/match, POST /ml/forecast, GET /ml/forecast/quick)
>   - supabase_schema.sql (food_listings, recipients, claims + PostGIS)
> Next step: BUILD BACKEND LAYER (FastAPI auth + listings CRUD + claims API).
