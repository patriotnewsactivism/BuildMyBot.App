# BuildMyBot.app - Deployment Guide

Complete guide for deploying BuildMyBot.app to production.

## Prerequisites

- Node.js 18+ installed
- Supabase account (https://supabase.com)
- Vercel account (https://vercel.com) or similar hosting
- Stripe account (https://stripe.com)
- OpenAI API key (https://platform.openai.com)

---

## 1. Local Development Setup

### Step 1.1: Clone and Install Dependencies

```bash
git clone https://github.com/your-org/buildmybot.git
cd buildmybot
npm install
```

### Step 1.2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API Key (CRITICAL: Server-side only)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Application Settings
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags (optional)
FEATURE_PHONE_AGENT=true
FEATURE_WEBSITE_BUILDER=true
FEATURE_MARKETPLACE=true
FEATURE_RESELLER_PROGRAM=true
FEATURE_WHITE_LABEL=true
```

### Step 1.3: Set Up Supabase Database

#### Install Supabase CLI

```bash
npm install -g supabase
```

#### Initialize Supabase

```bash
supabase init
supabase login
supabase link --project-ref your-project-ref
```

#### Run Migrations

```bash
supabase db push
```

This will apply all migrations:
- `20240101000000_initial_schema.sql` - Core database schema
- `20240101000001_rls_policies.sql` - Row-Level Security
- `20240101000002_vector_search_function.sql` - RAG search
- `20240101000003_fix_critical_security.sql` - Security patches

#### Verify Database

```bash
supabase db diff
```

Should show: "No schema changes detected"

### Step 1.4: Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy ai-complete
supabase functions deploy create-lead
supabase functions deploy embed-knowledge-base
supabase functions deploy billing-overage-check
supabase functions deploy marketplace-install-template
supabase functions deploy reseller-track-referral
```

Set secrets for Edge Functions:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Step 1.5: Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## 2. Stripe Integration Setup

### Step 2.1: Create Products and Prices

In Stripe Dashboard (https://dashboard.stripe.com):

1. **Create Products:**
   - Starter Plan - $29/month
   - Professional Plan - $99/month
   - Executive Plan - $199/month
   - Enterprise Plan - $399/month

2. **Note Price IDs** for each plan (e.g., `price_1A2B3C4D5E6F7G8H`)

3. **Update Webhook Handler:**

Edit `app/api/webhooks/stripe/route.ts` and update the `planMapping`:

```typescript
const planMapping: Record<string, string> = {
  'price_1A2B3C4D5E6F7G8H': 'STARTER',
  'price_2B3C4D5E6F7G8H9I': 'PROFESSIONAL',
  'price_3C4D5E6F7G8H9I0J': 'EXECUTIVE',
  'price_4D5E6F7G8H9I0J1K': 'ENTERPRISE',
};
```

### Step 2.2: Configure Webhook Endpoint

In Stripe Dashboard > Webhooks:

1. **Add Endpoint:** `https://your-domain.com/api/webhooks/stripe`

2. **Select Events:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`

3. **Copy Webhook Secret** and add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 2.3: Test Webhook Locally

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger customer.subscription.created
```

---

## 3. Supabase Configuration

### Step 3.1: Enable pgvector Extension

In Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 3.2: Configure Auth Settings

In Supabase Dashboard > Authentication:

1. **Enable Email Provider**
2. **Set Site URL:** `https://your-domain.com`
3. **Add Redirect URLs:**
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback`

4. **Email Templates:** Customize welcome email, password reset, etc.

### Step 3.3: Configure Storage (Optional)

For avatar uploads:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 3.4: Seed Initial Data

Run the seeding script (see section 5):

```bash
psql postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres -f supabase/seed.sql
```

---

## 4. Production Deployment (Vercel)

### Step 4.1: Connect to Vercel

```bash
npm install -g vercel
vercel login
vercel link
```

### Step 4.2: Configure Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
```

**CRITICAL:** Mark these as secret:
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Step 4.3: Deploy

```bash
vercel --prod
```

### Step 4.4: Update Stripe Webhook

After deployment, update your Stripe webhook endpoint to:

```
https://your-production-domain.com/api/webhooks/stripe
```

---

## 5. Database Seeding

Create initial data for testing and production.

### Step 5.1: Create Seed File

Create `supabase/seed.sql`:

```sql
-- Seed Plans
INSERT INTO plans (id, name, price_monthly, price_yearly, max_bots, max_conversations, features, is_active)
VALUES
  (gen_random_uuid(), 'FREE', 0, 0, 1, 60, '["1 bot", "60 conversations/month", "Basic analytics", "Community support"]', true),
  (gen_random_uuid(), 'STARTER', 29, 290, 1, 750, '["1 bot", "750 conversations/month", "GPT-4o Mini", "Email support"]', true),
  (gen_random_uuid(), 'PROFESSIONAL', 99, 990, 5, 5000, '["5 bots", "5,000 conversations/month", "Advanced analytics", "API access", "Priority support"]', true),
  (gen_random_uuid(), 'EXECUTIVE', 199, 1990, 10, 15000, '["10 bots", "15,000 conversations/month", "Custom integrations", "Team collaboration"]', true),
  (gen_random_uuid(), 'ENTERPRISE', 399, 3990, 9999, 50000, '["Unlimited bots", "50,000 conversations/month", "White-labeling", "SLA & Priority Support"]', true);

-- Seed Templates
INSERT INTO templates (id, name, description, category, system_prompt, model, temperature, is_featured)
VALUES
  (gen_random_uuid(), 'Customer Support Bot', 'Handle customer inquiries with empathy and efficiency', 'Customer Support', 'You are a helpful customer support assistant. Provide clear, friendly, and accurate information to help customers resolve their issues.', 'gpt-4o-mini', 0.7, true),
  (gen_random_uuid(), 'Sales Assistant', 'Qualify leads and schedule demos', 'Sales', 'You are a sales assistant. Help qualify leads by asking about their needs, budget, and timeline. Schedule demos when appropriate.', 'gpt-4o-mini', 0.8, true),
  (gen_random_uuid(), 'Real Estate Agent', 'Help clients find their dream property', 'Real Estate', 'You are a knowledgeable real estate agent. Help clients find properties that match their criteria, schedule viewings, and answer questions about the buying process.', 'gpt-4o-mini', 0.7, true),
  (gen_random_uuid(), 'Recruitment Bot', 'Screen candidates and schedule interviews', 'Recruitment', 'You are a professional recruiter. Screen candidates by asking about their experience, skills, and career goals. Schedule interviews with qualified candidates.', 'gpt-4o-mini', 0.6, true),
  (gen_random_uuid(), 'City Services Assistant', 'Help residents access city services', 'Government', 'You are a city services assistant. Help residents find information about permits, utilities, events, and city regulations. Be clear and official in your communication.', 'gpt-4o-mini', 0.5, true);

-- Create Admin User (Update email/password as needed)
-- First create auth user via Supabase dashboard, then:
-- UPDATE profiles SET role = 'ADMIN' WHERE email = 'admin@buildmybot.app';
```

### Step 5.2: Run Seed Script

```bash
psql postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres -f supabase/seed.sql
```

---

## 6. Monitoring & Logging

### Step 6.1: Set Up Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Update `.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-token
```

### Step 6.2: Monitor Supabase

In Supabase Dashboard:

1. **Database > Query Performance**
   - Monitor slow queries
   - Check index usage

2. **Logs**
   - Edge Function execution logs
   - Database query logs

3. **Usage**
   - API requests
   - Database size
   - Bandwidth

### Step 6.3: Set Up Alerts

Configure alerts for:
- High error rate (>5% in 5 minutes)
- Database CPU >80%
- Failed payments
- Unusual API usage spikes

---

## 7. Security Checklist

Before production deployment:

### Application Security
- [ ] All environment variables configured
- [ ] HTTPS enforced
- [ ] CORS origins validated
- [ ] Rate limiting active
- [ ] Input validation on all forms
- [ ] RLS policies tested with multiple users

### Database Security
- [ ] Service role key never exposed client-side
- [ ] All migrations applied
- [ ] RLS enabled on all tables
- [ ] Sensitive data encrypted
- [ ] Regular backups configured

### API Security
- [ ] Stripe webhook signature verification working
- [ ] OpenAI API key server-side only
- [ ] Authentication required on all protected routes
- [ ] Plan limits enforced
- [ ] Security events logging active

### Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR data export capability
- [ ] Cookie consent implemented
- [ ] Data retention policy documented

---

## 8. Performance Optimization

### Step 8.1: Enable Caching

In `next.config.cjs`:

```javascript
module.exports = {
  // ... existing config
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=10, stale-while-revalidate=59' }
      ],
    },
  ],
};
```

### Step 8.2: Optimize Database

```sql
-- Analyze tables for query planner
ANALYZE bots;
ANALYZE conversations;
ANALYZE knowledge_base;
ANALYZE leads;

-- Vacuum to reclaim storage
VACUUM ANALYZE;
```

### Step 8.3: CDN Configuration

In Vercel:
- Enable Edge Network
- Configure caching rules
- Enable Image Optimization

---

## 9. Testing in Production

### Step 9.1: Smoke Tests

After deployment, verify:

1. **Authentication:**
   ```bash
   curl -X POST https://your-domain.com/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

2. **Bot Creation:**
   - Create account
   - Create bot
   - Test chat interface

3. **Billing:**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Verify subscription creates
   - Confirm webhook fires

4. **Plan Limits:**
   - Create FREE account
   - Try to create 2nd bot (should fail)
   - Upgrade to STARTER
   - Verify 2nd bot now allowed

### Step 9.2: Load Testing

Use k6 or Apache Bench:

```bash
# Install k6
brew install k6

# Run load test
k6 run load-test.js
```

---

## 10. Rollback Procedure

If issues occur after deployment:

### Quick Rollback (Vercel)

```bash
vercel rollback
```

### Database Rollback

```bash
# List migrations
supabase migration list

# Rollback specific migration
supabase db reset --db-url postgresql://...
```

### Restore from Backup

```bash
# Download backup
supabase db dump > backup.sql

# Restore
psql postgresql://... < backup.sql
```

---

## 11. Post-Deployment Tasks

### Week 1
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Review security events log
- [ ] Test all critical user flows
- [ ] Collect user feedback

### Week 2
- [ ] Analyze usage patterns
- [ ] Optimize slow queries
- [ ] Review and adjust rate limits
- [ ] Update documentation based on issues

### Month 1
- [ ] Security audit
- [ ] Performance review
- [ ] Cost optimization
- [ ] Feature roadmap planning

---

## 12. Support & Troubleshooting

### Common Issues

**Issue:** "Missing authorization header"
- **Fix:** Ensure Supabase client is initialized with session token

**Issue:** "Bot not found or access denied"
- **Fix:** Verify RLS policies allow user to access bot

**Issue:** "Plan limit reached"
- **Fix:** Check `billing_accounts` table for correct plan

**Issue:** Stripe webhook not firing
- **Fix:** Verify webhook URL is accessible and secret is correct

### Getting Help

1. Check Supabase logs
2. Review security_events table
3. Check Sentry error dashboard
4. Review application logs in Vercel

### Useful Commands

```bash
# Check Supabase status
supabase status

# View Edge Function logs
supabase functions logs ai-complete

# Test database connection
psql postgresql://... -c "SELECT 1"

# Clear Next.js cache
rm -rf .next
npm run build
```

---

## Appendix: URLs & Resources

- **Supabase Dashboard:** https://app.supabase.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Stripe Dashboard:** https://dashboard.stripe.com
- **OpenAI Platform:** https://platform.openai.com
- **Sentry:** https://sentry.io

---

**Document Version:** 1.0
**Last Updated:** 2025-11-29
**Maintained By:** Development Team
