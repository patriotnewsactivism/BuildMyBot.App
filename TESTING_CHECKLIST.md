# BuildMyBot - Comprehensive Testing Checklist

## Pre-Release Testing

### Critical Bug Fixes ✅
- [ ] Database migration applied successfully (`supabase db reset` or `supabase db push`)
- [ ] Conversations table has `messages`, `updated_at`, and `timestamp` columns
- [ ] Admin Dashboard shows real bot/user counts (not zeros)
- [ ] Chat conversations persist correctly with message history
- [ ] No console errors related to schema mismatch

### Stripe Billing Integration ✅
- [ ] Stripe products created in dashboard (STARTER, PROFESSIONAL, EXECUTIVE, ENTERPRISE)
- [ ] Stripe webhook endpoint configured
- [ ] Environment secrets set (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs)
- [ ] Edge Functions deployed (`stripe-checkout`, `stripe-webhooks`)
- [ ] User can click "Upgrade" and reach Stripe Checkout
- [ ] Test card payment completes successfully (4242 4242 4242 4242)
- [ ] Webhook updates `profiles.plan` instantly after payment
- [ ] `billing_accounts` table syncs subscription status
- [ ] Billing UI reflects actual Stripe subscription
- [ ] Canceled payment redirects correctly
- [ ] Success payment updates plan in real-time

### Firebase Cleanup ✅
- [ ] Zero Firebase imports in codebase (`grep -r "firebase"`)
- [ ] Website pages upload to Supabase Storage (`website-pages` bucket)
- [ ] Published pages accessible via public URL
- [ ] `npm run build` succeeds with no errors
- [ ] No broken imports or missing dependencies

---

## Feature Testing (All 29 Categories)

### Core Bot Features (8 categories)

#### 1. Authentication & User Management
- [ ] User can sign up with email/password
- [ ] User can log in
- [ ] Email verification works
- [ ] Master admin emails get ENTERPRISE plan automatically
- [ ] Limited admin emails get read-only access
- [ ] User profile loads correctly
- [ ] Referral code (?ref=CODE) captured on signup

#### 2. Bot Builder
- [ ] User can create a new bot
- [ ] Bot name, system prompt, model selection work
- [ ] Temperature slider functional
- [ ] Theme color picker works
- [ ] Response delay configuration works
- [ ] Avatar customization works
- [ ] Bot saves to database
- [ ] Plan limits enforced (e.g., FREE = 1 bot)

#### 3. Knowledge Base / RAG
- [ ] User can upload PDF files
- [ ] User can upload text files
- [ ] User can train from website URL
- [ ] Multi-page URL scraping works
- [ ] Files are chunked and embedded
- [ ] Embeddings stored in `knowledge_base` table with pgvector
- [ ] Storage limits enforced by plan
- [ ] RAG retrieval works in chat (relevant answers from uploaded docs)

#### 4. Lead Capture
- [ ] Leads captured from widget conversations
- [ ] Lead email validation works
- [ ] Duplicate leads prevented (same email + bot)
- [ ] Leads stored with bot ownership
- [ ] Lead metadata (name, phone, company) captured

#### 5. CRM Pipeline
- [ ] Leads displayed in List view
- [ ] Leads displayed in Kanban view
- [ ] Drag-and-drop status changes work
- [ ] Lead scoring (0-100) calculated correctly
- [ ] Hot/Warm/Cold bands displayed
- [ ] Search and filtering functional
- [ ] Lead status tracking (New, Contacted, Qualified, Closed)

#### 6. Chat Logs & Conversations
- [ ] Full conversation transcripts viewable
- [ ] Real-time message updates work
- [ ] Sentiment analysis displayed (Positive/Neutral/Negative)
- [ ] Chat logs exportable
- [ ] Session tracking works
- [ ] Conversations linked to correct bot

#### 7. Analytics Dashboard
- [ ] 7-day conversation volume chart displays
- [ ] Lead capture metrics shown
- [ ] Estimated savings calculated
- [ ] Average response time metrics displayed
- [ ] Real-time analytics updates
- [ ] Lead source breakdown shown

