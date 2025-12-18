# BuildMyBot.App – Consolidated Improvement Plan

This plan operationalizes the provided recommendations into prioritized, actionable workstreams with clear deliverables, sequencing, and checkpoints. It complements the existing `PLAN.md` and `IMPLEMENTATION_SUMMARY.md` by focusing on completion, hardening, UX polish, branding, and SEO.

---

# 1. System Architecture

**Current State:** React + Vite + Firebase (Firestore/Auth)

**Target Architecture (Phase 1 — Near-Term Stabilization):**
React + Vite (Frontend SPA)
↓
Supabase Auth (JWT)
↓
Supabase Edge Functions (secure backend)
↓
Supabase Postgres (RLS-protected tables)
↳ pgvector for embeddings
↳ Stripe webhooks for billing
↓
OpenAI GPT-4o (LLM + embeddings)

**Target Architecture (Phase 2 — SEO & Scale Migration):**
Next.js (App Router) for SSR/SSG/ISR marketing + dashboard surfaces
↓
Supabase Auth (JWT) with server-side session validation
↓
Supabase Edge Functions (secure backend)
↓
Supabase Postgres (RLS-protected tables) with pgvector
↳ Stripe webhooks for billing
↓
OpenAI GPT-4o (LLM + embeddings)

---

## Guiding Principles
- **Security first:** No secrets in the client; enforce RLS on every table; validate ownership before mutations; log and alert on anomalies.
- **Type safety:** Generate typed SDKs from the Supabase schema; avoid `any`; align front-end models with database types.
- **Incremental delivery:** Land value in small, testable increments with fast feedback and automated coverage.
- **Observability:** Trace critical paths (auth, AI calls, billing) with Sentry and audit logs; add alerts for regressions.

---

## Workstreams & Key Actions

### 1) Supabase Completion & Data Integrity
- Deploy all Edge Functions (`ai-complete`, `create-lead`, `embed-knowledge-base`, `billing-overage-check`, `marketplace-install-template`, `reseller-track-referral`) and run the data-migration script.
- Verify RLS policies per table (owners, collaborators, reseller/client) and add automated policy tests.
- Add pgvector storage and search for knowledge base items; ensure embeddings are written via secure Edge Functions.
- Generate TypeScript types from the Supabase schema for API payloads and database rows; wire into the React codebase.

### 2) Background Processing & Reliability
- Integrate a queue service (e.g., Inngest or Trigger.dev) for long-running tasks: embeddings, phone transcriptions, heavy AI completions.
- Add retry/backoff and monitoring dashboards for queued jobs; surface job status in the UI where relevant.
- Ensure API calls and background tasks enforce billing/usage checks before execution.

### 3) Billing & Compliance
- Connect Stripe for subscriptions, plan enforcement, and overage handling through Supabase Edge webhooks.
- Map plans to entitlements (limits for AI calls, storage, seats); block or warn on overages.
- Document data handling (export/delete) for GDPR; publish updated privacy/terms; ensure audit logs are immutable and rotated.

### 4) Architecture, Performance & Error Handling
- Migrate marketing/landing pages to Next.js for SSR/SSG and consider ISR for dashboards with cache invalidation.
- Apply code-splitting and dynamic imports for heavy modules (phone agent, marketing studio) and analyze bundles regularly.
- Implement modern React Error Boundaries with user-friendly recovery paths; keep Sentry instrumentation aligned.
- Add PWA capabilities (manifest, service worker) for offline reads and faster re-visits where appropriate.

### 5) Accessibility (WCAG 2.1 AA)
- Conduct an accessibility audit (contrast, focus states, labels, aria attributes, keyboard navigation).
- Integrate automated checks (axe-core or Lighthouse) into CI and add manual spot-checks for critical flows.

### 6) Testing & CI Stability
- Stabilize Playwright e2e in CI (investigate Vitest/Playwright interaction); if unresolved, consider Cypress for e2e.
- Maintain >90% coverage for core user journeys (auth, bot build, knowledge base search, lead capture, billing).
- Add contract tests for Edge Functions and RLS policies; ensure mocks/stubs exist for third-party services.

