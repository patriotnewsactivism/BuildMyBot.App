# BuildMyBot.App – Consolidated Improvement Plan

This plan operationalizes the provided recommendations into prioritized, actionable workstreams with clear deliverables, sequencing, and checkpoints. It complements the existing `PLAN.md` and `IMPLEMENTATION_SUMMARY.md` by focusing on completion, hardening, UX polish, branding, and SEO.

---

## Goals
- **Reliability & Security:** Finish Supabase migration, enforce RLS rigorously, and add robust background processing.
- **Growth Readiness:** Ship billing, SEO-friendly marketing pages, and white-label customisation for resellers.
- **User Experience:** Improve accessibility, performance, branding, and error handling to raise trust and conversion.

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

## Sequencing & Milestones
- **Now (Week 1–2):** Finish Supabase migration (edge functions + data migration), RLS verification, type generation, and queue integration kickoff. Stabilize Playwright in CI.
- **Next (Week 3–4):** Stripe billing + entitlements, pgvector search rollout, error boundaries, and accessibility audit with CI checks.
- **Then (Week 5–6):** Next.js marketing site with SEO plumbing (sitemap, robots, metadata, structured data), branding refresh (palette/typography/logo), and landing page redesign with social proof and pricing.
- **Later (Week 7+):** Widget theme editor, PWA features, ISR for dynamic pages, continued content hub build-out, and ongoing monitoring/alerting improvements.

---

## Checkpoints & Owners
- **Security & Data:** RLS tests, audit log integrity, secret scanning.  
- **Reliability:** Queue metrics, job retries, alert thresholds.  
- **Growth:** SEO KPIs (index coverage, CWV), conversion on landing CTAs, billing activation rate.  
- **UX:** Accessibility scores, error boundary coverage, widget customization satisfaction.

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