#### 8. Multi-bot Management
- [ ] User can switch between bots
- [ ] Plan limits enforced (FREE=1, STARTER=1, PROFESSIONAL=5, EXECUTIVE=10, ENTERPRISE=unlimited)
- [ ] Bot deletion works
- [ ] Bot duplication works (if feature exists)

### Marketing Studio (4 categories)

#### 9. Email Generation
- [ ] Email campaign generation works
- [ ] Tone customization (Professional, Casual, Witty) works
- [ ] Generated email saves to `marketing_content` table
- [ ] Template history viewable

#### 10. Social Media Posts
- [ ] Twitter/X thread generation works
- [ ] LinkedIn post generation works
- [ ] Viral thread optimization works
- [ ] Post variants generated correctly

#### 11. Ad Copy
- [ ] Google Ads copy generation works
- [ ] Meta/Facebook ads copy generation works
- [ ] High-converting copy optimization works

#### 12. Blog Posts
- [ ] Blog post outline generation works
- [ ] Full blog drafting works
- [ ] SEO optimization included

### Advanced Features (17 categories)

#### 13. Website Builder
- [ ] Landing page generation from business description works
- [ ] Industry-specific templates available
- [ ] Headline and subheadline generation works
- [ ] Feature list auto-generated
- [ ] SEO metadata (title, description, keywords) generated
- [ ] Desktop preview works
- [ ] Mobile preview works
- [ ] Page saves to `website_pages` table
- [ ] Page publishes to Supabase Storage
- [ ] Published page accessible via public URL
- [ ] Static HTML download works

#### 14. Phone Agent (Twilio + Cartesia)
- [ ] Phone configuration UI loads
- [ ] Intro message customizable
- [ ] Voice selection works (alloy, echo, fable, onyx, nova, shimmer)
- [ ] Twilio integration configured
- [ ] Call logs displayed
- [ ] Transcripts saved to `phone_calls` table
- [ ] Call simulation works (if available)

#### 15. Marketplace
- [ ] Template categories displayed
- [ ] Template search works
- [ ] Template preview available
- [ ] One-click installation works
- [ ] Install count increments
- [ ] Rating system works
- [ ] User can install templates

#### 16. Reseller Dashboard
- [ ] Referral code generated
- [ ] Client referrals tracked
- [ ] Commission tiers displayed (Bronze, Silver, Gold, Platinum)
- [ ] Earnings calculations correct
- [ ] Referral attribution works

#### 17. Admin Dashboard (God Mode)
- [ ] Total users count correct (not zero)
- [ ] Total bots count correct (not zero)
- [ ] MRR calculation accurate
- [ ] Partner count correct
- [ ] Revenue trend chart displays
- [ ] All businesses table loads
- [ ] User status toggle works (Active/Suspended)
- [ ] Partner approval works
- [ ] Read-only mode respected

#### 18. Billing & Plans
- [ ] All 5 plans displayed
- [ ] Current plan badge shown
- [ ] Feature comparisons accurate
- [ ] Upgrade button triggers Stripe
- [ ] Plan limits enforced
- [ ] Overage tracking works
- [ ] Subscription status synced

#### 19. Chat Widget Embed
- [ ] Embed code generated
- [ ] Widget displays on external site
- [ ] Theme colors customizable
- [ ] Welcome message customizable
- [ ] Widget position adjustable (bottom-right, etc.)
- [ ] Widget responsive on mobile

#### 20. Real-time Subscriptions
- [ ] Bots update live via postgres_changes
- [ ] Leads update live
- [ ] Conversations update live
- [ ] Real-time notifications work

#### 21. API Access (Edge Functions)
- [ ] `ai-complete` Edge Function works
- [ ] `create-lead` Edge Function works
- [ ] `embed-knowledge-base` Edge Function works
- [ ] `billing-overage-check` Edge Function works
- [ ] Auth headers validated
- [ ] Usage tracking works

#### 22. Security & RLS
- [ ] Users can only see their own bots
- [ ] Users can only see their own leads
- [ ] Conversations isolated by user
- [ ] Knowledge base access restricted
- [ ] Unauthorized access blocked

#### 23. Storage Management
- [ ] File uploads work
- [ ] Storage usage tracked
- [ ] Plan limits enforced
- [ ] File deletion works

