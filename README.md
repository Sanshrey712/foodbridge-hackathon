<p align="center">
  <img src="https://img.shields.io/badge/🌿_FoodBridge-AI_Powered-2D6A4F?style=for-the-badge&labelColor=1B4332" alt="FoodBridge"/>
</p>

<h1 align="center">🌿 FoodBridge</h1>
<h3 align="center">AI-Powered Food Redistribution Platform for Chennai</h3>

<p align="center">
  <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSocket-010101?style=flat-square&logo=socket.io&logoColor=white" />
</p>

<p align="center">
  <b>Vashisht Hackathon 3.0 · EcoTech Track</b><br/>
  <sub>Real-time surplus food redistribution powered by ML matching, demand forecasting, and voice AI</sub>
</p>

<p align="center">
  <b>🎉 Live Demo: <a href="https://foodbridge-hackathon.vercel.app/">https://foodbridge-hackathon.vercel.app/</a> 🎉</b>
</p>

---

## 🎯 Problem

**1/3 of all food produced globally is wasted** — while millions go hungry. In Chennai alone, restaurants, hostels, and caterers discard tons of surplus food daily because there's no efficient way to connect them with nearby shelters and NGOs in real-time.

**FoodBridge** solves this with an AI-powered platform that instantly matches surplus food donors with the nearest recipients using machine learning, real-time WebSockets, and smart demand forecasting.

---

## ✨ Key Features

### 🤖 AI & Machine Learning
| Feature | Description |
|---------|-------------|
| **ML Smart Matching** | Weighted scoring engine ranks listings by urgency (35%), distance (30%), category preference (20%), and quantity (15%) |
| **Demand Forecasting** | Random Forest model predicts food surplus by category for the next 12 hours |
| **Predictive Heatmaps** | Visual forecast overlay on the map showing tomorrow's high-demand zones |
| **AI Food Safety** | Real-time decay analysis based on FDA/FSSAI guidelines with safety badges |
| **Voice AI Assistant** | 🎙️ Speech-to-text powered chatbot — speak to search, post, or get help hands-free |

### ⚡ Real-Time Features
| Feature | Description |
|---------|-------------|
| **WebSocket Live Feed** | Instant updates across all clients — no refresh needed |
| **Live Countdown Timers** | Real-time expiry countdowns on every listing |
| **Live Activity Feed** | Global stream of claims, posts, and pickups happening right now |
| **Live Impact Counter** | Animated ticker showing total meals saved, CO₂ prevented in real-time |

### 🌍 Sustainability & Impact
| Feature | Description |
|---------|-------------|
| **Mission Control Dashboard** | NASA-style dark analytics dashboard with glowing animated counters |
| **CO₂ Impact Calculator** | Interactive calculator showing environmental impact per donation (IPCC data) |
| **Confetti + Impact Certificate** | Full-screen celebration with downloadable Green Impact Certificate on every claim |
| **Donor Gamification** | Bronze → Silver → Gold → Platinum badges + leaderboard rankings |

### 🛡️ Trust & Verification
| Feature | Description |
|---------|-------------|
| **QR Code Verification** | Secure pickup codes prevent food theft and enable contactless handoff |
| **Email Notifications** | Real-time emails to both donor and recipient via Resend API |
| **Route Directions** | Turn-by-turn navigation from recipient to donor location |
| **Smart Expiry Input** | AI-suggested expiry times based on food category and temperature |

### 🌐 Accessibility & Reach
| Feature | Description |
|---------|-------------|
| **Bilingual i18n** | Full English ↔ Tamil translation toggle across the entire app |
| **PWA Support** | Install as a native mobile app — works offline with service workers |
| **Demand Gap Board** | Shows recipients what food categories are currently in shortage |
| **Smart Suggestions** | Tells donors what to cook based on real-time recipient demand |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ MapPage │ │ Matches  │ │ Forecast │ │ Leaderboard │ │
│  │(Leaflet)│ │(ML Rank) │ │(Heatmap) │ │(Gamified)   │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘ │
│       │           │            │               │        │
│  ┌────┴───────────┴────────────┴───────────────┴──────┐ │
│  │        Context Layer (Auth, Toast, i18n, WS)       │ │
│  └────────────────────┬───────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────┘
                        │ REST + WebSocket
        ┌───────────────┼───────────────┐
        ▼                               ▼
