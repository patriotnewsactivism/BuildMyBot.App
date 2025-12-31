-- Fix audit log trigger parameter types
-- Issue: log_audit was being called with UUID for resource_id instead of TEXT
-- This caused: "function log_audit(uuid, text, text, unknown, uuid, jsonb) does not exist"

-- Drop and recreate the audit_bot_changes trigger with correct parameter types
DROP TRIGGER IF EXISTS audit_bot_changes_trigger ON bots;
DROP FUNCTION IF EXISTS audit_bot_changes();

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

  -- Log the action - FIXED: Convert UUID to TEXT for resource_id
  PERFORM log_audit(
    COALESCE(NEW.user_id, OLD.user_id),
    v_user_email,
    v_action,
    'bot',
    COALESCE(NEW.id, OLD.id)::TEXT,  -- Convert UUID to TEXT
    jsonb_build_object(
      'bot_name', COALESCE(NEW.name, OLD.name),
      'bot_type', COALESCE(NEW.type, OLD.type),
      'timestamp', NOW()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger
DO $$
BEGIN
  -- Only create trigger if bots table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bots') THEN
    CREATE TRIGGER audit_bot_changes_trigger
      AFTER INSERT OR UPDATE OR DELETE ON bots
      FOR EACH ROW
      EXECUTE FUNCTION audit_bot_changes();
  END IF;
END
$$;

-- Also fix the audit_profile_changes trigger
DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON profiles;
DROP FUNCTION IF EXISTS audit_profile_changes();

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
    COALESCE(NEW.id, OLD.id)::TEXT,  -- Convert UUID to TEXT
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

-- Recreate the profiles trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TRIGGER audit_profile_changes_trigger
      AFTER INSERT OR UPDATE OR DELETE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION audit_profile_changes();
  END IF;
END
$$;

COMMENT ON FUNCTION audit_bot_changes IS 'Trigger function to audit bot changes - FIXED: resource_id now correctly cast to TEXT';
COMMENT ON FUNCTION audit_profile_changes IS 'Trigger function to audit profile changes - FIXED: resource_id now correctly cast to TEXT';
