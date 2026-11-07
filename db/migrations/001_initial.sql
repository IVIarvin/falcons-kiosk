CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, name text NOT NULL, grade text NOT NULL, phone text UNIQUE NOT NULL,
 password_hash text NOT NULL, role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),
 active boolean NOT NULL DEFAULT true, must_change_password boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS auth_attempts (key text PRIMARY KEY, attempts integer NOT NULL, started_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS reset_tokens (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL, used boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS products (
 id text PRIMARY KEY, name text NOT NULL, unit text NOT NULL, category text NOT NULL DEFAULT 'Boissons',
 is_beverage boolean NOT NULL DEFAULT true, price_cents integer NOT NULL CHECK(price_cents >= 0),
 price_mode text NOT NULL DEFAULT 'manual' CHECK(price_mode IN ('manual','auto')),
 cost_micros bigint, image text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
 available boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS purchases (
 id text PRIMARY KEY, product_id text NOT NULL REFERENCES products(id), quantity integer NOT NULL CHECK(quantity > 0),
 total_cents integer NOT NULL CHECK(total_cents >= 0), purchased_at timestamptz NOT NULL, actor_id text NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS consumptions (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), total_cents integer NOT NULL CHECK(total_cents >= 0),
 idempotency_key text NOT NULL, request_hash text NOT NULL, quote_id text,
 created_at timestamptz NOT NULL DEFAULT now(), reversed_at timestamptz, reversed_by text REFERENCES users(id), reason text,
 UNIQUE(user_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS consumption_lines (
 id text PRIMARY KEY, consumption_id text NOT NULL REFERENCES consumptions(id), product_id text NOT NULL REFERENCES products(id),
 product_name text NOT NULL, unit text NOT NULL, quantity integer NOT NULL CHECK(quantity > 0),
 price_cents integer NOT NULL CHECK(price_cents >= 0), cost_micros bigint, is_beverage boolean NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), actor_id text NOT NULL REFERENCES users(id),
 cents integer NOT NULL CHECK(cents > 0), kind text NOT NULL CHECK(kind IN ('payment','refund')),
 idempotency_key text NOT NULL, request_hash text NOT NULL, received_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), voided_at timestamptz, reason text,
 UNIQUE(user_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS expenses (
 id text PRIMARY KEY, cents integer NOT NULL CHECK(cents > 0), reason text NOT NULL,
 spent_at timestamptz NOT NULL, actor_id text NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS audit (
 id text PRIMARY KEY, actor_id text NOT NULL REFERENCES users(id), action text NOT NULL,
 reference_id text NOT NULL, reason text NOT NULL, before_data jsonb, after_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY CHECK(id=1), markup_basis_points integer NOT NULL DEFAULT 0 CHECK(markup_basis_points >= 0), piller_enabled boolean NOT NULL DEFAULT false);
INSERT INTO settings(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS consumptions_user ON consumptions(user_id,created_at);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS payments_user ON payments(user_id,received_at);
