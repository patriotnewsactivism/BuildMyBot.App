# BuildMyBot Deployment Guide

Complete guide for deploying BuildMyBot with addon features to production.

## Architecture Overview

BuildMyBot uses a **microservices architecture** with three deployment options:

1. **Frontend (Vite/React)** → Google Cloud Run or Firebase Hosting
2. **Backend API (Express)** → Google Cloud Run
3. **Firebase Cloud Functions** → Serverless functions for AI operations

```
┌─────────────┐
│   Frontend  │ (Vite + React)
│  Cloud Run  │ Port 80 (nginx)
└──────┬──────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Backend   │   │  Firebase   │   │   Firebase  │
│   API       │   │  Functions  │   │  Firestore  │
│  Cloud Run  │   │             │   │  (Database) │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## Prerequisites

### 1. Google Cloud Platform Setup

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login to GCP
gcloud auth login

# Set your project
gcloud config set project wtp-apps

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (already done, but for reference)
firebase init
```

### 3. Required Accounts & API Keys

- ✅ **Firebase** (wtp-apps project)
- ⚠️ **OpenAI API** - Need API key
- ⚠️ **Twilio** - For phone agent features
- ⚠️ **Stripe** - For payment processing

---

## Deployment Option 1: Firebase Cloud Functions (Recommended)

**Best for:** Quick deployment, automatic scaling, no container management

### Step 1: Configure Functions

```bash
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Step 2: Set Environment Variables

```bash
# Set Firebase environment variables
firebase functions:config:set \
  openai.api_key="sk-proj-YOUR_KEY_HERE"

# View current config
firebase functions:config:get
```

### Step 3: Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:generateBotResponse
```

### Step 4: Get Function URLs

After deployment, you'll receive URLs like:
```
https://us-central1-wtp-apps.cloudfunctions.net/generateBotResponse
https://us-central1-wtp-apps.cloudfunctions.net/generateMarketingContent
https://us-central1-wtp-apps.cloudfunctions.net/generateWebsiteStructure
```

### Step 5: Update Frontend Configuration

Create `.env.production` in the root directory:

```env
VITE_FUNCTIONS_URL=https://us-central1-wtp-apps.cloudfunctions.net
```

### Step 6: Deploy Frontend to Firebase Hosting

```bash
# Build frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Your app is now live!** 🎉

---

## Deployment Option 2: Google Cloud Run (Full Control)

**Best for:** Custom infrastructure, backend API needs, advanced features

### Part A: Deploy Backend API

#### Step 1: Configure Secrets

```bash
# Create secrets in Secret Manager
echo -n "sk-proj-YOUR_OPENAI_KEY" | \
  gcloud secrets create openai-api-key --data-file=-

echo -n "YOUR_TWILIO_AUTH_TOKEN" | \
  gcloud secrets create twilio-auth-token --data-file=-

echo -n "YOUR_STRIPE_SECRET_KEY" | \
  gcloud secrets create stripe-secret-key --data-file=-

echo -n "YOUR_JWT_SECRET" | \
  gcloud secrets create jwt-secret --data-file=-

# Create Firebase service account key secret
gcloud secrets create firebase-private-key \
  --data-file=path/to/serviceAccountKey.json
```

#### Step 2: Build & Deploy Backend API

```bash
cd api

# Build and deploy using Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Or deploy manually
gcloud builds submit --tag gcr.io/wtp-apps/buildmybot-api

gcloud run deploy buildmybot-api \
  --image gcr.io/wtp-apps/buildmybot-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest,\
TWILIO_AUTH_TOKEN=twilio-auth-token:latest,\
STRIPE_SECRET_KEY=stripe-secret-key:latest,\
JWT_SECRET=jwt-secret:latest
```

**Backend API URL:** `https://buildmybot-api-xxxxx-uc.a.run.app`

#### Step 3: Configure Environment Variables for Backend

In Cloud Run console, set these environment variables:

