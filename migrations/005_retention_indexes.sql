-- The app has no delete path for listings or inquiries, and `frozen_when` makes
-- a sold listing immutable, so every listing, photo, flag, moderation, inquiry
-- and message shipped so far lives forever — including the R2 photo bytes, which
-- a moderator "removal" never freed (it only inserts a moderations row).
--
-- retain_days now expires listings by updated_at (cascading photos with
-- file_id_column so the bytes go too, plus moderations and flags) and inquiries
-- by created_at (cascading messages). These indexes cover the runner's age scans
-- and the ids it deletes on; the child FK indexes from 001 cover the cascades.
--
-- `exempt_when` holds back listings still `active`: an untouched but live
-- listing is not residue, and expiring it would delete a for-sale post (and its
-- photos) out from under a seller who was never told. Only sold/removed/flagged
-- listings age out. lost-and-found exempts its `open` posts the same way.
CREATE INDEX IF NOT EXISTS listings_retention_idx
  ON app_marketplace__listings (updated_at, id);

CREATE INDEX IF NOT EXISTS inquiries_retention_idx
  ON app_marketplace__inquiries (created_at, id);
