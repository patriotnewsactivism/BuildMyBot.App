# BuildMyBot App

BuildMyBot is a Vite + React single-page application that lets teams create, manage, and sell AI-powered chatbots with built-in CRM, marketing, and reseller tooling. The app integrates Firebase for auth, storage, and Firestore persistence, and uses OpenAI's GPT-4o family for chat/marketing generation.

## Features
- **Bot builder**: Create bots with custom prompts, models, temperature, knowledge base snippets, and optional identity randomization.
- **Template marketplace**: Install ready-made bots from the marketplace to accelerate onboarding.
- **Chat and lead capture**: Test bots, log conversations, and pipe leads into the CRM with scoring and status management.
- **Website builder**: Generate landing pages for each bot with AI-generated structure and editable content.
- **Marketing studio**: Produce marketing copy (emails, ads, social posts, threads, stories) using OpenAI completions.
- **Phone agent**: Configure phone agent settings (voice, intro message, number) for voice-enabled flows.
- **Billing and plans**: Tiered plans (Free → Enterprise) with overage rules and plan metadata defined centrally.
- **Reseller dashboard**: Track referrals, commissions, and client counts with live Firestore subscriptions.
- **Admin console**: Manage user accounts, statuses, and reseller approvals.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Recharts, Lucide icons.
- **Backend services**: Firebase (Auth, Firestore, Storage, Analytics) configured via `services/firebaseConfig.ts`.
- **AI integration**: OpenAI Chat Completions API (GPT-4o family) via `services/geminiService.ts`.
- **Data modeling**: Shared TypeScript models for users, bots, leads, conversations, analytics, and plans in `types.ts` and `constants.ts`.

## Project Structure
- `App.tsx`: Root experience switcher (dashboard, bots, chat, billing, admin, reseller, marketing, website builder, phone agent, partner flows) plus global auth/Firestore subscriptions.
- `components/`: Feature modules (BotBuilder, Chat, CRM, Marketing, Marketplace, PhoneAgent, Reseller, Admin, Billing, Landing, Settings, Layout).
- `services/`: Data/AI helpers (`dbService.ts` for Firestore CRUD + listeners, `geminiService.ts` for OpenAI calls, `crawlerService.ts` for knowledge base ingestion, `firebaseConfig.ts` for client SDK setup).
- `constants.ts`: Plan definitions, available models, mock analytics, and reseller tiers.
- `types.ts`: Shared enums and interfaces for app entities.

## Prerequisites
- Node.js 18+
- npm 9+
- OpenAI API key with access to GPT-4o models
- Firebase project credentials (Auth, Firestore, Storage)

## Environment Variables
Create a `.env.local` file at the project root and set:

```
# Required: OpenAI
OPENAI_API_KEY=your_openai_api_key

# Required: Firebase (replace with your project values; do NOT commit secrets)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> **Security note:** Avoid hard-coding keys in source; use environment variables and configure your hosting provider's secret manager.

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the Vite URL printed in the console (typically http://localhost:5173).

## Build & Preview
- Create a production build:
  ```bash
  npm run build
  ```
- Preview the production bundle locally:
  ```bash
  npm run preview
  ```

## Data & Integrations
- **Firestore persistence**: `dbService.ts` exposes CRUD helpers and live subscriptions for bots, leads, users, conversations, and reseller referrals. It uses collection names defined in `COLLECTIONS`.
- **Auth**: Firebase Auth state is observed in `App.tsx`, which loads user profiles from Firestore and updates UI state accordingly.
- **AI calls**: `geminiService.ts` wraps OpenAI chat completions with context injection for knowledge base content and marketing content generation.
- **Billing logic**: Plan limits and features come from `PLANS` in `constants.ts`; plan updates persist through `dbService.updateUserPlan`.

## Testing
The project currently does not include automated tests. Add tests alongside new features using the preferred framework for this stack (e.g., Vitest + React Testing Library) to keep coverage healthy.

## Deployment Checklist
- Configure environment variables/secrets in your hosting platform (OpenAI key, Firebase config).
- Ensure Firestore rules and Firebase Auth providers are enabled for your use case.
- Run `npm run build` and deploy the `dist/` output to your CDN/hosting provider.
- Set up HTTPS, custom domains, and caching per your deployment target.

## Security & Compliance
- Never expose API keys in client bundles; use environment variables and secret managers.
- Enable Firebase security rules (Auth + Firestore) to restrict access based on user roles (owner, admin, reseller).
- Consider rate limiting and input validation for AI endpoints and lead capture forms.
- If handling PII, document data retention policies and consent flows.

## Additional Resources
- `supabase_schema.sql`: Reference SQL for potential Supabase deployment.
- `nginx.conf` & `Dockerfile`: Example container and web server setup for production hosting.
