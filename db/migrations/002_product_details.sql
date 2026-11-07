ALTER TABLE products ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS product_lookup_cache (key text PRIMARY KEY, payload jsonb NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS product_lookup_limits (kind text PRIMARY KEY, next_allowed_at bigint NOT NULL);
