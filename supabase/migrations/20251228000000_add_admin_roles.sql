-- Add MASTER_ADMIN and LIMITED_ADMIN roles to user_role enum
-- This allows the application to use these privileged roles

DO $$
BEGIN
  -- First, check if the user_role type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    -- Add MASTER_ADMIN if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'user_role' AND e.enumlabel = 'MASTER_ADMIN'
    ) THEN
      ALTER TYPE user_role ADD VALUE 'MASTER_ADMIN';
    END IF;

    -- Add LIMITED_ADMIN if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'user_role' AND e.enumlabel = 'LIMITED_ADMIN'
    ) THEN
      ALTER TYPE user_role ADD VALUE 'LIMITED_ADMIN';
    END IF;
  ELSE
    -- If the type doesn't exist, create it with all values
    CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'MASTER_ADMIN', 'LIMITED_ADMIN', 'RESELLER');
  END IF;
END $$;
