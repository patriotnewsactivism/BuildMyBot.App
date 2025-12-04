# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<<<<<<< Updated upstream
## Development Commands

### Running the Application
```bash
npm run dev      # Start Next.js development server on http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Supabase Commands
```bash
supabase start           # Start local Supabase instance
supabase stop            # Stop local Supabase instance
supabase db push         # Push schema changes to database
supabase functions deploy # Deploy Edge Functions
```

Note: There are currently no test scripts configured in package.json.

## Architecture Overview

### Migration Status: Firebase → Supabase
This codebase is **in active migration** from Firebase/Vite to Next.js 14 + Supabase. You will encounter:
- Backup files (`.backup` suffix) from the old Vite architecture
- Stub services in `services/` marked with migration TODOs
- Legacy Gemini service code that should be replaced with OpenAI
- TypeScript/ESLint build errors currently ignored in `next.config.cjs`

**Target architecture** (see PLAN.md for full details):
```
Next.js 14 App Router (Frontend)
    ↓
Supabase Auth (JWT-based)
    ↓
Supabase Edge Functions (server-side API)
    ↓
Supabase Postgres with RLS (Row-Level Security)
    ↓
OpenAI GPT-4o (LLM provider)
```

### Key Architectural Principles

1. **Row-Level Security (RLS) First**: All database operations must respect RLS policies. Every resource has an `owner_id` and users can only access their own data.

2. **Server-Side API Keys**: OpenAI, Stripe, and Supabase service role keys MUST remain server-side only. Use Edge Functions or Next.js API routes for sensitive operations.

3. **Auth Pattern**: Use `lib/auth.ts` helpers (`requireAuth`, `requireRole`, `checkPlanLimits`) for protecting routes and enforcing subscription limits.

4. **Client vs Server Supabase**:
   - `lib/supabase.ts` - Client-side Supabase client (anon key)
   - `lib/auth.ts` - Server-side client (service role key) for privileged operations

## Database Schema

See PLAN.md section 2 for complete schema. Key tables:
- `profiles` - User accounts with plan tier and role
- `bots` - AI chatbot configurations
- `knowledge_base` - RAG embeddings (uses pgvector)
- `conversations` - Chat history with sentiment analysis
- `leads` - CRM lead records with scoring
- `reseller_accounts` / `reseller_clients` / `commissions` - White-label reseller system
- `billing_accounts` / `usage_events` - Subscription tracking and billing
- `phone_calls` - AI phone agent call logs
- `marketing_content` - Generated marketing assets
- `website_pages` - Website builder output

## Core Features & Modules

### 1. Bot Builder
Multi-persona AI bots (City Government, Recruitment, Travel, Real Estate). Key files in `types.ts`:
- `Bot` interface: system prompt, model selection, temperature, knowledge base references
- Specialized personas with industry-specific behaviors

### 2. Knowledge Base (RAG)
- PDF upload, URL crawling, text ingestion
- Embeddings generated via OpenAI and stored in pgvector
- Semantic search during conversations (see Edge Function: `embed-knowledge-base`)

### 3. Lead CRM
- Hot Lead Detection: 0-100 scoring based on conversation intent
- Pipeline management (Kanban/List views)
- Status: New → Contacted → Qualified → Closed

### 4. Reseller/White-Label System
- Tiered commission structure (Bronze 20%, Silver 30%, Gold 40%, Platinum 50%)
- Referral tracking via `referredBy` codes
- White-label domains via `customDomain` in User profile
- See `constants.ts` RESELLER_TIERS for tier breakpoints

### 5. Billing & Plans
- Plans defined in `constants.ts`: FREE, STARTER, PROFESSIONAL, EXECUTIVE, ENTERPRISE
- Usage tracking in `usage_events` table
- Quota enforcement via `billing-overage-check` Edge Function
- Stripe integration for payments (keys in .env)

## Environment Variables

Required variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client-side anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side privileged key (NEVER expose to client)
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o (server-side only)
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Payment processing
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

Optional feature flags:
- `FEATURE_PHONE_AGENT`, `FEATURE_WEBSITE_BUILDER`, `FEATURE_MARKETPLACE`, `FEATURE_RESELLER_PROGRAM`, `FEATURE_WHITE_LABEL`

## Edge Functions (Supabase Backend)

Located in `supabase/functions/`. Key endpoints:

1. **ai-complete**: Chat completion handler
   - Validates bot ownership
   - Calls OpenAI with system prompt + knowledge base context
   - Logs conversation to database
   - Tracks token usage for billing
   - Enforces plan quotas

2. **create-lead**: Lead creation
   - Validates bot ownership
   - Creates lead record with initial score
   - Logs usage event

3. **embed-knowledge-base**: RAG embedding generation
   - Chunks text into segments
   - Generates OpenAI embeddings
   - Stores in pgvector for semantic search

4. **billing-overage-check**: Quota enforcement
   - Compares user's plan limits against current usage
   - Returns allow/deny for new operations

5. **marketplace-install-template**: Template installation
   - Loads marketplace template
   - Creates new bot from template configuration

6. **reseller-track-referral**: Referral attribution
   - Associates referral code with new signup
   - Establishes reseller-client relationship

## Project Structure

```
app/                    # Next.js 14 App Router pages
  layout.tsx           # Root layout with AuthProvider
  page.tsx             # Landing/auth page
  globals.css          # Global Tailwind styles

