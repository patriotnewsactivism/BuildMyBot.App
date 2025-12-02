# BuildMyBot.App - Complete Setup Guide

This guide will walk you through setting up the BuildMyBot application from scratch with live data and fully functional APIs.

## Prerequisites

- Node.js 18+ and npm installed
- A Supabase account (free tier works)
- An OpenAI API key
- Git installed

## Step 1: Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd BuildMyBot.App
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: BuildMyBot
   - **Database Password**: (choose a strong password - save it!)
   - **Region**: Choose closest to your users
4. Wait for the project to be created (~2 minutes)

### 2.2 Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2.3 Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase_schema.sql` from this repo
4. Paste and click "Run"
5. Wait for success message (should take ~10 seconds)
6. Create another new query
7. Copy the entire contents of `supabase_admin_policies.sql`
8. Paste and click "Run"
9. Verify success

### 2.4 Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure settings:
   - ✅ Enable Email provider
   - ✅ Confirm email (optional - can disable for testing)
   - Save

## Step 3: Get OpenAI API Key

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Go to **API Keys** section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)
6. **IMPORTANT**: Save this key - you won't be able to see it again!

## Step 4: Configure Environment Variables

1. In your project root, create a `.env` file:

```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Step 5: Verify Database Setup

1. In Supabase Dashboard, go to **Table Editor**
2. Verify these tables exist:
   - ✅ profiles
   - ✅ bots
   - ✅ leads
   - ✅ conversations
   - ✅ knowledge_base
   - ✅ marketing_content
   - ✅ website_pages
   - ✅ usage_events
   - ✅ billing_accounts
   - ✅ reseller_accounts
   - ✅ templates
   - ✅ phone_calls

3. Click on **templates** table - you should see 8 pre-loaded templates (City Government, Recruitment, Travel, etc.)

## Step 6: Run the Application

```bash
npm run dev
```

The app should open at `http://localhost:5173`

## Step 7: Create Your First Admin Account

1. Click **Sign Up** on the landing page
2. Use one of the master admin emails:
   - `admin@buildmybot.app`
   - `master@buildmybot.app`
   - `ceo@buildmybot.app`
   - OR add your email to the `MASTER_EMAILS` array in `App.tsx` line 35

3. Sign up with that email
4. Check your email for verification (if enabled)
5. Log in - you should have full admin access

## Step 8: Test Everything

### Test 1: Create a Bot
1. Go to **Bot Builder**
2. Click **Create New Bot**
3. Fill in details and save
4. Bot should appear in your list ✅

### Test 2: Test Chat
1. Open your bot
2. Use the Test Chat feature
3. Send a message
4. Should get AI response ✅
5. Check **Chat Logs** - conversation should be saved ✅

### Test 3: Generate a Lead
1. In Test Chat, mention an email address
2. Lead should be auto-captured
3. Check **CRM/Leads** - new lead should appear ✅

### Test 4: Marketing Content
1. Go to **Marketing**
2. Generate an email about any topic
3. Click **Save**
4. Should appear in "Saved Content" below ✅

### Test 5: Analytics
1. Go to **Dashboard**
2. Charts should show your conversation data
3. Stats should reflect real numbers ✅

### Test 6: Usage Tracking
1. Go to **Billing**
2. "Usage This Month" should show your conversation count
3. Progress bar should display correctly ✅

### Test 7: Admin Access
1. Log in as admin
2. Click **Admin** in sidebar
3. Should see platform-wide stats
4. Should see all users in the system ✅

## Step 9: Create a Regular User Account

1. Open an incognito/private window
2. Sign up with a different email
3. This user should only see their own data
4. Verify they cannot access Admin section ✅

## Database Structure Overview

### Key Tables

**profiles**: User accounts with role, plan, and settings
**bots**: AI chatbots with configuration
**conversations**: Chat message history
**leads**: CRM contacts captured from conversations
**marketing_content**: AI-generated marketing copy
**usage_events**: Tracks API usage for billing
**templates**: Marketplace bot templates

### Row Level Security (RLS)

- Users can only see/edit their own data
- Admins can see ALL data across all users
- Public can read templates
- System can create usage events and phone calls

## Troubleshooting

### Issue: "Supabase client failed to initialize"
**Solution**: Check your `.env` file - make sure credentials are correct and file is in project root

### Issue: "No data showing in analytics"
**Solution**: Create some conversations first - the analytics queries need data to display

### Issue: "Templates not loading"
**Solution**: Re-run the `supabase_schema.sql` migration - the templates are seeded automatically

### Issue: "Can't save bots/leads"
**Solution**: Check browser console for errors. Verify Supabase policies are applied by running `supabase_admin_policies.sql`

### Issue: "OpenAI API errors"
**Solution**:
- Verify your API key is correct
- Check you have credits in your OpenAI account
- Visit https://platform.openai.com/account/billing

### Issue: "RLS policy errors"
**Solution**: Make sure both SQL files were run:
1. `supabase_schema.sql` (main schema)
2. `supabase_admin_policies.sql` (admin bypass policies)

## Production Deployment

### Frontend Deployment (Vercel/Netlify)

1. Push your code to GitHub
2. Connect to Vercel or Netlify
3. Add environment variables in deployment settings
4. Deploy!

### Environment Variables for Production

```env
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_OPENAI_API_KEY=your-production-openai-key
```

### Important Security Notes

⚠️ **Never commit your `.env` file to Git**
⚠️ **Use different API keys for development and production**
⚠️ **Enable email confirmation in production**
⚠️ **Set up Supabase RLS policies correctly**

## Master Admin Emails

The following emails automatically get admin access:
- `admin@buildmybot.app`
- `master@buildmybot.app`
- `ceo@buildmybot.app`
- `mreardon@wtpnews.org`
- `ben@texasplanninglaw.com`

To add more, edit `App.tsx` line 35:
```typescript
const MASTER_EMAILS = ['admin@buildmybot.app', 'your-email@example.com'];
```

## Features Checklist

- ✅ Supabase authentication
- ✅ Real-time bot management
- ✅ Live conversation storage
- ✅ CRM/Lead tracking
- ✅ Analytics with real data
- ✅ Marketing content generation
- ✅ Usage tracking
- ✅ Billing enforcement
- ✅ Master admin dashboard
- ✅ Row-level security
- ✅ Multi-tenant architecture
- ✅ Reseller system
- ✅ Template marketplace

## Next Steps

1. **Stripe Integration**: Add payment processing for plan upgrades
2. **Email Notifications**: Set up transactional emails
3. **Advanced Analytics**: Add more detailed reporting
4. **API Webhooks**: Enable integrations with other services
5. **Phone Agent**: Integrate Twilio for voice conversations
6. **White Labeling**: Allow resellers to customize branding

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the code comments in `services/dbService.ts`
- Consult Supabase docs: https://supabase.com/docs
- OpenAI API docs: https://platform.openai.com/docs

---

**Built with**: React + Vite + Supabase + OpenAI GPT-4o Mini

**License**: Proprietary

**Last Updated**: December 2025
