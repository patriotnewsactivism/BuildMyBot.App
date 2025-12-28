# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuildMyBot is a white-label AI chatbot platform built with React + Next.js + TypeScript. The application uses Supabase for backend services (database, auth, edge functions).

## Development Commands

```bash
npm install           # Install dependencies
npm run dev           # Start Next.js dev server
npm run build         # Production build
npm run lint          # ESLint check
npm run test          # Run Vitest unit tests
npm run test:e2e      # Run Playwright e2e tests
npm run test:e2e:ui   # Playwright with UI
npm run check-links   # Check for broken links
```

### Deployment
```bash
# Docker
docker build -t buildmybot .
docker run -p 8080:80 buildmybot

# Google Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

### Testing
```bash
# Unit tests (Vitest)
npm run test              # Run unit tests once
npm run dev              # Dev mode with test watching

# E2E tests (Playwright)
npm run test:e2e          # Run E2E tests headless
npm run test:e2e:ui       # Run with Playwright UI
npm run test:e2e:headed   # Run with browser visible
npm run test:e2e:report   # View test report

# Other
npm run check-links       # Check for broken links
```

Test structure:
- `e2e/` - Playwright end-to-end tests (golden-path.spec.ts, widget.spec.ts)
  - Tests run against localhost:8080 (auto-started via webServer config)
  - Multi-browser testing: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
  - Screenshots/videos captured on failure for debugging
- `services/__tests__/` - Unit tests for service layer
- `tests/` - Additional test utilities
- `vitest.setup.ts` - Vitest configuration with jsdom environment
- `playwright.config.ts` - E2E test configuration with retry/parallelization settings

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
│   ├── firebaseConfig.ts # Legacy Firebase (being phased out)
│   └── __tests__/        # Service layer unit tests
├── supabase/             # Backend schema, migrations & functions
├── e2e/                  # Playwright end-to-end tests
└── tests/                # Test utilities and helpers
```


### Routing
- Next.js App Router in `app/` directory
- API routes in `app/api/`
- Legacy: `/chat/{botId}` routes handled via view-based switching in App.tsx

### State Management
- Local React state in App.tsx (user, bots, leads, chatLogs)
- Real-time subscriptions via `services/dbService.ts` (Supabase postgres_changes)
- Auth state managed by Supabase auth listener

### Data Layer (services/dbService.ts)
All database operations use real-time subscription pattern:
- `subscribeToBots(onUpdate)` / `saveBot(bot)`
- `subscribeToLeads(onUpdate)` / `saveLead(lead)`
- `getUserProfile(uid)` / `saveUserProfile(user)`
- Admin functions: `getAllUsers()`, `updateUserStatus(uid, status)`

### Authentication
Supabase Auth with "God Mode" logic in App.tsx:
- Master admin emails (MASTER_EMAILS array) get ADMIN role + ENTERPRISE plan
- Standard users load from profiles table
- Referral codes captured from `?ref=CODE` query param

### AI Services
- `services/geminiService.ts`: Google Gemini AI integration
- `services/openaiService.ts`: OpenAI GPT-4o/GPT-4o Mini
- Both handle streaming responses and conversation logging

### User Roles & Plans
```typescript
enum UserRole { OWNER, ADMIN, RESELLER }
enum PlanType { FREE, STARTER, PROFESSIONAL, EXECUTIVE, ENTERPRISE }
```
Plans and feature limits defined in `constants.ts`.

## Key Components

| Directory | Purpose |
|-----------|---------|
| `components/BotBuilder/` | Bot creation, knowledge base upload, RAG training |
| `components/CRM/` | Lead pipeline with 0-100 scoring, Kanban/List views |
| `components/Reseller/` | White-label portal, commission tracking |
| `components/PhoneAgent/` | AI receptionist, Twilio integration |
| `components/Marketing/` | Content generation, website builder |
| `components/Admin/` | User management dashboard |

## Database (Supabase)

Key tables: `profiles`, `bots`, `leads`, `conversations`, `knowledge_base`, `website_pages`

### Phone Agent (components/PhoneAgent/)
- 24/7 AI receptionist with real-time voice conversations
- **Twilio + Cartesia Sonic integration** for ultra-low latency (<200ms)
- WebSocket streaming for bidirectional audio
- Automatic transcript logging to phone_calls table
- Multiple voice options (alloy, echo, fable, onyx, nova, shimmer)
- See VOICE_AGENT_SETUP.md for complete setup instructions

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

### Edge Functions
Located in supabase/functions/:
- `ai-complete`: OpenAI proxy with usage tracking
- `create-lead`: Lead capture with ownership validation
- `embed-knowledge-base`: Generate and store embeddings
- `billing-overage-check`: Enforce plan limits
- `marketplace-install-template`: Template installation
- `reseller-track-referral`: Referral attribution
- `twilio-voice-handler`: TwiML handler for incoming calls (connects to Cartesia)
- `twilio-voice-stream`: WebSocket handler for real-time voice streaming
- `twilio-call-webhook`: Status callback handler for call logging and transcripts

## Environment Variables

Required in `.env` (see `.env.example` for full template):
```bash
# Supabase (active backend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Vercel/Next.js deployments
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Monitoring & Analytics
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_SENTRY_ORG=your-org
VITE_SENTRY_PROJECT=buildmybot-app
VITE_SENTRY_AUTH_TOKEN=your-auth-token
VITE_ENVIRONMENT=production

VITE_POSTHOG_API_KEY=phc_your_api_key
VITE_POSTHOG_HOST=https://app.posthog.com

# Stripe (publishable key only - safe for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# SECURITY: NEVER put these in frontend .env
# Set via Supabase Edge Function secrets instead:
# - OPENAI_API_KEY (for AI services)
# - STRIPE_SECRET_KEY (for billing)
# - STRIPE_WEBHOOK_SECRET (for webhook verification)
# - CARTESIA_API_KEY (for voice AI - sub-200ms latency TTS)
# - TWILIO_ACCOUNT_SID (for phone calls)
# - TWILIO_AUTH_TOKEN (for webhook signature validation)
# - TWILIO_PHONE_NUMBER (optional - for outbound calls)
```

## Security Notes

- Master admin emails hardcoded in App.tsx (MASTER_EMAILS array)
- RLS policies enforce owner_id checks
- Sensitive operations go through Edge Functions
- API keys never exposed to frontend except VITE_SUPABASE_ANON_KEY

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

## Monitoring & Observability

### Sentry (Error Tracking & Performance)
- Configured via `@sentry/react` and `@sentry/vite-plugin`
- Automatic error boundary integration
- Performance monitoring with automatic instrumentation
- Source maps uploaded during build (disabled in dev mode)
- Configuration in vite.config.ts

### PostHog (Product Analytics)
- User behavior tracking and feature usage analytics
- Session recording capabilities
- Feature flag support
- Event tracking for user actions

### Development vs Production
- Sentry plugin disabled in development mode
- Use VITE_ENVIRONMENT to control environment-specific behavior
- Monitoring tools initialized in production only

## Known Limitations

- Supabase schema migration incomplete (schema.sql is empty, see supabase/migrations/)
- Firebase dependencies still present (cleanup pending)

## Next Development Priorities

See PLAN.md sections 7-13 for full roadmap. Key items:
1. Complete Supabase schema migration (apply SQL from PLAN.md)
2. Deploy Edge Functions for secure backend operations
3. Implement RLS policies for multi-tenant isolation
4. Remove Firebase dependencies entirely
5. Add comprehensive test coverage
6. Implement Stripe billing integration
7. Deploy pgvector for RAG knowledge base search