**Required:**
```
NODE_ENV=production
PORT=8080
CORS_ORIGINS=https://buildmybot.app
OPENAI_API_KEY=<from Secret Manager>
FIREBASE_PROJECT_ID=wtp-apps
FIREBASE_CLIENT_EMAIL=<from service account>
```

**Optional (for full features):**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=<from Secret Manager>
TWILIO_PHONE_NUMBER=+15551234567
STRIPE_SECRET_KEY=<from Secret Manager>
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
JWT_SECRET=<from Secret Manager>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Part B: Deploy Frontend

#### Step 1: Configure Frontend Environment

Create `.env.production`:

```env
# Backend API URL (from Cloud Run deployment)
VITE_API_URL=https://buildmybot-api-xxxxx-uc.a.run.app

# Firebase Functions URL (if using Firebase Functions too)
VITE_FUNCTIONS_URL=https://us-central1-wtp-apps.cloudfunctions.net

# Firebase Config (public - safe to expose)
VITE_FIREBASE_API_KEY=AIzaSyDfB_L0wUSedHvqjRrxS_gwjODs7tPa5zM
VITE_FIREBASE_AUTH_DOMAIN=wtp-apps.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wtp-apps
VITE_FIREBASE_STORAGE_BUCKET=wtp-apps.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=177289312201
VITE_FIREBASE_APP_ID=1:177289312201:web:e79fe0d4888ab70b755a18
```

#### Step 2: Build & Deploy Frontend

```bash
# Build frontend
npm run build

# Deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml

# Or deploy manually
gcloud builds submit --tag gcr.io/wtp-apps/buildmybot

gcloud run deploy buildmybot-app \
  --image gcr.io/wtp-apps/buildmybot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```

**Frontend URL:** `https://buildmybot-app-xxxxx-uc.a.run.app`

---

## Environment Variables Reference

### Frontend (.env.production)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | No* | Backend API URL | `https://buildmybot-api-xxxxx-uc.a.run.app` |
| `VITE_FUNCTIONS_URL` | Yes* | Firebase Functions URL | `https://us-central1-wtp-apps.cloudfunctions.net` |
| `VITE_FIREBASE_*` | Yes | Firebase client config | See firebaseConfig.ts |

*Choose either Backend API or Firebase Functions

### Backend API (Cloud Run Environment Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Environment (production) |
| `PORT` | Yes | Server port (8080) |
| `CORS_ORIGINS` | Yes | Allowed CORS origins |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account key |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `TWILIO_ACCOUNT_SID` | No | For phone features |
| `TWILIO_AUTH_TOKEN` | No | For phone features |
| `TWILIO_PHONE_NUMBER` | No | For phone features |
| `STRIPE_SECRET_KEY` | No | For payments |
| `STRIPE_WEBHOOK_SECRET` | No | For Stripe webhooks |
| `JWT_SECRET` | No | For authentication |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (default: 900000) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |

### Firebase Functions (functions:config:set)

```bash
firebase functions:config:set \
  openai.api_key="sk-proj-YOUR_KEY" \
  twilio.account_sid="ACxxxxxxxx" \
  twilio.auth_token="YOUR_TOKEN" \
  twilio.phone_number="+15551234567"
```

---

## Post-Deployment Configuration

### 1. Set Up Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service buildmybot-app \
  --domain buildmybot.app \
  --region us-central1

# For API subdomain
gcloud run domain-mappings create \
  --service buildmybot-api \
  --domain api.buildmybot.app \
  --region us-central1
```

### 2. Configure Twilio Webhooks

In Twilio Console, set these webhook URLs:

**Phone Calls:**
- Incoming Call: `https://api.buildmybot.app/api/phone/call/incoming`
- Status Callback: `https://api.buildmybot.app/api/phone/call/status`

**SMS:**
- Incoming SMS: `https://api.buildmybot.app/api/phone/sms/incoming`

### 3. Configure Stripe Webhooks

In Stripe Dashboard → Webhooks, add endpoint:

