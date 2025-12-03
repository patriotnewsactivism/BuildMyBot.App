# BuildMyBot.app

The ultimate white-label AI chatbot platform for businesses and agencies. Build, deploy, and resell intelligent bots with zero coding.

## 🚀 Overview

BuildMyBot is an all-in-one AI Operating System that empowers businesses to automate customer interactions across text, web, and voice. It includes a comprehensive suite of tools for lead generation, customer support, and marketing automation.

## ✨ Key Features

### 🤖 AI Bot Builder
- **Specialized Personas:** tailored roles for City Government (e.g., Batesville City Assistant), Recruitment, Travel, Real Estate, and more.
- **RAG Knowledge Base:** Train bots on PDFs, Website URLs, and text data.
- **Visual Editor:** No-code customization of identity, tone, and behavior.

### 📞 AI Phone Agent
- **24/7 Receptionist:** Handles incoming calls, books appointments, and routes urgent issues.
- **Human-like Voice:** Powered by advanced neural speech synthesis.
- **Call Logging:** Transcripts automatically saved to the CRM.

### 📊 Lead CRM
- **Hot Lead Detection:** Automatically scores leads (0-100) based on conversation intent.
- **Pipeline Management:** Kanban and List views to manage deal flow.
- **Instant Alerts:** SMS/Email notifications for high-priority leads.

### 📢 Marketing Studio
- **Viral Content Generator:** Create high-engagement Twitter/X threads and LinkedIn posts.
- **Instant Website Builder:** Generate industry-specific landing pages in seconds.

### 💼 Reseller & Partner Portal
- **White-label Ready:** Agencies can resell the platform under their own brand.
- **Commission Tracking:** Real-time dashboard for earnings, payouts, and client management.
- **Tiered System:** Bronze, Silver, Gold, and Platinum tiers with increasing commission rates.

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend (Current):** Firebase (Firestore, Auth)
- **Backend (Target):** Supabase (Postgres, Edge Functions, Auth) - See `PLAN.md`
- **AI Models:** OpenAI GPT-4o / GPT-4o Mini
- **Icons:** Lucide React

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Account (https://supabase.com)
- OpenAI API Key (https://platform.openai.com)
- Stripe Account (https://stripe.com)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/buildmybot.git
   cd buildmybot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   OPENAI_API_KEY=sk-your-openai-key
   STRIPE_SECRET_KEY=sk_test_your-stripe-key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
   ```

4. **Set up Database:**
   ```bash
   supabase init
   supabase link --project-ref your-project-ref
   supabase db push
   ```

5. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy ai-complete
   supabase functions deploy create-lead
   supabase functions deploy embed-knowledge-base
   supabase functions deploy billing-overage-check
   supabase functions deploy marketplace-install-template
   supabase functions deploy reseller-track-referral
   ```

6. **Run Development Server:**
   ```bash
   npm run dev
   ```

Visit http://localhost:3000 to see your application.

### Comprehensive Setup

For detailed deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## 🏗 Architecture & Documentation

### Key Documents
- **[PLAN.md](./PLAN.md)** - Original engineering plan and database schema
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[SECURITY_FIXES.md](./SECURITY_FIXES.md)** - Security audit and fixes
- **[API.md](./API.md)** - Complete API reference
- **[TESTING.md](./TESTING.md)** - Testing procedures
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current project status
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant guidance

### Production Status

✅ **PRODUCTION READY** - Security Score: 7/10

- All critical security vulnerabilities resolved
- Comprehensive input validation and rate limiting
- Stripe billing integration complete
- RLS policies enforced
- Ready for staging deployment with monitoring

## 📱 Live Demos included in the App
- **City Services:** Batesville City Assistant demo with utility payment logic.
- **Instant Training:** Drag-and-drop PDF training.
- **Viral Post Creator:** Content generation engine.
- **Phone Agent:** Interactive call simulator.

---
© 2024 BuildMyBot. All rights reserved.
