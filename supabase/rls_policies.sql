-- ============================================================================
-- BuildMyBot.app - Row-Level Security (RLS) Policies
-- ============================================================================
-- This file defines all RLS policies for the BuildMyBot.app platform.
--
-- Principles:
-- 1. Every resource belongs to exactly one owner_id
-- 2. Users may only access their own resources
-- 3. Resellers may view clients via relational checks
-- 4. Admins bypass all restrictions
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns a resource
CREATE OR REPLACE FUNCTION is_owner(resource_owner_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = resource_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a reseller with access to a client
CREATE OR REPLACE FUNCTION is_reseller_of_client(client_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reseller_clients rc
    JOIN reseller_accounts ra ON rc.reseller_id = ra.id
    WHERE ra.owner_id = auth.uid()
    AND rc.client_id = client_id
    AND rc.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PLANS (Public Read)
-- ============================================================================

-- Anyone can read plans (pricing tiers are public)
CREATE POLICY "plans_select_public"
  ON plans FOR SELECT
  USING (is_active = true);

-- Only admins can modify plans
CREATE POLICY "plans_admin_all"
  ON plans FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- PROFILES (Owner CRUD + Admin Access)
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- New profiles are created via auth trigger (handled separately)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users cannot delete their profile (soft delete via status)
-- Admins can delete any profile
CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  USING (is_admin());

-- Resellers can view their clients' profiles (limited fields via views/functions)
CREATE POLICY "profiles_select_reseller_clients"
  ON profiles FOR SELECT
  USING (is_reseller_of_client(id));

-- ============================================================================
-- BOTS (Owner CRUD)
-- ============================================================================

-- Users can read their own bots
CREATE POLICY "bots_select_own"
  ON bots FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

-- Users can create bots
CREATE POLICY "bots_insert_own"
  ON bots FOR INSERT
  WITH CHECK (is_owner(owner_id));

-- Users can update their own bots
CREATE POLICY "bots_update_own"
  ON bots FOR UPDATE
  USING (is_owner(owner_id))
  WITH CHECK (is_owner(owner_id));

-- Users can delete their own bots
CREATE POLICY "bots_delete_own"
  ON bots FOR DELETE
  USING (is_owner(owner_id) OR is_admin());

-- ============================================================================
-- KNOWLEDGE_BASE (Owner CRUD)
-- ============================================================================

CREATE POLICY "knowledge_base_select_own"
  ON knowledge_base FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

CREATE POLICY "knowledge_base_insert_own"
  ON knowledge_base FOR INSERT
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "knowledge_base_update_own"
  ON knowledge_base FOR UPDATE
  USING (is_owner(owner_id))
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "knowledge_base_delete_own"
  ON knowledge_base FOR DELETE
  USING (is_owner(owner_id) OR is_admin());

-- ============================================================================
-- CONVERSATIONS (Owner CRUD + Public Insert for chat widget)
-- ============================================================================

-- Users can read their own conversations
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

-- Anyone can create conversations (public chat widget)
-- The bot ownership validation happens at the edge function level
CREATE POLICY "conversations_insert_public"
  ON conversations FOR INSERT
  WITH CHECK (true);

-- Users can update their own conversations (e.g., add messages)
CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  USING (is_owner(owner_id) OR is_admin())
  WITH CHECK (is_owner(owner_id) OR is_admin());

-- Users can delete their own conversations
CREATE POLICY "conversations_delete_own"
  ON conversations FOR DELETE
  USING (is_owner(owner_id) OR is_admin());

-- ============================================================================
-- LEADS (Owner CRUD)
-- ============================================================================

CREATE POLICY "leads_select_own"
  ON leads FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

CREATE POLICY "leads_insert_own"
  ON leads FOR INSERT
  WITH CHECK (is_owner(owner_id));

-- Allow public lead creation via edge function (validated there)
CREATE POLICY "leads_insert_public"
  ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "leads_update_own"
  ON leads FOR UPDATE
  USING (is_owner(owner_id))
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "leads_delete_own"
  ON leads FOR DELETE
  USING (is_owner(owner_id) OR is_admin());

-- ============================================================================
-- MARKETING_CONTENT (Owner CRUD)
-- ============================================================================

CREATE POLICY "marketing_content_select_own"
  ON marketing_content FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

CREATE POLICY "marketing_content_insert_own"
  ON marketing_content FOR INSERT
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "marketing_content_update_own"
  ON marketing_content FOR UPDATE
  USING (is_owner(owner_id))
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "marketing_content_delete_own"
  ON marketing_content FOR DELETE
  USING (is_owner(owner_id) OR is_admin());

-- ============================================================================
-- BILLING_ACCOUNTS (Owner Read + Limited Update)
-- ============================================================================

CREATE POLICY "billing_accounts_select_own"
  ON billing_accounts FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

-- Billing accounts are created/updated by Stripe webhooks (service role)
-- Users cannot directly modify billing accounts
CREATE POLICY "billing_accounts_admin_all"
  ON billing_accounts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- USAGE_EVENTS (Owner Read, System Write)
-- ============================================================================

CREATE POLICY "usage_events_select_own"
  ON usage_events FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

-- Usage events are created by edge functions (service role)
-- This policy allows the service role to insert
CREATE POLICY "usage_events_insert_service"
  ON usage_events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TEMPLATES (Public Read, Admin CRUD)
-- ============================================================================

-- Anyone can read active templates (marketplace is public)
CREATE POLICY "templates_select_public"
  ON templates FOR SELECT
  USING (is_active = true OR is_admin());

-- Only admins or template authors can modify
CREATE POLICY "templates_insert_admin"
  ON templates FOR INSERT
  WITH CHECK (is_admin() OR author_id = auth.uid());

CREATE POLICY "templates_update_admin"
  ON templates FOR UPDATE
  USING (is_admin() OR author_id = auth.uid())
  WITH CHECK (is_admin() OR author_id = auth.uid());

CREATE POLICY "templates_delete_admin"
  ON templates FOR DELETE
  USING (is_admin());

-- ============================================================================
-- RESELLER_ACCOUNTS (Owner CRUD)
-- ============================================================================

CREATE POLICY "reseller_accounts_select_own"
  ON reseller_accounts FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

CREATE POLICY "reseller_accounts_insert_own"
  ON reseller_accounts FOR INSERT
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "reseller_accounts_update_own"
  ON reseller_accounts FOR UPDATE
  USING (is_owner(owner_id) OR is_admin())
  WITH CHECK (is_owner(owner_id) OR is_admin());

CREATE POLICY "reseller_accounts_delete_admin"
  ON reseller_accounts FOR DELETE
  USING (is_admin());

-- ============================================================================
-- RESELLER_CLIENTS (Reseller Access)
-- ============================================================================

-- Resellers can view their clients
CREATE POLICY "reseller_clients_select_reseller"
  ON reseller_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts ra
      WHERE ra.id = reseller_clients.reseller_id
      AND ra.owner_id = auth.uid()
    )
    OR is_admin()
  );

