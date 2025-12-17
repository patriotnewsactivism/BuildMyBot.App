# 🚀 Supabase Backend Setup Guide

Complete guide to set up your Supabase backend for BuildMyBot.

**Time Required:** 20-30 minutes
**Difficulty:** Intermediate (we'll guide you through everything!)

---

## 📋 What You'll Create

Your Supabase backend will include:
- ✅ **PostgreSQL database** with 11 tables (profiles, bots, leads, conversations, etc.)
- ✅ **pgvector extension** for AI-powered semantic search
- ✅ **Row-Level Security (RLS)** policies for multi-tenant isolation
- ✅ **8 Edge Functions** for secure server-side operations
- ✅ **Audit logging** for compliance and debugging

---

## Step 1: Create Supabase Account & Project (5 minutes)

### 1.1 Sign Up

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign in with GitHub (recommended) or email

### 1.2 Create Organization (if first time)

1. You'll be prompted to create an organization
2. Name it whatever you like (e.g., "My Company" or your name)
3. Choose the **Free plan** (perfect for development and small production)

### 1.3 Create New Project

1. Click **"New Project"**
2. Fill in the details:
   ```
   Project Name: buildmybot
   Database Password: [Generate strong password - SAVE THIS!]
   Region: [Choose closest to your users]
   Pricing Plan: Free (you can upgrade later)
   ```
3. Click **"Create new project"**
4. **Wait 2-3 minutes** for project to be created ☕

### 1.4 Save Your Credentials

Once the project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"API"** in the left menu
3. You'll see:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
4. **KEEP THIS TAB OPEN** - you'll need these values soon!

---

## Step 2: Install & Configure Supabase CLI (5 minutes)

### 2.1 Install Supabase CLI

Open your terminal in the BuildMyBot.App directory:

```bash
# Install Supabase CLI globally
npm install -g supabase

# Verify installation
supabase --version
# Should show: supabase 1.x.x
```

**Troubleshooting:**
- If `supabase` command not found, try: `npx supabase` instead
- On Windows, you may need to restart your terminal

### 2.2 Login to Supabase

```bash
supabase login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Return a success message

**If browser doesn't open:**
- Copy the URL from terminal and paste into browser manually
- Complete authorization
- Return to terminal

### 2.3 Link Your Project

You'll need your **Project Reference ID**:

1. Go to your Supabase project dashboard
2. Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
3. Copy `YOUR_PROJECT_REF` (it's a short string like `abcdefghijkl`)

Now link it:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Enter your database password when prompted (the one you saved earlier).

You should see: ✅ **"Finished supabase link."**

---

## Step 3: Review Migration Files (2 minutes)

Let's see what will be created:

```bash
# View migration files
ls -la supabase/migrations/

# You should see:
# - 20250109000000_initial_schema.sql (main database schema)
# - 20250204000000_add_phone_call_metadata.sql (phone features)
# - 20251216_create_audit_logs.sql (audit logging)
```

**What these migrations create:**

### Initial Schema (596 lines)
- **profiles** - User accounts with roles (OWNER, ADMIN, RESELLER)
- **bots** - AI chatbot configurations
- **leads** - Captured leads with scoring (0-100)
- **conversations** - Chat message history
- **knowledge_base** - RAG embeddings with pgvector
- **reseller_accounts** - Reseller/partner management
- **reseller_clients** - Client tracking for resellers
- **commissions** - Commission calculations
- **billing_accounts** - Stripe integration
- **usage_events** - Track API usage, messages, etc.
- **marketing_content** - Generated marketing content
- **website_pages** - Website builder pages
- **phone_calls** - Phone agent call logs

### Additional Migrations
- Phone call metadata enhancements
- Audit logging system

**All tables include:**
- ✅ Row-Level Security (RLS) policies
- ✅ Proper indexes for performance
- ✅ Foreign key relationships
- ✅ Timestamps (created_at, updated_at)

---

## Step 4: Apply Migrations to Database (3 minutes)

### 4.1 Push Migrations

```bash
supabase db push
```

This will:
1. Connect to your remote Supabase database
2. Read all migration files in `supabase/migrations/`
3. Execute them in order
4. Create all tables, policies, functions, etc.

**You should see:**
```
Applying migration 20250109000000_initial_schema.sql...
Applying migration 20250204000000_add_phone_call_metadata.sql...
Applying migration 20251216_create_audit_logs.sql...
Finished supabase db push.
```

### 4.2 Verify in Dashboard

1. Go to your Supabase dashboard
2. Click **"Table Editor"** in sidebar
3. You should see all your tables:
   - profiles
   - bots
   - leads
   - conversations
   - knowledge_base
   - etc.

**If you see tables, SUCCESS!** 🎉

### 4.3 Check pgvector Extension

1. In dashboard, go to **"Database"** → **"Extensions"**
2. Search for `vector`
3. Should show as **Enabled**

---

## Step 5: Deploy Edge Functions (8-10 minutes)

Edge Functions run server-side code securely without exposing API keys.

### 5.1 Review Your Edge Functions

```bash
ls -la supabase/functions/

# You should see 8 functions:
# - ai-complete (AI proxy with usage tracking)
# - create-lead (Lead capture with validation)
# - embed-knowledge-base (Generate RAG embeddings)
# - billing-overage-check (Enforce plan limits)
# - marketplace-install-template (Bot template installation)
# - reseller-track-referral (Referral attribution)
# - scrape-url (URL content extraction)
# - twilio-call-webhook (Phone call handling)
```

### 5.2 Deploy All Functions

Deploy them one by one:

```bash
# 1. AI completion proxy
supabase functions deploy ai-complete

# 2. Lead capture
supabase functions deploy create-lead

# 3. Knowledge base embeddings
supabase functions deploy embed-knowledge-base

# 4. Billing checks
supabase functions deploy billing-overage-check

# 5. Marketplace templates
supabase functions deploy marketplace-install-template

# 6. Reseller tracking
supabase functions deploy reseller-track-referral

# 7. URL scraping
supabase functions deploy scrape-url

# 8. Twilio webhooks
supabase functions deploy twilio-call-webhook
```

**Each deployment will show:**
```
Bundling function...
Deploying function...
Deployed function ai-complete with version xxx
```

**Shortcut to deploy all at once:**
```bash
# Deploy all functions in one command
for func in ai-complete create-lead embed-knowledge-base billing-overage-check marketplace-install-template reseller-track-referral scrape-url twilio-call-webhook; do
  supabase functions deploy $func
done
```

### 5.3 Verify Deployments

1. Go to **"Edge Functions"** in Supabase dashboard
2. You should see all 8 functions listed
3. Each should show a green "deployed" status

---

## Step 6: Configure Secrets (2 minutes)

Edge Functions need your OpenAI API key:

```bash
# Set OpenAI API key for edge functions
supabase secrets set OPENAI_API_KEY=sk-proj-your-actual-key-here
```

**Get your OpenAI key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-`)
5. Use it in the command above

