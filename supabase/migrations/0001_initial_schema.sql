-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── projects ────────────────────────────────────────────────────────────────
create table projects (
  id               uuid        primary key default uuid_generate_v4(),
  slug             text        unique not null,
  name             text        not null,
  -- Array of view definitions: key, label_key, image_url, image_width, image_height, thumbnail_url, order, is_default
  views            jsonb       not null default '[]',
  -- General project config (e.g. hidden_apartment_behavior)
  config           jsonb       not null default '{}',
  -- All client-facing strings (label_key → display string)
  labels           jsonb       not null default '{}',
  -- Ordered array of field keys to show in cards and modal
  visible_fields   jsonb       not null default '[]',
  -- Array of status definitions: key, label_key, color, stroke, clickable, show_in_filter, order
  statuses         jsonb       not null default '[]',
  -- Default CTA behaviour
  cta_config       jsonb       not null default '{}',
  -- Promo popup configuration
  popup_config     jsonb       not null default '{}',
  -- Apartment image gallery configuration
  gallery_config   jsonb       not null default '{}',
  -- GA4 / Meta Pixel / events config
  analytics_config jsonb       not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── apartments ──────────────────────────────────────────────────────────────
create table apartments (
  id             uuid        primary key default uuid_generate_v4(),
  project_id     uuid        not null references projects(id) on delete cascade,
  -- Short human identifier used in URLs and polygon keys, e.g. "unit1"
  unit_id        text        not null,
  title          text        not null default '',
  -- References a key from project.statuses
  status         text        not null default 'available',
  price          text,
  size           text,
  rooms          text,
  floor          text,
  balcony        text,
  parking        text,
  view_direction text,
  energy_rating  text,
  ownership_type text,
  monthly_cost   text,
  total_price    text,
  description    text,
  viewing_date   timestamptz,
  viewing_note   text,
  -- Optional per-apartment CTA override (same shape as cta_config)
  cta_override   jsonb,
  -- Map of view_key → [[x, y], ...] in image-space coordinates (NOT screen pixels)
  polygons       jsonb       not null default '{}',
  -- Array of image objects: url, alt, caption, type, order
  images         jsonb       not null default '[]',
  display_order  integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (project_id, unit_id)
);

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger apartments_updated_at
  before update on apartments
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
-- anon role gets read access (for the public embed); all writes go through
-- the service role (server-side API routes only).
alter table projects   enable row level security;
alter table apartments enable row level security;

create policy "public read projects"
  on projects for select to anon using (true);

create policy "public read apartments"
  on apartments for select to anon using (true);

-- service_role bypasses RLS by default in Supabase — no extra policy needed.
