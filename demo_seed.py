"""
demo_seed.py — FoodBridge Demo Data Seeder
==========================================
Creates realistic demo donor accounts + food listings so the
app looks alive the moment judges open it.

Run AFTER backend is up:
  python demo_seed.py --url http://localhost:8001

Or against deployed:
  python demo_seed.py --url https://your-render-url.onrender.com
"""

import requests
import argparse
import time
import random
from datetime import datetime

random.seed(2026)

BASE = "http://localhost:8001"

# ── Demo donors ───────────────────────────────────────────────────
DONORS = [
    {"name": "Saravana Bhavan T.Nagar",   "email": "saravana@demo.fb",   "password": "demo1234", "lat": 13.0389, "lng": 80.2348},
    {"name": "Hotel Annalakshmi",          "email": "annalakshmi@demo.fb","password": "demo1234", "lat": 13.0604, "lng": 80.2496},
    {"name": "Taj Coromandel Kitchen",     "email": "taj@demo.fb",        "password": "demo1234", "lat": 13.0569, "lng": 80.2425},
    {"name": "Murugan Idli Shop",          "email": "murugan@demo.fb",    "password": "demo1234", "lat": 13.0169, "lng": 80.2747},
    {"name": "Chennai Bakehouse",          "email": "bakehouse@demo.fb",  "password": "demo1234", "lat": 13.0827, "lng": 80.2707},
]

# ── Demo recipients ───────────────────────────────────────────────
RECIPIENTS = [
    {"name": "Akshaya Patra Foundation",  "email": "akshaya@demo.fb",    "password": "demo1234", "lat": 12.9816, "lng": 80.2180, "org_name": "Akshaya Patra Foundation", "org_type": "ngo"},
    {"name": "Tambaram Shelter",          "email": "tambaram@demo.fb",   "password": "demo1234", "lat": 12.9229, "lng": 80.1275, "org_name": "Tambaram Shelter Home", "org_type": "shelter"},
]

# ── Listings per donor (category, title, qty, expires_hrs) ────────
LISTINGS = {
    "saravana@demo.fb": [
        ("cooked",   "Fresh Sambar Rice — Lunch Surplus",        28.0,  5),
        ("cooked",   "Pongal & Chutney — Morning Batch",         15.0,  3),
        ("cooked",   "Curd Rice — End of Day",                   20.0,  4),
    ],
    "annalakshmi@demo.fb": [
        ("cooked",   "Vegetarian Thali — 40 Portions",           36.0,  6),
        ("raw",      "Fresh Vegetables — Tomatoes & Onions",     12.0, 24),
    ],
    "taj@demo.fb": [
        ("cooked",   "Hotel Buffet Surplus — Mixed Cuisine",     55.0,  4),
        ("packaged", "Sealed Snack Boxes — 50 Units",            8.0,  48),
        ("dairy",    "Fresh Milk Packets — 30 Units (500ml)",    15.0,  12),
    ],
    "murugan@demo.fb": [
        ("cooked",   "Idli & Vada — Morning Surplus",            22.0,  3),
        ("bakery",   "Whole Wheat Bread Loaves — 20 pcs",         6.0,  10),
        ("cooked",   "Mini Tiffin Boxes — Ready to Go",          18.0,  4),
    ],
    "bakehouse@demo.fb": [
        ("bakery",   "Assorted Pastries — End of Day",            4.5,  6),
        ("bakery",   "White & Brown Bread — Closing Stock",       8.0,  8),
        ("packaged", "Biscuit Packets — 40 Units (Parle-G)",      5.0, 72),
    ],
}


