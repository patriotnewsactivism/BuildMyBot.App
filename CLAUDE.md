# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuildMyBot is a white-label AI chatbot platform built with Next.js 14 (App Router), React, and TypeScript. The application has migrated from Vite to Next.js and is in the process of completing migration from Firebase to Supabase as the backend (see PLAN.md for migration details).

## Common Development Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start Next.js dev server (default port 3000)
npm run build        # Production build with Next.js
npm start            # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm test             # Run Vitest unit tests
npm run test:e2e     # Run Playwright e2e tests
npm run test:e2e:ui  # Run Playwright with UI mode
npm run test:e2e:headed      # Run Playwright in headed mode
npm run test:e2e:report      # View Playwright test report
```

### Utilities
```bash
npm run check-links  # Check for broken links in the codebase
```

### Testing
```bash
npm run test         # Run unit tests with Vitest
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run E2E tests with interactive UI
```

### Build & Deploy
```bash
# Docker deployment
docker build -t buildmybot .
docker run -p 80:80 buildmybot

# Google Cloud Build (via cloudbuild.yaml)
gcloud builds submit --config cloudbuild.yaml
```

## Architecture

### Backend Architecture
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- Database operations abstracted via `services/dbService.ts` for clean separation of concerns
- All Firebase dependencies have been removed (migration complete)

### File Structure
```
/
├── app/                   # Next.js App Router
│   ├── layout.tsx        # Root layout with metadata
│   ├── page.tsx          # Homepage (dynamically imports App.tsx)
│   ├── globals.css       # Global styles
│   └── api/              # Next.js API routes
│       └── ai/           # AI proxy endpoint
├── App.tsx               # Main React app (client component), routing, auth state
├── types.ts              # Global TypeScript interfaces (User, Bot, Lead, etc.)
├── constants.ts          # PLANS, MOCK_ANALYTICS_DATA
├── components/           # Feature modules (organized by domain)
│   ├── Auth/            # AuthModal, PartnerSignup
│   ├── BotBuilder/      # Bot creation & configuration
│   ├── Chat/            # FullPageChat, ChatLogs
│   ├── CRM/             # LeadsCRM (pipeline management)
│   ├── Marketing/       # MarketingTools (content generation)
│   ├── WebsiteBuilder/  # Website page builder
│   ├── PhoneAgent/      # AI phone agent interface
│   ├── Marketplace/     # Bot template marketplace
│   ├── Reseller/        # ResellerDashboard, LandingPage
│   ├── Admin/           # AdminDashboard (user management)
│   ├── Billing/         # Subscription & plan management
│   ├── Landing/         # LandingPage, PartnerProgramPage
│   ├── Layout/          # Sidebar navigation
│   └── Settings/        # User settings
├── services/
│   ├── supabaseClient.ts # Supabase client initialization
│   ├── dbService.ts      # Database abstraction (real-time subscriptions)
│   ├── geminiService.ts  # Google Gemini AI integration
│   └── openaiService.ts  # OpenAI GPT integration
└── supabase/             # Backend schema & functions (empty = in progress)
│   ├── supabaseClient.ts    # Supabase client initialization
│   ├── dbService.ts         # Database abstraction (real-time subscriptions)
│   ├── edgeFunctions.ts     # Supabase Edge Function wrappers
│   ├── geminiService.ts     # Google Gemini AI integration
│   ├── openaiService.ts     # OpenAI GPT integration
│   ├── leadCapture.ts       # Lead scoring & capture logic
│   ├── resellerService.ts   # Reseller operations
│   ├── marketingService.ts  # Marketing content generation
│   ├── phoneCallService.ts  # Phone agent operations
│   ├── websiteService.ts    # Website builder operations
│   ├── auditService.ts      # Audit logging
│   ├── sentryInit.ts        # Sentry error tracking setup
│   ├── posthogInit.ts       # PostHog analytics setup
│   └── firebaseConfig.ts    # Legacy Firebase (being phased out)
├── supabase/
│   └── functions/           # Supabase Edge Functions (deployed)
│       ├── ai-complete/            # AI proxy with usage tracking
│       ├── create-lead/            # Lead capture endpoint
│       ├── embed-knowledge-base/   # RAG embedding generation
│       ├── billing-overage-check/  # Plan limit enforcement
│       ├── marketplace-install-template/
│       ├── reseller-track-referral/
│       ├── scrape-url/             # URL content extraction
│       └── twilio-call-webhook/    # Phone call handling
├── tests/                # Unit tests
├── e2e/                  # Playwright e2e tests
└── utils/                # Utility functions
```

### Routing & Rendering Strategy
**Hybrid Next.js + SPA Architecture:**
- The app uses Next.js App Router as the foundation but renders most of the UI as a client-side SPA
- Entry point: app/page.tsx dynamically imports App.tsx with `ssr: false` for full client-side rendering
- This preserves the existing Vite-style SPA architecture while gaining Next.js benefits (API routes, SSR capability for future pages)

**Next.js App Router:**
- `/` → app/page.tsx dynamically imports App.tsx (client-side SPA)
- `/api/ai` → Next.js API route for AI completions (server-side proxy)

**Client-side routing in App.tsx:**
- `/chat/{botId}` → FullPageChat component (full-screen embedded chat)
- `/landing`, `/public` → Public landing pages
- All authenticated routes use view-based switching via currentView state
- URL parsing done with `window.location.pathname` (client-side only)

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

**Edge Functions (services/edgeFunctions.ts)** provide secure server-side operations:
- `callAIComplete()` - AI completions with usage tracking
- `createLead()` - Lead capture with validation
- `embedKnowledgeBase()` - RAG embedding generation
- `checkBillingOverage()` - Plan limit enforcement
- `installMarketplaceTemplate()` - Template installation
- `trackReferral()` - Referral attribution

### Authentication
Supabase Auth with special "God Mode" logic in App.tsx:43-44:
- Master admin emails (MASTER_EMAILS array) get ADMIN role + ENTERPRISE plan
- Limited admin emails (LIMITED_ADMIN_EMAILS array) get ADMIN role with standard plan
- Standard users load from profiles table via getUserProfile()
- Referral codes captured from `?ref=CODE` query param and stored in localStorage

### AI Services
- **Next.js API Route** (app/api/ai/route.ts): Server-side proxy for AI calls to protect API keys
- **Gemini** (services/geminiService.ts): For AI chat completions
- **OpenAI** (services/openaiService.ts): For GPT-4o/GPT-4o Mini completions
- **Supabase Edge Function** (supabase/functions/ai-complete): Alternative secure proxy with usage tracking
- All services handle streaming responses and conversation logging

### Error Tracking
- Sentry integration for production error monitoring
- Source maps uploaded automatically during build

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
- Specialized personas: City Government, Recruitment, Travel, Real Estate

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

## Backend Architecture

**Current State:** Supabase-only operation
- Auth: Supabase Auth with JWT
- Database: Supabase Postgres with real-time subscriptions
- Edge Functions: Deployed for secure backend operations
- Storage: Supabase Storage for file uploads

**Target Schema:** See PLAN.md for full schema and RLS policies.

Key tables:
- `profiles` (users with role, plan, referral tracking)
- `bots` (bot configurations with owner_id)
- `leads` (captured leads with scoring)
- `conversations` (chat message history)
- `knowledge_base` (RAG embeddings with pgvector)
- `reseller_accounts`, `reseller_clients`, `commissions`
- `billing_accounts`, `usage_events`
- `marketing_content`, `website_pages`, `phone_calls`

### Edge Functions (Deployed)
Located in supabase/functions/:
- `ai-complete`: OpenAI proxy with usage tracking
- `create-lead`: Lead capture with ownership validation
- `embed-knowledge-base`: Generate and store embeddings
- `billing-overage-check`: Enforce plan limits
- `marketplace-install-template`: Template installation
- `reseller-track-referral`: Referral attribution
- `scrape-url`: URL content extraction for knowledge base
- `twilio-call-webhook`: Phone call handling and transcription

## Environment Variables

Required in `.env`:
```bash
# OpenAI (used in Next.js API route)
OPENAI_API_KEY=sk-...                    # Server-side only (not VITE_ prefixed)