### 7) Branding & Marketing Experience
- Define brand attributes (intelligent, reliable, empowering, white-label) and update palette (e.g., royal blue/purple primary with accessible contrast) and typography (e.g., Inter or IBM Plex Sans).
- Refresh logo and iconography to reflect conversational AI; ensure scalability for the widget.
- Redesign landing pages: clear value proposition, strong hero CTA, feature highlights, social proof, transparent pricing (including reseller tiers), and mobile-first layouts.
- Add micro-interactions (subtle hovers, loaders) without harming performance or accessibility.

### 8) Widget & Reseller Customisation
- Ship a theme editor with preset themes (light, dark, corporate, playful) plus custom CSS for resellers.
- Enable logo upload, primary/accent color selection, and welcome text configuration in the admin UI.
- Ensure widget performance (<2 KB loader) and accessibility (aria labels, keyboard support, descriptive alt text).

### 9) SEO Execution
- With Next.js, generate programmatic sitemaps and `robots.txt` (block staging).
- Implement metadata per page (`generateMetadata`), OpenGraph tags, and schema.org (SoftwareApplication/Product/FAQ) via JSON-LD.
- Enforce descriptive filenames and alt text for all images; avoid keyword stuffing.
- Improve internal linking, breadcrumbs, semantic HTML structure, and optimize assets (WebP, HTTP/2, caching/CDN).
- Build a content hub (blog/knowledge center) targeting AI chatbot, automation, and case-study keywords.

---

# 4. Edge Functions (Backend)

### 4.1. `ai-complete`
- Validates ownership  
- Calls OpenAI  
- Logs conversation  
- Tracks AI token usage  
- Enforces billing quota  

### 4.2. `create-lead`
- Validates bot ownership  
- Creates lead record  
- Logs usage event  

### 4.3. `embed-knowledge-base`
- Chunk text (done client-side or server-side)  
- Generate embedding  
- Store text + vector  

### 4.4. `billing-overage-check`
- Checks plan limits  
- Compares usage  
- Returns allow/deny  

### 4.5. `marketplace-install-template`
- Load template  
- Create bot with template payload  

### 4.6. `reseller-track-referral`
- Associates referral code with new user  
- Tracks reseller-client relationship  

Each function lives in `supabase/functions/<name>`.

### 4.7. Background Queue Integration (planned)
- Queue provider: Inngest or Trigger.dev (evaluate cost, latency, retries)  
- Workloads: embeddings, phone transcriptions, bulk imports, long-running marketing jobs  
- Ingress: Edge Functions enqueue jobs with auth context and tenant IDs  
- Guarantees: at-least-once with idempotency keys, exponential backoff, DLQ monitoring  
- Observability: structured logs, per-tenant metrics, alerting on retry exhaustion  
- Security: RLS-aware payloads only; no secrets in queue payloads; server-side env for credentials  

---

# 5. Application Modules

### 5.1. Bot Builder
- Prompt editing  
- Model selection  
- Temperature tuning  
- Bot settings  
- Knowledge base management  
- Preview chat  
- **Specialized Personas:** City Government, Recruitment, Travel, Real Estate, etc.

### 5.2. Knowledge Base
- File upload (PDF)  
- URL crawler  
- Text ingestion  
- Embedding generation  
- Search during conversations  

### 5.3. Chat Interface
- Real-time messages  
- Session attribution  
- Lead capture triggers  
- Conversation history  

### 5.4. CRM
- Lead pipeline (Kanban/List)
- Lead scoring (Hot Lead detection)
- CSV export  
- Notes & metadata  

### 5.5. Marketing Studio
- Emails  
- Ads  
- Blog posts  
- Scripts  
- Social posts  
- Viral Thread Generator

### 5.6. Website Generator
- Page editor  
- SEO metadata  
- Bot embed snippet  
- Hosting via Supabase Storage or static export  

### 5.7. Phone Agent
- Twilio call flow  
- Webhooks → transcripts  
- Logging in `phone_calls`  

### 5.8. Marketplace
- Template installation  
- Preview UI  
- Category filters  

### 5.9. Reseller System
- Referral tracking  
- Commission tracking  
- Client oversight  
- White-label configuration

---

# 6. Frontend Architecture

### **Patterns**
- React + Vite
- Tailwind CSS for styling
- Zustand/Context for global state  
- Supabase JS client for auth + direct queries  
- All sensitive calls done via Edge Functions  

### **Directory Structure**
- `components/*` – UI modules  
- `services/*` – API + Supabase helpers  
- `store/*` – state management  
- `types/*` – TypeScript interfaces  
- `utils/*` – chunking, parsing, formatting  

