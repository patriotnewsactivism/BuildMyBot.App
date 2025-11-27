# Cloud Run Environment Variables Configuration

Quick reference for configuring environment variables in Google Cloud Run.

## Frontend Service: `buildmybot-app`

### Set Environment Variables via Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select service: `buildmybot-app`
3. Click "EDIT & DEPLOY NEW REVISION"
4. Scroll to "Variables & Secrets" section
5. Add the following environment variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| N/A | N/A | Frontend uses build-time env vars only |

### Frontend uses `.env.production` (build time)

```env
VITE_FUNCTIONS_URL=https://us-central1-wtp-apps.cloudfunctions.net
```

These are baked into the build. No runtime env vars needed for frontend.

---

## Backend API Service: `buildmybot-api`

### Required Environment Variables

```bash
gcloud run services update buildmybot-api \
  --region us-central1 \
  --update-env-vars \
NODE_ENV=production,\
PORT=8080,\
CORS_ORIGINS=https://buildmybot.app,\
FIREBASE_PROJECT_ID=wtp-apps,\
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@wtp-apps.iam.gserviceaccount.com
```

### Secrets (via Secret Manager)

```bash
# Create secrets first
gcloud secrets create openai-api-key --data-file=-
# Paste your API key, then Ctrl+D

# Mount secrets to Cloud Run
gcloud run services update buildmybot-api \
  --region us-central1 \
  --set-secrets \
OPENAI_API_KEY=openai-api-key:latest,\
FIREBASE_PRIVATE_KEY=firebase-private-key:latest,\
TWILIO_AUTH_TOKEN=twilio-auth-token:latest,\
STRIPE_SECRET_KEY=stripe-secret-key:latest,\
JWT_SECRET=jwt-secret:latest
```

### Full Backend Configuration

| Variable | Type | Required | Example Value |
|----------|------|----------|---------------|
| `NODE_ENV` | Env Var | ✅ Yes | `production` |
| `PORT` | Env Var | ✅ Yes | `8080` |
| `CORS_ORIGINS` | Env Var | ✅ Yes | `https://buildmybot.app,https://www.buildmybot.app` |
| `FIREBASE_PROJECT_ID` | Env Var | ✅ Yes | `wtp-apps` |
| `FIREBASE_CLIENT_EMAIL` | Env Var | ✅ Yes | `firebase-adminsdk-xxxxx@wtp-apps.iam.gserviceaccount.com` |
| `OPENAI_API_KEY` | Secret | ✅ Yes | `sk-proj-xxxxxxxxxxxxx` |
| `FIREBASE_PRIVATE_KEY` | Secret | ✅ Yes | `-----BEGIN PRIVATE KEY-----\n...` |
| `TWILIO_ACCOUNT_SID` | Env Var | ❌ Optional | `ACxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Secret | ❌ Optional | `xxxxxxxxxxxxxxxx` |
| `TWILIO_PHONE_NUMBER` | Env Var | ❌ Optional | `+15551234567` |
| `STRIPE_SECRET_KEY` | Secret | ❌ Optional | `sk_live_xxxxxxxxxxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Secret | ❌ Optional | `whsec_xxxxxxxxxxxxx` |
| `JWT_SECRET` | Secret | ❌ Optional | `your-super-secret-key` |
| `RATE_LIMIT_WINDOW_MS` | Env Var | ❌ Optional | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Env Var | ❌ Optional | `100` |

---

## Firebase Functions Configuration

Firebase Functions use `firebase functions:config` instead of Cloud Run env vars.

### Set Firebase Config

```bash
# Required
firebase functions:config:set openai.api_key="sk-proj-YOUR_KEY_HERE"

# Optional (for full features)
firebase functions:config:set \
  twilio.account_sid="ACxxxxxxxx" \
  twilio.auth_token="YOUR_TOKEN" \
  twilio.phone_number="+15551234567" \
  stripe.secret_key="sk_live_xxxxx" \
  stripe.webhook_secret="whsec_xxxxx"

# View current config
firebase functions:config:get

# Deploy functions with new config
firebase deploy --only functions
```

### Access in Functions Code

```typescript
import * as functions from 'firebase-functions';

const openaiKey = functions.config().openai.api_key;
const twilioSid = functions.config().twilio.account_sid;
```

---

## Creating Secrets in Secret Manager

### OpenAI API Key

```bash
echo -n "sk-proj-YOUR_OPENAI_KEY_HERE" | \
  gcloud secrets create openai-api-key \
  --data-file=- \
  --replication-policy=automatic

# Grant Cloud Run access to secret
gcloud secrets add-iam-policy-binding openai-api-key \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT@wtp-apps.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Firebase Private Key

```bash
# Extract private key from service account JSON
cat path/to/serviceAccountKey.json | jq -r '.private_key' | \
  gcloud secrets create firebase-private-key \
  --data-file=- \
  --replication-policy=automatic
```

### Twilio Auth Token

```bash
echo -n "YOUR_TWILIO_AUTH_TOKEN" | \
  gcloud secrets create twilio-auth-token \
  --data-file=- \
  --replication-policy=automatic