┌───────────────┐               ┌───────────────┐
│  BACKEND API  │               │  ML SERVICE   │
│  (FastAPI)    │               │  (FastAPI)     │
│  Port 8001    │               │  Port 8000     │
│               │               │                │
│ • Auth/JWT    │               │ • /ml/match    │
│ • Listings    │               │ • /ml/forecast │
│ • Claims      │               │ • Scikit-learn │
│ • WebSocket   │               │ • Random Forest│
│ • Leaderboard │               │                │
│ • Emails      │               └───────┬────────┘
│ • Rate Limit  │                       │
└───────┬───────┘                       │
        │                               │
        └───────────┬───────────────────┘
                    ▼
          ┌──────────────────┐
          │     SUPABASE     │
          │   (PostgreSQL)   │
          │                  │
          │ • food_listings  │
          │ • recipients     │
          │ • claims         │
          │ • users          │
          │ • PostGIS        │
          └──────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Supabase** account (free tier works)

### 1. Clone & Configure

```bash
git clone https://github.com/Sanshrey712/foodbridge.git
cd foodbridge

# Create .env in root
cp .env.example .env
# Add your SUPABASE_URL, SUPABASE_KEY, RESEND_API_KEY
```

### 2. Database Setup

```bash
# Run the schema in Supabase SQL Editor
# File: ml/supabase_schema.sql
# Then: backend/users_table.sql
```

### 3. ML Service (Port 8000)

```bash
cd ml
pip install -r requirements.txt
python -m ml.seeder          # Seed real Chennai data from OpenStreetMap
python -m ml.train           # Train matching + forecast models
uvicorn ml.api:app --port 8000
```

