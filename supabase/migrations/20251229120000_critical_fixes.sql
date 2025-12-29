-- CRITICAL FIXES MIGRATION
-- Date: 2025-12-29
-- Purpose: Fix P0 critical issues identified in comprehensive audit
--
-- Issues Fixed:
-- 1. Vector dimension mismatch in match_knowledge_base (3072 → 1536)
-- 2. Missing admin RLS policies for cross-user access
-- 3. Message role enum missing 'model' value
-- 4. Missing UNIQUE constraint for lead deduplication
-- 5. Overly permissive public bot access policy

-- ============================================================================
-- 1. FIX VECTOR DIMENSION MISMATCH
-- ============================================================================

-- Drop and recreate match_knowledge_base function with correct vector dimension
DROP FUNCTION IF EXISTS match_knowledge_base(vector, UUID, FLOAT, INT);

CREATE OR REPLACE FUNCTION match_knowledge_base(
    query_embedding vector(1536),  -- FIXED: Changed from 3072 to 1536
    match_bot_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    file_name TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content,
        kb.file_name,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.bot_id = match_bot_id
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge_base IS 'RAG vector similarity search - FIXED vector dimension to 1536';

-- ============================================================================
-- 2. ADD MESSAGE ROLE ENUM VALUE
-- ============================================================================

-- Add 'model' to message_role enum (used by Gemini API responses)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'model' AND enumtypid = 'message_role'::regtype) THEN
        ALTER TYPE message_role ADD VALUE 'model';
    END IF;
END $$;

COMMENT ON TYPE message_role IS 'Message roles: user, assistant, system, model (Gemini)';

-- ============================================================================
-- 3. ADD ADMIN RLS POLICIES FOR CROSS-USER ACCESS
-- ============================================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('ADMIN', 'MASTER_ADMIN', 'LIMITED_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES: Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT
    USING (is_admin());

-- PROFILES: Admin can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE
    USING (is_admin());

-- BOTS: Admin can view all bots
CREATE POLICY "Admins can view all bots" ON bots
    FOR SELECT
    USING (is_admin());

-- BOTS: Admin can update any bot
CREATE POLICY "Admins can update any bot" ON bots
    FOR UPDATE
    USING (is_admin());

-- LEADS: Admin can view all leads
CREATE POLICY "Admins can view all leads" ON leads
    FOR SELECT
    USING (is_admin());

-- LEADS: Admin can update any lead
CREATE POLICY "Admins can update any lead" ON leads
    FOR UPDATE
    USING (is_admin());

-- CONVERSATIONS: Admin can view all conversations
CREATE POLICY "Admins can view all conversations" ON conversations
    FOR SELECT
    USING (is_admin());

-- PHONE_CALLS: Admin can view all phone calls
CREATE POLICY "Admins can view all phone calls" ON phone_calls
    FOR SELECT
    USING (is_admin());

-- USAGE_EVENTS: Admin can view all usage
CREATE POLICY "Admins can view all usage" ON usage_events
    FOR SELECT
    USING (is_admin());

-- ============================================================================
-- 4. FIX OVERLY PERMISSIVE PUBLIC BOT ACCESS
-- ============================================================================

-- Remove the overly permissive "Anyone can view bots by embed_code" policy
DROP POLICY IF EXISTS "Anyone can view bots by embed_code" ON bots;

-- Don't replace it - let widget access use service_role key instead
COMMENT ON TABLE bots IS 'Bots table - widget access via service_role only';

-- ============================================================================
-- 5. ADD UNIQUE CONSTRAINT FOR LEAD DEDUPLICATION
-- ============================================================================

-- Add unique constraint on (email, bot_id) to prevent duplicate leads
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_email_bot
    ON leads(email, bot_id)
    WHERE email IS NOT NULL;

COMMENT ON INDEX idx_leads_unique_email_bot IS 'Prevent duplicate leads for same email+bot';

-- ============================================================================
-- 6. ADD MISSING DELETE POLICIES
-- ============================================================================

-- PHONE_CALLS: Users can delete own phone calls
CREATE POLICY "Users can delete own phone calls" ON phone_calls
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 7. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for admin dashboard filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- Index for lead queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);

-- Index for reseller queries
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_status
    ON profiles(referred_by, status)
    WHERE referred_by IS NOT NULL;

-- ============================================================================
-- 8. ADD CHECK CONSTRAINTS FOR DATA VALIDATION
-- ============================================================================

-- Email validation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_format') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_format
            CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_email_format') THEN
        ALTER TABLE leads ADD CONSTRAINT leads_email_format
            CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Phone number validation (E.164 format)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_phone_format') THEN
        ALTER TABLE leads ADD CONSTRAINT leads_phone_format
            CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phone_calls_numbers_format') THEN
        ALTER TABLE phone_calls ADD CONSTRAINT phone_calls_numbers_format
            CHECK (
                (from_number IS NULL OR from_number ~* '^\+?[1-9]\d{1,14}$')
                AND (to_number IS NULL OR to_number ~* '^\+?[1-9]\d{1,14}$')
            );
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Critical fixes migration completed successfully';
    RAISE NOTICE '- Fixed vector dimension mismatch (3072 → 1536)';
    RAISE NOTICE '- Added admin RLS policies for cross-user access';
    RAISE NOTICE '- Added "model" to message_role enum';
    RAISE NOTICE '- Added unique constraint for lead deduplication';
    RAISE NOTICE '- Removed overly permissive public bot access';
    RAISE NOTICE '- Added performance indexes';
    RAISE NOTICE '- Added data validation constraints';
END $$;
