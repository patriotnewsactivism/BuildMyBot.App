-- Critical Security Fixes Migration
-- This migration fixes critical security vulnerabilities identified in the audit

-- ============================================================================
-- FIX #1: Remove Unsafe Commissions RLS Policy
-- ============================================================================

-- Drop the unsafe policy that allows anyone to insert commissions
DROP POLICY IF EXISTS "System can insert commissions" ON commissions;

-- Commissions should ONLY be created by Edge Functions using service role
-- Service role bypasses RLS, so we don't need an INSERT policy
-- For additional security, add a trigger to validate commission creation

CREATE OR REPLACE FUNCTION validate_commission_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify the reseller-client relationship exists
  IF NOT EXISTS (
    SELECT 1 FROM reseller_clients
    WHERE reseller_id = NEW.reseller_id
    AND client_id = NEW.client_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid reseller-client relationship for commission';
  END IF;

  -- Verify commission amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Commission amount must be positive';
  END IF;

  -- Verify commission rate is within valid range (0-1)
  IF NEW.commission_rate < 0 OR NEW.commission_rate > 1 THEN
    RAISE EXCEPTION 'Commission rate must be between 0 and 1';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_commission_validation
  BEFORE INSERT ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_commission_creation();

-- ============================================================================
-- FIX #2: Fix Vector Search Function to Enforce Owner Validation
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS match_knowledge_base(vector(1536), float, int, uuid);

-- Create secure version that requires bot_id
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_bot_id uuid DEFAULT NULL,
  filter_owner_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source_type text,
  source_url text,
  similarity float
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    kb.id,
    kb.content,
    kb.source_type,
    kb.source_url,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE
    -- REQUIRE bot_id filter (prevents unscoped queries)
    filter_bot_id IS NOT NULL
    AND kb.bot_id = filter_bot_id
    -- ENFORCE owner check if provided
    AND (filter_owner_id IS NULL OR kb.owner_id = filter_owner_id)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create RLS-aware wrapper function
CREATE OR REPLACE FUNCTION match_knowledge_base_secure(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_bot_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source_type text,
  source_url text,
  similarity float
)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  -- Verify bot ownership via RLS-protected query
  IF filter_bot_id IS NOT NULL THEN
    PERFORM 1 FROM bots WHERE id = filter_bot_id AND owner_id = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bot not found or access denied';
    END IF;
  ELSE
    RAISE EXCEPTION 'bot_id parameter is required';
  END IF;

  -- Call underlying function with owner validation
  RETURN QUERY
  SELECT * FROM match_knowledge_base(
    query_embedding,
    match_threshold,
    match_count,
    filter_bot_id,
    auth.uid()
  );
END;
$$;

-- ============================================================================
-- FIX #3: Add Profile Creation Trigger
-- ============================================================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, company_name, role, plan, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    'OWNER',
    'FREE',
    'Active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FIX #4: Add Account Status Enforcement
-- ============================================================================

-- Function to check if account is active
CREATE OR REPLACE FUNCTION check_account_status()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM profiles
  WHERE id = auth.uid();

  IF v_status = 'Suspended' THEN
    RAISE EXCEPTION 'Account suspended. Please contact support.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to critical tables
CREATE TRIGGER enforce_account_status_bots
  BEFORE INSERT OR UPDATE ON bots
  FOR EACH ROW
  EXECUTE FUNCTION check_account_status();

CREATE TRIGGER enforce_account_status_conversations
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION check_account_status();

CREATE TRIGGER enforce_account_status_leads
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION check_account_status();

-- ============================================================================
-- FIX #5: Add Missing Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bots_created ON bots(created_at DESC);

-- ============================================================================
-- FIX #6: Add Conversation Message Schema Validation
-- ============================================================================

ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS valid_messages_schema;

ALTER TABLE conversations
ADD CONSTRAINT valid_messages_schema CHECK (
  jsonb_typeof(messages) = 'array'
);

-- ============================================================================
-- FIX #7: Add Security Events Table for Audit Logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_auth', 'rate_limit', 'suspicious_activity', 'data_access', 'permission_denied')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);

-- Enable RLS on security_events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
  ON security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- System can insert security events
CREATE POLICY "System can insert security events"
  ON security_events FOR INSERT
  WITH CHECK (true);