#### 24. User Roles
- [ ] OWNER role permissions work
- [ ] ADMIN role permissions work
- [ ] RESELLER role permissions work
- [ ] MASTER_ADMIN permissions work
- [ ] LIMITED_ADMIN read-only works

#### 25. Plan Limits Enforcement
- [ ] Conversation limits enforced
- [ ] Bot limits enforced
- [ ] Storage limits enforced
- [ ] Upgrade prompt shown when limit reached

#### 26. Referral System
- [ ] `?ref=CODE` captured on signup
- [ ] Referral attributed to correct reseller
- [ ] Referral count increments

#### 27. White-Label (ENTERPRISE)
- [ ] Custom domain support works
- [ ] Custom branding colors work
- [ ] Company logo uploadable
- [ ] Custom email domain configured

#### 28. Voice Agent (Cartesia)
- [ ] Ultra-low latency TTS works (<200ms)
- [ ] Bidirectional audio streaming works
- [ ] WebSocket connection stable
- [ ] Voice quality high

#### 29. Done-For-You Services
- [ ] Service tiers displayed (Starter $299, Professional $799, Enterprise $1999)
- [ ] Service request form works
- [ ] Progress tracking visible
- [ ] Deliverables shown

---

## Technical Testing

### Performance
- [ ] Page load time < 3s on 3G
- [ ] Time to Interactive < 5s
- [ ] Lighthouse score > 90
- [ ] No memory leaks in long sessions
- [ ] Database queries optimized (< 100ms)
- [ ] API response times < 500ms

### Mobile Responsive
- [ ] 320px (iPhone SE) - UI functional
- [ ] 375px (iPhone 12) - UI functional
- [ ] 768px (iPad) - UI functional
- [ ] 1920px (Desktop) - UI functional
- [ ] 4K (3840px) - UI functional
- [ ] Touch interactions work
- [ ] Mobile navigation works

### Browser Compatibility
- [ ] Chrome (latest) works
- [ ] Firefox (latest) works
- [ ] Safari (latest) works
- [ ] Edge (latest) works
- [ ] Mobile Safari works
- [ ] Mobile Chrome works

### Security
- [ ] SQL injection tests pass
- [ ] XSS vulnerability tests pass
- [ ] CSRF protection works
- [ ] RLS policies prevent unauthorized access
- [ ] API keys never exposed in frontend
- [ ] Sensitive data encrypted

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Database errors logged
- [ ] User-friendly error messages shown
- [ ] No uncaught exceptions in console
- [ ] Sentry error tracking working

---

## Automated Testing

### E2E Tests
- [ ] `npm run test:e2e` passes
- [ ] `e2e/golden-path.spec.ts` passes
- [ ] `e2e/widget.spec.ts` passes
- [ ] `e2e/billing-flow.spec.ts` passes
- [ ] `e2e/knowledge-base.spec.ts` passes

### Unit Tests
- [ ] `npm run test` passes
- [ ] Service layer tests pass
- [ ] Helper function tests pass

### Other
- [ ] `npm run check-links` passes
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (no errors)

---

## Production Readiness

### Infrastructure
- [ ] Environment variables set (.env.local)
- [ ] Supabase project configured
- [ ] Database migrations applied
- [ ] Edge Functions deployed
- [ ] Stripe live mode configured (not test mode)
- [ ] Domain configured (if custom domain)
- [ ] SSL certificate valid

### Monitoring
- [ ] Sentry error tracking active
- [ ] PostHog analytics active
- [ ] Stripe webhook monitoring setup
- [ ] Database performance monitoring setup

### Documentation
- [ ] CLAUDE.md updated with Stripe setup
- [ ] Environment variables documented
- [ ] Deployment guide created
- [ ] API documentation complete

### Final Checks
- [ ] All console errors resolved
- [ ] All console warnings reviewed
- [ ] No broken links
- [ ] No broken images
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] GDPR compliance reviewed
- [ ] Data backup strategy in place

---

## Sign-Off

**Tested By:** ___________________________

**Date:** ___________________________

**Environment:** ☐ Development  ☐ Staging  ☐ Production

**Overall Status:** ☐ Pass  ☐ Fail  ☐ Conditional Pass

**Notes:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
