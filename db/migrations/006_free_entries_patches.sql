ALTER TABLE consumptions ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'kiosk' CHECK(origin IN ('kiosk','free','patch'));
ALTER TABLE consumption_lines ALTER COLUMN product_id DROP NOT NULL;
CREATE TABLE IF NOT EXISTS patch_campaigns (
 id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '',
 price_cents integer NOT NULL CHECK(price_cents >= 0), deadline date NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','ordered','cancelled')),
 actor_id text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 ordered_at timestamptz, ordered_by text REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS patch_reservations (
 id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES patch_campaigns(id), user_id text NOT NULL REFERENCES users(id),
 quantity integer NOT NULL CHECK(quantity >= 0 AND quantity <= 1000),
 consumption_id text UNIQUE REFERENCES consumptions(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(campaign_id,user_id)
);
CREATE TABLE IF NOT EXISTS extra_requests (
 user_id text NOT NULL REFERENCES users(id), action text NOT NULL CHECK(action IN ('freeCheckout','reservePatch','confirmPatchOrder')),
 idempotency_key text NOT NULL, request_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,action,idempotency_key)
);
CREATE INDEX IF NOT EXISTS patch_reservations_user ON patch_reservations(user_id,campaign_id);
ALTER TABLE patch_campaigns ADD COLUMN IF NOT EXISTS funding_goal_cents integer NOT NULL DEFAULT 10000 CHECK(funding_goal_cents>0);
ALTER TABLE patch_campaigns ADD COLUMN IF NOT EXISTS final_price_cents integer CHECK(final_price_cents>=0);
