# BuildMyBot Deployment Guide

Complete guide for deploying BuildMyBot to production with all features enabled.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Supabase account with a project created
- ✅ Node.js 18+ and npm installed
- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Git repository connected

## 🚀 Quick Start Deployment

### Step 1: Database Migration ✅ COMPLETED

The critical database migration has been applied:
- Auto-profile creation trigger installed
- Foreign key constraint error fixed
- All users now get automatic profiles

### Step 2: Configure Secrets

Run the interactive secrets configuration script:

```powershell
# Windows
.\deploy-secrets.ps1

# Or manually set secrets:
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set OPENAI_API_KEY=sk_...
```

#### Required Secrets for Full Functionality

| Secret | Description | Where to Get It | Required For |
|--------|-------------|-----------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | https://dashboard.stripe.com/apikeys | Billing |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Stripe Dashboard > Webhooks | Payment webhooks |
| `STRIPE_PRICE_STARTER` | Starter plan price ID | Stripe Dashboard > Products | Subscription |
| `STRIPE_PRICE_PROFESSIONAL` | Professional plan price ID | Stripe Dashboard > Products | Subscription |
| `STRIPE_PRICE_EXECUTIVE` | Executive plan price ID | Stripe Dashboard > Products | Subscription |
| `STRIPE_PRICE_ENTERPRISE` | Enterprise plan price ID | Stripe Dashboard > Products | Subscription |
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys | AI Chat |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | https://console.twilio.com/ | Phone Agent |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Twilio Console | Phone Agent |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Twilio Console | Phone Agent |
| `CARTESIA_API_KEY` | Cartesia API key | https://cartesia.ai/ | Voice TTS |

#### Optional Secrets

| Secret | Description | Purpose |
|--------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | Claude AI support |
| `GOOGLE_API_KEY` | Google AI API key | Gemini fallback |

### Step 3: Deploy Edge Functions

Deploy all 13 Edge Functions to Supabase:

```bash
# Deploy all functions at once
npx supabase functions deploy

# Or deploy individually
npx supabase functions deploy ai-complete
npx supabase functions deploy stripe-checkout
npx supabase functions deploy stripe-webhooks
npx supabase functions deploy twilio-voice-handler
npx supabase functions deploy twilio-voice-stream
npx supabase functions deploy twilio-call-webhook
npx supabase functions deploy create-lead
npx supabase functions deploy embed-knowledge-base
npx supabase functions deploy billing-overage-check
npx supabase functions deploy marketplace-install-template
npx supabase functions deploy reseller-track-referral
npx supabase functions deploy scrape-url
```

### Step 4: Configure Environment Variables

Update your `.env.local` file:

```bash
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://qjwwkcoredotrjtstigt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe Frontend (Required for billing UI)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Monitoring (Optional but recommended)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_POSTHOG_API_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Step 5: Run Tests

Validate everything works before deployment:

```bash
# Unit tests
npm run test

# E2E tests (requires dev server running)
npm run test:e2e

# Check for broken links
npm run check-links
```

### Step 6: Build for Production

```bash
# Build Next.js application
npm run build

# Test production build locally
npm run start
```

### Step 7: Deploy Application

#### Option A: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard
# vercel.com/your-project/settings/environment-variables
```

#### Option B: Google Cloud Run (Docker)

```bash
# Build Docker image
docker build -t buildmybot:latest .

# Test locally
docker run -p 8080:3000 buildmybot:latest

# Deploy to Cloud Run
gcloud builds submit --config cloudbuild.yaml

# Or using gcloud run deploy
gcloud run deploy buildmybot \
  --image gcr.io/your-project-id/buildmybot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option C: Netlify

```bash
# Build the app
npm run build

# Deploy via Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=.next
```

### Step 8: Configure Webhooks

#### Stripe Webhook Setup

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhooks`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret and set it as `STRIPE_WEBHOOK_SECRET`

#### Twilio Webhook Setup (for Phone Agent)

1. Go to https://console.twilio.com/
2. Navigate to Phone Numbers > Manage > Active Numbers
3. Select your phone number
4. Configure Voice & Fax:
   - **A CALL COMES IN**: Webhook
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/twilio-voice-handler`
   - HTTP POST
5. Configure Status Callbacks:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/twilio-call-webhook`
   - HTTP POST

### Step 9: Verify Deployment

Test each critical flow:

