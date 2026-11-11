CREATE TABLE IF NOT EXISTS service_visitors (
 id text PRIMARY KEY, name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 90),
 actor_id text NOT NULL REFERENCES users(id), idempotency_key text NOT NULL, request_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), merged_user_id text REFERENCES users(id),
 merged_at timestamptz, merged_by text REFERENCES users(id),
 UNIQUE(actor_id,idempotency_key),
 CHECK((merged_user_id IS NULL AND merged_at IS NULL AND merged_by IS NULL) OR
       (merged_user_id IS NOT NULL AND merged_at IS NOT NULL AND merged_by IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS service_tickets (
 id text PRIMARY KEY, member_id text REFERENCES users(id), visitor_id text REFERENCES service_visitors(id),
 recipient_name text NOT NULL, product_id text NOT NULL REFERENCES products(id), product_name text NOT NULL,
 unit text NOT NULL, quantity integer NOT NULL DEFAULT 1 CHECK(quantity=1), actor_id text NOT NULL REFERENCES users(id),
 idempotency_key text NOT NULL, request_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 voided_at timestamptz, voided_by text REFERENCES users(id), void_reason text,
 UNIQUE(actor_id,idempotency_key), CHECK((member_id IS NULL) <> (visitor_id IS NULL)),
 CHECK((voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL) OR
       (voided_at IS NOT NULL AND voided_by IS NOT NULL AND length(trim(void_reason)) BETWEEN 3 AND 300))
);
CREATE INDEX IF NOT EXISTS service_tickets_period ON service_tickets(created_at);
CREATE INDEX IF NOT EXISTS service_tickets_member ON service_tickets(member_id,product_id,created_at);
CREATE INDEX IF NOT EXISTS service_tickets_visitor ON service_tickets(visitor_id,created_at);
