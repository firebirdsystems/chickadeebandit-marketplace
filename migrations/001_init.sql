CREATE TABLE IF NOT EXISTS listings (
  household_id    UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id              TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  price_cents     INTEGER,
  category        TEXT NOT NULL DEFAULT 'other',
  pickup_details  TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active',
  seller_id       TEXT NOT NULL,
  seller_name     TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (household_id, id),
  CONSTRAINT listings_category_check CHECK (category IN (
    'furniture', 'electronics', 'kids', 'household', 'clothing', 'outdoor', 'free', 'other'
  )),
  CONSTRAINT listings_status_check CHECK (status IN ('active', 'sold', 'removed', 'flagged'))
);

CREATE INDEX IF NOT EXISTS listings_status_idx ON listings (household_id, status, created_at);
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings (household_id, seller_id);

CREATE TABLE IF NOT EXISTS listing_photos (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  listing_id   TEXT NOT NULL,
  file_id      TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (household_id, id)
);

CREATE INDEX IF NOT EXISTS listing_photos_listing_idx ON listing_photos (household_id, listing_id, position);

CREATE TABLE IF NOT EXISTS inquiries (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  listing_id   TEXT NOT NULL,
  buyer_id     TEXT NOT NULL,
  buyer_name   TEXT NOT NULL,
  seller_id    TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (household_id, id),
  UNIQUE (household_id, listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS inquiries_listing_idx ON inquiries (household_id, listing_id);
CREATE INDEX IF NOT EXISTS inquiries_participant_idx ON inquiries (household_id, buyer_id, seller_id);

CREATE TABLE IF NOT EXISTS inquiry_messages (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  inquiry_id   TEXT NOT NULL,
  sender_id    TEXT NOT NULL,
  sender_name  TEXT NOT NULL,
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (household_id, id)
);

CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages (household_id, inquiry_id, created_at);

CREATE TABLE IF NOT EXISTS flags (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  listing_id   TEXT NOT NULL,
  reporter_id  TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  reason       TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TEXT NOT NULL,
  resolved_by  TEXT,
  resolved_at  TEXT,
  PRIMARY KEY (household_id, id),
  CONSTRAINT flags_status_check CHECK (status IN ('open', 'dismissed', 'actioned'))
);

CREATE INDEX IF NOT EXISTS flags_status_idx ON flags (household_id, status, created_at);
CREATE INDEX IF NOT EXISTS flags_listing_idx ON flags (household_id, listing_id);

CREATE TABLE IF NOT EXISTS activity (
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  id           TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,
  detail       TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  PRIMARY KEY (household_id, id)
);

CREATE INDEX IF NOT EXISTS activity_record_idx ON activity (household_id, record_id, created_at);