### 4. Backend API (Port 8001)

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --port 8001
```

### 5. Frontend (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** → Register → Start donating or claiming food! 🎉

---

## 📁 Project Structure

```
foodbridge/
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── components/          # 26 reusable components
│   │   │   ├── AIChatBot.jsx        # Voice AI assistant (Web Speech API)
│   │   │   ├── ConfettiCelebration.jsx  # Full-screen confetti + certificate
│   │   │   ├── MissionControl.jsx   # NASA-style impact dashboard
│   │   │   ├── RouteDirections.jsx  # Turn-by-turn navigation
│   │   │   ├── LiveActivityFeed.jsx # WebSocket live stream
│   │   │   ├── CO2Calculator.jsx    # Interactive CO₂ impact calc
│   │   │   ├── QRPickupCode.jsx     # QR verification codes
│   │   │   ├── FoodSafetyChecker.jsx # AI food safety analysis
│   │   │   └── ...18 more components
│   │   ├── pages/               # 8 full pages
│   │   │   ├── MapPage.jsx          # Leaflet map + heatmap
│   │   │   ├── RecipientPage.jsx    # ML matches + claims
│   │   │   ├── DonorPage.jsx        # Listing management
│   │   │   ├── ForecastPage.jsx     # ML demand forecasting
│   │   │   └── ...4 more pages
│   │   └── context/             # Global state (Auth, Toast, i18n, WS)
│   └── public/                  # PWA manifest + icons
│
├── backend/                     # FastAPI REST API
│   ├── main.py                  # App entry + CORS + rate limiting
│   └── routers/
│       ├── auth.py              # JWT authentication
│       ├── listings.py          # CRUD + auto-archival
│       ├── claims.py            # Claim management
│       ├── websocket.py         # Real-time WebSocket hub
│       ├── notifications.py     # Resend email integration
│       ├── leaderboard.py       # Donor rankings
│       └── maintenance.py       # Background cleanup jobs
│
├── ml/                          # ML Microservice
│   ├── matching_engine.py       # Weighted KNN scorer
│   ├── demand_forecast.py       # Random Forest forecaster
│   ├── seeder.py                # Real Chennai data (OpenStreetMap)
│   ├── train.py                 # Model training pipeline
│   └── api.py                   # ML REST endpoints
│
└── .env                         # Environment variables
```

---

## 🛡️ Tech Stack Deep Dive

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + Vite | Blazing fast HMR, modern JSX |
| **Styling** | Pure CSS + CSS Variables | Dark/light mode, glassmorphism, zero deps |
| **Maps** | Leaflet + OSM | Free, no API key, great mobile support |
| **Backend** | FastAPI | Async, auto-docs, WebSocket native |
| **Database** | Supabase (PostgreSQL) | PostGIS spatial queries, real-time |
| **ML** | Scikit-learn | Lightweight, fast inference, proven |
| **Email** | Resend API | Modern email API, great deliverability |
| **Auth** | JWT + Supabase Auth | Stateless, scalable |
| **PWA** | Service Workers + Manifest | Installable, offline-capable |
| **Voice** | Web Speech API | Zero dependencies, works in Chrome |
| **Rate Limit** | SlowAPI | DDoS protection out of the box |

---

## 📊 ML Models

### Matching Engine
- **Algorithm**: Weighted multi-factor scorer
- **Features**: Urgency (time-to-expiry), Haversine distance, category match, quantity ratio
- **Weights**: Urgency 35% · Distance 30% · Category 20% · Quantity 15%
- **Output**: Ranked list of listings with match scores (0–100)

### Demand Forecaster
- **Algorithm**: Random Forest Regressor
- **Training Data**: Historical claims from Supabase (hour, day-of-week, category, location)
- **Output**: 12-hour demand grid by category and geographic zone
- **Accuracy**: Cross-validated on real Chennai donation patterns

---

## 🌐 API Documentation

### Backend API (Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create user account |
| `/api/auth/login` | POST | JWT login |
| `/api/listings` | GET/POST | Browse or create food listings |
| `/api/claims` | POST | Claim a listing |
| `/api/claims/mine` | GET | Get user's claims |
| `/api/leaderboard` | GET | Top donor rankings |
| `/api/ws` | WS | Real-time event stream |
| `/api/notifications/email` | POST | Send claim notification emails |

### ML API (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ml/match` | POST | Get ML-ranked matches for a recipient |
| `/ml/forecast` | POST | 12-hour demand forecast |
| `/ml/forecast/quick` | GET | Quick 6-hour summary |
| `/ml/health` | GET | Model status check |

---

## 🎨 Design Philosophy

FoodBridge follows a **"Fresh + Human + Warm"** design language:

- 🌿 **Color Palette**: Forest greens (#2D6A4F, #52B788) with warm accents
- 🪟 **Glassmorphism**: Frosted glass cards with subtle backdrop blur
- ✨ **Micro-animations**: Smooth page transitions, animated counters, confetti effects
- 🌙 **Dark Mode**: Full dark theme with glowing accent lights
- 📱 **Mobile-first**: Responsive layouts that work beautifully on any screen size

---

## 🏆 Hackathon Scoring Alignment

| Criteria | Our Implementation |
|----------|-------------------|
| **Innovation** | Voice AI + ML Matching + Predictive Heatmaps + AI Food Safety |
| **Technical Implementation** | 3-tier microservices + WebSocket + PWA + Rate Limiting |
| **Feasibility** | Real Chennai data (OSM) + QR Verification + Email notifs |
| **Scalability** | Stateless JWT + Supabase (managed Postgres) + independent ML service |
| **UI/UX** | Glassmorphism + Confetti celebrations + Bilingual i18n + Mission Control |
| **Impact** | CO₂ tracking (IPCC data) + Gamification + Demand gap analysis |

---

<p align="center">
  <sub>🌿 Every meal saved is a step toward a hunger-free Chennai 🌿</sub>
</p>
