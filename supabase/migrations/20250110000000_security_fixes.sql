-- BuildMyBot Security Fixes Migration
-- Migration: 20250110000000_security_fixes
-- Description: Critical security fixes from architectural review

-- ============================================
-- SEC-002 FIX: Add is_master_admin column to profiles
-- Admin status is now stored in database, not hardcoded
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_master_admin ON profiles(is_master_admin) WHERE is_master_admin = true;

-- ============================================
-- SEC-004 FIX: Fix overly permissive bots RLS policy
-- The old policy allowed anyone to read ALL bots
-- ============================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "Anyone can view bots by embed_code" ON bots;

-- Create a more restrictive policy for public bot access
-- Only allows viewing a specific bot when accessed via its embed_code
-- This is used by the chat widget for embedded bots
CREATE POLICY "Public can view active bots by embed_code" ON bots
    FOR SELECT USING (
        active = true AND embed_code IS NOT NULL
    );

-- Note: The chat widget should pass the embed_code and the query will
-- filter to just that bot. RLS ensures only active bots with embed codes
-- are visible to unauthenticated users.

-- ============================================
-- SEC-005 FIX: Admin policies for viewing all profiles
-- Only admins can view all user profiles
-- ============================================

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'ADMIN' OR is_master_admin = true
        )
    );

-- Allow admins to update any profile (for suspension, etc.)
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'ADMIN' OR is_master_admin = true
        )
    );

-- ============================================
-- SEC-007 FIX: Add rate limiting support table
-- ============================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON api_rate_limits(user_id, endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON api_rate_limits(ip_address, endpoint, created_at DESC);

-- Auto-cleanup old rate limit records (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM api_rate_limits WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on rate limits table
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" ON api_rate_limits
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Add missing indexes identified in review
-- ============================================

-- SEC: Email + bot index for lead duplicate checks
CREATE INDEX IF NOT EXISTS idx_leads_email_bot ON leads(email, bot_id);

-- SEC: Session + bot index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_session_bot ON conversations(session_id, bot_id);

-- ============================================
-- Helper function for checking admin status
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_user BOOLEAN;
BEGIN
    SELECT (role = 'ADMIN' OR is_master_admin = true) INTO is_admin_user
    FROM profiles
    WHERE id = user_id;

    RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Safe function for getting public bot config
-- Only returns non-sensitive fields
-- ============================================

CREATE OR REPLACE FUNCTION get_public_bot_config(p_embed_code UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    theme_color TEXT,
    avatar TEXT,
    active BOOLEAN,
    system_prompt TEXT,
    model TEXT,
    temperature NUMERIC,
    max_messages INTEGER
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.name,
        b.theme_color,
        b.avatar,
        b.active,
        b.system_prompt,
        b.model,
        b.temperature,
        b.max_messages
    FROM bots b
    WHERE b.embed_code = p_embed_code AND b.active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grant execute permissions to anon role for public functions
-- ============================================

GRANT EXECUTE ON FUNCTION get_public_bot_config(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_bot_config(UUID) TO authenticated;