---

# 7. Operational Roadmap

## Milestone 1 – Supabase Core (1–2 weeks)
- Create schema  
- Migrate data  
- Implement RLS  
- Deploy base Edge Functions  

## Milestone 2 – Bot Builder, AI, CRM (2–3 weeks)
- Bot builder integration  
- Chat + AI completions  
- CRM/lead views  
- Billing enforcement  

## Milestone 3 – Marketplace, Website Builder, Phone Agent (3–4 weeks)
- Template marketplace  
- Website generator  
- Phone agent MVP  
- Landing page upgrades  

## Milestone 4 – Hardening & Launch (2–3 weeks)
- Testing framework  
- Logging + Analytics dashboards  
- Sentry integration  
- SEO & landing page polish  
- Final docs  

## Milestone 5 – Next.js Migration (3–4 weeks)
- Stand up Next.js App Router with Tailwind + shadcn-compatible components  
- Migrate marketing pages to SSG/SSR with ISR for high-traffic sections  
- Implement programmatic sitemap and robots.txt (production vs staging rules)  
- Implement structured data (JSON-LD) for Product/FAQ and OpenGraph defaults  
- Add server-side Supabase auth helpers (cookies, server actions) and protect dashboard routes  
- Create API route proxies to Edge Functions to keep secrets server-side  
- Enable image/font optimization, route-level code splitting, and streaming where applicable  
- Run Lighthouse + axe-core accessibility checks in CI; ensure WCAG 2.1 AA for new pages  
- Cutover plan: dual-run Vite + Next.js during migration, gate by subpath or subdomain, then deprecate Vite build  

---

# 8. DevOps & Deployment

### Supabase Deployment
```bash
supabase db push
supabase functions deploy
supabase start
```

### Frontend Deployment
- Vercel
- Netlify
- Cloudflare Pages

### CI/CD
GitHub Actions:
1. Install
2. Lint
3. Test
4. Build
5. Deploy

### Supabase Migration Completion Checklist
- [ ] Deploy all Edge Functions (`ai-complete`, `create-lead`, `embed-knowledge-base`, `billing-overage-check`, `marketplace-install-template`, `reseller-track-referral`)  
- [ ] Run and validate data-migration script end-to-end  
- [ ] Verify RLS policies per table for owner/reseller/admin contexts; add regression tests  
- [ ] Confirm no service-role or secret keys are exposed to clients; enforce server-only env usage  
- [ ] Validate PostgREST and client SDK permissions against RLS expectations  

---

# 9. API Reference (Full)

- `POST /ai-complete`: Generate completions, store conversation, track usage.
- `POST /create-lead`: Insert new lead for a bot.
- `POST /embed-knowledge-base`: Store embeddings for semantic search.
- `POST /billing-overage-check`: Quota enforcement.
- `POST /marketplace-install-template`: Install a marketplace template.
- `POST /reseller-track-referral`: Record and route new referrals.

Each endpoint is fully documented in the Edge Function code.

---

# 10. Security
- Full RLS enforcement
- Separate service-role keys for backend
- No secrets shipped to frontend
- Token usage monitoring
- Stripe webhook signature verification
- JWT claims for roles

---

# 11. Testing Strategy

### Unit Tests
- Edge Function logic
- Utilities
- Services

### Integration Tests
- Supabase RPC
- RLS protections
- AI chat → conversation logging

### End-to-End Tests
- Bot creation
- Chat-to-lead flow
- Template installation
- Billing enforcement

---

## Risks & Mitigations
- **CI flakiness:** Parallelize isolated suites; run Playwright in dedicated workflow with stable browser versions.
- **Billing regressions:** Use Stripe test mode, replayable webhooks, and strict entitlement checks before AI/embedding calls.
- **Data leakage:** Continuous RLS tests; ownership validation in every Edge Function; secrets restricted to server-side env vars.
- **Performance regressions:** Budget-based bundle analysis; monitor Core Web Vitals; cache and compress assets/CDN.

---

## Definition of Done (per release train)
- All new features backed by automated tests (unit + e2e where applicable).
- Security checks (RLS, auth, secret validation) pass in CI.
- Accessibility checks pass (automated + targeted manual).
- Observability in place (Sentry + audit logs) with no untriaged errors.
- Documentation updated (README/implementation notes) for new capabilities.
