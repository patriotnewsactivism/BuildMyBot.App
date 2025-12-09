# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuildMyBot is a white-label AI chatbot platform built with React + Vite + TypeScript. The application is currently in transition from Firebase to Supabase as the backend (see PLAN.md for migration details).

## Common Development Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 8080
npm run build        # TypeScript compile + production build
npm run preview      # Preview production build
```

### Build & Deploy
```bash
# Docker deployment
docker build -t buildmybot .
docker run -p 8080:80 buildmybot

# Google Cloud Build (via cloudbuild.yaml)
gcloud builds submit --config cloudbuild.yaml
```

### Testing
Currently no test suite configured. When adding tests, use standard React testing patterns.

## Architecture

### File Structure
```
/
├── App.tsx                 # Main application entry, routing, auth state
├── index.tsx              # React DOM mount point
├── types.ts               # Global TypeScript interfaces (User, Bot, Lead, etc.)
├── constants.ts           # PLANS, MOCK_ANALYTICS_DATA
├── components/            # Feature modules (organized by domain)
│   ├── Auth/             # AuthModal, PartnerSignup
│   ├── BotBuilder/       # Bot creation & configuration
│   ├── Chat/             # FullPageChat, ChatLogs
│   ├── CRM/              # LeadsCRM (pipeline management)
│   ├── Marketing/        # MarketingTools (content generation)
│   ├── WebsiteBuilder/   # Website page builder
│   ├── PhoneAgent/       # AI phone agent interface
│   ├── Marketplace/      # Bot template marketplace
│   ├── Reseller/         # ResellerDashboard, LandingPage
│   ├── Admin/            # AdminDashboard (user management)
│   ├── Billing/          # Subscription & plan management
│   ├── Landing/          # LandingPage, PartnerProgramPage
│   ├── Layout/           # Sidebar navigation
│   └── Settings/         # User settings
├── services/
│   ├── supabaseClient.ts # Supabase client initialization
│   ├── dbService.ts      # Database abstraction (real-time subscriptions)
│   ├── geminiService.ts  # Google Gemini AI integration
│   ├── openaiService.ts  # OpenAI GPT integration
│   └── firebaseConfig.ts # Legacy Firebase (being phased out)
└── supabase/             # Backend schema & functions (empty = in progress)
```

### Routing
Simple manual routing in App.tsx:
- `/chat/{botId}` → FullPageChat component (full-screen embedded chat)
- All other routes use view-based switching via currentView state

### State Management
- Local React state in App.tsx (user, bots, leads, chatLogs)
- Real-time subscriptions via dbService (Supabase postgres_changes)
- Auth state managed by Supabase auth listener

### Data Layer (services/dbService.ts)
All database operations use real-time subscription pattern:
- `subscribeToBots(onUpdate)` / `saveBot(bot)`
- `subscribeToLeads(onUpdate)` / `saveLead(lead)`
- `getUserProfile(uid)` / `saveUserProfile(user)`
- `subscribeToReferrals(code, onUpdate)` (for reseller tracking)
- Admin functions: `getAllUsers()`, `updateUserStatus(uid, status)`

### Authentication
Supabase Auth with special "God Mode" logic in App.tsx:86-97:
- Master admin emails (MASTER_EMAILS array) get ADMIN role + ENTERPRISE plan
- Standard users load from profiles table via getUserProfile()
- Referral codes captured from `?ref=CODE` query param and stored in localStorage

### AI Services
- **Gemini** (services/geminiService.ts): For AI chat completions
- **OpenAI** (services/openaiService.ts): For GPT-4o/GPT-4o Mini completions
- Both services handle streaming responses and conversation logging

### User Roles & Plans
```typescript
enum UserRole { OWNER, ADMIN, RESELLER }
enum PlanType { FREE, STARTER, PROFESSIONAL, EXECUTIVE, ENTERPRISE }
```
- ADMIN role grants access to AdminDashboard (user management, suspension)
- RESELLER role enables ResellerDashboard (client tracking, commissions)
- Plans control feature access and usage quotas (defined in constants.ts)

## Key Features & Components

### Bot Builder (components/BotBuilder/)
- Visual editor for bot configuration (name, persona, system prompt, model, temperature)
- Knowledge base file upload (PDF, URL, text)
- RAG training interface
- Preview chat for testing

### Lead CRM (components/CRM/)
- Hot lead detection with 0-100 scoring
- Kanban and List views for pipeline management
- SMS/Email notification triggers
- CSV export functionality

### Reseller Portal (components/Reseller/)
- White-label ready (customDomain field in User type)
- Commission tracking (Bronze/Silver/Gold/Platinum tiers)
- Referral code generation and tracking
- Real-time client management dashboard

### Phone Agent (components/PhoneAgent/)
- 24/7 AI receptionist
- Twilio integration for call handling
- Transcript logging to phone_calls table
- Human-like voice synthesis configuration

### Marketing Studio (components/Marketing/)
- Viral content generator (Twitter/X threads, LinkedIn posts)
- Instant website builder (industry-specific landing pages)
- Email/ad/blog post generation

### Marketplace (components/Marketplace/)
- Pre-built bot templates by industry
- One-click installation via marketplace-install-template endpoint

## Backend Migration (Firebase → Supabase)

**Current State:** Dual-mode operation
- Auth: Supabase (active)
- Database: Supabase (active for bots, leads, profiles)
- Legacy: Firebase config still present (firebaseConfig.ts)

**Target Schema:** See PLAN.md sections 2-3 for full schema and RLS policies.

Key tables:
- `profiles` (users with role, plan, referral tracking)
- `bots` (bot configurations with owner_id)
- `leads` (captured leads with scoring)
- `conversations` (chat message history)
- `knowledge_base` (RAG embeddings with pgvector)
- `reseller_accounts`, `reseller_clients`, `commissions`
- `billing_accounts`, `usage_events`
- `marketing_content`, `website_pages`, `phone_calls`

### Edge Functions (Planned)
Located in supabase/functions/ (currently empty):
- `ai-complete`: OpenAI proxy with usage tracking
- `create-lead`: Lead capture with ownership validation
- `embed-knowledge-base`: Generate and store embeddings
- `billing-overage-check`: Enforce plan limits
- `marketplace-install-template`: Template installation
- `reseller-track-referral`: Referral attribution

## Environment Variables

Required in `.env`:
```bash
# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Supabase (active)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Vercel deployments may require NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Firebase (legacy - being phased out)
VITE_FIREBASE_API_KEY=...
```

## Development Workflow

1. **Adding a new feature**: Follow the component-based structure. Place domain logic in appropriate components/ subdirectory.

2. **Database operations**: Always use dbService abstraction. Real-time subscriptions ensure UI stays in sync.

3. **Adding AI functionality**: Use geminiService or openaiService. Both support streaming and conversation logging.

4. **Role-based features**: Check user.role in component render logic. ADMIN gets full access, RESELLER gets partner features.

5. **Billing enforcement**: Check user.plan against PLANS constants. Display upgrade prompts for locked features.

6. **Styling**: Tailwind CSS throughout. Theme color customization via bot.themeColor field.

## TypeScript Patterns

- All types defined in types.ts (User, Bot, Lead, Conversation, etc.)
- Optional userId during creation, required in database (added by dbService.save* methods)
- Enums for UserRole and PlanType ensure type safety
- Interface extensions for specialized configs (PhoneAgentConfig, ResellerStats)

## Security Notes

- Master admin emails hardcoded in App.tsx:35 (MASTER_EMAILS array)
- RLS policies enforce owner_id checks (see PLAN.md section 3)
- Sensitive operations MUST go through Edge Functions (not direct Supabase calls)
- API keys never exposed to frontend except VITE_SUPABASE_ANON_KEY (safe for client use)

## Deployment

### Cloud Run (via Docker)
Dockerfile configured with:
- Node 22 build stage
- nginx static file serving
- Port 8080 exposure

### Cloud Build
cloudbuild.yaml defines:
1. Docker image build
2. Push to gcr.io/wtp-apps/buildmybot
3. Deploy to Cloud Run

### Vercel/Netlify
Standard Vite SPA deployment:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables required (see .env.example)

## Known Limitations

- No automated test suite yet
- Supabase schema migration incomplete (schema.sql is empty)
- Edge Functions not yet deployed
- Firebase dependencies still present (cleanup pending)
- Some mock data used for analytics (MOCK_ANALYTICS_DATA in constants.ts)

## Next Development Priorities

See PLAN.md sections 7-13 for full roadmap. Key items:
1. Complete Supabase schema migration (apply SQL from PLAN.md)
2. Deploy Edge Functions for secure backend operations
3. Implement RLS policies for multi-tenant isolation
4. Remove Firebase dependencies entirely
5. Add comprehensive test coverage
6. Implement Stripe billing integration
7. Deploy pgvector for RAG knowledge base search
