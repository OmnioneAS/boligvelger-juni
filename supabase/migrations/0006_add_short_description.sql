-- Short, plain-text description used in DetailModal, Card, and the Featured
-- widget — separate from the existing (full, longer-form) description field,
-- which stays reserved for the standalone single-unit page.
alter table apartments
  add column if not exists short_description text;
