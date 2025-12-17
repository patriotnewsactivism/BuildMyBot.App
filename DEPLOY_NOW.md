# 🚀 Deploy BuildMyBot Now

Follow these steps to deploy your application immediately.

## Option 1: Deploy to Vercel (Recommended - Fastest)

### 1. Login to Vercel
```bash
vercel login
```

### 2. Deploy to Production
```bash
vercel --prod
```

When prompted:
- Set up and deploy: Y
- Which scope: Choose your account
- Link to existing project: N
- Project name: buildmybot (or your choice)
- Directory: ./
- Override settings: N

### 3. Set Environment Variables

After deployment, go to [Vercel Dashboard](https://vercel.com/dashboard) and:
1. Click on your project
2. Go to Settings → Environment Variables
3. Add these variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=your-openai-key
VITE_GEMINI_API_KEY=your-gemini-key (optional)
VITE_SENTRY_DSN=your-sentry-dsn (optional)
```

### 4. Redeploy
```bash
vercel --prod
```

Your app will be live at: https://buildmybot.vercel.app

---

## Option 2: Deploy to Netlify

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Build the Application
```bash
npm run build
```

### 3. Deploy
```bash
netlify deploy --prod --dir=dist
```

### 4. Set Environment Variables
Go to Netlify Dashboard → Site Settings → Environment Variables and add the same variables as above.

---

## Option 3: Deploy with Docker (Cloud Run/AWS/Azure)

### 1. Build Docker Image
```bash
docker build -t buildmybot .
```

### 2. Test Locally
```bash
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=your-url \
  -e VITE_SUPABASE_ANON_KEY=your-key \
  -e VITE_OPENAI_API_KEY=your-key \
  buildmybot
```

### 3. Deploy to Cloud Run
```bash
# Tag for GCR
docker tag buildmybot gcr.io/your-project/buildmybot

# Push to GCR
docker push gcr.io/your-project/buildmybot

# Deploy
gcloud run deploy buildmybot \
  --image gcr.io/your-project/buildmybot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Supabase Setup (Required for All Options)

### 1. Create Supabase Project
Go to [Supabase](https://app.supabase.com) and create a new project.

### 2. Apply Database Schema
In Supabase SQL Editor, run these files in order:
1. `supabase/migrations/20250109000000_initial_schema.sql`
2. `supabase/migrations/20250204000000_add_phone_call_metadata.sql`
3. `supabase/migrations/20251216_create_audit_logs.sql`

### 3. Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set OPENAI_API_KEY=your-key

# Deploy functions
supabase functions deploy --all
```

### 4. Create Storage Buckets
In Supabase SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('knowledge-files', 'knowledge-files', false),
  ('website-exports', 'website-exports', true)
ON CONFLICT (id) DO NOTHING;
```

---

## Quick Verification

After deployment, verify:
1. ✅ Homepage loads at your deployment URL
2. ✅ Authentication works (sign up/login)
3. ✅ Bot creation works
4. ✅ Chat interface responds
5. ✅ Lead capture functions

---

## Automated Deployments

For automatic deployments on every push to main:

1. Go to your GitHub repository settings
2. Add these secrets:
   - `VERCEL_TOKEN` (get from Vercel dashboard)
   - `VERCEL_ORG_ID` (get from Vercel project settings)
   - `VERCEL_PROJECT_ID` (get from Vercel project settings)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`
   - `SUPABASE_PROJECT_REF`
   - `SUPABASE_ACCESS_TOKEN`

The included `.github/workflows/deploy.yml` will handle automatic deployments.

---

## Need Help?

- Check deployment logs in your platform's dashboard
- Verify all environment variables are set correctly
- Ensure Supabase project is fully configured
- Review `DEPLOYMENT.md` for detailed instructions

🎉 Your app should be live in less than 5 minutes!