# Gemini (optional)
VITE_GEMINI_API_KEY=...

# Supabase (active)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# PostHog Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry (optional)
VITE_SENTRY_DSN=...
VITE_SENTRY_ORG=...
VITE_SENTRY_PROJECT=...
VITE_SENTRY_AUTH_TOKEN=...

# Vercel deployments may require NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Important:**
- Use `NEXT_PUBLIC_` prefix for client-side variables (replaces `VITE_`)
- Server-side only variables (like `OPENAI_API_KEY`) should NOT have `NEXT_PUBLIC_` prefix
- The Next.js API route at `/api/ai` proxies AI calls to protect server-side keys

## Development Workflow

1. **Adding a new feature**: Follow the component-based structure. Place domain logic in appropriate components/ subdirectory.

2. **Database operations**: Always use dbService abstraction. Real-time subscriptions ensure UI stays in sync.

3. **Adding AI functionality**:
   - For client-side calls: Use the Next.js API route (`/api/ai`) to proxy requests and protect API keys
   - For server-side operations: Use Supabase Edge Functions (`supabase/functions/ai-complete`)
   - Legacy: geminiService and openaiService (being migrated to secure proxies)

4. **Role-based features**: Check user.role in component render logic. ADMIN gets full access, RESELLER gets partner features.

