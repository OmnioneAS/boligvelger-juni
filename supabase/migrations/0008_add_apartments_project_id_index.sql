-- Postgres does not automatically index foreign key columns — only primary
-- keys and unique constraints get one for free. Every embed/editor query
-- filters apartments by project_id, so this index is what keeps those
-- lookups fast as a project's apartment count grows.
create index if not exists apartments_project_id_idx on apartments (project_id);
