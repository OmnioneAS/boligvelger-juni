-- Add Norwegian real estate fields to apartments table.
alter table apartments
  add column if not exists collective_debt  text,
  add column if not exists property_type    text,
  add column if not exists completion_year  text,
  add column if not exists bra              text,
  add column if not exists primary_room     text;
