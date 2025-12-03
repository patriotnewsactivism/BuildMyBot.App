-- BuildMyBot.app Row-Level Security Policies
-- This migration implements RLS for all tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is admin
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

-- Check if user is reseller
CREATE OR REPLACE FUNCTION is_reseller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'RESELLER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a client of the reseller
CREATE OR REPLACE FUNCTION is_reseller_client(client_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reseller_accounts ra
    JOIN reseller_clients rc ON ra.id = rc.reseller_id
    WHERE ra.owner_id = auth.uid()
    AND rc.client_id = client_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Resellers can view their clients' profiles
CREATE POLICY "Resellers can view client profiles"
  ON profiles FOR SELECT
  USING (is_reseller_client(id));

-- ============================================================================
-- BOTS POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own bots"
  ON bots FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own bots"
  ON bots FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own bots"
  ON bots FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own bots"
  ON bots FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- KNOWLEDGE_BASE POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own knowledge base"
  ON knowledge_base FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own knowledge base"
  ON knowledge_base FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own knowledge base"
  ON knowledge_base FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own knowledge base"
  ON knowledge_base FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- CONVERSATIONS POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- LEADS POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- MARKETING_CONTENT POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own marketing content"
  ON marketing_content FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own marketing content"
  ON marketing_content FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own marketing content"
  ON marketing_content FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own marketing content"
  ON marketing_content FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- BILLING_ACCOUNTS POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own billing account"
  ON billing_accounts FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own billing account"
  ON billing_accounts FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own billing account"
  ON billing_accounts FOR UPDATE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- USAGE_EVENTS POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own usage events"
  ON usage_events FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own usage events"
  ON usage_events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- TEMPLATES POLICIES (Public Read)
-- ============================================================================

CREATE POLICY "Anyone can view templates"
  ON templates FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage templates
CREATE POLICY "Admins can insert templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete templates"
  ON templates FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- PLANS POLICIES (Public Read)
-- ============================================================================

CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage plans
CREATE POLICY "Admins can insert plans"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update plans"
  ON plans FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete plans"
  ON plans FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- RESELLER_ACCOUNTS POLICIES
-- ============================================================================

CREATE POLICY "Resellers can view own account"
  ON reseller_accounts FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Resellers can create own account"
  ON reseller_accounts FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Resellers can update own account"
  ON reseller_accounts FOR UPDATE
  USING (auth.uid() = owner_id);

-- Admins can view all reseller accounts
CREATE POLICY "Admins can view all reseller accounts"
  ON reseller_accounts FOR SELECT
  USING (is_admin());

-- ============================================================================
-- RESELLER_CLIENTS POLICIES
-- ============================================================================

CREATE POLICY "Resellers can view own clients"
  ON reseller_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE id = reseller_clients.reseller_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can create client relationships"
  ON reseller_clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE id = reseller_clients.reseller_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can update client relationships"
  ON reseller_clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE id = reseller_clients.reseller_id
      AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- REFERRALS POLICIES
-- ============================================================================

CREATE POLICY "Resellers can view own referrals"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE id = referrals.reseller_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE id = referrals.reseller_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can update own referrals"
  ON referrals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE id = referrals.reseller_id
      AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMISSIONS POLICIES
-- ============================================================================

CREATE POLICY "Resellers can view own commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reseller_accounts
      WHERE id = commissions.reseller_id
      AND owner_id = auth.uid()
    )
  );

-- Admins can view all commissions
CREATE POLICY "Admins can view all commissions"
  ON commissions FOR SELECT
  USING (is_admin());

-- System can insert commissions (via Edge Functions)
CREATE POLICY "System can insert commissions"
  ON commissions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- WEBSITE_PAGES POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own website pages"
  ON website_pages FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own website pages"
  ON website_pages FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own website pages"
  ON website_pages FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own website pages"
  ON website_pages FOR DELETE
  USING (auth.uid() = owner_id);

-- Public can view published pages
CREATE POLICY "Anyone can view published pages"
  ON website_pages FOR SELECT
  TO anon
  USING (is_published = true);

-- ============================================================================
-- PHONE_CALLS POLICIES (Owner CRUD)
-- ============================================================================

CREATE POLICY "Users can view own phone calls"
  ON phone_calls FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own phone calls"
  ON phone_calls FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own phone calls"
  ON phone_calls FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own phone calls"
  ON phone_calls FOR DELETE
  USING (auth.uid() = owner_id);
