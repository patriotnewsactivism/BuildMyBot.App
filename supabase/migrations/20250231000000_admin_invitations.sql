-- Admin Invitations and Management System
-- Migration: 20250231000000_admin_invitations
-- Description: Add admin invitation system for MASTER_ADMIN to invite and manage admins

-- ============================================
-- ADMIN INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who sent the invitation (MASTER_ADMIN only)
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Invitation details
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'ADMIN',

  -- Invitation token for verification
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_role CHECK (role IN ('ADMIN', 'RESELLER')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_token ON admin_invitations(token);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status, created_at DESC);
CREATE INDEX idx_admin_invitations_invited_by ON admin_invitations(invited_by);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only MASTER_ADMIN can view all invitations
CREATE POLICY "MASTER_ADMIN can view all invitations"
  ON admin_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'MASTER_ADMIN'
    )
  );

-- Only MASTER_ADMIN can create invitations
CREATE POLICY "MASTER_ADMIN can create invitations"
  ON admin_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'MASTER_ADMIN'
    )
    AND invited_by = auth.uid()
  );

-- Only MASTER_ADMIN can update invitations (revoke, etc.)
CREATE POLICY "MASTER_ADMIN can update invitations"
  ON admin_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'MASTER_ADMIN'
    )
  );

-- Only MASTER_ADMIN can delete invitations
CREATE POLICY "MASTER_ADMIN can delete invitations"
  ON admin_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'MASTER_ADMIN'
    )
  );

-- ============================================
-- PROFILES RLS POLICY UPDATES
-- ============================================

-- MASTER_ADMIN can view all profiles
CREATE POLICY "MASTER_ADMIN can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'MASTER_ADMIN'
    )
  );

-- MASTER_ADMIN can update user roles
CREATE POLICY "MASTER_ADMIN can update all profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'MASTER_ADMIN'
    )
  );

-- ADMIN can view all profiles but with restrictions
CREATE POLICY "ADMIN can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- ADMIN can update profiles (but not roles or critical fields)
CREATE POLICY "ADMIN can update user statuses" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
    AND id != auth.uid() -- Cannot modify own profile
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create admin invitation
CREATE OR REPLACE FUNCTION create_admin_invitation(
  p_email TEXT,
  p_role user_role DEFAULT 'ADMIN'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id UUID;
  v_user_role user_role;
BEGIN
  -- Check if caller is MASTER_ADMIN
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_user_role != 'MASTER_ADMIN' THEN
    RAISE EXCEPTION 'Only MASTER_ADMIN can create invitations';
  END IF;

  -- Check if role is valid for invitation
  IF p_role NOT IN ('ADMIN', 'RESELLER') THEN
    RAISE EXCEPTION 'Can only invite ADMIN or RESELLER roles';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Check if there's already a pending invitation
  IF EXISTS (
    SELECT 1 FROM admin_invitations
    WHERE email = p_email
    AND status = 'pending'
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Pending invitation already exists for this email';
  END IF;

  -- Create invitation
  INSERT INTO admin_invitations (invited_by, email, role)
  VALUES (auth.uid(), p_email, p_role)
  RETURNING id INTO v_invitation_id;

  -- Log the action
  PERFORM log_audit(
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'admin_invitation_created',
    'admin_invitation',
    v_invitation_id::TEXT,
    jsonb_build_object(
      'invited_email', p_email,
      'role', p_role
    )
  );

  RETURN v_invitation_id;
END;
$$;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_admin_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation admin_invitations%ROWTYPE;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM admin_invitations
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check if user email matches invitation
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
    AND email = v_invitation.email
  ) THEN
    RAISE EXCEPTION 'Email does not match invitation';
  END IF;

  -- Update user role
  UPDATE profiles
  SET role = v_invitation.role
  WHERE id = p_user_id;

  -- Mark invitation as accepted
  UPDATE admin_invitations
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Log the action
  PERFORM log_audit(
    p_user_id,
    v_invitation.email,
    'admin_invitation_accepted',
    'admin_invitation',
    v_invitation.id::TEXT,
    jsonb_build_object(
      'role', v_invitation.role
    )
  );

  RETURN TRUE;
END;
$$;

-- Function to revoke invitation
CREATE OR REPLACE FUNCTION revoke_admin_invitation(
  p_invitation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role user_role;
BEGIN
  -- Check if caller is MASTER_ADMIN
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_user_role != 'MASTER_ADMIN' THEN
    RAISE EXCEPTION 'Only MASTER_ADMIN can revoke invitations';
  END IF;

  -- Update invitation status
  UPDATE admin_invitations
  SET status = 'revoked'
  WHERE id = p_invitation_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  -- Log the action
  PERFORM log_audit(
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'admin_invitation_revoked',
    'admin_invitation',
    p_invitation_id::TEXT,
    '{}'::jsonb
  );

  RETURN TRUE;
END;
$$;

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE admin_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON admin_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_admin_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_admin_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_invitations TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE admin_invitations IS 'Stores admin invitations sent by MASTER_ADMIN';
COMMENT ON FUNCTION create_admin_invitation IS 'Creates a new admin invitation (MASTER_ADMIN only)';
COMMENT ON FUNCTION accept_admin_invitation IS 'Accepts an admin invitation and upgrades user role';
COMMENT ON FUNCTION revoke_admin_invitation IS 'Revokes a pending invitation (MASTER_ADMIN only)';
COMMENT ON FUNCTION expire_old_invitations IS 'Automatically expires invitations past their expiry date';
