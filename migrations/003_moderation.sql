-- Moderator removals move OUT of the (owner-writable) listings.status column into a
-- moderator-only child table. `moderations` is governed by inherit_visibility +
-- insert_privileged_only, deriving "privileged" from the parent listings table's
-- bypass_group_setting (the configured moderator group). Effective "removed" status
-- is derived from this table, so a seller can no longer reverse a leadership removal
-- by rewriting status on their own listing row (write_owner_only let them do that).
-- A seller may still remove/relist their OWN listing via listings.status — that is a
-- legitimate owner action — but only a moderator can write a row here.
CREATE TABLE IF NOT EXISTS app_marketplace__moderations (
  listing_id    TEXT NOT NULL PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'removed',  -- plaintext (encryption skip-list)
  reason        TEXT NOT NULL DEFAULT '',         -- encrypted at rest / decrypted on read
  moderated_by  TEXT NOT NULL,                    -- writer_column; forced to caller server-side
  moderated_at  TEXT NOT NULL
);

-- Track who uploaded each photo so listing_photos can be governed by inherit_visibility
-- (everyone reads — listings are public; only the listing owner or a moderator writes).
-- Closes the hole where any member could attach junk photos to, or delete photos from,
-- a listing they don't own.
ALTER TABLE app_marketplace__listing_photos ADD COLUMN uploaded_by TEXT NOT NULL DEFAULT '';
