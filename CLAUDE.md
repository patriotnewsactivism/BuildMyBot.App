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

## Architecture

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

Edge Functions in `supabase/functions/`:
- `ai-complete`: OpenAI proxy with usage tracking
- `create-lead`: Lead capture with ownership validation
- `embed-knowledge-base`: Generate/store pgvector embeddings

## Environment Variables

Required in `.env`:
```bash
VITE_OPENAI_API_KEY=sk-...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Security Notes

- Master admin emails hardcoded in App.tsx (MASTER_EMAILS array)
- RLS policies enforce owner_id checks
- Sensitive operations go through Edge Functions
- API keys never exposed to frontend except VITE_SUPABASE_ANON_KEY

## Migration Status

The codebase transitioned from Firebase to Supabase. Firebase config (`services/firebaseConfig.ts`) is legacy and being phased out. See `PLAN.md` for full migration roadmap.
