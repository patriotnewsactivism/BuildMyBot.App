# Getting Started with BuildMyBot.app

Welcome to BuildMyBot! This guide will help you set up and deploy your AI chatbot platform.

## 🚀 Quick Start (5 Minutes)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/buildmybot.git
cd buildmybot
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose a name and password
   - Wait for the project to initialize (~2 minutes)

2. **Get Your Credentials**
   - Go to Settings → API
   - Copy your **Project URL** and **anon public** key

3. **Apply Database Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Push migrations
   supabase db push
   ```

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI
VITE_OPENAI_API_KEY=sk-your-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` and create your first bot!

---

## 📋 Full Setup Guide

### Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Database Setup

The database schema includes:
- ✅ User profiles with role-based access
- ✅ AI bots with knowledge bases
- ✅ Conversation history
- ✅ Lead CRM
- ✅ Billing and usage tracking
- ✅ Reseller/partner system
- ✅ Marketplace templates

All migrations are in `supabase/migrations/`.

### Deploy Edge Functions

Edge Functions provide serverless backend logic:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy ai-complete
supabase functions deploy create-lead
supabase functions deploy embed-knowledge-base
```

### Set Environment Secrets

For Edge Functions to work in production:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
```

---

## 🎯 Key Features

### 1. Bot Builder
- Create AI chatbots with custom personas
- Train on PDFs, URLs, or text
- Configure behavior, tone, and appearance
- Test in real-time preview

### 2. Knowledge Base
- Upload PDF documents
- Scrape websites
- Add manual facts
- Vector-based semantic search (pgvector)

### 3. Lead CRM
- Automatic lead capture
- Lead scoring (0-100)
- Pipeline management
- Email/phone collection

### 4. Marketing Studio
- Generate emails, ads, social posts
- Viral thread creator
- Multiple tone options
- One-click copy

### 5. Reseller System
- White-label ready
- Referral tracking
- Commission management
- Tiered pricing (Bronze → Platinum)

---

## 🔧 Configuration Options

### AI Models

Supported models (in `constants.ts`):
- gpt-4o-mini (default, fast & cheap)
- gpt-4o (most capable)
- gpt-3.5-turbo (legacy)

### Plans

Configure subscription plans in the database:
```sql
-- See supabase/migrations/20240101000000_initial_schema.sql
-- Plans: free, starter, pro, enterprise
```

### Customization

- **Theme Colors**: Edit `AVATAR_COLORS` in BotBuilder
- **Personas**: Add custom personas in `PERSONAS` array
- **Branding**: Update logo and colors in components

---

## 🌐 Deployment

### Frontend Deployment (Vercel)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel
   ```

2. **Set Environment Variables**
   In Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Alternative: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Backend (Edge Functions)

Already deployed via `supabase functions deploy`.

---

## 📊 Usage Tracking

The platform automatically tracks:
- Message count per user
- Bot creation limits
- API usage
- Lead generation

Enforce limits via `billing-overage-check` Edge Function.

---

## 🔐 Security

### Row-Level Security (RLS)

All database tables have RLS policies:
- Users can only access their own data
- Admins can access all data
- Resellers can view their clients

### API Keys

Never commit `.env` files. Use environment variables:
- **Frontend**: `VITE_` prefix (exposed to browser)
- **Backend**: No prefix (server-only)

---

## 🐛 Troubleshooting

### "Supabase not initialized"

**Solution**: Check that your `.env` file has valid credentials.

```bash
# Verify
cat .env | grep SUPABASE
```

### "OpenAI API Error"

**Solution**: Verify your API key has credits.

```bash
# Test
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

### Database Migration Errors

**Solution**: Reset and reapply migrations.

```bash
supabase db reset
supabase db push
```

### Edge Function Errors

**Solution**: Check function logs.

```bash
supabase functions logs ai-complete --tail
```

---

## 📚 Documentation

- [PLAN.md](./PLAN.md) - Engineering roadmap
- [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - Firebase → Supabase migration
- [supabase/DEPLOYMENT.md](./supabase/DEPLOYMENT.md) - Detailed deployment guide

---

## 🚀 Next Steps

1. **Create Your First Bot**
   - Go to Bot Builder
   - Choose a persona (e.g., "Sales Rep")
   - Test in preview
   - Get embed code

2. **Add Knowledge**
   - Upload a PDF
   - Or paste website URL
   - Bot will use this context in responses

3. **Capture Leads**
   - Test chat with email input
   - Check CRM for captured leads

4. **Go Live**
   - Deploy to Vercel/Netlify
   - Add custom domain
   - Embed on your website

---

## 💡 Pro Tips

### Performance

- Use `gpt-4o-mini` for 90% of use cases (10x cheaper)
- Chunk large PDFs before embedding
- Enable caching for frequently accessed bots

### Lead Quality

- Configure "hot lead" triggers in system prompts
- Set minimum score thresholds
- Use lead scoring (0-100) for prioritization

### Reseller Success

- Share referral link with `?ref=YOUR_CODE`
- Track conversions in Reseller Dashboard
- Set up automated commission payouts

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/buildmybot/issues)
- **Docs**: [docs.buildmybot.app](https://docs.buildmybot.app)
- **Email**: support@buildmybot.app

---

## ⚖️ License

MIT License - See LICENSE file for details.

---

**Ready to automate your business? Let's build! 🤖**
