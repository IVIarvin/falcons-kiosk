ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_seed text CHECK(avatar_seed IS NULL OR length(avatar_seed)=36);
