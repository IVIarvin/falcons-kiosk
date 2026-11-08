ALTER TABLE consumption_lines ADD COLUMN IF NOT EXISTS removed_quantity integer NOT NULL DEFAULT 0 CHECK(removed_quantity >= 0 AND removed_quantity <= quantity);
CREATE TABLE IF NOT EXISTS consumption_removals (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), line_id text NOT NULL REFERENCES consumption_lines(id),
 quantity integer NOT NULL CHECK(quantity > 0), idempotency_key text NOT NULL, request_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,idempotency_key)
);
