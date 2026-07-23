-- Featured Units widget (/embed/[slug]/featured).
alter table apartments
  add column if not exists featured_pinned boolean not null default false;

-- slot_count, rotation_days, last_rotated_at, selected_unit_ids, title,
-- heading, description — all optional within the object; existing projects
-- get '{}' and the app falls back to sensible defaults until configured.
alter table projects
  add column if not exists featured_config jsonb not null default '{}';
