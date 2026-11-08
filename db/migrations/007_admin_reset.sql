CREATE TABLE IF NOT EXISTS admin_reset_runs (
 id text PRIMARY KEY, actor_id text NOT NULL, token_hash text NOT NULL UNIQUE,
 snapshot_hash text NOT NULL, counts jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 completed_at timestamptz, result jsonb
);
