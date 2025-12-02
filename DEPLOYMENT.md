# BuildMyBot.app Deployment Guide

This guide covers deploying BuildMyBot to production environments including Supabase backend, frontend hosting, and environment configuration.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Backend Deployment](#supabase-backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- **Supabase Account** - [Sign up at supabase.com](https://supabase.com)
- **OpenAI API Key** - [Get from platform.openai.com](https://platform.openai.com)
- **Stripe Account** (Optional) - For payment processing
- **Twilio Account** (Optional) - For phone agent features
- **Sentry Account** (Optional) - For error tracking
- **Node.js 18+** and **npm** installed locally
- **Supabase CLI** installed - `npm install -g supabase`

---

## Supabase Backend Deployment

### Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in project details:
   - **Project Name**: BuildMyBot Production
   - **Database Password**: Use a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project provisioning (2-3 minutes)

### Step 2: Set Up Database Schema

```bash
# Navigate to project root
cd /path/to/BuildMyBot.App

# Login to Supabase CLI
supabase login

# Link your project (get Project ID from Supabase Dashboard > Settings > General)
supabase link --project-ref YOUR_PROJECT_ID

# Push database migrations
supabase db push

# This will create all tables, RLS policies, and functions
```

**Alternative: Manual SQL Execution**

If CLI doesn't work, manually run the SQL:

1. Go to Supabase Dashboard > SQL Editor
2. Open `supabase/migrations/20240101000000_initial_schema.sql`
3. Copy and paste the entire SQL
4. Click **Run**

### Step 3: Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy ai-complete
supabase functions deploy create-lead
supabase functions deploy embed-knowledge-base
supabase functions deploy billing-overage-check
supabase functions deploy marketplace-install-template
supabase functions deploy reseller-track-referral
supabase functions deploy phone-webhook
supabase functions deploy stripe-webhook

# Set environment secrets for Edge Functions
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here
supabase secrets set STRIPE_SECRET_KEY=sk_live_your-stripe-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
supabase secrets set TWILIO_ACCOUNT_SID=your-twilio-sid
supabase secrets set TWILIO_AUTH_TOKEN=your-twilio-token
```

### Step 4: Enable Required Extensions

In Supabase Dashboard > Database > Extensions, enable:

- `vector` (for pgvector embeddings)
- `pg_cron` (for scheduled jobs)
- `http` (for external API calls)

### Step 5: Configure Storage Buckets

1. Go to Storage > Create Bucket
2. Create these buckets:
   - `knowledge-base-files` (Private)
   - `bot-assets` (Public)
   - `profile-avatars` (Public)

### Step 6: Set Up Authentication

1. Go to Authentication > Providers
2. Enable **Email** provider
3. Configure **Password Recovery** and **Email Confirmation**
4. Add production URL to **Redirect URLs**: `https://yourdomain.com/**`

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

#### Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure environment variables in Vercel Dashboard
```

#### Deploy via GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) > Import Project
3. Connect your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables (see below)
6. Click **Deploy**

#### Vercel Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-your-openai-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_ENVIRONMENT=production
VITE_APP_URL=https://yourdomain.com
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
# ... add other env vars
```

#### netlify.toml Configuration

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### Option 3: Cloudflare Pages

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
npx wrangler pages deploy dist --project-name=buildmybot
```

### Option 4: Docker (Self-Hosted)

```bash
# Build Docker image
docker build -t buildmybot:latest .

# Run container
docker run -d \
  -p 80:80 \
  -e VITE_SUPABASE_URL="https://your-project.supabase.co" \
  -e VITE_SUPABASE_ANON_KEY="your-anon-key" \
  --name buildmybot \
  buildmybot:latest
```

---

## Environment Configuration

### Production .env File

Create a `.env.production` file:

```env
# ========================================
# SUPABASE (Required)
# ========================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# ========================================
# OPENAI (Required)
# ========================================
VITE_OPENAI_API_KEY=sk-your-openai-key-here

# For edge functions (set via supabase secrets)
# OPENAI_API_KEY=sk-your-openai-key-here

# ========================================
# STRIPE (Production Keys)
# ========================================
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# ========================================
# TWILIO (For phone agent)
# ========================================
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ========================================
# SENTRY (Error tracking)
# ========================================
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_ENVIRONMENT=production

# ========================================
# APP CONFIG
# ========================================
VITE_APP_NAME=BuildMyBot
VITE_APP_URL=https://buildmybot.app
VITE_SUPPORT_EMAIL=support@buildmybot.app
VITE_APP_VERSION=1.0.0
```

### Getting Your Supabase Keys

1. Go to Supabase Dashboard > Settings > API
2. Copy:
   - **Project URL** ’ `VITE_SUPABASE_URL`
   - **anon/public key** ’ `VITE_SUPABASE_ANON_KEY`
   - **service_role key** ’ Use for Edge Functions only (never expose to frontend!)

### Stripe Webhook Configuration

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click **Add Endpoint**
3. Set **Endpoint URL**: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy **Signing Secret** ’ `STRIPE_WEBHOOK_SECRET`

---

## Post-Deployment Verification

### 1. Database Verification

```sql
-- Connect to Supabase SQL Editor and run:

-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Test pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 2. Edge Functions Health Check

Test each endpoint:

```bash
# Test ai-complete
curl -X POST https://your-project.supabase.co/functions/v1/ai-complete \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"botId":"test","message":"Hello"}'

# Test create-lead
curl -X POST https://your-project.supabase.co/functions/v1/create-lead \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"botId":"test","name":"Test Lead","email":"test@example.com"}'
```

### 3. Frontend Smoke Test

1. Visit your deployed URL
2. Test key user flows:
   - Sign up / Log in
   - Create a bot
   - Test chat interface
   - Create a lead
   - Check CRM dashboard
   - Test marketplace templates

### 4. Authentication Test

```bash
# Test signup
curl -X POST https://your-project.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

---

## Monitoring & Maintenance

### Sentry Error Tracking

1. Create project at [sentry.io](https://sentry.io)
2. Get DSN from Project Settings
3. Add to environment variables
4. Monitor errors in Sentry Dashboard

### Supabase Monitoring

1. **Database**: Dashboard > Database > Usage
   - Monitor connection pool
   - Check disk usage
   - Review slow queries

2. **Edge Functions**: Dashboard > Edge Functions
   - Monitor invocation count
   - Check error rates
   - Review execution times

3. **Auth**: Dashboard > Authentication > Users
   - Track user growth
   - Monitor failed login attempts

### Performance Monitoring

**Frontend (Vercel)**:
- Vercel Dashboard > Analytics
- Monitor Core Web Vitals
- Check bandwidth usage

**Lighthouse Scores**:
```bash
npm install -g lighthouse
lighthouse https://yourdomain.com --view
```

**Target Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

### Backup Strategy

**Automatic Supabase Backups**:
- Daily backups retained for 7 days (Free/Pro)
- Point-in-time recovery available (Pro/Enterprise)

**Manual Backup**:
```bash
# Export database
supabase db dump > backup-$(date +%Y%m%d).sql

# Restore from backup
psql -h your-db-host -U postgres -d postgres < backup-20241202.sql
```

---

## Troubleshooting

### Common Issues

#### 1. "Failed to fetch" errors

**Problem**: CORS or network issues

**Solution**:
```bash
# Check Supabase URL is correct
echo $VITE_SUPABASE_URL

# Verify anon key
echo $VITE_SUPABASE_ANON_KEY

# Ensure URL is added to allowed origins in Supabase Dashboard
```

#### 2. Edge Functions returning 500

**Problem**: Missing environment secrets

**Solution**:
```bash
# List secrets
supabase secrets list

# Set missing secrets
supabase secrets set OPENAI_API_KEY=your-key
```

#### 3. RLS blocking queries

**Problem**: Row-Level Security denying access

**Solution**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'bots';

-- Temporarily disable RLS for debugging (NOT for production!)
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
```

#### 4. Build failures

**Problem**: Environment variables not set

**Solution**:
```bash
# Check all required env vars are set
npm run build

# If missing vars, add them to your hosting platform
```

#### 5. Stripe webhook not working

**Problem**: Webhook signature verification failing

**Solution**:
- Use Stripe CLI to test locally: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
- Verify webhook secret matches
- Check Edge Function logs in Supabase Dashboard

### Debug Mode

Enable verbose logging:

```env
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### Getting Help

- **Documentation**: `/docs` folder in repository
- **Issues**: GitHub Issues
- **Email**: support@buildmybot.app
- **Supabase Support**: [Supabase Discord](https://discord.supabase.com)

---

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Edge Functions deployed and tested
- [ ] Stripe webhooks configured
- [ ] Sentry error tracking enabled
- [ ] SSL/TLS certificate active (auto with Vercel/Netlify)
- [ ] Custom domain configured
- [ ] robots.txt and sitemap.xml deployed
- [ ] Analytics/monitoring set up
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] GDPR/Privacy policy published
- [ ] Terms of Service published
- [ ] Support email configured
- [ ] Load testing completed

---

## Rollback Procedure

If deployment fails:

### Frontend Rollback

**Vercel**:
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

**Netlify**:
- Dashboard > Deploys > Click previous deploy > **Publish deploy**

### Database Rollback

```bash
# Restore from backup
supabase db reset

# Or restore specific backup
psql -h your-db-host -U postgres -d postgres < backup.sql
```

---

## Scaling Considerations

### Database Scaling

- **Free Tier**: 500MB, 2 GB transfer
- **Pro Tier**: 8GB, 50 GB transfer
- **Enterprise**: Custom limits

Monitor and upgrade as needed.

### Edge Function Scaling

- Auto-scales with demand
- Monitor invocation count
- Optimize function execution time
- Consider caching strategies

### CDN & Caching

Vercel/Netlify provide automatic CDN. For custom setups:

- Use Cloudflare for CDN
- Enable caching headers
- Optimize images and assets

---

## Security Best Practices

1. **Never commit secrets** - Use `.env` files (gitignored)
2. **Rotate keys regularly** - Especially API keys
3. **Enable RLS** - All tables must have RLS enabled
4. **Use HTTPS only** - Enforce SSL/TLS
5. **Set up rate limiting** - Prevent abuse
6. **Monitor logs** - Watch for suspicious activity
7. **Keep dependencies updated** - Run `npm audit` regularly
8. **Enable 2FA** - On all accounts (Supabase, Vercel, etc.)

---

## Support & Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review error logs in Sentry
- **Monthly**: Check Supabase usage and costs
- **Quarterly**: Update dependencies (`npm update`)
- **Annually**: Rotate API keys and secrets

### Monitoring Alerts

Set up alerts for:
- Error rate > 5%
- Response time > 3s
- Database CPU > 80%
- Disk usage > 80%
- Edge Function failures

---

**Deployment Complete!** =€

Your BuildMyBot platform is now live and ready to serve users.
