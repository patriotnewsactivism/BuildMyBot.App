# BuildMyBot.App
## AI-Powered Chatbot Platform for Business

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-green)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-blueviolet)](https://stripe.com/)

An enterprise-ready SaaS platform for creating intelligent AI chatbots with lead capture, RAG-enabled knowledge base, and white-label reseller program.

---

## 🚀 Recent Updates

**✅ Next.js Migration Complete** (November 25, 2025)
- Migrated from Vite + React to Next.js 14 App Router
- Backend API routes implemented (Bots CRUD, Chat)
- **Security Fix:** OpenAI API calls moved to server-side
- Supabase, Stripe, and OpenAI integrations ready

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for full details.

---

## ✨ Features

### Current (30% Complete)
- ✅ **AI Chat Interface** - OpenAI GPT-4o Mini integration
- ✅ **Bot Builder** - Create and configure multiple chatbots
- ✅ **Reseller Dashboard** - White-label partner program UI
- ✅ **Marketing Tools** - AI-powered content generation
- ✅ **Lead CRM** - Lead capture and management interface
- ✅ **Phone Agent UI** - Voice-enabled AI interface
- ✅ **Admin Dashboard** - Platform administration
- ✅ **Billing Interface** - Subscription management UI

### In Progress (Next Phase)
- 🚧 **Backend API** - 3 endpoints live, 17+ pending
- 🚧 **Database** - Schema ready, needs deployment
- 🚧 **Authentication** - Supabase Auth integration pending
- 🚧 **Payment Processing** - Stripe setup pending
- 🚧 **Embed Widget** - Chatbot embedding on external sites

---

## 🏗️ Architecture

**Frontend:** Next.js 14 (App Router) + React 18 + TypeScript
**Backend:** Next.js API Routes
**Database:** Supabase (PostgreSQL + pgvector for RAG)
**Authentication:** Supabase Auth
**Payments:** Stripe Subscriptions + Webhooks
**AI:** OpenAI GPT-4o Mini
**Deployment:** Vercel (recommended)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account ([create one](https://supabase.com))
- Stripe account ([create one](https://stripe.com))
- OpenAI API key ([get one](https://platform.openai.com))

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
```bash
# Required for development
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
OPENAI_API_KEY=sk-proj-xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

3. **Set up Supabase database:**
- Create a new Supabase project
- Copy the contents of `supabase_schema.sql`
- Paste into Supabase SQL Editor and execute

4. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
BuildMyBot.App/
├── app/                    # Next.js App Router
│   ├── api/               # Backend API routes
│   │   ├── bots/         # Bot CRUD operations
│   │   └── chat/         # AI chat endpoint
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # React components (15 total)
│   ├── BotBuilder/       # Bot configuration UI
│   ├── CRM/              # Lead management
│   ├── Chat/             # Chat interface
│   ├── Billing/          # Subscription management
│   └── ...
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Supabase client
│   ├── stripe.ts         # Stripe client
│   └── openai.ts         # OpenAI client
├── services/              # Legacy services (to be migrated)
├── types.ts               # TypeScript type definitions
└── constants.ts           # App constants

Documentation:
├── IMPLEMENTATION_ROADMAP.md      # Week-by-week development plan
├── BACKEND_API_SPEC.md            # Complete API specification
├── TECHNICAL_AUDIT_VALIDATION.md  # Technical analysis
├── MIGRATION_GUIDE.md             # Next.js migration details
└── supabase_schema.sql            # Database schema
```

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### API Endpoints (Implemented)

#### Bots
- `GET /api/bots` - List all bots for authenticated user
- `POST /api/bots` - Create new bot
- `GET /api/bots/[id]` - Get specific bot
- `PUT /api/bots/[id]` - Update bot
- `DELETE /api/bots/[id]` - Soft delete bot

#### Chat
- `POST /api/chat/[botId]` - Send message and get AI response

### Testing API Endpoints

```bash
# Create a bot
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -H "x-user-id: u1" \
  -d '{
    "name": "Sales Assistant",
    "type": "Sales",
    "systemPrompt": "You are a helpful sales assistant."
  }'

# Send chat message
curl -X POST http://localhost:3000/api/chat/[botId] \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help!",
    "visitorId": "visitor-123"
  }'
```

---

## 📊 Implementation Status

See [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for the complete 16-week development plan.

### Phase 1: Foundation (Week 1-2) - In Progress
- ✅ Next.js migration
- ✅ Bot CRUD API
- ✅ Chat API with server-side OpenAI
- 🚧 Supabase setup
- 🚧 Authentication
- 🚧 Stripe integration

### Upcoming Phases
- **Phase 2:** Core Product (Week 3-4) - Embed widget, data persistence
- **Phase 3:** Retention Features (Week 5-6) - Notifications, webhooks
- **Phase 4:** Differentiators (Week 7-10) - RAG, scheduling, phone agent
- **Phase 5:** Scale Features (Week 11-16) - White-label, teams, enterprise

---

## 🔐 Security

- ✅ **API Key Protection:** OpenAI API calls moved to server-side (fixed critical vulnerability)
- ✅ **Environment Variables:** Sensitive keys stored in `.env.local` (not committed)
- 🚧 **Authentication:** Supabase Auth with JWT (pending implementation)
- 🚧 **Rate Limiting:** API rate limiting (pending implementation)
- 🚧 **Input Validation:** Request validation middleware (pending)

---

## 📈 Roadmap to Revenue

**Week 2 Goal:** First paying customer
**Month 1 Goal:** $500 MRR (10 customers)
**Month 6 Goal:** $10,000 MRR (150 customers)

See [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for detailed projections.

---

## 📚 Documentation

- [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md) - Complete development plan
- [Backend API Spec](./BACKEND_API_SPEC.md) - API endpoint specifications
- [Technical Audit](./TECHNICAL_AUDIT_VALIDATION.md) - Code analysis & findings
- [Migration Guide](./MIGRATION_GUIDE.md) - Next.js migration details
- [Database Schema](./supabase_schema.sql) - PostgreSQL schema

---

## 🤝 Contributing

This is a private SaaS project. For internal development team only.

---

## 📄 License

Proprietary - All Rights Reserved

---

## 🆘 Support

For questions or issues, contact the development team.