def register_user(url, user, role):
    payload = {
        "name":     user["name"],
        "email":    user["email"],
        "password": user["password"],
        "role":     role,
        "lat":      user.get("lat", 13.0827),
        "lng":      user.get("lng", 80.2707),
    }
    if role == "recipient":
        payload["org_name"] = user.get("org_name", user["name"])
        payload["org_type"] = user.get("org_type", "ngo")

    r = requests.post(f"{url}/auth/register", json=payload, timeout=10)
    if r.status_code == 409:
        # Already registered — log in instead
        r = requests.post(f"{url}/auth/login", json={
            "email": user["email"], "password": user["password"]
        }, timeout=10)
    if r.status_code not in (200, 201):
        print(f"  ⚠ Could not register/login {user['email']}: {r.text[:80]}")
        return None
    return r.json().get("token")


def post_listing(url, token, donor, listing):
    cat, title, qty, expires = listing
    # Add small lat/lng jitter so pins don't stack exactly
    lat = donor.get("lat", 13.0827) + random.uniform(-0.03, 0.03)
    lng = donor.get("lng", 80.2707) + random.uniform(-0.03, 0.03)

    payload = {
        "title":            title,
        "category":         cat,
        "quantity_kg":      qty,
        "lat":              round(lat, 6),
        "lng":              round(lng, 6),
        "expires_in_hours": expires,
        "description":      f"Demo listing from {donor['name']}",
    }
    r = requests.post(
        f"{url}/listings",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if r.status_code in (200, 201):
        return r.json()
    else:
        print(f"    ⚠ Listing failed: {r.text[:80]}")
        return None


def seed_claims(url, listing_ids):
    """Log in as a recipient and claim a couple of listings."""
    # Register/login demo recipient
    r = requests.post(f"{url}/auth/login", json={
        "email": "akshaya@demo.fb", "password": "demo1234"
    }, timeout=10)
    if r.status_code != 200:
        return
    token = r.json().get("token")

    # Claim first 2 listings
    for lid in listing_ids[:2]:
        requests.post(
            f"{url}/claims",
            json={"listing_id": lid},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        time.sleep(0.2)


def main():
    parser = argparse.ArgumentParser(description="FoodBridge demo seeder")
    parser.add_argument("--url", default="http://localhost:8001", help="Backend base URL")
    args = parser.parse_args()
    url = args.url.rstrip("/")

    print(f"\n🌿 FoodBridge Demo Seeder")
    print(f"   Target: {url}\n")

    # Health check
    try:
        r = requests.get(f"{url}/health", timeout=5)
        if r.status_code != 200:
            print("❌ Backend not responding. Is it running?")
            return
        print("✅ Backend is up\n")
    except Exception as e:
        print(f"❌ Cannot reach backend: {e}")
        return

    created_listing_ids = []

    # ── Register recipients first ─────────────────────────────────
    print("📋 Registering demo recipients...")
    for rec in RECIPIENTS:
        token = register_user(url, rec, "recipient")
        status = "✅" if token else "⚠"
        print(f"  {status} {rec['name']}")
        time.sleep(0.3)

    # ── Register donors + post listings ───────────────────────────
    print("\n🍛 Registering demo donors and posting listings...")
    for donor in DONORS:
        token = register_user(url, donor, "donor")
        if not token:
            continue
        print(f"  ✅ {donor['name']}")

        listings = LISTINGS.get(donor["email"], [])
        for listing in listings:
            result = post_listing(url, token, donor, listing)
            if result:
                created_listing_ids.append(result["id"])
                print(f"     📦 {listing[1][:50]} ({listing[2]} kg, {listing[3]}h)")
            time.sleep(0.2)

    # ── Create a couple of demo claims ───────────────────────────
    if created_listing_ids:
        print("\n📋 Creating demo claims...")
        seed_claims(url, created_listing_ids)
        print("  ✅ 2 demo claims created")

    print(f"\n🎉 Demo seed complete!")
    print(f"   Donors:    {len(DONORS)}")
    print(f"   Listings:  {len(created_listing_ids)}")
    print(f"   Recipients: {len(RECIPIENTS)}")
    print(f"\n   Demo login (donor):    saravana@demo.fb / demo1234")
    print(f"   Demo login (recipient): akshaya@demo.fb / demo1234")


if __name__ == "__main__":
    main()