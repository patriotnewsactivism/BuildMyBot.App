# ✅ Supabase Setup Checklist

Quick reference checklist - check off as you go!

---

## 🌐 Step 1: Create Account & Project

- [ ] Go to https://supabase.com and sign up
- [ ] Create organization (if first time)
- [ ] Click "New Project"
- [ ] Fill in details:
  - Project name: `buildmybot`
  - Database password: **[SAVE THIS]** _______________
  - Region: _______________
- [ ] Wait 2-3 minutes for project creation
- [ ] Keep browser tab open with dashboard

## 📝 Step 2: Save Credentials

Go to Project Settings → API:

- [ ] **Project URL**: _______________________________________________
- [ ] **anon public key**: _______________________________________________
- [ ] **Project Reference ID** (from URL): _______________

---

## 💻 Step 3: Install CLI

```bash
npm install -g supabase
supabase --version
```

- [ ] CLI installed successfully
- [ ] Version shows: `supabase 1.x.x`

---

## 🔗 Step 4: Login & Link

```bash
supabase login
```
- [ ] Browser opened and authorized
- [ ] Success message in terminal

```bash
supabase link --project-ref YOUR_PROJECT_REF
```
- [ ] Entered project ref: _______________
- [ ] Entered database password
- [ ] Success: "Finished supabase link"

---

## 📊 Step 5: Apply Migrations

```bash
supabase db push
```

- [ ] Migration 20250109000000_initial_schema.sql applied
- [ ] Migration 20250204000000_add_phone_call_metadata.sql applied
- [ ] Migration 20251216_create_audit_logs.sql applied
- [ ] Success message shown

**Verify in Dashboard:**
- [ ] Table Editor shows 11+ tables
- [ ] `profiles` table exists
- [ ] `bots` table exists
- [ ] `leads` table exists
- [ ] Database → Extensions → `vector` is enabled

---

## ⚡ Step 6: Deploy Edge Functions

Deploy each function (or use the shortcut command):

```bash
# Individual deployments:
supabase functions deploy ai-complete
supabase functions deploy create-lead
supabase functions deploy embed-knowledge-base
supabase functions deploy billing-overage-check
supabase functions deploy marketplace-install-template
supabase functions deploy reseller-track-referral
supabase functions deploy scrape-url
supabase functions deploy twilio-call-webhook

# OR use this shortcut (Windows PowerShell):
@("ai-complete", "create-lead", "embed-knowledge-base", "billing-overage-check", "marketplace-install-template", "reseller-track-referral", "scrape-url", "twilio-call-webhook") | ForEach-Object { supabase functions deploy $_ }

# OR use this shortcut (Git Bash / WSL):
for func in ai-complete create-lead embed-knowledge-base billing-overage-check marketplace-install-template reseller-track-referral scrape-url twilio-call-webhook; do supabase functions deploy $func; done
```

Edge Functions Deployed:
- [ ] ai-complete
- [ ] create-lead
- [ ] embed-knowledge-base
- [ ] billing-overage-check
- [ ] marketplace-install-template
- [ ] reseller-track-referral
- [ ] scrape-url
- [ ] twilio-call-webhook

**Verify in Dashboard:**
- [ ] Edge Functions page shows all 8 functions

---

## 🔐 Step 7: Configure Secrets

Get OpenAI API key from: https://platform.openai.com/api-keys

- [ ] OpenAI account created
- [ ] API key generated: sk-proj-_______________
- [ ] Credits added to account ($5-20 recommended)

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-actual-key
```

- [ ] Secret set successfully

**Verify:**
```bash
supabase secrets list
```
- [ ] Shows: `OPENAI_API_KEY: ******`

---

## 📝 Step 8: Update .env File

Edit your local `.env` file with Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
OPENAI_API_KEY=sk-proj-...
```

- [ ] Updated `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Updated `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Updated `OPENAI_API_KEY`
- [ ] Saved `.env` file

---

## ✅ Step 9: Test & Verify

```bash
npm run dev
```

- [ ] Dev server starts without errors
- [ ] Visit http://localhost:3000
- [ ] Landing page loads
- [ ] No console errors (F12)

**Test Sign Up:**
- [ ] Click "Get Started" button
- [ ] Sign up modal appears
- [ ] Enter email and password
- [ ] Successfully creates account
- [ ] Go to Supabase → Table Editor → profiles
- [ ] New profile row appears!

**Test Interactive Demos:**
- [ ] Chatbot widget works
- [ ] Can send messages
- [ ] Gets AI responses

---

## 🎉 Setup Complete!

All items checked? **Congratulations!** Your Supabase backend is fully operational.

**Current Status:**
- ✅ Database: 11+ tables with RLS policies
- ✅ Edge Functions: 8 deployed and ready
- ✅ Secrets: OpenAI key configured
- ✅ Local App: Connected to Supabase

---

## 📋 Summary of What You Have

### Database Tables Created:
1. **profiles** - User accounts (OWNER, ADMIN, RESELLER roles)
2. **bots** - AI chatbot configurations
3. **leads** - Lead capture with scoring
4. **conversations** - Chat message history
5. **knowledge_base** - RAG embeddings (pgvector)
6. **reseller_accounts** - Reseller management
7. **reseller_clients** - Client tracking
8. **commissions** - Commission calculations
9. **billing_accounts** - Stripe billing
10. **usage_events** - API usage tracking
11. **phone_calls** - Phone agent logs
12. **marketing_content** - Generated content
13. **website_pages** - Website builder
14. **audit_logs** - Audit trail

### Edge Functions Deployed:
1. **ai-complete** - Secure AI proxy
2. **create-lead** - Lead validation
3. **embed-knowledge-base** - RAG embeddings
4. **billing-overage-check** - Plan enforcement
5. **marketplace-install-template** - Template installer
6. **reseller-track-referral** - Referral tracking
7. **scrape-url** - Content extraction
8. **twilio-call-webhook** - Phone integration

---

## 🚀 Next Steps

1. **Test All Features**: Try creating bots, capturing leads, chatting
2. **Check Dashboard**: Monitor usage in Supabase
3. **Deploy to Production**: Follow DEPLOY_IMMEDIATELY.md
4. **Add Team Members**: Invite collaborators in Supabase dashboard

---

## 🆘 Issues?

If anything didn't work:
1. Check **SUPABASE_SETUP.md** for detailed troubleshooting
2. Verify all credentials are correct in `.env`
3. Check Supabase dashboard logs
4. Try `supabase unlink` and repeat linking process

---

**Date Completed:** _______________
**Time Taken:** _______________
**Notes:** _____________________________________________