5. **Billing enforcement**: Check user.plan against PLANS constants. Display upgrade prompts for locked features.

6. **Styling**: Tailwind CSS throughout. Theme color customization via bot.themeColor field.

7. **Testing**:
   - Write unit tests in `tests/` or colocated `*.test.ts` files
   - Use Vitest for unit tests with `npm test`
   - Write e2e tests in `e2e/` using Playwright
   - Run e2e tests with `npm run test:e2e` or `npm run test:e2e:ui`

8. **Error tracking**: Sentry is initialized on app startup (services/sentryInit.ts). Errors are automatically captured.

9. **Analytics**: PostHog is initialized on app startup (services/posthogInit.ts) for product analytics.

## TypeScript Patterns

- All types defined in types.ts (User, Bot, Lead, Conversation, etc.)
- Optional userId during creation, required in database (added by dbService.save* methods)
- Enums for UserRole and PlanType ensure type safety
- Interface extensions for specialized configs (PhoneAgentConfig, ResellerStats)

## Important Patterns & Conventions

### Client Component Usage
- App.tsx and most components use `'use client'` directive (required for client-side state and interactivity)
- This is expected behavior for the SPA-style architecture within Next.js

### Real-time Data Pattern
```typescript
// Subscribe to data changes
useEffect(() => {
  const unsubscribe = dbService.subscribeToBots((updatedBots) => {
    setBots(updatedBots);
  });
  return () => unsubscribe?.();
}, []);
```

### Secure AI Calls Pattern
```typescript
// Preferred: Use Next.js API route
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, model })
});

// Alternative: Use Supabase Edge Function
const result = await edgeFunctions.callAIComplete({ messages, model });
```

### Role-based Rendering
```typescript
// Check user role before rendering admin features
{user?.role === UserRole.ADMIN && <AdminDashboard />}
{user?.role === UserRole.RESELLER && <ResellerDashboard />}
```

### Plan Enforcement
```typescript
// Check plan limits before allowing feature access
const currentPlan = PLANS[user.plan];
if (bots.length >= currentPlan.maxBots) {
  // Show upgrade prompt
}
```

## Security Notes

