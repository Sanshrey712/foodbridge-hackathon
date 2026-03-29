# FoodBridge — Full Project Todo
# Vashisht Hackathon 3.0 | Deadline: 29 March 2026, 9:00 PM
# Track: EcoTech | Solo | Stack: Python + React + Supabase

---

## Legend
- [x] Done
- [ ] To do
- [!!] High priority / scoring impact

---

## PHASE 1 — ML Layer ✅ COMPLETE

### Step 1 — Data & Schema
- [x] Design Supabase schema (food_listings, recipients, claims tables)
- [x] Enable PostGIS + spatial index on location columns (trigger-based, fixed immutable error)
- [x] Write listings_near() spatial SQL function
- [x] Real data seeder using OpenStreetMap Overpass API
- [x] 84 real Chennai NGO/shelter/temple recipients seeded
- [x] 150 realistic food listings seeded (real Chennai coords)
- [x] 102 historical claims seeded for forecast training

### Step 2 — Matching Engine
- [x] Haversine distance function
- [x] Feature builder (distance, urgency, quantity, category match)
- [x] Weighted scoring engine (urgency 35%, distance 30%, category 20%, quantity 15%)
- [x] MinMaxScaler fit + saved to ml/models/scaler.pkl
- [x] top_matches() end-to-end function
- [x] Tested against real Supabase data ✅

### Step 3 — Demand Forecast
- [x] Random Forest forecaster
- [x] forecast_grid() for next N hours across all categories
- [x] Retrained on real Supabase data
- [x] MAE: 7.40 kg (acceptable for hackathon scale)
- [x] Model saved to ml/models/demand_forecast.pkl

### Step 4 — ML API (FastAPI) — port 8000
- [x] GET  /ml/health → status: ok, matching_engine: true, demand_forecaster: true ✅
- [x] POST /ml/match → fetch live Supabase listings + rank
- [x] POST /ml/forecast → demand grid for a location
- [x] GET  /ml/forecast/quick → 6-hour summary for map overlay
- [x] CORS middleware
- [x] API key auth (ML_API_KEY)
- [x] ml/__init__.py so ml/ is importable as package

---

## PHASE 2 — Backend Layer ✅ COMPLETE

### Auth
- [x] POST /auth/register (donor / recipient roles)
- [x] POST /auth/login (returns JWT)
- [x] GET  /auth/me (current user profile)
- [x] JWT middleware — protects all non-public routes
- [x] users table created in Supabase
- [x] Register tested → 200 OK + JWT token returned ✅

### Food Listings CRUD
- [x] POST   /listings (donor posts surplus food)
- [x] GET    /listings/nearby (geo bounding box search)
- [x] GET    /listings/{id} (single listing detail)
- [x] PATCH  /listings/{id} (donor updates listing, ownership check)
- [x] DELETE /listings/{id} (donor removes listing, ownership check)