```

### Stripe Secret Key

```bash
echo -n "sk_live_YOUR_STRIPE_KEY" | \
  gcloud secrets create stripe-secret-key \
  --data-file=- \
  --replication-policy=automatic
```

### JWT Secret

```bash
# Generate random secret
openssl rand -base64 32 | \
  gcloud secrets create jwt-secret \
  --data-file=- \
  --replication-policy=automatic
```

---

## Quick Commands

### Update Single Environment Variable

```bash
gcloud run services update buildmybot-api \
  --region us-central1 \
  --update-env-vars KEY_NAME=value
```

### Update Multiple Environment Variables

```bash
gcloud run services update buildmybot-api \
  --region us-central1 \
  --update-env-vars KEY1=value1,KEY2=value2,KEY3=value3
```

### Remove Environment Variable

```bash
gcloud run services update buildmybot-api \
  --region us-central1 \
  --remove-env-vars KEY_NAME
```

### View Current Configuration

```bash
gcloud run services describe buildmybot-api \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### Update Secret Reference

```bash
gcloud run services update buildmybot-api \
  --region us-central1 \
  --update-secrets OPENAI_API_KEY=openai-api-key:latest
```

---

## Minimal Deployment (OpenAI Only)

If you only want AI chat features (no phone, no payments), configure:

### Backend API (Minimal)

```bash
gcloud run services update buildmybot-api \
  --region us-central1 \
  --update-env-vars \
NODE_ENV=production,\
PORT=8080,\
CORS_ORIGINS=https://buildmybot.app,\
FIREBASE_PROJECT_ID=wtp-apps,\
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@wtp-apps.iam.gserviceaccount.com \
  --set-secrets \
OPENAI_API_KEY=openai-api-key:latest,\
FIREBASE_PRIVATE_KEY=firebase-private-key:latest
```

### Firebase Functions (Minimal)

```bash
firebase functions:config:set openai.api_key="sk-proj-YOUR_KEY"
firebase deploy --only functions
```

---

## Testing Configuration

### Test Backend API

```bash
# Health check
curl https://buildmybot-api-xxxxx-uc.a.run.app/api/health

# Test AI endpoint (requires valid request body)
curl -X POST https://buildmybot-api-xxxxx-uc.a.run.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "lastMessage": "Hello, how are you?",
    "history": []
  }'
```

### Test Firebase Functions

```bash
# Call function directly
curl -X POST https://us-central1-wtp-apps.cloudfunctions.net/generateBotResponse \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "lastMessage": "Hello!",
    "history": []
  }'
```

---

## Troubleshooting

### Error: "OPENAI_API_KEY is not set"

**Solution:**
```bash
# Verify secret exists
gcloud secrets describe openai-api-key

# Mount secret to Cloud Run
gcloud run services update buildmybot-api \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest
```

### Error: "CORS policy blocked"

**Solution:**
```bash
# Add your frontend domain to CORS_ORIGINS
gcloud run services update buildmybot-api \
  --update-env-vars CORS_ORIGINS=https://yourdomain.com
```

### Error: "Failed to initialize Firebase Admin"

**Solution:**
```bash
# Verify all Firebase env vars are set
gcloud run services describe buildmybot-api --format=json | \
  jq '.spec.template.spec.containers[0].env'

# Should include:
# - FIREBASE_PROJECT_ID
# - FIREBASE_CLIENT_EMAIL
# - FIREBASE_PRIVATE_KEY (as secret)
```

---

## Getting Service Account Credentials

### Option 1: Create New Service Account

```bash
# Create service account
gcloud iam service-accounts create buildmybot-backend \
  --display-name="BuildMyBot Backend API"

# Grant Firestore access
gcloud projects add-iam-policy-binding wtp-apps \
  --member="serviceAccount:buildmybot-backend@wtp-apps.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Create key
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=buildmybot-backend@wtp-apps.iam.gserviceaccount.com

# Extract values for env vars
cat serviceAccountKey.json | jq -r '.client_email'
cat serviceAccountKey.json | jq -r '.private_key'
```

### Option 2: Use Existing Firebase Admin SDK

Go to Firebase Console → Project Settings → Service Accounts → Generate New Private Key

---

## Security Best Practices

1. ✅ **Never commit secrets to git** - Use Secret Manager
2. ✅ **Use least privilege** - Service accounts should only have necessary permissions
3. ✅ **Rotate secrets regularly** - Update API keys periodically
4. ✅ **Use Secret Manager versions** - Mount `:latest` or pin to specific version
5. ✅ **Enable Cloud Audit Logs** - Track secret access
6. ✅ **Restrict CORS origins** - Only allow your actual domains

---

## Need Help?

View live environment variables:
```bash
gcloud run services describe buildmybot-api --region us-central1
```

View secrets:
```bash
gcloud secrets list
gcloud secrets versions access latest --secret=openai-api-key
```

View Firebase Functions config:
```bash
firebase functions:config:get
```
