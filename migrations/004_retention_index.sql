-- Retention prune scans the activity feed by age (created_at); this index lets the
-- daily runner find expired rows without a full-table scan and covers the id it deletes on.
CREATE INDEX IF NOT EXISTS activity_retention_idx ON app_marketplace__activity (created_at, id);