### Claims
- [x] POST  /claims (recipient claims a listing, marks is_claimed=true)
- [x] GET   /claims/mine (recipient's claim history)
- [x] PATCH /claims/{id}/pickup (mark as picked up)

### Donors
- [x] GET /donors/me (donor profile + their listings)
- [x] GET /donors/stats (total kg donated, by category breakdown)

### Backend running on port 8001
- [x] uvicorn backend.main:app --reload --port 8001
- [x] Swagger UI live at http://localhost:8001/docs
- [x] .env at Hackathon root (SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, ML_API_KEY)

---

## PHASE 3 — Frontend Layer (React + Leaflet) ← YOU ARE HERE

### Setup
- [ ] [!!] Create React app with Vite inside Hackathon/frontend/
        cd frontend && npm create vite@latest . -- --template react
- [ ] [!!] Install dependencies:
        npm install leaflet react-leaflet axios react-router-dom recharts
        npm install -D tailwindcss postcss autoprefixer
        npx tailwindcss init -p
- [ ] Set up frontend/.env:
        VITE_API_URL=http://localhost:8001
        VITE_ML_URL=http://localhost:8000

### Pages & Components
- [ ] [!!] Login / Register page
        - Toggle donor / recipient role
        - Calls POST /auth/register or /auth/login
        - Saves token to localStorage
- [ ] [!!] Map page (homepage)
        - Leaflet map centred on Chennai (12.9716, 80.2209)
        - Food listing pins colour-coded by category
        - Click pin → popup with food details + Claim button
        - Auto-refresh every 30s via GET /listings/nearby
- [ ] [!!] Recipient view
        - Cards showing top ML matches (POST /ml/match)
        - Each card: food name, distance, expires in, match score bar
        - Claim button → POST /claims
- [ ] [!!] Donor dashboard
        - Form to post new listing (POST /listings)
        - Table of my active listings (GET /donors/me)
        - Stats: total kg donated (GET /donors/stats)
- [ ] [!!] Forecast chart
        - Recharts line chart: predicted surplus kg by category
        - Calls POST /ml/forecast with Chennai coords
        - Refresh every hour
- [ ] Navbar with role-aware links (donor vs recipient views)

### UX Polish (affects Video Presentation score)
- [ ] Loading skeletons while fetching
- [ ] Toast notifications on claim success/failure
- [ ] Mobile responsive layout
- [ ] "Expires in X hours" countdown on listing cards
- [ ] Match score progress bar (0–100%)

---

## PHASE 4 — Deployment (mandatory, 10% of score)

### Supabase ✅
- [x] Schema deployed (food_listings, recipients, claims, users)
- [x] PostGIS enabled with trigger-based location columns
- [x] RLS policies active
- [x] Real data seeded (84 recipients, 150 listings, 102 claims)

### Backend — Render
- [ ] [!!] Create public GitHub repo: foodbridge-hackathon
- [ ] [!!] Push all code (ml/ + backend/ + frontend/)
- [ ] [!!] Deploy to Render (free tier)
        - Build: pip install -r requirements.txt
        - Start: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
        - Env vars: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, ML_API_KEY
- [ ] Test deployed backend URL is publicly accessible

### ML API — Render
- [ ] Deploy ml.api (second Render service or combine with backend)
        - Start: uvicorn ml.api:app --host 0.0.0.0 --port $PORT
        - Commit ml/models/*.pkl so no cold-start retraining needed

### Frontend — Vercel
- [ ] [!!] Deploy React app to Vercel
        - Connect GitHub repo → select frontend/ folder
        - Set VITE_API_URL to Render backend URL
        - Set VITE_ML_URL to Render ML URL
- [ ] Test full flow on deployed URL (not localhost)

---

## PHASE 5 — Submission Requirements

### GitHub Repo
- [ ] [!!] Create public repo: foodbridge-hackathon
- [ ] Push all code
- [ ] [!!] Root README.md:
        - Problem statement
        - Solution description
        - Architecture diagram
        - Tech stack
        - Setup instructions (local + deployed links)
        - Team: solo

### Demo Video (2–5 min, 15% of score)
- [ ] [!!] Script:
        1. Open deployed URL → map loads with Chennai food pins
        2. Log in as recipient → see ML-matched listings with scores
        3. Claim a listing → pin disappears from map
        4. Open forecast chart → show predicted surplus by category
        5. Log in as donor → post a new listing
        6. Show new pin appear on map live
- [ ] Record using OBS or Loom
- [ ] Upload to GitHub under /demo/

### Google Form Submission
- [ ] [!!] Submit before 29 March 9:00 PM IST
- [ ] Include: GitHub repo link + deployed URL + video link

---

## Evaluation Score Tracker

| Criteria             | Weight | Status                          |
|----------------------|--------|---------------------------------|
| Technical impl.      | 35%    | ML ✅ Backend ✅ Frontend ⬜     |
| Innovation           | 20%    | Strong — ML matching + forecast |
| Feasibility          | 20%    | Strong — real Chennai OSM data  |
| Video presentation   | 15%    | Not started                     |
| Deployment/Hosting   | 10%    | Not started                     |

---

## Suggested Build Order for Remaining Time

1. [x] ~~Supabase setup + schema~~ ✅
2. [x] ~~Seed real data (84 OSM NGOs) + train models~~ ✅
3. [x] ~~ML API live + health check passing~~ ✅
4. [x] ~~Backend API (auth + listings + claims) + tested~~ ✅
5. [ ] [!!] Build React frontend (3–4 hrs)
6. [ ] [!!] Push to GitHub + deploy Render + Vercel (1 hr)
7. [ ] Record demo video (30–45 min)
8. [ ] Write root README + submit Google Form (30 min)

## Total estimated time remaining: ~5–6 hours of work
## Time until deadline: ~32 hours — WELL AHEAD. KEEP GOING!

---

## Context for New Chat

> Building FoodBridge for Vashisht Hackathon 3.0 (EcoTech, solo).
> Deadline: 29 March 2026 9 PM IST.
> Stack: FastAPI + React (Vite) + Supabase (PostgreSQL + PostGIS) + Scikit-learn.
>
> COMPLETED:
>   ML layer: ml/api.py, ml/matching_engine.py, ml/demand_forecast.py
>             ml/seeder.py, ml/train.py, ml/config.py
>             Running on port 8000. Health check: both models true.
>   Backend layer: backend/main.py, backend/config.py
>                  backend/middleware/auth.py (JWT)
>                  backend/routers/auth.py, listings.py, claims.py, donors.py
>                  Running on port 8001. Register/login tested and working.
>   Supabase: schema live, users table live, 84 recipients + 150 listings + 102 claims seeded.
>   .env at Hackathon root: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, ML_API_KEY
>
> NEXT STEP: Build React frontend (Phase 3).
>   - Vite + React + Leaflet + Recharts + Tailwind
>   - Pages: Login/Register, Map (homepage), Recipient view, Donor dashboard, Forecast chart
>   - API base URLs: http://localhost:8001 (backend), http://localhost:8000 (ML)