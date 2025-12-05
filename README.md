
# BuildMyBot.app

The ultimate white-label AI chatbot platform for businesses and agencies. Build, deploy, and resell intelligent bots with zero coding.

## 🚀 Overview

BuildMyBot is an all-in-one AI Operating System that empowers businesses to automate customer interactions across text, web, and voice. It includes a comprehensive suite of tools for lead generation, customer support, and marketing automation.

## ✨ Key Features

### 🤖 AI Bot Builder
- **Specialized Personas:** tailored roles for City Government (e.g., Batesville City Assistant), Recruitment, Travel, Real Estate, and more.
- **RAG Knowledge Base:** Train bots on PDFs, Website URLs, and text data.
- **Visual Editor:** No-code customization of identity, tone, and behavior.

### 📞 AI Phone Agent
- **24/7 Receptionist:** Handles incoming calls, books appointments, and routes urgent issues.
- **Human-like Voice:** Powered by advanced neural speech synthesis.
- **Call Logging:** Transcripts automatically saved to the CRM.

### 📊 Lead CRM
- **Hot Lead Detection:** Automatically scores leads (0-100) based on conversation intent.
- **Pipeline Management:** Kanban and List views to manage deal flow.
- **Instant Alerts:** SMS/Email notifications for high-priority leads.

### 📢 Marketing Studio
- **Viral Content Generator:** Create high-engagement Twitter/X threads and LinkedIn posts.
- **Instant Website Builder:** Generate industry-specific landing pages in seconds.

### 💼 Reseller & Partner Portal
- **White-label Ready:** Agencies can resell the platform under their own brand.
- **Commission Tracking:** Real-time dashboard for earnings, payouts, and client management.
- **Tiered System:** Bronze, Silver, Gold, and Platinum tiers with increasing commission rates.

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend (Current):** Firebase (Firestore, Auth)
- **Backend (Target):** Supabase (Postgres, Edge Functions, Auth) - See `PLAN.md`
- **AI Models:** OpenAI GPT-4o / GPT-4o Mini
- **Icons:** Lucide React

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Firebase Project or Supabase Project (depending on migration stage)
- OpenAI API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/buildmybot.git
   cd buildmybot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment:
   Create a `.env` file and add your keys:
   ```env
   # OpenAI
   VITE_OPENAI_API_KEY=sk-...
   
   # Firebase (Current)
   VITE_FIREBASE_API_KEY=...
   
   # Supabase (Optional/Migration)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   
   # Note: For Vercel deployments, you may need to use NEXT_PUBLIC_ prefix for Supabase variables
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. Run Development Server:
   ```bash
   npm run dev
   ```

## 🏗 Architecture & Roadmap

For a detailed breakdown of the engineering plan, database schema, and migration strategy to Supabase, please refer to **[PLAN.md](./PLAN.md)**.

## 📱 Live Demos included in the App
- **City Services:** Batesville City Assistant demo with utility payment logic.
- **Instant Training:** Drag-and-drop PDF training.
- **Viral Post Creator:** Content generation engine.
- **Phone Agent:** Interactive call simulator.

---
© 2025 BuildMyBot. All rights reserved.
