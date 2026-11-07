CREATE TABLE IF NOT EXISTS piller_quotes (
 id text PRIMARY KEY, text text NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 160),
 topic text NOT NULL CHECK(topic IN ('general','sugary','sugar-free','energy','coffee','alcohol','water','snack','bulk')),
 enabled boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1 CHECK(revision>0)
);
ALTER TABLE consumptions ADD COLUMN IF NOT EXISTS quote_text text;
