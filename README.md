# BuildMyBot.app

The ultimate white-label AI chatbot platform for businesses and agencies. Build, deploy, and resell intelligent bots with zero coding.

## 🚀 Overview

BuildMyBot is an all-in-one AI Operating System that empowers businesses to automate customer interactions across text, web, and voice. It includes a comprehensive suite of tools for lead generation, customer support, and marketing automation.

## ✨ Key Features

### 🤖 AI Bot Builder
- **Specialized Personas:** tailored roles for City Government (e.g., Batesville City Assistant), Recruitment, Travel, Real Estate, and more.
- **RAG Knowledge Base:** Train bots on PDFs, Website URLs, and text data with vector embeddings.
- **Visual Editor:** No-code customization of identity, tone, and behavior.
- **15+ Pre-built Templates:** Ready-to-use marketplace templates

### 📞 AI Phone Agent
- **24/7 Receptionist:** Handles incoming calls, books appointments, and routes urgent issues.
- **Human-like Voice:** Powered by advanced neural speech synthesis.
- **Call Logging:** Transcripts automatically saved to the CRM.

### 📊 Lead CRM
- **Hot Lead Detection:** Automatically scores leads (0-100) based on conversation intent.
- **Pipeline Management:** Kanban and List views to manage deal flow.
- **Instant Alerts:** SMS/Email notifications for high-priority leads.
- **Real-time Sync:** PostgreSQL with live updates

### 📢 Marketing Studio
- **Viral Content Generator:** Create high-engagement Twitter/X threads and LinkedIn posts.
- **Instant Website Builder:** Generate industry-specific landing pages in seconds.
- **Multiple Formats:** Emails, ads, social posts, stories

### 💼 Reseller & Partner Portal
- **White-label Ready:** Agencies can resell the platform under their own brand.
- **Commission Tracking:** Real-time dashboard for earnings, payouts, and client management.
- **Tiered System:** Bronze, Silver, Gold, and Platinum tiers with increasing commission rates.

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Edge Functions, Auth) ✅ **MIGRATED**
- **Database:** PostgreSQL with pgvector for semantic search
- **AI Models:** OpenAI GPT-4o / GPT-4o Mini
- **Icons:** Lucide React
- **Deployment:** Vercel (Frontend), Supabase (Backend)

## 🏗 Architecture

**Current Architecture (Post-Migration):**
```
React App → Supabase Auth (JWT) → Edge Functions → PostgreSQL (RLS + pgvector)
```

**Key Features:**
- ✅ Row-Level Security on all tables
- ✅ Serverless Edge Functions (6 deployed)
- ✅ Vector embeddings for semantic search
- ✅ Real-time subscriptions
- ✅ Automated usage tracking & billing

For detailed engineering docs, see:
- **[PLAN.md](./PLAN.md)** - Engineering roadmap
- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** - Migration details
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Quick start guide
- **[supabase/DEPLOYMENT.md](./supabase/DEPLOYMENT.md)** - Deployment guide

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- OpenAI API Key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/buildmybot.git
   cd buildmybot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Apply migrations
   supabase db push

   # Deploy Edge Functions
   supabase functions deploy

   # Set secrets
   supabase secrets set OPENAI_API_KEY=sk-your-key
   ```

4. Configure Environment:
   Create a `.env` file:
   ```env
   # Supabase (Required)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

   # OpenAI (Required)
   VITE_OPENAI_API_KEY=sk-your-key-here
   ```

5. Run Development Server:
   ```bash
   npm run dev
   ```

   Visit `http://localhost:5173` and start building!

## 📱 Live Demos included in the App
- **City Services:** Batesville City Assistant demo with utility payment logic.
- **Instant Training:** Drag-and-drop PDF training with vector embeddings.
- **Viral Post Creator:** AI-powered content generation engine.
- **Phone Agent:** Interactive call simulator.
- **15 Marketplace Templates:** Pre-built bots for every industry

## 🎯 Current Status

**Milestone 1 ✅ COMPLETE** - Supabase Migration
- Database schema with 16 tables
- Row-Level Security policies
- 6 Edge Functions deployed
- Frontend services updated

**Milestone 2 ✅ COMPLETE** - Core Features
- Bot Builder with AI integration
- Knowledge Base with vector embeddings
- Lead CRM with real-time updates
- Marketing content generator
- Marketplace templates (15 pre-built)

**Milestone 3** - Coming Soon
- Phone Agent (Twilio integration)
- Website Builder with hosting
- Advanced analytics
- Team collaboration

## 📞 Support

- **Quick Start:** [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Deployment:** [supabase/DEPLOYMENT.md](./supabase/DEPLOYMENT.md)
- **Issues:** [GitHub Issues](https://github.com/your-org/buildmybot/issues)

---
© 2024 BuildMyBot. All rights reserved.