components/            # React components
  Auth/
    AuthProvider.tsx   # Supabase auth context wrapper

lib/                   # Client/server utilities
  supabase.ts         # Client-side Supabase client
  auth.ts             # Server-side auth helpers (requireAuth, requireRole)
  openai.ts           # OpenAI client and generateChatResponse helper
  stripe.ts           # Stripe client

services/              # Legacy service layer (migration stubs)
  dbService.ts        # TODO: Migrate to Supabase

supabase/             # Supabase project files
  functions/          # Edge Functions (backend API)
  migrations/         # SQL schema migrations

types.ts              # TypeScript interfaces (User, Bot, Lead, Conversation, etc.)
constants.ts          # PLANS, RESELLER_TIERS, AVAILABLE_MODELS
```

## Critical Security Patterns

1. **Never expose server keys client-side**: OpenAI, Stripe secret, Supabase service role
2. **Use RLS policies**: All user data must be protected with owner_id checks
3. **Validate ownership**: Before any operation, verify the user owns the resource (bot, lead, etc.)
4. **Enforce quotas**: Check plan limits before allowing resource creation or usage
5. **Stripe webhook verification**: Always verify webhook signatures before processing payments

## AI Model Configuration

Default model: `gpt-4o-mini` (fast, low-cost)
Available models (see `constants.ts` AVAILABLE_MODELS):
- `gpt-4o-mini` - High-volume tasks
- `gpt-4o` - Complex reasoning

Temperature range: 0.0-1.0 (configurable per bot)

## TypeScript Configuration

Path alias: `@/*` maps to root directory
Build errors currently ignored during migration (see `next.config.cjs`)
Backup files excluded from compilation (see `tsconfig.json` exclude)

## Known Issues & Migration TODOs

1. `services/dbService.ts` is a stub - needs Supabase implementation
2. `services/geminiService.ts` exists but should be removed (migrated to OpenAI)
3. TypeScript/ESLint errors suppressed in build config - these need fixing before production
4. No test framework currently configured
5. Backup files (`.backup` suffix) should be removed after migration validation

## Development Workflow

1. **Starting development**:
   ```bash
   npm install
   # Configure .env with Supabase and OpenAI keys
   npm run dev
   ```

2. **Schema changes**:
   - Edit migration files in `supabase/migrations/`
   - Run `supabase db push` to apply changes
   - Update TypeScript types in `types.ts` to match

3. **Adding new Edge Functions**:
   - Create in `supabase/functions/<name>/index.ts`
   - Use `lib/auth.ts` helpers for auth checks
   - Deploy with `supabase functions deploy <name>`

4. **Adding new features**:
   - Check feature flags in `.env.example`
   - Respect RLS and ownership patterns
   - Enforce plan limits via `checkPlanLimits`

## Reference Documentation

- Full engineering plan: `PLAN.md`
- Environment setup: `.env.example`
- Subscription tiers: `constants.ts` PLANS
- Type definitions: `types.ts`
=======
## Project Overview

BuildMyBot.App is a Next.js 14 SaaS platform for building and deploying AI chatbots. Recently migrated from Vite to Next.js with App Router architecture. The platform includes bot creation, conversation management, lead capture, CRM, reseller program, and subscription billing via Stripe.

## Development Commands

### Running the App
```bash
npm run dev      # Start Next.js development server (http://localhost:3000)
npm run build    # Build production bundle
npm start        # Run production server
npm run lint     # Run ESLint
```

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Configure required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
   - `OPENAI_API_KEY` (server-side only, NEVER expose to client)
   - `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Database Setup
Run the SQL schema in Supabase SQL Editor:
```bash
# Execute supabase_schema.sql in Supabase Dashboard
# Requires pgvector extension for RAG/semantic search
```

## Architecture

### Next.js App Router Structure
- **`app/`** - Next.js App Router pages and API routes
  - **`app/layout.tsx`** - Root layout with AuthProvider
  - **`app/page.tsx`** - Landing page
  - **`app/dashboard/page.tsx`** - Dashboard (client component wrapper)
  - **`app/api/`** - Backend API routes (server-side only)
    - `api/bots/route.ts` - Bot CRUD (GET all, POST create)
    - `api/bots/[id]/route.ts` - Single bot operations (GET, PUT, DELETE)
    - `api/chat/[botId]/route.ts` - Chat endpoint (POST)
    - `api/auth/callback/route.ts` - Supabase auth callback

### Component Architecture
- **`components/`** - React components organized by feature
  - Feature-based directories: `Admin/`, `Auth/`, `Billing/`, `BotBuilder/`, `Chat/`, `CRM/`, `Dashboard/`, `Landing/`, `Layout/`, `Marketing/`, `Marketplace/`, `PhoneAgent/`, `Reseller/`, `Settings/`, `WebsiteBuilder/`
  - Each feature contains related UI components

### Core Libraries
- **`lib/supabase.ts`** - Supabase client for database operations
- **`lib/auth.ts`** - Authentication utilities:
  - `createServerSupabaseClient()` - Server-side client with service role
  - `getAuthUser(request)` - Extract authenticated user from request
  - `requireAuth(request)` - Middleware to protect API routes
  - `requireRole(request, roles)` - Role-based access control
  - `checkPlanLimits(userId, resource)` - Enforce subscription limits
- **`lib/openai.ts`** - OpenAI client and `generateChatResponse()` helper
- **`lib/stripe.ts`** - Stripe client configuration

### Type System
- **`types.ts`** - Global TypeScript types:
  - `User`, `Bot`, `Lead`, `Conversation`, `AnalyticsData`, `ResellerStats`
  - Enums: `UserRole`, `PlanType`
- **`constants.ts`** - Plan limits, pricing, models, reseller tiers

### Services
- **`services/geminiService.ts`** - Google Gemini integration (legacy from AI Studio)

## Security Model

### API Key Protection
**CRITICAL:** OpenAI API calls MUST happen server-side only (in API routes). The previous Vite implementation exposed the API key in browser JavaScript. All AI interactions now go through `/api/chat/[botId]` endpoint.

### Authentication Flow
1. Supabase Auth handles user authentication
2. JWT tokens passed via `Authorization: Bearer <token>` header
3. API routes use `requireAuth()` middleware from `lib/auth.ts`
4. Row Level Security (RLS) enabled on Supabase tables

### Authorization
- **Plan limits enforced via `checkPlanLimits()`** - Checks bots/conversations/files against subscription tier
- **Role-based access** - `OWNER`, `ADMIN`, `RESELLER` roles
- **Feature flags** - Environment variables control feature availability (phone agent, white label, etc.)

## Database Schema

### Key Tables (Supabase PostgreSQL)
- **`users`** - User accounts with plan, Stripe IDs, reseller info, white-label settings
- **`bots`** - Bot configurations (name, type, system_prompt, model, temperature, theme, behavior)
- **`conversations`** - Chat conversation logs with sentiment analysis
- **`leads`** - Captured leads with scoring and status
- **`knowledge_base_files`** - Uploaded files for RAG
- **`knowledge_base_embeddings`** - Vector embeddings (pgvector) for semantic search
- **`subscriptions`** - Stripe subscription tracking
- **Extensions required:** `uuid-ossp`, `pgcrypto`, `vector`

## Multi-Tenant Design

Each user (`user_id`) owns multiple bots. Bots belong to users via foreign keys. RLS policies enforce data isolation. Resellers can refer clients and earn commissions based on tier thresholds.

## Plan Tiers & Limits

Defined in `constants.ts`:
- **FREE:** 1 bot, 60 conversations/month
- **STARTER:** 1 bot, 750 conversations/month
- **PROFESSIONAL:** 5 bots, 5000 conversations/month
- **EXECUTIVE:** 10 bots, 15000 conversations/month
- **ENTERPRISE:** Unlimited bots, 50k included convos + $0.01/overage

Reseller tiers: Bronze (20%), Silver (30%), Gold (40%), Platinum (50%) commission based on client count.

## OpenAI Integration

- Default model: `gpt-4o-mini` (fast, low cost)
- Available: `gpt-4o-mini`, `gpt-4o` (flagship)
- Temperature: 0-2 (default 0.7)
- Conversations stored in database for analytics and lead scoring

## Deployment

### Vercel (Recommended)
```bash
vercel
# Set environment variables in Vercel dashboard
```

### Docker (GCP Cloud Run)
```bash
docker build -t buildmybot .
docker run -p 8080:8080 buildmybot
```

Dockerfile uses multi-stage build with Next.js standalone output. See `cloudbuild.yaml` for GCP deployment.

## Migration Context

**Migrated from Vite to Next.js 14 on Nov 25, 2025.** See `MIGRATION_GUIDE.md` for details. Key changes:
- Removed Vite, added Next.js App Router
- Created backend API routes (`app/api/`)
- Moved OpenAI calls server-side for security
- Added Supabase, Stripe, authentication infrastructure
- Components moved from `src/` to `components/`

## Path Aliases

TypeScript configured with `@/` alias:
```typescript
import { Sidebar } from '@/components/Layout/Sidebar';
import { supabase } from '@/lib/supabase';
```

## Linting & Build

- ESLint configured via `eslint-config-next`
- TypeScript strict mode enabled
- Build errors/warnings ignored during builds (set in `next.config.js`)

## Feature Flags

Environment variables control features:
- `FEATURE_PHONE_AGENT` - Twilio voice integration
- `FEATURE_WEBSITE_BUILDER` - AI website generation
- `FEATURE_MARKETPLACE` - Bot marketplace
- `FEATURE_RESELLER_PROGRAM` - Partner/reseller access
- `FEATURE_WHITE_LABEL` - Custom domain support

## Important Files

- **`supabase_schema.sql`** - Complete database schema
- **`.env.example`** - All environment variables with documentation
- **`MIGRATION_GUIDE.md`** - Vite to Next.js migration details
- **`Dockerfile`** - Multi-stage Docker build for production
>>>>>>> Stashed changes
