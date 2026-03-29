-- ============================================================
-- FoodBridge — Supabase Schema (FIXED)
-- Run this entire file in: Supabase → SQL Editor → Run
-- ============================================================

-- Enable PostGIS (geospatial support)
create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- ── Food listings ─────────────────────────────────────────────────
create table if not exists food_listings (
  id              uuid primary key default uuid_generate_v4(),
  donor_id        uuid,
  title           text not null,
  category        text not null check (category in ('cooked','raw','packaged','bakery','dairy')),
  quantity_kg     float not null check (quantity_kg > 0),
  lat             float not null,
  lng             float not null,
  location        geography(point, 4326),
  expires_at      timestamptz not null,
  is_claimed      boolean default false,
  description     text,
  created_at      timestamptz default now()
);

-- ── Recipients (NGOs, shelters, food banks) ───────────────────────
create table if not exists recipients (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  type                  text default 'ngo',
  lat                   float not null,
  lng                   float not null,
  location              geography(point, 4326),
  preferred_categories  text[] default '{}',
  max_distance_km       float default 10.0,
  created_at            timestamptz default now()
);

-- ── Claims ────────────────────────────────────────────────────────
create table if not exists claims (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid references food_listings(id) on delete cascade,
  recipient_id  uuid references recipients(id) on delete cascade,
  claimed_at    timestamptz default now(),
  picked_up     boolean default false,
  picked_up_at  timestamptz,
  hour_of_day   int,
  day_of_week   int
);

-- ── Triggers to auto-set location from lat/lng ────────────────────

create or replace function set_food_listing_location()
returns trigger as $$
begin
  new.location := st_makepoint(new.lng, new.lat)::geography;
  return new;
end;
$$ language plpgsql;

create or replace trigger food_listings_location_trigger
  before insert or update on food_listings
  for each row execute function set_food_listing_location();

create or replace function set_recipient_location()
returns trigger as $$
begin
  new.location := st_makepoint(new.lng, new.lat)::geography;
  return new;
end;
$$ language plpgsql;

create or replace trigger recipients_location_trigger
  before insert or update on recipients
  for each row execute function set_recipient_location();

create or replace function set_claim_time_fields()
returns trigger as $$
begin
  new.hour_of_day := extract(hour from new.claimed_at)::int;
  new.day_of_week := extract(dow  from new.claimed_at)::int;
  return new;
end;
$$ language plpgsql;

create or replace trigger claims_time_trigger
  before insert or update on claims
  for each row execute function set_claim_time_fields();

-- ── Spatial indexes ───────────────────────────────────────────────
create index if not exists food_listings_location_idx
  on food_listings using gist(location);

create index if not exists recipients_location_idx
  on recipients using gist(location);

create index if not exists food_listings_claimed_idx
  on food_listings(is_claimed, expires_at);

-- ── Spatial query function ────────────────────────────────────────
create or replace function listings_near(
  user_lat    float,
  user_lng    float,
  radius_km   float default 10,
  limit_count int   default 50
)
returns table (
  id           uuid,
  title        text,
  category     text,
  quantity_kg  float,
  lat          float,
  lng          float,
  expires_at   timestamptz,
  is_claimed   boolean,
  distance_m   float
) as $$
  select
    id, title, category, quantity_kg, lat, lng, expires_at, is_claimed,
    st_distance(location, st_makepoint(user_lng, user_lat)::geography) as distance_m
  from food_listings
  where
    is_claimed = false
    and expires_at > now()
    and st_dwithin(
      location,
      st_makepoint(user_lng, user_lat)::geography,
      radius_km * 1000
    )
  order by distance_m
  limit limit_count;
$$ language sql stable;

-- ── Row Level Security ────────────────────────────────────────────
alter table food_listings enable row level security;
alter table recipients    enable row level security;
alter table claims        enable row level security;

create policy "Public read listings"
  on food_listings for select using (true);

create policy "Auth insert listings"
  on food_listings for insert with check (true);

create policy "Auth update listings"
  on food_listings for update using (true);

create policy "Public read recipients"
  on recipients for select using (true);

create policy "Public insert recipients"
  on recipients for insert with check (true);

create policy "Public read claims"
  on claims for select using (true);

create policy "Public insert claims"
  on claims for insert with check (true);

create policy "Public update claims"
  on claims for update using (true);