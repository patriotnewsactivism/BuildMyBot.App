-- Add metadata support for phone call records
ALTER TABLE phone_calls
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Index for metadata filtering
CREATE INDEX IF NOT EXISTS idx_phone_calls_metadata ON phone_calls USING gin (metadata);
