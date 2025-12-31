# Environment Variables Setup Guide

## Overview

BuildMyBot uses Next.js which requires specific naming conventions for environment variables:

- **`NEXT_PUBLIC_*`** - Client-side variables (accessible in browser)
- **No prefix** - Server-side only variables (API keys, secrets)

## Required Variables

### 1. Create `.env.local` file

Copy the example file:

```bash
cp .env.example .env.local
```

### 2. Configure Required Variables

Edit `.env.local` and set these values:

```bash
# ============================================
# SUPABASE (Required)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# OPENAI (Required for AI features)
# ============================================
# Server-side only - NOT exposed to browser
OPENAI_API_KEY=sk-proj-...
```

**Where to get these values:**

1. **Supabase URL & Anon Key**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Click "Settings" → "API"
   - Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **OpenAI API Key**:
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new secret key
   - Copy → `OPENAI_API_KEY`

### 3. Optional Variables

```bash
# ============================================
# SENTRY ERROR TRACKING (Optional)
# ============================================
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# ============================================
# POSTHOG ANALYTICS (Optional)
# ============================================
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ============================================
# STRIPE (Optional - for billing)
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deployment Configuration

### Vercel Deployment

**Option 1: Via Vercel Dashboard (Recommended)**

1. Go to your project in [Vercel Dashboard](https://vercel.com)
2. Settings → Environment Variables
3. Add each variable:
   - `NEXT_PUBLIC_SUPABASE_URL` → Value from Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Value from Supabase
   - `OPENAI_API_KEY` → Value from OpenAI
   - etc.
4. Select environment: Production, Preview, Development
5. Click "Save"

**Option 2: Via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add OPENAI_API_KEY
```

### GitHub Actions (CI/CD)

Add these secrets to your GitHub repository:

1. Go to your repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SENTRY_DSN` (optional)
   - `NEXT_PUBLIC_POSTHOG_KEY` (optional)

### Google Cloud Run

Set environment variables during deployment:

```bash
gcloud run deploy buildmybot \
  --image=gcr.io/PROJECT_ID/buildmybot:latest \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=https://...,NEXT_PUBLIC_SUPABASE_ANON_KEY=...,OPENAI_API_KEY=..."
```

### Docker

Pass environment variables via `-e` flag:

```bash
docker run -p 80:80 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e OPENAI_API_KEY=... \
  buildmybot
```

Or use `.env` file:

```bash
docker run -p 80:80 --env-file .env.local buildmybot
```

## Supabase Edge Function Secrets

For voice agent and other edge functions, set secrets via Supabase CLI:

```bash
# Required for voice agent
supabase secrets set CARTESIA_API_KEY=your_key
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=+15551234567
supabase secrets set OPENAI_API_KEY=sk-...

# Optional but recommended
supabase secrets set DEEPGRAM_API_KEY=your_key

# Verify secrets are set
supabase secrets list
```

## Common Issues & Solutions

### Issue: "Environment variable VITE_SUPABASE_URL not found"

**Solution**: The app was migrated from Vite to Next.js. Update all references:

- ❌ `VITE_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`

### Issue: "Supabase client failed to initialize"

**Checklist**:
1. ✅ Verify `.env.local` exists
2. ✅ Check variable names use `NEXT_PUBLIC_` prefix
3. ✅ Restart dev server: `npm run dev`
4. ✅ Clear Next.js cache: `rm -rf .next`

### Issue: "API key exposed in browser"

**Important**: Only `NEXT_PUBLIC_*` variables are exposed to the browser.

- ✅ Safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ❌ Never use `NEXT_PUBLIC_` for: `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`

### Issue: Vercel deployment fails with "Missing environment variables"

**Solution**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add all required `NEXT_PUBLIC_*` variables
3. Redeploy

## Validation

Run this command to verify your setup:

```bash
# Check local environment
npm run dev

# You should see in terminal:
# ✓ NEXT_PUBLIC_SUPABASE_URL is set
# ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is set
```

For edge functions:

```bash
# Validate Supabase secrets
supabase secrets list

# Should show:
# CARTESIA_API_KEY ✓
# TWILIO_ACCOUNT_SID ✓
# TWILIO_AUTH_TOKEN ✓
# OPENAI_API_KEY ✓
```

## Security Best Practices

### ✅ DO:
- Use `NEXT_PUBLIC_` for client-side variables only
- Keep server-side keys without prefix
- Use `.env.local` for local development (git-ignored)
- Use hosting platform's secret management for production
- Rotate API keys periodically
- Use different keys for development and production

### ❌ DON'T:
- Commit `.env.local` to git
- Use `NEXT_PUBLIC_` prefix for secret API keys
- Share environment variables in public forums
- Use production keys in development
- Hardcode API keys in source code

## Migration from Vite

If you have old `VITE_*` environment variables, update them:

```bash
# Old (Vite)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_OPENAI_API_KEY=...

# New (Next.js)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...  # Server-side only!
```

**Important**: `OPENAI_API_KEY` should NOT have `NEXT_PUBLIC_` prefix as it's server-side only.

## Quick Reference

| Variable | Prefix | Exposed to Browser | Where Used |
|----------|--------|-------------------|------------|
| Supabase URL | `NEXT_PUBLIC_` | ✅ Yes | Client & Server |
| Supabase Anon Key | `NEXT_PUBLIC_` | ✅ Yes | Client & Server |
| OpenAI API Key | None | ❌ No | Server only |
| Stripe Publishable | `NEXT_PUBLIC_` | ✅ Yes | Client |
| Stripe Secret | None | ❌ No | Server only |
| Sentry DSN | `NEXT_PUBLIC_` | ✅ Yes | Client |
| PostHog Key | `NEXT_PUBLIC_` | ✅ Yes | Client |

---

**Need Help?** Check [Next.js Environment Variables Docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
