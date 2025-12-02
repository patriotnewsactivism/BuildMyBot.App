-- Admin RLS Bypass Policies
-- These policies allow users with ADMIN role to bypass normal restrictions

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());

-- BOTS: Admins can view all bots
CREATE POLICY "Admins can view all bots" ON bots FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all bots" ON bots FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete all bots" ON bots FOR DELETE USING (is_admin());

-- LEADS: Admins can view all leads
CREATE POLICY "Admins can view all leads" ON leads FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all leads" ON leads FOR UPDATE USING (is_admin());

-- CONVERSATIONS: Admins can view all conversations
CREATE POLICY "Admins can view all conversations" ON conversations FOR SELECT USING (is_admin());
CREATE POLICY "Admins can delete all conversations" ON conversations FOR DELETE USING (is_admin());

-- MARKETING CONTENT: Admins can view all marketing content
CREATE POLICY "Admins can view all marketing" ON marketing_content FOR SELECT USING (is_admin());

-- WEBSITE PAGES: Admins can view all pages
CREATE POLICY "Admins can view all pages" ON website_pages FOR SELECT USING (is_admin());

-- USAGE EVENTS: Admins can view all usage
CREATE POLICY "Admins can view all usage" ON usage_events FOR SELECT USING (is_admin());

-- BILLING: Admins can view all billing
CREATE POLICY "Admins can view all billing" ON billing_accounts FOR SELECT USING (is_admin());

-- RESELLER ACCOUNTS: Admins can view all reseller accounts
CREATE POLICY "Admins can view all reseller accounts" ON reseller_accounts FOR SELECT USING (is_admin());

-- RESELLER CLIENTS: Admins can view all relationships
CREATE POLICY "Admins can view all reseller clients" ON reseller_clients FOR SELECT USING (is_admin());

-- COMMISSIONS: Admins can view all commissions
CREATE POLICY "Admins can view all commissions" ON commissions FOR SELECT USING (is_admin());

-- PHONE CALLS: Admins can view all calls
CREATE POLICY "Admins can view all phone calls" ON phone_calls FOR SELECT USING (is_admin());
