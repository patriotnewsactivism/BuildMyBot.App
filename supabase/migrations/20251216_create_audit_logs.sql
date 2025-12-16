-- Create audit_logs table for security and compliance tracking
-- This table stores all significant actions taken in the system for accountability

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT, -- Denormalized for easier querying

  -- What action was performed
  action TEXT NOT NULL, -- e.g., 'bot_created', 'bot_updated', 'bot_deleted', 'user_suspended', etc.

  -- What resource was affected
  resource_type TEXT NOT NULL, -- e.g., 'bot', 'user', 'lead', 'conversation'
  resource_id TEXT NOT NULL, -- ID of the affected resource

  -- Additional context
  metadata JSONB DEFAULT '{}', -- Store additional context (IP address, user agent, changes made, etc.)

  -- When did it happen
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create a composite index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_activity ON audit_logs(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- 3. System can insert audit logs (via service role or trigger)
-- Note: INSERT policies are typically handled by service role key or database triggers
CREATE POLICY "Service can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- This will only work with service_role key

-- 4. No one can update or delete audit logs (immutable for compliance)
-- No UPDATE or DELETE policies = no one can modify logs

-- Create a helper function to log actions
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, metadata)
  VALUES (p_user_id, p_user_email, p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Create triggers to automatically log bot changes
CREATE OR REPLACE FUNCTION audit_bot_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_user_email TEXT;
BEGIN
  -- Determine the action
  IF (TG_OP = 'INSERT') THEN
    v_action := 'bot_created';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'bot_updated';
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'bot_deleted';
  END IF;

  -- Get user email (try from NEW first, then OLD)
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Log the action
  PERFORM log_audit(
    COALESCE(NEW.user_id, OLD.user_id),
    v_user_email,
    v_action,
    'bot',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'bot_name', COALESCE(NEW.name, OLD.name),
      'bot_type', COALESCE(NEW.type, OLD.type),
      'timestamp', NOW()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to bots table (if it exists)
DO $$
BEGIN
  -- Only create trigger if bots table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bots') THEN
    DROP TRIGGER IF EXISTS audit_bot_changes_trigger ON bots;
    CREATE TRIGGER audit_bot_changes_trigger
      AFTER INSERT OR UPDATE OR DELETE ON bots
      FOR EACH ROW
      EXECUTE FUNCTION audit_bot_changes();
  END IF;
END
$$;

-- Create trigger for user profile changes
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_action := 'profile_created';
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Check if status changed (suspension)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'user_status_changed';
    ELSE
      v_action := 'profile_updated';
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'profile_deleted';
  END IF;

  PERFORM log_audit(
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.email, OLD.email),
    v_action,
    'profile',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'role', COALESCE(NEW.role, OLD.role),
      'timestamp', NOW()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to profiles table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON profiles;
    CREATE TRIGGER audit_profile_changes_trigger
      AFTER INSERT OR UPDATE OR DELETE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION audit_profile_changes();
  END IF;
END
$$;

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO service_role;

-- Add helpful comments
COMMENT ON TABLE audit_logs IS 'Immutable audit log for security and compliance tracking';
COMMENT ON COLUMN audit_logs.action IS 'The action performed (e.g., bot_created, user_suspended)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context stored as JSON (IP, user agent, changes, etc.)';