**Webhook URL:** `https://api.buildmybot.app/api/webhooks/stripe`

**Events to listen for:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### 4. Update CORS Origins

After deploying, update backend CORS to allow your frontend domain:

```bash
gcloud run services update buildmybot-api \
  --update-env-vars CORS_ORIGINS=https://buildmybot.app,https://www.buildmybot.app
```

---

## Monitoring & Debugging

### View Logs

```bash
# Frontend logs
gcloud run services logs read buildmybot-app --region us-central1

# Backend logs
gcloud run services logs read buildmybot-api --region us-central1

# Firebase Functions logs
firebase functions:log
```

### Health Checks

```bash
# Frontend health
curl https://buildmybot.app/health

# Backend health
curl https://api.buildmybot.app/api/health
```

### Common Issues

**1. CORS Errors**
- Update `CORS_ORIGINS` in backend API
- Verify domain mapping

**2. OpenAI API Errors**
- Check API key is set correctly in Secret Manager
- Verify billing is enabled on OpenAI account

**3. Twilio Webhook Failures**
- Verify webhook URLs are publicly accessible
- Check Twilio signature validation

**4. Firebase Errors**
- Verify service account key is valid
- Check Firestore rules allow backend access

---

## CI/CD with Cloud Build

### Automatic Deployments

Set up Cloud Build triggers in GCP Console:

**Frontend Trigger:**
- Repository: `patriotnewsactivism/BuildMyBot.App`
- Branch: `main`
- Build config: `cloudbuild.yaml`

**Backend Trigger:**
- Repository: `patriotnewsactivism/BuildMyBot.App`
- Branch: `main`
- Build config: `api/cloudbuild.yaml`

### Manual Deployments

```bash
# Deploy everything
gcloud builds submit --config=cloudbuild.yaml
cd api && gcloud builds submit --config=cloudbuild.yaml
firebase deploy --only functions,hosting
```

---

## Cost Optimization

### Cloud Run
- Set `--min-instances=0` (scale to zero when idle)
- Set `--max-instances=10` (cap maximum scaling)
- Use `--memory=512Mi` (adjust based on needs)

### Firebase Functions
- Use `runWith({ memory: '512MB' })` for functions
- Set timeout limits: `runWith({ timeoutSeconds: 60 })`

### OpenAI API
- Use `gpt-4o-mini` for cost-effective responses
- Set `max_tokens` limits
- Cache responses when possible

---

## Security Checklist

- ✅ All API keys stored in Secret Manager (never in code)
- ✅ CORS configured to only allow your domains
- ✅ Rate limiting enabled on API
- ✅ Webhook signature validation enabled (Twilio, Stripe)
- ✅ HTTPS enforced (Cloud Run does this automatically)
- ✅ Non-root user in Docker container
- ✅ Firebase security rules configured
- ✅ Environment variables not exposed in frontend

---

## Support

For issues or questions:
1. Check logs: `gcloud run services logs read <service-name>`
2. Review [GCP Cloud Run docs](https://cloud.google.com/run/docs)
3. Review [Firebase Functions docs](https://firebase.google.com/docs/functions)

---

## Quick Reference

### Deploy Frontend Only
```bash
npm run build
gcloud builds submit --config=cloudbuild.yaml
```

### Deploy Backend Only
```bash
cd api
gcloud builds submit --config=cloudbuild.yaml
```

### Deploy Functions Only
```bash
cd functions
firebase deploy --only functions
```

### Update Environment Variables
```bash
# Backend API
gcloud run services update buildmybot-api \
  --update-env-vars KEY=VALUE

# Firebase Functions
firebase functions:config:set key=value
firebase deploy --only functions
```

---

**Deployment Status:** ⚠️ Pending configuration

**Next Steps:**
1. Get OpenAI API key
2. Configure Secret Manager
3. Deploy backend API
4. Deploy Firebase Functions
5. Deploy frontend
6. Configure webhooks (Twilio, Stripe)
