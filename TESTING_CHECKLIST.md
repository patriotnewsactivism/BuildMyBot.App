<<<<<<< HEAD
# 🧪 Local Testing Checklist

**Dev Server Running:** ✅ http://localhost:3000

---

## Test 1: Dashboard Analytics (Real Data)

### Steps:
1. Open http://localhost:3000
2. Login with your Supabase account (or create new account)
3. Navigate to Dashboard

### ✅ What to Check:

**Conversation Volume Chart:**
- [ ] Chart shows data for last 7 days (Sun-Sat)
- [ ] If you have conversations, bars show real counts
- [ ] If no data yet, shows zeros (not fake 45, 52, 38, etc.)
- [ ] Hover shows actual numbers

**Lead Sources Widget:**
- [ ] If no leads: Shows "No leads captured yet"
- [ ] If leads exist: Shows percentage like "45% from Sales Bot"
- [ ] Percentage is calculated (not fixed at 82%)
- [ ] Shows actual bot name

**Average Response Time:**
- [ ] If no conversations: Shows "N/A"
- [ ] If conversations exist: Shows calculated time (e.g., "1.2s" or "850ms")
- [ ] NOT hardcoded "0.8s"

**To Generate Test Data:**
```
1. Create a bot in Bot Builder
2. Open the preview chat
3. Send 3-5 test messages
4. Wait 30 seconds
5. Refresh dashboard
6. Analytics should update with real data
```

---

## Test 2: Website Scraping

### Test A: Landing Page Demo

1. **Logout** (if logged in)
2. Scroll to "Instant Training Demo" section
3. Enter URL: `https://example.com`
4. Click **"Train"** button

**Expected Result:**
- [ ] Loading spinner appears
- [ ] After 3-5 seconds, success message shows
- [ ] Content preview displays extracted text
- [ ] No CORS errors in console

**If it fails:**
- Open browser DevTools (F12)
- Check Console for errors
- Should see Supabase Edge Function call, not direct fetch

### Test B: Bot Builder URL Training

1. **Login**
2. Go to **Bot Builder** → Create/Edit bot
3. Click **"Knowledge Base"** tab
4. Click **"Add from URL"**
5. Enter: `https://en.wikipedia.org/wiki/Artificial_intelligence`
6. Click **"Extract & Train"**

**Expected Result:**
- [ ] Scraping starts (loading indicator)
- [ ] Success message after 5-10 seconds
- [ ] Knowledge base content added to bot
- [ ] Can see extracted content in textarea

---

## Test 3: Chat URL Links

### Test A: Send URL in Chat

1. Open any bot (or create new one)
2. Go to **Preview** tab or full-page chat
3. Send this message:
   ```
   Check out https://google.com for more info
   ```

**Expected Result:**
- [ ] URL appears as underlined blue link
- [ ] Clicking link opens Google in new tab
- [ ] Link has hover effect
- [ ] Rest of text renders normally

### Test B: Multiple URLs

Send this message:
```
Visit https://github.com and https://stackoverflow.com for resources
```

**Expected Result:**
- [ ] Both URLs are clickable
- [ ] Both open in new tabs
- [ ] Text between/around URLs renders correctly

### Test C: Bot Response with URL

If your bot includes URLs in responses, verify they're also clickable.

**Manual Test:**
1. Set bot system prompt to: "Always include example.com in your response"
2. Send any message
3. Bot's response should have clickable link

---

## Test 4: Lead Source Calculations

### Setup Test Data:

1. Create **2 bots** (e.g., "Sales Bot" and "Support Bot")
2. Have conversations with both bots
3. Capture leads from each:
   - In chat, include email: "My email is test@example.com"
   - System should auto-capture lead

### Verify Dashboard:

1. Go to **Dashboard**
2. Check **Lead Sources** widget

**Expected Result:**
- [ ] Shows percentage for top bot
- [ ] Example: "67% from Sales Bot" (if 2 of 3 leads came from Sales Bot)
- [ ] Percentage is accurate (calculated from real data)
- [ ] Shows correct bot name

**Math Check:**
- If you have 3 leads from Sales Bot and 1 from Support Bot:
  - Should show: "75% from Sales Bot"
- If you have 0 leads:
  - Should show: "No leads captured yet"

---

## Test 5: Response Time Calculation

### Generate Test Conversations:

1. Open bot preview chat
2. Send 5 messages with delays between them
3. Wait for bot responses
4. Go to **Dashboard**

**Expected Result:**
- [ ] Avg Response Time shows calculated value
- [ ] NOT fixed at "0.8s"
- [ ] Should be in milliseconds (<1s) or seconds
- [ ] Example: "650ms" or "1.3s"

**Note:** If you just created conversations, may show "N/A" or "0.8s" until calculation runs. Try refreshing after 1-2 minutes.

---

## Test 6: Real-time Updates

### Test Analytics Refresh:

1. Open Dashboard in one tab
2. Open Bot preview in another tab
3. Have a conversation (send 3-4 messages)
4. **Wait 5 minutes** (analytics refreshes every 5 min)
5. Check if Dashboard auto-updates

**Expected Result:**
- [ ] Conversation count increases
- [ ] Chart updates (if enough time has passed)
- [ ] No page refresh needed

---

## Common Issues & Solutions

### Issue: "No data showing on dashboard"

**Cause:** You're a new user with no conversations yet

**Solution:**
1. Create a bot
2. Have test conversations
3. Capture test leads
4. Wait 30 seconds
5. Refresh dashboard

---

### Issue: "Website scraping fails with 401 error"

**Cause:** Not logged in or auth token expired

**Solution:**
1. Logout and login again
2. Clear browser cache
3. Check Supabase is connected (check .env)

---

### Issue: "URLs not clickable in chat"

**Cause:** Browser cache showing old version

**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Check browser console for errors

---

### Issue: "Analytics shows old mock data"

**Cause:** Using demo/admin account or mock data fallback

**Solution:**
1. Login with real Supabase user (not demo account)
2. Check user.id doesn't start with 'demo-user' or 'master-admin'
3. Verify you have real conversations/leads in database

---

## Success Criteria

All tests should pass:
- [x] Dev server running on localhost:3000
- [ ] Dashboard shows real data (or zeros for new users)
- [ ] Website scraping works (both landing page and bot builder)
- [ ] URLs in chat are clickable
- [ ] Lead sources calculated correctly
- [ ] Response time calculated (not hardcoded)

---

## Browser Console Check

Open DevTools (F12) → Console tab

**Good Signs:**
- No red errors
- See successful API calls to Supabase
- Edge Function calls succeed (status 200)

**Bad Signs:**
- CORS errors → Scraping broken
- 401/403 errors → Auth issue
- "MOCK_ANALYTICS_DATA" in logs → Still using mock data

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit any final changes
2. Push to GitHub
3. Vercel will auto-deploy
4. Test in production

### If Issues Found ❌
Report which test failed and I'll fix it immediately.

---

**Ready to test!** Start with Test 1 (Dashboard) and work through each one. Let me know results! 🚀
=======
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
>>>>>>> 76d87c4532f1d96b278572148f69343067e747b5