-- Reseller-client relationships are created by edge functions
CREATE POLICY "reseller_clients_insert_service"
  ON reseller_clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "reseller_clients_update_admin"
  ON reseller_clients FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "reseller_clients_delete_admin"
  ON reseller_clients FOR DELETE
  USING (is_admin());

-- ============================================================================
-- REFERRALS (Reseller Access)
-- ============================================================================

CREATE POLICY "referrals_select_reseller"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts ra
      WHERE ra.id = referrals.reseller_id
      AND ra.owner_id = auth.uid()
    )
    OR is_admin()
  );

-- Referrals are created by edge functions
CREATE POLICY "referrals_insert_service"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "referrals_update_service"
  ON referrals FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMISSIONS (Reseller Read)
-- ============================================================================

CREATE POLICY "commissions_select_reseller"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts ra
      WHERE ra.id = commissions.reseller_id
      AND ra.owner_id = auth.uid()
    )
    OR is_admin()
  );

-- Commissions are managed by the system
CREATE POLICY "commissions_admin_all"
  ON commissions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- WEBSITE_PAGES (Owner CRUD)
-- ============================================================================

CREATE POLICY "website_pages_select_own"
  ON website_pages FOR SELECT
  USING (is_owner(owner_id) OR is_published = true OR is_admin());

CREATE POLICY "website_pages_insert_own"
  ON website_pages FOR INSERT
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "website_pages_update_own"
  ON website_pages FOR UPDATE
  USING (is_owner(owner_id))
  WITH CHECK (is_owner(owner_id));

CREATE POLICY "website_pages_delete_own"
  ON website_pages FOR DELETE
  USING (is_owner(owner_id) OR is_admin());

-- ============================================================================
-- PHONE_CALLS (Owner CRUD)
-- ============================================================================

CREATE POLICY "phone_calls_select_own"
  ON phone_calls FOR SELECT
  USING (is_owner(owner_id) OR is_admin());

-- Phone calls are created by Twilio webhooks (service role)
CREATE POLICY "phone_calls_insert_service"
  ON phone_calls FOR INSERT
  WITH CHECK (true);

CREATE POLICY "phone_calls_update_service"
  ON phone_calls FOR UPDATE
  USING (is_owner(owner_id) OR is_admin())
  WITH CHECK (is_owner(owner_id) OR is_admin());

CREATE POLICY "phone_calls_delete_admin"
  ON phone_calls FOR DELETE
  USING (is_admin());

-- ============================================================================
-- AUTH TRIGGER: Create profile on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, plan, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'OWNER',
    'FREE',
    'Active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================
-- Note: The Supabase service role automatically bypasses RLS.
-- Edge functions using the service role can perform any operation.
-- This is intentional for:
-- - Stripe webhook handlers
-- - Twilio webhook handlers
-- - System operations (usage tracking, commission calculations)

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