#### ✅ Bot Creation Flow
1. Log in to your deployed app
2. Create a new bot
3. Configure knowledge base
4. Test chat interface

#### ✅ Chat Widget Flow
1. Get widget embed code
2. Test on external website
3. Verify chat responses
4. Check lead capture

#### ✅ Billing Flow (if Stripe configured)
1. Navigate to Billing page
2. Select a plan
3. Go through checkout
4. Verify subscription created

#### ✅ Phone Agent Flow (if Twilio configured)
1. Call your Twilio number
2. Verify AI answers
3. Check transcript logging
4. Review call logs in dashboard

#### ✅ CRM Flow
1. Generate test leads from chat
2. View in LeadsCRM
3. Test pipeline movement
4. Verify lead scoring

## 📊 Post-Deployment Monitoring

### Sentry Error Tracking

1. Create project at https://sentry.io/
2. Copy DSN to `NEXT_PUBLIC_SENTRY_DSN`
3. Deploy with environment variable
4. Errors will automatically report

### PostHog Analytics

1. Create project at https://posthog.com/
2. Copy API key to `NEXT_PUBLIC_POSTHOG_API_KEY`
3. Deploy with environment variable
4. User events will automatically track

### Supabase Logs

Monitor Edge Functions:
```bash
# View real-time logs
npx supabase functions logs ai-complete --tail

# View specific function logs
npx supabase functions logs stripe-webhooks --tail
```

## 🔒 Security Checklist

- [ ] All secrets set via Supabase secrets (never in code)
- [ ] RLS policies enabled on all tables
- [ ] Stripe webhook signature verification enabled
- [ ] CORS headers properly configured
- [ ] Rate limiting enabled on Edge Functions
- [ ] Audit logging enabled for sensitive operations
- [ ] Environment variables set to `production`

## 📝 Edge Functions Reference

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `ai-complete` | `/functions/v1/ai-complete` | AI chat completions + marketing content |
| `stripe-checkout` | `/functions/v1/stripe-checkout` | Create Stripe checkout sessions |
| `stripe-webhooks` | `/functions/v1/stripe-webhooks` | Handle Stripe webhook events |
| `twilio-voice-handler` | `/functions/v1/twilio-voice-handler` | TwiML for incoming calls |
| `twilio-voice-stream` | `/functions/v1/twilio-voice-stream` | WebSocket voice streaming |
| `twilio-call-webhook` | `/functions/v1/twilio-call-webhook` | Call status callbacks |
| `create-lead` | `/functions/v1/create-lead` | Lead capture from chat |
| `embed-knowledge-base` | `/functions/v1/embed-knowledge-base` | RAG embeddings |
| `billing-overage-check` | `/functions/v1/billing-overage-check` | Plan limit enforcement |
| `marketplace-install-template` | `/functions/v1/marketplace-install-template` | Bot template installation |
| `reseller-track-referral` | `/functions/v1/reseller-track-referral` | Referral tracking |
| `scrape-url` | `/functions/v1/scrape-url` | Website content extraction |

## 🐛 Troubleshooting

### Edge Function Not Working

```bash
# Check logs
npx supabase functions logs function-name --tail

# Verify secrets are set
npx supabase secrets list

# Test function locally
npx supabase functions serve function-name
```

### Database Connection Issues

```bash
# Check database status
npx supabase db remote exec "SELECT 1"

# Verify migrations applied
npx supabase db diff
```

### Stripe Webhook Issues

1. Check webhook signature verification
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Test webhook with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks
   ```

### Twilio Phone Agent Issues

1. Verify all Twilio secrets are set
2. Check webhook URLs in Twilio console
3. Review function logs for errors
4. Test WebSocket connection

## 📞 Support

- GitHub Issues: https://github.com/patriotnewsactivism/BuildMyBot.App/issues
- Documentation: See `CLAUDE.md` and `PLAN.md`
- Supabase Docs: https://supabase.com/docs

## 🎉 Success!

If all steps complete successfully, you now have:
- ✅ Full-stack AI chatbot platform deployed
- ✅ 13 Edge Functions running
- ✅ Database with RLS policies
- ✅ Billing integration (if configured)
- ✅ Phone agent (if configured)
- ✅ Monitoring and error tracking
- ✅ Automated testing pipeline

Your BuildMyBot platform is now live and ready for production use! 🚀
