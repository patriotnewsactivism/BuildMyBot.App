-- BuildMyBot.app Row-Level Security Policies
-- Migration: RLS Policies
-- Description: Comprehensive security policies for all tables

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
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

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is reseller
CREATE OR REPLACE FUNCTION is_reseller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'reseller'
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1. PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- =====================================================
-- 2. PLANS POLICIES (Public Read)
-- =====================================================

-- Everyone can view plans
CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  USING (true);

-- Only admins can modify plans
CREATE POLICY "Admins can manage plans"
  ON plans FOR ALL
  USING (is_admin());

-- =====================================================
-- 3. BOTS POLICIES
-- =====================================================

-- Users can view their own bots
CREATE POLICY "Users can view own bots"
  ON bots FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

-- Users can create their own bots
CREATE POLICY "Users can create own bots"
  ON bots FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Users can update their own bots
CREATE POLICY "Users can update own bots"
  ON bots FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- Users can delete their own bots
CREATE POLICY "Users can delete own bots"
  ON bots FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- =====================================================
-- 4. KNOWLEDGE BASE POLICIES
-- =====================================================

CREATE POLICY "Users can view own knowledge base"
  ON knowledge_base FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own knowledge base entries"
  ON knowledge_base FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own knowledge base"
  ON knowledge_base FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own knowledge base"
  ON knowledge_base FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- =====================================================
-- 5. CONVERSATIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- =====================================================
-- 6. LEADS POLICIES
-- =====================================================

CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own leads"
  ON leads FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- =====================================================
-- 7. MARKETING CONTENT POLICIES
-- =====================================================

CREATE POLICY "Users can view own marketing content"
  ON marketing_content FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own marketing content"
  ON marketing_content FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own marketing content"
  ON marketing_content FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own marketing content"
  ON marketing_content FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- =====================================================
-- 8. BILLING ACCOUNTS POLICIES
-- =====================================================

CREATE POLICY "Users can view own billing"
  ON billing_accounts FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own billing"
  ON billing_accounts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own billing"
  ON billing_accounts FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- =====================================================
-- 9. USAGE EVENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view own usage"
  ON usage_events FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own usage events"
  ON usage_events FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only admins can delete usage events (audit trail)
CREATE POLICY "Admins can delete usage events"
  ON usage_events FOR DELETE
  USING (is_admin());

-- =====================================================
-- 10. TEMPLATES POLICIES (Public Read)
-- =====================================================

-- Everyone can view templates
CREATE POLICY "Anyone can view templates"
  ON templates FOR SELECT
  USING (true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage templates"
  ON templates FOR ALL
  USING (is_admin());

-- =====================================================
-- 11. RESELLER ACCOUNTS POLICIES
-- =====================================================

CREATE POLICY "Resellers can view own account"
  ON reseller_accounts FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Resellers can create own account"
  ON reseller_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Resellers can update own account"
  ON reseller_accounts FOR UPDATE
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- =====================================================
-- 12. RESELLER CLIENTS POLICIES
-- =====================================================

-- Resellers can view their clients
CREATE POLICY "Resellers can view own clients"
  ON reseller_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE reseller_accounts.id = reseller_clients.reseller_id
      AND reseller_accounts.user_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "Resellers can add clients"
  ON reseller_clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE reseller_accounts.id = reseller_clients.reseller_id
      AND reseller_accounts.user_id = auth.uid()
    )
  );

-- =====================================================
-- 13. REFERRALS POLICIES
-- =====================================================

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Admins can update referrals"
  ON referrals FOR UPDATE
  USING (is_admin());

-- =====================================================
-- 14. COMMISSIONS POLICIES
-- =====================================================

CREATE POLICY "Resellers can view own commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE reseller_accounts.id = commissions.reseller_id
      AND reseller_accounts.user_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "System can create commissions"
  ON commissions FOR INSERT
  WITH CHECK (is_admin()); -- Only backend/admin can create commissions

CREATE POLICY "Admins can update commissions"
  ON commissions FOR UPDATE
  USING (is_admin());

-- =====================================================
-- 15. WEBSITE PAGES POLICIES
-- =====================================================

CREATE POLICY "Users can view own website pages"
  ON website_pages FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own website pages"
  ON website_pages FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own website pages"
  ON website_pages FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own website pages"
  ON website_pages FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- Allow public read for published pages
CREATE POLICY "Anyone can view published pages"
  ON website_pages FOR SELECT
  USING (is_published = true);

-- =====================================================
-- 16. PHONE CALLS POLICIES
-- =====================================================

CREATE POLICY "Users can view own phone calls"
  ON phone_calls FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own phone calls"
  ON phone_calls FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own phone calls"
  ON phone_calls FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own phone calls"
  ON phone_calls FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());
