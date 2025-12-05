
# BuildMyBot.app

The ultimate white-label AI chatbot platform for businesses and agencies. Build, deploy, and resell intelligent bots with zero coding.

## Overview

BuildMyBot is an all-in-one AI Operating System that empowers businesses to automate customer interactions across text, web, and voice. It includes a comprehensive suite of tools for lead generation, customer support, and marketing automation.

## Key Features

### AI Bot Builder
- **Specialized Personas:** tailored roles for City Government, Recruitment, Travel, Real Estate, and more
- **RAG Knowledge Base:** Train bots on PDFs, Website URLs, and text data with vector embeddings
- **Visual Editor:** No-code customization of identity, tone, and behavior

### AI Phone Agent
- **24/7 Receptionist:** Handles incoming calls, books appointments, and routes urgent issues
- **Human-like Voice:** Powered by Twilio with neural speech synthesis
- **Call Logging:** Transcripts automatically saved to the CRM with sentiment analysis

### Lead CRM
- **Hot Lead Detection:** Automatically scores leads (0-100) based on conversation intent
- **Pipeline Management:** Kanban and List views to manage deal flow
- **CSV Export:** Export leads for external use

### Marketing Studio
- **Viral Content Generator:** Create high-engagement Twitter/X threads and LinkedIn posts
- **Instant Website Builder:** Generate industry-specific landing pages in seconds

### Reseller & Partner Portal
- **White-label Ready:** Agencies can resell the platform under their own brand
- **Commission Tracking:** Real-time dashboard for earnings, payouts, and client management
- **Tiered System:** Bronze, Silver, Gold, and Platinum tiers with increasing commission rates

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, RLS) |
| AI | OpenAI GPT-4o / GPT-4o-mini, text-embedding-3-small |
| Phone | Twilio Voice API |
| Payments | Stripe |
| Icons | Lucide React |
| Charts | Recharts |

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase Project (create at [supabase.com](https://supabase.com))
- OpenAI API Key
- (Optional) Stripe Account for billing
- (Optional) Twilio Account for phone agent

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/patriotnewsactivism/BuildMyBot.App.git
   cd BuildMyBot.App
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   ```env
   # Supabase (Required)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

   # OpenAI (Required)
   VITE_OPENAI_API_KEY=sk-your-key
   ```

4. **Deploy Supabase Schema:**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Deploy schema and RLS policies
   supabase db push

   # Deploy Edge Functions
   supabase functions deploy

   # Seed marketplace templates (optional)
   psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/seed_templates.sql
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
BuildMyBot.App/
├── components/           # React UI components
│   ├── Admin/           # Admin dashboard
│   ├── Auth/            # Authentication
│   ├── BotBuilder/      # Bot creation/editing
│   ├── CRM/             # Lead management
│   ├── Chat/            # Chat interface
│   ├── Marketplace/     # Template gallery
│   ├── PhoneAgent/      # Phone configuration
│   └── ...
├── services/            # API integrations
│   ├── dbService.ts     # Supabase database operations
│   ├── openaiService.ts # OpenAI API calls
│   └── supabaseClient.ts
├── supabase/            # Supabase configuration
│   ├── functions/       # Edge Functions (8 total)
│   │   ├── ai-complete/
│   │   ├── create-lead/
│   │   ├── embed-knowledge-base/
│   │   ├── billing-overage-check/
│   │   ├── marketplace-install-template/
│   │   ├── reseller-track-referral/
│   │   ├── stripe-webhook/
│   │   └── twilio-webhook/
│   ├── schema.sql       # Database schema (16 tables)
│   ├── rls_policies.sql # Row-Level Security
│   └── seed_templates.sql
├── types/               # TypeScript definitions
│   ├── supabase.ts      # Database types
│   └── types.ts         # App types
├── public/
│   └── embed.js         # Embeddable chat widget
└── .github/workflows/   # CI/CD
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts & settings |
| `bots` | AI chatbot configurations |
| `knowledge_base` | RAG documents with vector embeddings |
| `conversations` | Chat sessions |
| `leads` | Captured contact information |
| `templates` | Marketplace bot templates |
| `plans` | Pricing tiers |
| `billing_accounts` | Stripe subscriptions |
| `usage_events` | Token/API usage tracking |
| `reseller_accounts` | Partner profiles |
| `reseller_clients` | Reseller-client relationships |
| `referrals` | Referral tracking |
| `commissions` | Commission records |
| `marketing_content` | Generated content |
| `website_pages` | AI-generated pages |
| `phone_calls` | Twilio call logs |

## Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `ai-complete` | Chat completions with billing enforcement | Public |
| `create-lead` | Lead capture from widgets | Public |
| `embed-knowledge-base` | Vector embeddings | JWT |
| `billing-overage-check` | Usage validation | JWT |
| `marketplace-install-template` | Template installation | JWT |
| `reseller-track-referral` | Referral tracking | Public |
| `stripe-webhook` | Subscription management | Stripe Sig |
| `twilio-webhook` | Phone call handling | Twilio Auth |

## Deployment

### Docker

```bash
# Build image
docker build -t buildmybot .

# Run container
docker run -p 80:80 buildmybot
```

### Vercel / Netlify

The app is configured for static hosting. Build output goes to `dist/`:

```bash
npm run build
```

### GitHub Actions

CI/CD is configured in `.github/workflows/ci.yml`:
- Builds and type-checks on push
- Deploys Edge Functions on main branch
- Builds Docker image and pushes to GHCR

Required secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

## Embedding the Chat Widget

Add to any website:

```html
<script src="https://your-domain.com/embed.js" data-bot-id="your-bot-id"></script>
```

## Architecture

See [PLAN.md](./PLAN.md) for detailed engineering specifications.

## License

© 2025 BuildMyBot. All rights reserved.
