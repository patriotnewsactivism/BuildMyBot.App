-- Add missing INSERT policies for bots, leads, conversations, and profiles
-- This allows users to create new records

DO $$
BEGIN
  -- BOTS INSERT POLICY
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bots' AND policyname = 'Users can insert own bots') THEN
    CREATE POLICY "Users can insert own bots" ON bots FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- LEADS INSERT POLICY
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can insert own leads') THEN
    CREATE POLICY "Users can insert own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- CONVERSATIONS INSERT POLICY
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can insert own conversations') THEN
    CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- PROFILES INSERT POLICY
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