**Verify secrets:**
```bash
supabase secrets list

# Should show:
# OPENAI_API_KEY: ****** (hidden)
```

---

## Step 7: Update Your .env File (2 minutes)

Now copy your Supabase credentials to your local `.env` file:

1. Open `.env` in your editor
2. Go to your Supabase dashboard → Settings → API
3. Copy these values:

```bash
# Update these in your .env file:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-actual-key...
```

4. Save the file

---

## Step 8: Verify Everything Works (3 minutes)

### 8.1 Test Database Connection

Create a simple test in your terminal:

```bash
# Start Node REPL
node

# Test connection (paste this code):
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'your-anon-key'
);

// Test query
supabase.from('profiles').select('count').then(console.log);

// Should show: { data: null, count: 0, error: null }
// (0 because no profiles exist yet)
```

Press `Ctrl+D` to exit Node REPL.

### 8.2 Test Edge Function

```bash
# Test the AI completion function
curl -i --location --request POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/ai-complete' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Hello"}]}'
```

Should return a response from OpenAI (or error if no credits).

### 8.3 Start Your App

```bash
npm run dev
```

Visit **http://localhost:3000** - your app should now:
- ✅ Connect to Supabase
- ✅ Show landing page
- ✅ Allow sign-ups (creates profile in database)
- ✅ Save data to your database

---

## ✅ Setup Complete!

You now have:
- ✅ Supabase project created
- ✅ Database schema applied (11 tables)
- ✅ pgvector extension enabled
- ✅ RLS policies active
- ✅ 8 Edge Functions deployed
- ✅ Secrets configured
- ✅ Local environment connected

---

## 🔍 Verify Your Setup

### Check Tables in Dashboard

1. Go to **Table Editor** in Supabase
2. Click through each table
3. Should see proper columns and structure

### Check RLS Policies

1. Go to **Authentication** → **Policies**
2. Each table should have policies listed
3. This ensures data security

### Check Edge Functions

1. Go to **Edge Functions**
2. All 8 functions should show "Deployed"
3. Click any function to see logs

---

## 🚨 Troubleshooting

### "Invalid project ref"
- Double-check project reference ID
- Make sure you're logged into correct account
- Try `supabase logout` then `supabase login` again

### "Permission denied" during db push
- Check database password is correct
- Verify you have admin access to project
- Try unlinking and relinking: `supabase unlink` then `supabase link`

### Edge function deployment fails
- Check you're in the project root directory
- Verify function folder exists: `ls supabase/functions/`
- Try deploying one function at a time

### "pgvector extension not available"
- This means your Supabase version is old
- Enable it manually: Dashboard → Database → Extensions → Search "vector" → Enable
- Or create a new project (pgvector is enabled by default now)

### OpenAI API errors in edge functions
- Verify secret is set: `supabase secrets list`
- Check API key has credits: https://platform.openai.com/usage
- Re-set secret: `supabase secrets set OPENAI_API_KEY=sk-proj-...`

---

## 🎉 Next Steps

1. **Test Your App**: Run `npm run dev` and test features
2. **Create Test Account**: Sign up to see profile creation
3. **Create Test Bot**: Build a bot to test database writes
4. **Deploy to Production**: Follow DEPLOY_IMMEDIATELY.md

---

## 📚 Useful Commands

```bash
# View database status
supabase db status

# View edge function logs
supabase functions logs ai-complete

# View secrets
supabase secrets list

# Reset database (⚠️ deletes all data!)
supabase db reset

# Generate TypeScript types from schema
supabase gen types typescript --local > types/supabase.ts
```

---

## 💡 Pro Tips

1. **Use Supabase Studio**: Your dashboard is powerful - explore it!
2. **Check Logs**: Edge Functions → Logs shows all function calls
3. **Monitor Usage**: Settings → Usage shows your plan limits
4. **Backup Database**: Settings → Database → Backups (automatic on paid plans)
5. **Generate Types**: Run `supabase gen types typescript` to get TypeScript types for your database

---

**🎊 Congratulations! Your Supabase backend is fully set up!**

Return to the main terminal and continue with development or deployment.
