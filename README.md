# BuildMyBot.app

BuildMyBot is a full-stack AI automation platform that enables creators, businesses, agencies, and resellers to **build, train, deploy, and sell AI agents**—all from a single interface.

Powered by **React + Vite + Supabase + GPT-4o**, BuildMyBot.app provides a complete ecosystem including:

- AI Chatbot Builder  
- Knowledge Base & Embedding Engine  
- CRM + Lead Capture  
- Website & Landing Page Generator  
- AI Marketing Studio  
- Phone Agent (Voice AI)  
- Template Marketplace  
- Reseller Program (White-label Optional)  
- Usage-based Billing & Stripe Integration  
- Admin Console & Analytics  

This repository contains the frontend (React/Vite) and backend (Supabase Edge Functions + Postgres schema) required to run the entire platform.

---

## 🚀 Features

### **AI Bot Builder**
Create AI agents with:
- Custom system prompts  
- GPT-4o / GPT-4o-mini model selection  
- Temperature & behavior tuning  
- Identity randomization  
- Settings schema for future extensions  
- Full multi-bot support  

### **Knowledge Base & Embeddings**
Use:
- Raw text  
- PDFs / files  
- URL content crawler  
Data is split into chunks, vectorized using OpenAI embeddings, and stored using **pgvector** for semantic search.

### **Multi-Channel AI Chat**
- Real-time chat with AI agent  
- Conversation logs  
- Token usage & cost tracking  
- Optional automatic lead capture  
- External-user attribution (session tracking)

### **CRM & Lead Management**
All leads captured by bots flow into a complete CRM including:
- Lead statuses (New → Contacted → Qualified → Converted)  
- Lead scoring  
- Custom metadata  
- Export (CSV, JSON)  
- Integration-ready record structure  

### **Marketing Studio**
Generate:
- Ad copy  
- Emails  
- Sales scripts  
- Blog posts  
- Social posts  
- Brand voice templates  
Stored in `marketing_content` for reuse.

### **Website Builder**
Users can generate:
- Landing pages  
- SEO metadata  
- Hosted mini-sites for each bot  
Pages can be published instantly or exported.

### **Phone Agent**
Voice-driven AI agent with:
- Twilio webhook integration  
- Live call handling  
- Transcripts stored in `phone_calls`  
- Configurable greetings & flows  

### **Template Marketplace**
Installable bot templates for verticals such as:
- Real estate  
- Law firms  
- Restaurants  
- SaaS  
- Sales funnels  
- Support assistants  
- Agency systems  

### **Reseller & White-Label Program**
- Referral link tracking  
- Commissions  
- Client management  
- Optional white-label mode  

### **Usage-Based Billing**
Stripe + Supabase integration includes:
- Monthly subscription plans  
- AI usage limits (token caps)  
- Overage prevention  
- Automated quota enforcement  

---

## 🧩 Tech Stack

### **Frontend**
- React 18  
- Vite  
- TypeScript  
- Zustand state management  
- Recharts  
- Lucide Icons  

### **Backend**
- **Supabase**
  - Auth  
  - PostgreSQL  
  - Row-Level Security  
  - Storage  
  - Realtime  
  - Edge Functions  
- **OpenAI GPT-4o**  
- **pgvector** semantic search  
- **Stripe** billing  

---

## 📁 Directory Structure

```plaintext
├── src/
│   ├── components/        # Bots, CRM, Website builder, Marketing Studio, etc.
│   ├── pages/             # Dashboard routes
│   ├── store/             # Zustand global state
│   ├── services/          # API helpers (Supabase + Edge Functions)
│   ├── utils/             # Parsing, chunking, formatting
│   └── types/             # Shared TypeScript definitions
│
├── supabase/
│   ├── migrations/        # SQL migrations & schema
│   ├── functions/         # Edge Functions (AI, leads, billing, etc.)
│   └── seed/              # Optional template seeds
│
├── public/                # Static assets
├── README.md
└── PLAN.md
