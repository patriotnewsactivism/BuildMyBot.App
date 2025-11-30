# BuildMyBot.app – Engineering Plan

This document defines the **architecture**, **schema**, **security model**, **backend functions**, **feature completion**, **roadmap**, and **development workflow** for the BuildMyBot.app platform.

---

# 1. System Architecture

**Current State:** React + Vite + Firebase (Firestore/Auth)
**Target Architecture:**
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

---

# 2. Database Schema

All tables are defined in the migration file:

- `profiles`  
- `bots`  
- `knowledge_base`  
- `conversations`  
- `leads`  
- `marketing_content`  
- `billing_accounts`  
- `usage_events`  
- `templates`  
- `plans`  
- `reseller_accounts`  
- `reseller_clients`  
- `referrals`  
- `commissions`  
- `website_pages`  
- `phone_calls`  

See migration SQL for detailed fields, indexes, and relationships.

---

# 3. Row-Level Security (RLS)

### **Principles**
- Every resource belongs to exactly one `owner_id`.  
- Users may only access their own resources.  
- Resellers may view clients via relational checks.  
- Admins bypass all restrictions.  

### **Categories of Policies**
1. **Owner CRUD** policies for:
   - bots  
   - leads  
   - conversations  
   - knowledge_base  
   - marketing_content  
   - billing_accounts  
   - website_pages  
   - phone_calls  

2. **Public Read** policies for:
   - plans  
   - templates  

3. **Reseller Access** policies for:
   - reseller_accounts  
   - reseller_clients  
   - referrals  
   - commissions  

RLS policy file included in repository.

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

## Milestone 5 – Post-Launch Growth & Integrations (2–3 weeks)
- Multi-language support rollout across chat, website pages, and marketing tools
- Team collaboration (multi-seat) controls with role-based permissions
- Advanced analytics dashboards for bots, leads, and marketing performance
- Webhook integrations (Zapier, Make.com) and reseller webhooks
- White-label domain system for agencies with per-tenant routing

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

# 12. Release Checklist
- [ ] All migrations applied
- [ ] RLS tested
- [ ] Edge Functions deployed
- [ ] Stripe keys configured
- [ ] OpenAI key configured
- [ ] Embedding engine live
- [ ] Landing page updated
- [ ] Documentation complete
- [ ] Sentry/live error tracking enabled
- [ ] Production logging verified

---

# 13. Post-Launch Plans
- Webhook integrations (Zapier, Make.com)
- Agency white-label domain system
- Team seats
- User roles inside organization
- Advanced analytics
- Unified search across bots, leads, KB
- Multi-language support
