# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
