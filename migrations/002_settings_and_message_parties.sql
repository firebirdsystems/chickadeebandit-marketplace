-- Key/value table for admin-configured settings (e.g. moderator_group_id).
-- Governed by app_config row policy: read-only via api/db; written only by api/admin-config.
CREATE TABLE IF NOT EXISTS app_marketplace__settings (
  key   TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Denormalize buyer_id + seller_id onto inquiry_messages so party_scoped can scope
-- message visibility to the two participants without a cross-table join.
ALTER TABLE app_marketplace__inquiry_messages ADD COLUMN buyer_id  TEXT NOT NULL DEFAULT '';
ALTER TABLE app_marketplace__inquiry_messages ADD COLUMN seller_id TEXT NOT NULL DEFAULT '';

-- Back-fill existing message rows from their parent inquiry.
UPDATE app_marketplace__inquiry_messages
   SET buyer_id  = (SELECT i.buyer_id  FROM app_marketplace__inquiries i WHERE i.id = app_marketplace__inquiry_messages.inquiry_id),
       seller_id = (SELECT i.seller_id FROM app_marketplace__inquiries i WHERE i.id = app_marketplace__inquiry_messages.inquiry_id);
