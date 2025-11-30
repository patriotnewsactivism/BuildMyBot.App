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

## ✅ Milestone 1 – Supabase Core (COMPLETED)
- ✅ Create schema
- ✅ Migrate data
- ✅ Implement RLS
- ✅ Deploy base Edge Functions

**Status:** Complete - All database migrations, RLS policies, and core Edge Functions deployed.

## ✅ Milestone 2 – Bot Builder, AI, CRM (COMPLETED)
- ✅ Bot builder integration
- ✅ Chat + AI completions
- ✅ CRM/lead views
- ✅ Billing enforcement

**Status:** Complete - Unified AI service, marketplace templates, and core features integrated.

## ✅ Milestone 3 – Advanced Features (COMPLETED)
- ✅ Template marketplace seeded with 15 templates
- ✅ Website generator (existing)
- ✅ Phone agent MVP with Twilio integration
- ✅ Stripe webhook handler for billing
- ✅ Analytics dashboard with real-time metrics
- ✅ Usage quota enforcement widget
- ✅ Team collaboration and multi-user access
- ✅ Comprehensive testing documentation

**Status:** Complete - All advanced features implemented and tested.

## Milestone 4 – Hardening & Launch (IN PROGRESS)
- ✅ Testing framework (TESTING.md created)
- ✅ Analytics dashboards (implemented)
- [ ] Sentry integration
- [ ] SEO & landing page polish
- [ ] Final deployment documentation
- [ ] Production environment setup  

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

**Comprehensive testing documentation available in [TESTING.md](./TESTING.md)**

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

### Test Coverage
- 50+ test cases covering all features
- Database schema validation
- Row-Level Security (RLS) testing
- Edge Functions testing (8 functions)
- Frontend component testing
- Security & performance testing
- Real-time subscription testing

---

# 12. Release Checklist
- [x] All migrations applied
- [x] RLS tested (see TESTING.md)
- [x] Edge Functions deployed (ai-complete, create-lead, embed-knowledge-base, billing-overage-check, marketplace-install-template, reseller-track-referral, phone-webhook, stripe-webhook)
- [x] OpenAI key configured
- [x] Embedding engine live (pgvector + OpenAI embeddings)
- [x] Documentation complete (README.md, GETTING_STARTED.md, TESTING.md, DEPLOYMENT.md, MIGRATION_SUMMARY.md)
- [ ] Stripe keys configured (production environment)
- [ ] Landing page updated
- [ ] Sentry/live error tracking enabled
- [ ] Production logging verified
- [ ] Production deployment complete

---

# 13. Post-Launch Plans
- Webhook integrations (Zapier, Make.com)
- Agency white-label domain system
- Team seats
- User roles inside organization
- Advanced analytics
- Unified search across bots, leads, KB
- Multi-language support
