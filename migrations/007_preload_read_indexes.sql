-- Index the manifest `preload` read, which the hub runs server-side while
-- rendering this app's document — on every launch, for every household.
--
-- preload.listings takes the newest 500 listings and was sorting every listing
-- the space has ever carried, sold and closed ones included.
CREATE INDEX IF NOT EXISTS app_marketplace__listings_created_idx
  ON app_marketplace__listings (created_at DESC);
