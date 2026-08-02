-- Automation support for the `create_listing` action.
--
-- `source_event_id` records which app event produced the row. The dispatcher's
-- dedupe guard matches on it (SELECT 1 FROM ... WHERE source_event_id = ?
-- LIMIT 1), so a redelivered event reuses the listing already posted rather
-- than putting the same item up for sale twice.
--
-- Nullable on purpose: listings created by a person have no source event, and
-- the guard only ever looks for a specific non-null id.
ALTER TABLE app_marketplace__listings ADD COLUMN source_event_id TEXT;

CREATE INDEX IF NOT EXISTS app_marketplace__listings_source_event_idx
  ON app_marketplace__listings (source_event_id);
