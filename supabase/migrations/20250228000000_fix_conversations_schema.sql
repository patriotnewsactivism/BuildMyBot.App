-- Fix conversations table schema mismatch
-- This migration adds missing columns that the application code expects

-- Add missing columns to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS timestamp BIGINT;

-- Create index for query performance (sorting by updated_at)
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(user_id, updated_at DESC);

-- Create index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp
  ON conversations(timestamp DESC);

-- Add trigger to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- Migrate existing messages from messages table to conversations.messages JSONB array
-- This preserves existing conversation history
UPDATE conversations c
SET messages = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'role', m.role::text,
        'text', m.content,
        'timestamp', EXTRACT(EPOCH FROM m.timestamp)::bigint * 1000
      ) ORDER BY m.timestamp ASC
    ),
    '[]'::jsonb
  )
  FROM messages m
  WHERE m.conversation_id = c.id
)
WHERE EXISTS (
  SELECT 1 FROM messages WHERE conversation_id = c.id
);

-- Set timestamp to created_at epoch for existing records
UPDATE conversations
SET timestamp = EXTRACT(EPOCH FROM created_at)::bigint * 1000
WHERE timestamp IS NULL;

-- Add helper functions for admin dashboard
CREATE OR REPLACE FUNCTION get_total_bots_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM bots;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_total_conversations_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM conversations;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_total_leads_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM leads;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_total_bots_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_conversations_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_leads_count() TO authenticated;

-- Comment documentation
COMMENT ON COLUMN conversations.messages IS 'JSONB array of message objects with role, text, and timestamp';
COMMENT ON COLUMN conversations.timestamp IS 'Unix timestamp in milliseconds for conversation creation';
COMMENT ON COLUMN conversations.updated_at IS 'Auto-updated timestamp for last modification';