- Master admin emails hardcoded in App.tsx:43 (MASTER_EMAILS array)
- Limited admin emails hardcoded in App.tsx:44 (LIMITED_ADMIN_EMAILS array)
- RLS policies enforce owner_id checks (see PLAN.md)
- Sensitive operations MUST go through Edge Functions or Next.js API routes (not direct client calls)
- API keys protected:
  - `OPENAI_API_KEY` is server-side only (used in `/api/ai` route)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for client use (RLS policies enforce security)
  - Never expose server-side keys to the frontend
- Security headers configured in next.config.mjs (Referrer-Policy, X-Content-Type-Options)
- Audit logging available via services/auditService.ts

## Deployment

### Docker
Dockerfile configured with:
- Node 22 build stage
- Next.js standalone build (`output: 'standalone'` in next.config.mjs)
- nginx static file serving
- Port 80 exposure

### Google Cloud Build
cloudbuild.yaml defines:
1. Docker image build
2. Push to gcr.io/$PROJECT_ID/buildmybot
3. Deploy to Cloud Run (manual step required)

### Vercel (Recommended for Next.js)
Native Next.js deployment:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables required (see .env section)

## Known Limitations

- No automated test suite yet (Vitest/Playwright configured but no tests written)
- Some mock data used for analytics (MOCK_ANALYTICS_DATA in constants.ts)
- Stripe billing integration not yet implemented
- pgvector for RAG knowledge base search not fully configured

## Next Development Priorities

See PLAN.md sections 7-13 for full roadmap. Key items:
1. ✅ Supabase schema migration (complete)
2. ✅ Edge Functions deployed
3. ✅ RLS policies implemented
4. ✅ Firebase dependencies removed
5. Add comprehensive test coverage
6. Implement Stripe billing integration
7. Configure pgvector for enhanced RAG knowledge base search
8. Create data migration scripts for existing Firebase users (if needed)
- Framework preset: Next.js
- Environment variables required (see Environment Variables section above)
- Automatic serverless function deployment for API routes

### Other Platforms
Standard Next.js deployment:
- Build command: `npm run build`
- Start command: `npm start`
- Output directory: `.next`
- Ensure all environment variables are configured

## Known Limitations & Migration Status

- ✅ **Completed:**
  - Migrated from Vite to Next.js 14 with App Router
  - Deployed Supabase Edge Functions
  - Implemented unit tests (Vitest) and e2e tests (Playwright)
  - Added Sentry error tracking and PostHog analytics
  - Next.js API route for secure AI proxying

- ⚠️ **In Progress:**
  - Supabase schema migration (some tables may not be fully migrated)
  - Removing Firebase dependencies (firebaseConfig.ts still present)
  - CI/CD pipeline stabilization for Playwright tests
  - Complete migration of all AI calls to secure proxies

- ⏳ **Pending:**
  - Stripe billing integration (Billing.tsx has placeholder UI)
  - Complete pgvector implementation for RAG search
  - Full RLS policy testing and verification
  - Comprehensive test coverage (currently partial)

## Next Development Priorities

See PLAN.md for comprehensive roadmap. Key items:
1. **Backend Completion:**
   - Finalize Supabase schema migration and verify all tables
   - Implement and test RLS policies for multi-tenant isolation
   - Remove all Firebase dependencies
   - Deploy pgvector for RAG knowledge base search

2. **Billing & Compliance:**
   - Integrate Stripe for subscription management
   - Enforce plan limits and overage handling
   - Add GDPR compliance features (data export/deletion)

3. **Testing & Quality:**
   - Increase test coverage to >90% for critical paths
   - Stabilize Playwright e2e tests in CI
   - Add accessibility testing (WCAG 2.1 AA compliance)

4. **Performance & UX:**
   - Optimize bundle size with code splitting
   - Add PWA capabilities for offline support
   - Implement ISR for dynamic pages
   - Improve SEO with comprehensive metadata and structured data

5. **Reseller Features:**
   - Widget theme editor for white-label customization
   - Enhanced commission tracking and reporting
   - Custom domain support
