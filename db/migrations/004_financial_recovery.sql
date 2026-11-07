ALTER TABLE purchases ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_operation ON purchases(actor_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_operation ON expenses(actor_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voided_by text REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS void_reason text;
