# Fix for "Failed to save bot: violates foreign key constraint bots_user_id_fkey"

## Problem
When users try to save a bot, they get an error: **"Failed to save bot: insert or update on table 'bots' violates foreign key constraint 'bots_user_id_fkey'"**

This happens because:
1. Users sign up via Supabase Auth (creates a row in `auth.users`)
2. **BUT** no corresponding profile is created in the `profiles` table
3. When saving a bot, the foreign key constraint fails because `bots.user_id` must reference an existing `profiles.id`

## Solution
Apply the migration that automatically creates profiles for new users.

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/20251229000000_add_auto_profile_creation.sql`
5. Click **Run**

This will:
- Create a trigger that automatically creates a profile when users sign up
- Backfill profiles for any existing users who don't have them

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

This will apply all pending migrations.

### Option 3: Install Supabase CLI and Apply

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## Verification

After applying the migration:

1. Try to create or edit a bot
2. Click "Save Changes"
3. The save should now work without errors

## What the Migration Does

The migration creates:

1. **A function** (`handle_new_user()`) that creates a profile whenever a new user signs up
2. **A trigger** that automatically runs this function when a row is inserted into `auth.users`
3. **A backfill** that creates profiles for existing users who don't have them

This ensures that every authenticated user always has a corresponding profile, preventing the foreign key constraint error.
