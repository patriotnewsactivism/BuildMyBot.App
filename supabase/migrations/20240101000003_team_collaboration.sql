-- Team Collaboration Features
-- Description: Add support for teams and multi-user access

-- =====================================================
-- TEAM MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{"bots": "read", "leads": "read", "analytics": "read"}',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_members_owner ON team_members(team_owner_id);
CREATE INDEX idx_team_members_member ON team_members(member_id);
CREATE INDEX idx_team_members_status ON team_members(status);
CREATE UNIQUE INDEX idx_team_members_unique ON team_members(team_owner_id, member_id);

-- =====================================================
-- TEAM INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_invitations_owner ON team_invitations(team_owner_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_resource ON activity_log(resource_type, resource_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- =====================================================
-- SHARED RESOURCES TABLE (for shared bots/leads)
-- =====================================================
CREATE TABLE IF NOT EXISTS shared_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('bot', 'lead', 'conversation', 'website')),
  resource_id UUID NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read' CHECK (permissions IN ('read', 'write', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shared_resources_owner ON shared_resources(owner_id);
CREATE INDEX idx_shared_resources_shared_with ON shared_resources(shared_with_id);
CREATE INDEX idx_shared_resources_resource ON shared_resources(resource_type, resource_id);
CREATE UNIQUE INDEX idx_shared_resources_unique ON shared_resources(owner_id, shared_with_id, resource_type, resource_id);

-- =====================================================
-- RLS POLICIES FOR TEAM FEATURES
-- =====================================================

-- Team Members Policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can view their team members"
  ON team_members FOR SELECT
  USING (team_owner_id = auth.uid() OR member_id = auth.uid());

CREATE POLICY "Team owners can manage team members"
  ON team_members FOR ALL
  USING (team_owner_id = auth.uid());

-- Team Invitations Policies
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can view invitations"
  ON team_invitations FOR SELECT
  USING (team_owner_id = auth.uid());

CREATE POLICY "Team owners can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (team_owner_id = auth.uid());

CREATE POLICY "Team owners can update invitations"
  ON team_invitations FOR UPDATE
  USING (team_owner_id = auth.uid());

-- Activity Log Policies
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System can create activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (true); -- Allow system to create logs

-- Shared Resources Policies
ALTER TABLE shared_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resources shared with them"
  ON shared_resources FOR SELECT
  USING (owner_id = auth.uid() OR shared_with_id = auth.uid());

CREATE POLICY "Owners can manage shared resources"
  ON shared_resources FOR ALL
  USING (owner_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user has access to a resource (directly or via team/sharing)
CREATE OR REPLACE FUNCTION has_resource_access(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the resource
  IF EXISTS (
    SELECT 1 FROM bots WHERE id = p_resource_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if resource is shared with user
  IF EXISTS (
    SELECT 1 FROM shared_resources
    WHERE shared_with_id = p_user_id
    AND resource_type = p_resource_type
    AND resource_id = p_resource_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a team member with access
  IF EXISTS (
    SELECT 1 FROM team_members tm
    JOIN bots b ON b.owner_id = tm.team_owner_id
    WHERE tm.member_id = p_user_id
    AND tm.status = 'active'
    AND b.id = p_resource_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_log (user_id, action, resource_type, resource_id, metadata)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional)
-- =====================================================

-- Add team collaboration permissions to existing profiles
UPDATE profiles
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'),
  '{team_enabled}',
  'true'
)
WHERE role = 'owner' AND plan IN ('pro', 'enterprise');

COMMENT ON TABLE team_members IS 'Stores team member relationships for multi-user access';
COMMENT ON TABLE team_invitations IS 'Pending team invitations sent via email';
COMMENT ON TABLE activity_log IS 'Audit log of all user actions';
COMMENT ON TABLE shared_resources IS 'Individual resource sharing between users';
