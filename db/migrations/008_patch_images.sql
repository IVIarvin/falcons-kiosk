CREATE TABLE IF NOT EXISTS patch_images (
 campaign_id text NOT NULL REFERENCES patch_campaigns(id), kind text NOT NULL CHECK(kind IN ('artwork','print')),
 data_base64 text NOT NULL, version text NOT NULL, uploaded_by text NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(campaign_id,kind)
);
