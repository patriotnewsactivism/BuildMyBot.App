# BuildMyBot Delivery Plan

## 1) Current State Snapshot
- React + Vite SPA with Firebase (Auth, Firestore, Storage, Analytics) and OpenAI GPT-4o integration for chat/marketing.
- Core modules: bot builder, template marketplace, chat + CRM/lead capture, marketing tools, website builder, phone agent, billing, reseller and admin dashboards.
- Data helpers live in `services/dbService.ts`; AI calls route through `services/geminiService.ts`.
- Firebase config is currently in source; should be migrated to environment variables.
- No automated tests or CI configured.

## 2) Objectives
- Deliver a secure, multi-tenant chatbot platform with reliable AI, billing, and reseller workflows.
- Harden security: secret management, auth/role enforcement, Firestore rules, and API usage limits.
- Improve maintainability: testing coverage, type safety, documentation, and deployment automation.

## 3) Near-Term Work (1–2 sprints)
1. **Secret management & config**
   - Move Firebase config to environment variables and document required values.
   - Validate `OPENAI_API_KEY` presence and fail fast in dev/CI.
2. **Auth & access control**
   - Add role-based guards around admin/reseller routes and Firestore queries.
   - Define/implement Firestore security rules aligned with `UserRole` and plan tiers.
3. **Testing & quality**
   - Introduce Vitest + React Testing Library; add unit tests for `dbService` and AI wrappers (mocked network).
   - Add linting/formatting (ESLint/Prettier) if not already present.
4. **CI/CD setup**
   - Configure GitHub Actions for install, lint, test, build; block merges on failure.
   - Add preview deployments (e.g., Vercel/Netlify) for PR review.
5. **Billing & usage safeguards**
   - Enforce plan limits (bots, conversations) client-side and in Firestore writes.
   - Track conversation counts per bot/user to support overage calculations.
6. **Analytics & observability**
   - Instrument key flows (chat errors, lead capture, AI latency) with logging/metrics.
   - Add error boundaries and user-facing error states around networked features.

## 4) Mid-Term Enhancements (3–6 sprints)
- **Knowledge base improvements**: Persist crawled content, add retry/fallback strategies, and allow manual uploads.
- **Reseller program**: Automate referral tracking, payout calculations, and exportable reports.
- **Phone agent**: Integrate real telephony provider and validate phone numbers; add call transcripts to conversations.
- **Localization & accessibility**: i18n setup, ARIA fixes, keyboard navigation audits.
- **Performance**: Code-splitting by route, cache strategy for static assets, memoization for heavy charts.

## 5) Release Checklist
- ✅ Env vars configured in hosting provider (OpenAI, Firebase, analytics/logging keys).
- ✅ Firestore rules tested against role matrix (Owner/Admin/Reseller/Client).
- ✅ `npm run build` green in CI; automated tests pass with coverage gates.
- ✅ PII handling documented; consent/retention reviewed with legal/compliance.
- ✅ Backups and monitoring alerts enabled for Firestore/outbound AI errors.

## 6) Risks & Mitigations
- **Secret leakage**: Move Firebase keys out of source; use CI secret scanning and runtime env injection.
- **Over-spend on AI**: Apply rate limits, cache deterministic prompts, and cap tokens per request.
- **Data integrity**: Enforce schema via validation on writes and Firestore rules; add migrations/backups.
- **Availability**: Add graceful degradation when OpenAI/Firebase is unavailable; surface status to users.

## 7) Success Metrics
- <2% error rate on AI requests over rolling 7 days.
- 99%+ success rate on lead capture writes.
- CI lead time <10 minutes; PRs blocked on failing tests.
- Onboarding time: new bot live in under 5 minutes using templates.
