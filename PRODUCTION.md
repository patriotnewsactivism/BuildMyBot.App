# BuildMyBot Production Configuration Guide

This document provides detailed instructions for configuring BuildMyBot for production deployment, including environment setup, security hardening, and optimization.

---

## Table of Contents

1. [Production Environment Setup](#production-environment-setup)
2. [Stripe Configuration](#stripe-configuration)
3. [Security Configuration](#security-configuration)
4. [Performance Optimization](#performance-optimization)
5. [Logging & Monitoring](#logging--monitoring)
6. [Production Checklist](#production-checklist)

---

## Production Environment Setup

### Environment Variables Configuration

Create a `.env.production` file with production values:

```env
# ========================================
# SUPABASE PRODUCTION
# ========================================
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ========================================
# OPENAI PRODUCTION
# ========================================
VITE_OPENAI_API_KEY=sk-proj-...your-production-key...

# ========================================
# STRIPE PRODUCTION KEYS
# ========================================
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51...
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# ========================================
# TWILIO PRODUCTION
# ========================================
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# ========================================
# SENTRY PRODUCTION
# ========================================
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_ENVIRONMENT=production

# ========================================
# APP CONFIGURATION
# ========================================
VITE_APP_NAME=BuildMyBot
VITE_APP_URL=https://buildmybot.app
VITE_SUPPORT_EMAIL=support@buildmybot.app
VITE_APP_VERSION=1.0.0

# ========================================
# FEATURE FLAGS (Production)
# ========================================
VITE_DEBUG=false
VITE_LOG_LEVEL=error
```

### Supabase Production Configuration

#### 1. Database Configuration

**Connection Pooling**:
- Use connection pooler for production
- URL format: `https://your-project.supabase.co:6543`

**Performance Settings**:
```sql
-- Optimize for production workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET work_mem = '16MB';
```

#### 2. Row-Level Security Verification

Ensure RLS is enabled on all tables:

```sql
-- Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Enable RLS on any missing tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

#### 3. Database Indexes

Verify production indexes exist:

```sql
-- Critical indexes for performance
CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_bot_id ON leads(bot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_bot_id ON conversations(bot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_bot_id ON knowledge_base(bot_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
```

#### 4. Edge Function Secrets

Set all production secrets:

```bash
supabase secrets set OPENAI_API_KEY="sk-proj-your-production-key"
supabase secrets set STRIPE_SECRET_KEY="sk_live_your-stripe-key"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
supabase secrets set TWILIO_ACCOUNT_SID="ACyour-twilio-sid"
supabase secrets set TWILIO_AUTH_TOKEN="your-twilio-token"
supabase secrets set TWILIO_PHONE_NUMBER="+1234567890"

# Verify secrets are set
supabase secrets list
```

---

## Stripe Configuration

### Step 1: Switch to Live Mode

1. Go to Stripe Dashboard
2. Toggle from **Test Mode** to **Live Mode** (top right)

### Step 2: Get Production API Keys

1. Navigate to **Developers > API keys**
2. Copy:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)
3. Update environment variables

### Step 3: Configure Production Webhooks

#### Create Webhook Endpoint

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Set **Endpoint URL**:
   ```
   https://your-project-id.supabase.co/functions/v1/stripe-webhook
   ```
4. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Update `STRIPE_WEBHOOK_SECRET` environment variable

#### Test Webhook

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your Edge Function
stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
```

### Step 4: Configure Products & Prices

Create production products in Stripe Dashboard:

#### Free Plan
- **Product Name**: Free Plan
- **Price**: $0/month
- **Price ID**: Copy and save

#### Starter Plan
- **Product Name**: Starter Plan
- **Price**: $29/month
- **Price ID**: Copy and save

#### Professional Plan
- **Product Name**: Professional Plan
- **Price**: $99/month
- **Price ID**: Copy and save

#### Business Plan
- **Product Name**: Business Plan
- **Price**: $299/month
- **Price ID**: Copy and save

#### Enterprise Plan
- **Product Name**: Enterprise Plan
- **Price**: $999/month
- **Price ID**: Copy and save

#### Update constants.ts

Update `/constants.ts` with production Price IDs:

```typescript
export const STRIPE_PRICE_IDS = {
  [PlanType.FREE]: null,
  [PlanType.STARTER]: 'price_1ABC...', // Your Starter price ID
  [PlanType.PROFESSIONAL]: 'price_1DEF...', // Your Pro price ID
  [PlanType.BUSINESS]: 'price_1GHI...', // Your Business price ID
  [PlanType.ENTERPRISE]: 'price_1JKL...', // Your Enterprise price ID
};
```

### Step 5: Tax Configuration (Optional)

1. Go to **Settings > Tax**
2. Enable **Stripe Tax** for automatic tax calculation
3. Configure tax behavior for your jurisdictions

---

## Security Configuration

### 1. API Key Protection

**Never expose secret keys in frontend**:
- Use `VITE_` prefix only for public keys
- Server-side keys should be in Supabase secrets
- Rotate keys every 90 days

### 2. CORS Configuration

In Supabase Dashboard > Settings > API:

**Allowed Origins**:
```
https://buildmybot.app
https://www.buildmybot.app
https://app.buildmybot.app
```

### 3. Rate Limiting

Implement rate limiting for Edge Functions:

```typescript
// Example rate limit middleware
const RATE_LIMIT = 100; // requests per minute
const rateLimiter = new Map();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];

  // Filter requests from last minute
  const recentRequests = userRequests.filter(
    (timestamp: number) => now - timestamp < 60000
  );

  if (recentRequests.length >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }

  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
}
```

### 4. Content Security Policy (CSP)

Add to your hosting platform's headers configuration:

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.openai.com;"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

**Netlify** (`netlify.toml`):
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

### 5. Secrets Management

**Rotate secrets regularly**:
```bash
# Generate new API key in OpenAI/Stripe dashboard
# Update in Supabase
supabase secrets set OPENAI_API_KEY="new-key"

# Update in hosting platform (Vercel)
vercel env add VITE_OPENAI_API_KEY production
```

---

## Performance Optimization

### 1. Frontend Optimization

#### Enable Production Build

```bash
# Build with production optimizations
NODE_ENV=production npm run build

# Analyze bundle size
npm run build -- --analyze
```

#### Code Splitting

Vite automatically splits code. Verify in `dist/` output.

#### Asset Optimization

```bash
# Install optimization tools
npm install -D vite-plugin-imagemin

# Add to vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

export default {
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 3 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9] },
      svgo: { plugins: [{ removeViewBox: false }] }
    })
  ]
};
```

### 2. Database Optimization

#### Connection Pooling

Use Supabase connection pooler in production:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    headers: {
      'x-client-info': 'buildmybot-web',
    },
  },
});
```

#### Query Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX CONCURRENTLY idx_leads_created_at ON leads(created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM conversations WHERE bot_id = 'some-id' ORDER BY created_at DESC LIMIT 10;
```

### 3. Edge Function Optimization

```typescript
// Cache frequently accessed data
const cache = new Map();

export async function handler(req: Request) {
  const cacheKey = 'some-key';

  // Check cache first
  if (cache.has(cacheKey)) {
    return new Response(cache.get(cacheKey));
  }

  // Fetch and cache
  const data = await fetchData();
  cache.set(cacheKey, data);

  return new Response(data);
}
```

### 4. CDN Configuration

**Vercel**: Automatic global CDN

**Cloudflare**:
1. Add site to Cloudflare
2. Update nameservers
3. Enable caching rules
4. Set cache TTL for static assets

---

## Logging & Monitoring

### 1. Sentry Configuration

#### Initialize Sentry

Already configured in `services/sentryService.ts`. Verify settings:

```typescript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
    }
    return event;
  },
});
```

#### Set Up Alerts

In Sentry Dashboard:

1. Go to **Alerts > Create Alert**
2. Configure:
   - **When**: Error rate > 5% for 1 minute
   - **Then**: Send email to team
3. Create additional alerts for:
   - First seen errors
   - Regression errors
   - Performance degradation

### 2. Supabase Logging

#### Enable Logging

1. Go to Supabase Dashboard > Logs
2. Enable:
   - API logs
   - Database logs
   - Edge Function logs

#### Export Logs

```bash
# Install Supabase CLI
supabase login

# Export logs
supabase logs --type=api --start="2024-12-01" --end="2024-12-02" > api-logs.txt
```

### 3. Custom Analytics

#### Track Key Events

```typescript
import { logger } from './services/loggingService';

// Track user actions
logger.logUserAction('bot_created', 'BotBuilder', {
  userId: user.id,
  botId: bot.id,
});

// Track API calls
logger.logApiCall('POST', '/api/bots', 150, 200, {
  userId: user.id,
});

// Track performance
logger.logPerformance('page_load', 1200, 'ms');
```

### 4. Uptime Monitoring

Use services like:
- **UptimeRobot** (free, basic monitoring)
- **Pingdom** (advanced monitoring)
- **Better Uptime** (status page + monitoring)

**Configure checks for**:
- Homepage (https://buildmybot.app)
- API health (https://your-project.supabase.co/functions/v1/health)
- Database connection

---

## Production Checklist

### Pre-Launch

- [ ] All environment variables set to production values
- [ ] Stripe switched to live mode
- [ ] Stripe webhooks configured and tested
- [ ] All product/price IDs updated in code
- [ ] Database migrations applied
- [ ] RLS policies enabled and tested
- [ ] Edge Functions deployed with production secrets
- [ ] Sentry DSN configured
- [ ] Custom domain configured and SSL active
- [ ] CORS origins set correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] robots.txt allows crawling
- [ ] sitemap.xml deployed and valid
- [ ] Analytics/monitoring active
- [ ] Backup strategy in place
- [ ] Error alerting configured
- [ ] Load testing completed (1000+ concurrent users)

### Post-Launch

- [ ] Monitor error rates (target: < 0.1%)
- [ ] Monitor response times (target: < 500ms p95)
- [ ] Verify webhooks processing correctly
- [ ] Check Stripe dashboard for successful payments
- [ ] Monitor Supabase usage and costs
- [ ] Review user feedback
- [ ] Set up on-call rotation
- [ ] Document incident response procedures

### Compliance

- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie policy (if applicable)
- [ ] GDPR compliance (if serving EU users)
- [ ] CCPA compliance (if serving CA users)
- [ ] Data processing agreement
- [ ] Support contact information visible

---

## Incident Response

### Severity Levels

**P0 - Critical**: Site down, payments failing
- Response time: Immediate
- Escalation: Page on-call engineer

**P1 - High**: Feature broken, severe degradation
- Response time: < 1 hour
- Escalation: Notify team lead

**P2 - Medium**: Minor feature broken, workaround exists
- Response time: < 4 hours
- Escalation: Log ticket

**P3 - Low**: Cosmetic issue, no user impact
- Response time: Next sprint
- Escalation: Backlog

### Common Issues & Resolutions

#### Supabase Down
1. Check [status.supabase.com](https://status.supabase.com)
2. If service issue, wait for resolution
3. If project issue, check logs
4. Contact Supabase support if needed

#### High Error Rate
1. Check Sentry for error details
2. Check Supabase logs
3. Rollback recent deployment if necessary
4. Fix and redeploy

#### Webhook Failures
1. Check Stripe webhook logs
2. Verify webhook secret is correct
3. Test webhook endpoint manually
4. Retry failed events in Stripe Dashboard

---

## Performance Targets

### Response Times

- **Homepage**: < 1s LCP (Largest Contentful Paint)
- **Dashboard**: < 2s TTI (Time to Interactive)
- **API Calls**: < 500ms p95
- **Edge Functions**: < 200ms p95

### Availability

- **Uptime Target**: 99.9% (8.76 hours downtime/year)
- **Error Rate Target**: < 0.1%

### Scalability

- **Concurrent Users**: 10,000+
- **Requests/minute**: 100,000+
- **Database Connections**: < 100 (pooled)

---

## Cost Optimization

### Supabase

- **Free Tier**: 500MB DB, 2GB bandwidth
- **Pro Tier**: $25/mo - 8GB DB, 50GB bandwidth
- **Monitor**: Database size, API calls, bandwidth

### OpenAI

- **GPT-4o Mini**: $0.150 / 1M input tokens, $0.600 / 1M output tokens
- **Embeddings**: $0.020 / 1M tokens
- **Monitor**: Token usage per user/bot
- **Optimize**: Use caching, limit context window

### Vercel

- **Free**: 100GB bandwidth
- **Pro**: $20/mo - 1TB bandwidth
- **Monitor**: Bandwidth usage, function invocations

### Estimated Monthly Costs

**1,000 users**:
- Supabase Pro: $25
- OpenAI: ~$100-300 (varies by usage)
- Vercel Pro: $20
- Sentry: $26 (Developer plan)
- **Total**: ~$200-400/mo

**10,000 users**:
- Supabase Pro/Team: $599
- OpenAI: ~$1,000-3,000
- Vercel Pro/Enterprise: $150+
- Sentry: $99+
- **Total**: ~$2,000-4,000/mo

---

## Support

### Getting Help

- **Technical Issues**: support@buildmybot.app
- **Billing Issues**: billing@buildmybot.app
- **Security Issues**: security@buildmybot.app
- **Documentation**: See `/docs` folder

### Escalation Path

1. Check this documentation
2. Check Supabase docs
3. Check service status pages
4. Contact support
5. Emergency: Call on-call engineer

---

**Production Environment Ready!** =€

Your BuildMyBot platform is configured for production deployment with security, monitoring, and optimization best practices.
