# 🚀 Deploy BuildMyBot to Production

Your Next.js app is ready to deploy! Choose the best option for your needs:

---

## ⚡ Option 1: Vercel (Recommended - 5 minutes)

**Why Vercel?** Built by the creators of Next.js, automatic deployments, zero config needed.

### Step-by-step:

```bash
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **What's your project's name?** → buildmybot (or your choice)
- **In which directory is your code located?** → ./
- **Want to modify settings?** → No

### Add Environment Variables in Vercel Dashboard:

After deployment, go to your Vercel project settings and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_POSTHOG_KEY=phc_... (optional)
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com (optional)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/... (optional)
```

**Your app will be live at:** `https://buildmybot.vercel.app`

---

## 🐳 Option 2: Docker (Cloud Run, AWS, Azure, etc.)

Perfect for Google Cloud Run, AWS ECS, Azure Container Apps, or any Docker host.

```bash
# 1. Build the Docker image
docker build -t buildmybot .

# 2. Test locally
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  buildmybot

# 3. Visit http://localhost:3000 to verify

# 4. Deploy to your cloud provider
```

### Google Cloud Run (from project directory):
```bash
# Build and deploy in one command
gcloud builds submit --config cloudbuild.yaml

# Or manually:
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/buildmybot
gcloud run deploy buildmybot \
  --image gcr.io/YOUR-PROJECT-ID/buildmybot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Don't forget to set environment variables in Cloud Run settings!

---

## 🌐 Option 3: Static Export (Not Recommended)

Next.js with API routes requires a Node.js server. Static export won't work for this app because:
- `/api/ai` route needs server-side execution
- Dynamic features require server-side rendering

**Use Vercel or Docker instead.**

---

## ✅ Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] **Supabase project** created and configured
  - Applied migrations from `supabase/migrations/`
  - Deployed Edge Functions from `supabase/functions/`
  - Got your Supabase URL and anon key

- [ ] **OpenAI API key** (required for AI features)
  - Get one at https://platform.openai.com/api-keys
  - Should start with `sk-proj-...`

- [ ] **Environment variables** ready
  - Copy from `.env.example`
  - Fill in real values
  - Add to hosting platform

- [ ] **Build succeeds locally**
  ```bash
  npm run build
  ```

- [ ] **Optional: Analytics & Monitoring**
  - PostHog account for product analytics
  - Sentry account for error tracking

---

## 🧪 Test Your Deployment

Once deployed, verify these critical paths:

1. ✅ **Homepage loads** - Landing page displays correctly
2. ✅ **Sign up works** - Create a new account
3. ✅ **Sign in works** - Log into existing account
4. ✅ **Create bot** - Bot builder loads and saves
5. ✅ **Chat works** - AI responses come through
6. ✅ **Admin login** - Master admin emails get full access

---

## 🔧 Environment Variables Reference

### Required (App won't work without these):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
OPENAI_API_KEY=sk-proj-...
```

### Optional (Recommended for production):
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### Optional (For billing features):
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🚨 Common Issues

### "Module not found: Can't resolve '@supabase/supabase-js'"
- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Rebuild: `npm run build`

### "Invalid Supabase URL or key"
- Check environment variables are set correctly
- Make sure `NEXT_PUBLIC_` prefix is used
- Verify Supabase project is not paused

### "OpenAI API error"
- Check `OPENAI_API_KEY` is set (no `NEXT_PUBLIC_` prefix)
- Verify API key is valid and has credits
- Check you're using the correct key format (`sk-proj-...`)

### Build fails with TypeScript errors
- Run `npm run build` locally first to catch errors
- Fix type errors before deploying
- Check `CLAUDE.md` for TypeScript patterns

---

## 📞 Need Help?

- **Documentation:** Check `CLAUDE.md` for architecture details
- **Issues:** Report bugs at GitHub Issues
- **Supabase:** https://supabase.com/docs
- **Next.js:** https://nextjs.org/docs
- **Vercel:** https://vercel.com/docs

---

## 🎉 You're Live!

Once deployed:
1. Share your URL with beta users
2. Monitor Sentry for errors
3. Check PostHog for usage analytics
4. Iterate based on feedback

**Your BuildMyBot deployment is complete!** 🚀
