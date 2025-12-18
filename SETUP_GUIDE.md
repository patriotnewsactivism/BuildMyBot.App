# 🚀 BuildMyBot Setup Guide

Complete step-by-step guide to get BuildMyBot running locally and deploy to production.

---

## 📋 Prerequisites

Before you begin, make sure you have:

- [ ] **Node.js 18+** installed ([download here](https://nodejs.org/))
- [ ] **npm** (comes with Node.js)
- [ ] **Git** installed
- [ ] A code editor (VS Code recommended)
- [ ] 30 minutes of focused time

---

## ⚡ Quick Start (5 minutes)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-org/BuildMyBot.App.git
cd BuildMyBot.App

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Open .env in your editor and fill in the values
# At minimum, you need: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY
```

### 3. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** to see your app!

---

## 🔧 Complete Setup (30 minutes)

Follow these steps for full production readiness:

### Step 1: Supabase Setup (10 minutes)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose your organization
   - Set project name: `buildmybot`
   - Set database password (save this!)
   - Choose region closest to your users
   - Click "Create new project" (takes ~2 minutes)

2. **Apply Database Migrations**

   ```bash
   # Install Supabase CLI if you haven't
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link your project
   supabase link --project-ref YOUR_PROJECT_REF

   # Apply migrations
   supabase db push
   ```

   Your database schema is now set up with all tables, RLS policies, and pgvector extension!

3. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add these to your `.env` file

4. **Deploy Edge Functions** (Optional but recommended)

   ```bash
   # Deploy all edge functions
   supabase functions deploy ai-complete
   supabase functions deploy create-lead
   supabase functions deploy embed-knowledge-base
   supabase functions deploy billing-overage-check
   supabase functions deploy marketplace-install-template
   supabase functions deploy reseller-track-referral
   supabase functions deploy scrape-url
   supabase functions deploy twilio-call-webhook

   # Set secrets for edge functions
   supabase secrets set OPENAI_API_KEY=sk-proj-your-key-here
   ```

### Step 2: OpenAI Setup (5 minutes)

1. **Get API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Sign up or log in
   - Click your profile → "View API keys"
   - Click "Create new secret key"
   - Copy the key (starts with `sk-proj-...`)
   - Add to `.env`: `OPENAI_API_KEY=sk-proj-your-key-here`

2. **Add Credits** (if needed)
   - Go to Settings → Billing
   - Add payment method
   - Add credits ($5-$20 is good to start)

### Step 3: Analytics & Monitoring (Optional - 10 minutes)

#### PostHog (Product Analytics)

1. Go to [posthog.com](https://posthog.com) → Sign up
2. Create a new project
3. Copy your Project API Key
4. Add to `.env`:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

#### Sentry (Error Tracking)

1. Go to [sentry.io](https://sentry.io) → Sign up
2. Create a new Next.js project
3. Copy your DSN
4. Add to `.env`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

### Step 4: Test Locally (5 minutes)

```bash
# Start the dev server
npm run dev

# In another terminal, run tests
npm test

# Run e2e tests (optional)
npm run test:e2e:ui
```

Visit **http://localhost:3000** and verify:

- ✅ Landing page loads
- ✅ Can click "Get Started"
- ✅ Sign up modal appears
- ✅ Interactive chatbot demo works

---

## 🎯 Your Updated .env File Should Look Like:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...

# Optional (recommended for production)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

# Optional (for billing - can add later)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 📦 Deploy to Production

See **[DEPLOY_IMMEDIATELY.md](./DEPLOY_IMMEDIATELY.md)** for deployment instructions.

**Recommended:** Use Vercel for zero-config Next.js deployment.

```bash
npm i -g vercel
vercel login
vercel --prod
```

Don't forget to add all environment variables in the Vercel dashboard!

---

## 🎨 Customizing Your Instance

### Master Admin Access

Edit `App.tsx` line 43 to add your email:

```typescript
const MASTER_EMAILS = [
  'admin@buildmybot.app',
  'your-email@example.com'  // Add your email here
];
```

Master admins get:
- Full ADMIN role
- ENTERPRISE plan
- Access to AdminDashboard
- User management capabilities

### Branding

1. **Colors**: Edit `app/globals.css` for theme colors
2. **Logo**: Replace assets in `/public` (if applicable)
3. **Landing Page**: Edit `components/Landing/LandingPage.tsx`
4. **Plans**: Update pricing in `constants.ts`

---

## 🧪 Testing

### Unit Tests

```bash
npm test                  # Run all tests
npm test -- --watch       # Run in watch mode
npm test -- --coverage    # Generate coverage report
```

### E2E Tests

```bash
npm run test:e2e          # Headless mode
npm run test:e2e:ui       # UI mode (recommended)
npm run test:e2e:headed   # See browser
npm run test:e2e:report   # View last report
```

### Manual Testing Checklist

- [ ] Sign up with email
- [ ] Sign in with existing account
- [ ] Create a new bot
- [ ] Test chat with bot
- [ ] Check lead capture
- [ ] Verify admin features (if admin)
- [ ] Test reseller features (if reseller)
- [ ] Mobile responsive design

---

## 🐛 Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Supabase connection fails

- Check `.env` has correct URL and anon key
- Verify Supabase project is not paused
- Check RLS policies are applied (run `supabase db push`)

### OpenAI API errors

- Verify API key is correct in `.env`
- Check you have credits in your OpenAI account
- Ensure key starts with `sk-proj-`

### Build fails

```bash
# Check TypeScript errors
npm run build

# Run linter
npm run lint

# Fix common issues automatically
npm run lint -- --fix
```

### Tests fail

- Make sure `.env` file exists
- Clear test cache: `rm -rf node_modules/.vitest`
- Reinstall: `npm install`

---

## 📚 Next Steps

Once your app is running:

1. **Read** `CLAUDE.md` for architecture details
2. **Check** `PLAN.md` for development roadmap
3. **Review** `DEPLOY_IMMEDIATELY.md` for deployment options
4. **Explore** the codebase structure
5. **Customize** for your use case

---

## 🆘 Getting Help

- **Documentation**: Check `CLAUDE.md` for architecture
- **GitHub Issues**: Report bugs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OpenAI Docs**: https://platform.openai.com/docs

---

## ✅ Setup Complete!

You should now have:

- ✅ Local development server running
- ✅ Supabase backend configured
- ✅ OpenAI integration working
- ✅ Tests passing
- ✅ Ready to deploy

**Next:** Deploy to Vercel or your preferred hosting platform!

🎉 **Happy Building!**
