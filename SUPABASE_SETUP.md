# Supabase Setup Guide
## Database, Authentication & Storage for BuildMyBot.App

**Estimated Time:** 30-60 minutes
**Prerequisites:** Email address (for Supabase account)

---

## Step 1: Create Supabase Project

### 1.1 Sign Up for Supabase
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### 1.2 Create New Project
1. Click "New Project"
2. Fill in project details:
   - **Name:** `buildmybot-production` (or `buildmybot-dev` for testing)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan:** Free (good for development, 500MB database, 1GB file storage)

3. Click "Create new project"
4. Wait 2-3 minutes for project initialization

---

## Step 2: Get API Keys

### 2.1 Navigate to API Settings
1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll see several important values:

### 2.2 Copy Required Credentials

Copy these values (you'll need them for `.env.local`):

```bash
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Anon/Public Key (safe for browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (SECRET - server-side only!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANT:**
- The `anon` key is safe to expose in browser code
- The `service_role` key has admin privileges - **NEVER expose in client code**

---

## Step 3: Run Database Migration

### 3.1 Open SQL Editor
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"

### 3.2 Copy Schema SQL
1. Open `supabase_schema.sql` from this repository
2. Copy the **entire contents** (all ~450 lines)
3. Paste into the SQL Editor

### 3.3 Execute Migration
1. Click "Run" (or press `Cmd+Enter` / `Ctrl+Enter`)
2. Wait for execution (~5-10 seconds)
3. You should see: `Success. No rows returned`

### 3.4 Verify Tables Created
1. Go to **Table Editor** in Supabase dashboard
2. You should see 18 tables:
   - `users`
   - `bots`
   - `conversations`
   - `messages`
   - `leads`
   - `subscriptions`
   - `webhooks`
   - `phone_calls`
   - `resellers`
   - `reseller_clients`
   - `payouts`
   - `knowledge_base_files`
   - `knowledge_base_chunks`
   - `daily_analytics`
   - `api_usage`
   - `audit_logs`
   - `feature_flags`
   - `system_settings`

---

## Step 4: Enable pgvector Extension (for RAG)

### 4.1 Enable Extension
1. In SQL Editor, run this query:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. Verify by running:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

You should see one row returned.

---

## Step 5: Create Storage Buckets

### 5.1 Create Knowledge Base Bucket
1. Go to **Storage** in Supabase dashboard
2. Click "New bucket"
3. Configure:
   - **Name:** `knowledge-base`
   - **Public bucket:** `No` (private)
   - **File size limit:** `50 MB`
   - **Allowed MIME types:** `application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain`
4. Click "Create bucket"

### 5.2 Create Avatars Bucket
1. Click "New bucket" again
2. Configure:
   - **Name:** `avatars`
   - **Public bucket:** `Yes` (public)
   - **File size limit:** `2 MB`
   - **Allowed MIME types:** `image/png,image/jpeg,image/gif,image/webp`
3. Click "Create bucket"

### 5.3 Set Up Storage Policies

#### Knowledge Base Bucket Policies:
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own knowledge base files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own knowledge base files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own knowledge base files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Avatars Bucket Policies:
```sql
-- Anyone can view avatars (public bucket)
CREATE POLICY "Public avatars are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');
```

Run these in the SQL Editor.

---

## Step 6: Configure Authentication

### 6.1 Enable Email Authentication
1. Go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize "Confirm signup", "Magic Link", "Change Email", "Reset Password"

### 6.2 Enable OAuth Providers (Optional)

For Google OAuth:
1. Go to **Authentication** → **Providers** → **Google**
2. Toggle "Enable"
3. Add credentials from Google Cloud Console:
   - Client ID
   - Client Secret
4. Add redirect URL: `https://xxxxx.supabase.co/auth/v1/callback`

For GitHub OAuth:
1. Similar process with GitHub OAuth App credentials

### 6.3 Configure Auth Settings
1. Go to **Authentication** → **Settings**
2. Configure:
   - **Site URL:** `http://localhost:3000` (dev) or `https://buildmybot.app` (prod)
   - **Redirect URLs:** Add your domain(s)
   - **JWT Expiry:** `3600` (1 hour, default)
   - **Disable Signup:** `No` (allow new signups)
   - **Email Confirmations:** `Yes` (require email verification)

---

## Step 7: Set Up Environment Variables

### 7.1 Create .env.local File
```bash
cd /path/to/BuildMyBot.App
cp .env.example .env.local
```

### 7.2 Fill In Supabase Credentials
Edit `.env.local` and add your Supabase values:

```bash
# =============================================================================
# SUPABASE
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# =============================================================================
# OPENAI (Get from: https://platform.openai.com/api-keys)
# =============================================================================
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# =============================================================================
# STRIPE (Get from: https://dashboard.stripe.com/apikeys)
# =============================================================================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# =============================================================================
# APPLICATION
# =============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Step 8: Test Database Connection

### 8.1 Run Test Script
```bash
npm run test:db
```

If you see errors, we'll create this test script next.

### 8.2 Manual Test (Alternative)
Create `scripts/test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // Test 1: Check connection
  const { data, error } = await supabase.from('users').select('count');

  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Database connection successful!');
  console.log('✅ Tables accessible');

  // Test 2: Check storage
  const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

  if (storageError) {
    console.error('❌ Storage check failed:', storageError.message);
  } else {
    console.log(`✅ Storage buckets: ${buckets.map(b => b.name).join(', ')}`);
  }

  console.log('\n🎉 Supabase setup complete!');
}

testConnection();
```

Run it:
```bash
node scripts/test-supabase.js
```

---

## Step 9: Verify RLS Policies

### 9.1 Check RLS Status
Run this query in SQL Editor:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

### 9.2 Test RLS Policies
As a logged-in user, you should only see your own data:

```sql
-- This should return 0 rows (unless you've created test data)
SELECT * FROM bots;

-- This should work (returns empty set)
SELECT COUNT(*) FROM bots;
```

---

## Step 10: Optional - Seed Test Data

### 10.1 Create Test User (via Supabase Auth)
1. Go to **Authentication** → **Users**
2. Click "Add user"
3. Fill in:
   - **Email:** `test@buildmybot.app`
   - **Password:** `TestPassword123!`
   - **Auto Confirm User:** `Yes`
4. Copy the user's UUID

### 10.2 Insert Test Bot
```sql
INSERT INTO bots (user_id, name, type, system_prompt, model, temperature, active)
VALUES (
  'USER_UUID_HERE',
  'Test Sales Bot',
  'Sales',
  'You are a helpful sales assistant.',
  'gpt-4o-mini',
  0.7,
  true
);
```

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution:** Re-run the migration SQL from Step 3.

### Issue: "permission denied for table"
**Solution:** Check that RLS policies are set up correctly in Step 9.

### Issue: "JWT expired"
**Solution:** Your auth token expired. Log out and log back in.

### Issue: Storage bucket 404
**Solution:** Make sure you created the storage buckets in Step 5.

### Issue: Can't connect from localhost
**Solution:**
1. Check `.env.local` has correct values
2. Restart Next.js dev server: `npm run dev`
3. Verify Supabase project is not paused (free tier pauses after 1 week inactivity)

---

## Security Checklist

Before going to production:

- [ ] Enable email verification (Authentication → Settings)
- [ ] Set up password requirements (min 8 chars, etc.)
- [ ] Configure rate limiting for auth endpoints
- [ ] Review all RLS policies
- [ ] Disable service_role key in production (use only in backend)
- [ ] Set up database backups (Settings → Database → Backups)
- [ ] Enable 2FA for Supabase account
- [ ] Add production domains to redirect URLs
- [ ] Review audit logs regularly

---

## Next Steps

After completing Supabase setup:

1. ✅ Database is ready
2. ✅ Authentication is configured
3. ✅ Storage buckets created
4. 🚧 Implement authentication UI (login/signup pages)
5. 🚧 Add auth middleware to protect routes
6. 🚧 Connect Stripe for payments

See `IMPLEMENTATION_ROADMAP.md` for the complete plan.

---

## Useful Resources

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Functions:** https://supabase.com/docs/guides/database/functions
- **Row Level Security:** https://supabase.com/docs/guides/auth/row-level-security
- **Storage Guide:** https://supabase.com/docs/guides/storage
- **Auth Helpers (Next.js):** https://supabase.com/docs/guides/auth/auth-helpers/nextjs

---

**Setup Complete!** ✅

You're now ready to build the authentication layer and connect your app to Supabase.
