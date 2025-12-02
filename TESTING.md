# Testing Guide

Comprehensive testing documentation for BuildMyBot.app covering all features, Edge Functions, database policies, and UI components.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Testing](#database-testing)
4. [Edge Functions Testing](#edge-functions-testing)
5. [Frontend Testing](#frontend-testing)
6. [Integration Testing](#integration-testing)
7. [Security Testing](#security-testing)
8. [Performance Testing](#performance-testing)

---

## Prerequisites

### Required Tools
- Node.js 18+ and npm/yarn
- Supabase CLI (`npm install -g supabase`)
- PostgreSQL client (psql) for manual queries
- curl or Postman for API testing
- Modern browser with DevTools

### Test Accounts
Create test accounts for different roles:
- **Free Tier User**: Test quota limits
- **Pro User**: Test advanced features
- **Reseller**: Test reseller dashboard
- **Admin**: Test admin overrides

---

## Environment Setup

### 1. Local Supabase Setup
```bash
# Start local Supabase instance
supabase start

# Apply migrations
supabase db reset

# View local dashboard
supabase status
```

### 2. Environment Variables
```bash
# Copy test environment
cp .env.example .env.test

# Set test values
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
VITE_OPENAI_API_KEY=<test-key-or-mock>
```

### 3. Run Frontend
```bash
npm install
npm run dev
```

---

## Database Testing

### Schema Validation

#### Test 1: Verify All Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected**: 16 tables (profiles, bots, knowledge_base, conversations, leads, marketing_content, billing_accounts, usage_events, templates, plans, reseller_accounts, reseller_clients, referrals, commissions, website_pages, phone_calls)

#### Test 2: Check Extensions
```sql
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgvector');
```

**Expected**: Both extensions enabled

#### Test 3: Verify Indexes
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected**: All idx_* indexes created

### Row-Level Security (RLS) Testing

#### Test 4: User Isolation
```sql
-- Sign up two users via UI
-- As User A, create a bot
INSERT INTO bots (owner_id, name, system_prompt)
VALUES (auth.uid(), 'Test Bot A', 'Test prompt');

-- As User B, try to view User A's bot
SELECT * FROM bots WHERE owner_id != auth.uid();
```

**Expected**: User B sees no bots (RLS blocks cross-user access)

#### Test 5: Admin Override
```sql
-- Update a user to admin role
UPDATE profiles SET role = 'admin' WHERE id = '<user-id>';

-- As admin, query all bots
SELECT * FROM bots;
```

**Expected**: Admin sees all bots regardless of owner

#### Test 6: Reseller Access
```sql
-- Create reseller account
UPDATE profiles SET role = 'reseller' WHERE id = '<reseller-id>';

-- Create client under reseller
INSERT INTO reseller_clients (reseller_id, client_id)
VALUES ('<reseller-id>', '<client-id>');

-- Reseller queries client's bots
SELECT b.* FROM bots b
JOIN reseller_clients rc ON rc.client_id = b.owner_id
WHERE rc.reseller_id = auth.uid();
```

**Expected**: Reseller sees only their clients' bots

### Team Collaboration Testing

#### Test 7: Team Member Access
```sql
-- Owner invites team member
INSERT INTO team_members (team_owner_id, member_id, role, status)
VALUES ('<owner-id>', '<member-id>', 'admin', 'active');

-- Member queries owner's bots via has_resource_access()
SELECT * FROM bots WHERE has_resource_access('<member-id>', 'bot', id);
```

**Expected**: Team member can access shared resources based on permissions

#### Test 8: Shared Resources
```sql
-- Share a bot with another user
INSERT INTO shared_resources (owner_id, shared_with_id, resource_type, resource_id, permissions)
VALUES ('<owner-id>', '<user-id>', 'bot', '<bot-id>', 'read');

-- User queries shared bots
SELECT * FROM shared_resources WHERE shared_with_id = auth.uid();
```

**Expected**: User sees shared resources with appropriate permissions

### Vector Embeddings Testing

#### Test 9: Upload and Query Embeddings
```bash
# Upload a knowledge file via UI
# Check embeddings were created
```

```sql
SELECT id, owner_id, content, similarity
FROM knowledge_base
WHERE owner_id = '<user-id>'
LIMIT 5;
```

**Expected**: Embeddings stored with 1536-dimensional vectors

#### Test 10: Semantic Search
```sql
-- Search for similar content
SELECT content, 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM knowledge_base
WHERE bot_id = '<bot-id>'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 3;
```

**Expected**: Results ordered by semantic similarity

---

## Edge Functions Testing

### AI Complete Function

#### Test 11: Authenticated Bot Chat
```bash
# Get auth token from UI
TOKEN="<your-jwt-token>"

curl -X POST \
  'http://localhost:54321/functions/v1/ai-complete' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "<bot-id>",
    "messages": [
      {"role": "user", "content": "Hello, what can you do?"}
    ]
  }'
```

**Expected**:
- JSON response with AI message
- Usage event logged to `usage_events` table
- Message count incremented

#### Test 12: Quota Enforcement
```sql
-- Set user to free plan with low limit
UPDATE profiles SET plan = 'free' WHERE id = '<user-id>';
UPDATE billing_accounts SET messages_limit = 5 WHERE owner_id = '<user-id>';

-- Make 6 requests via ai-complete
```

**Expected**: 6th request returns quota exceeded error

#### Test 13: Knowledge Base Context
```bash
# Upload knowledge base file via UI
# Send query that should match knowledge base

curl -X POST \
  'http://localhost:54321/functions/v1/ai-complete' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "botId": "<bot-id>",
    "messages": [{"role": "user", "content": "What is your return policy?"}],
    "useKnowledgeBase": true
  }'
```

**Expected**: Response includes relevant context from knowledge base

### Phone Webhook Function

#### Test 14: Twilio Incoming Call
```bash
# Simulate Twilio webhook
curl -X POST \
  'http://localhost:54321/functions/v1/phone-webhook' \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'CallSid=CAxxxxxxx' \
  -d 'From=+15551234567' \
  -d 'To=+15559876543' \
  -d 'CallStatus=ringing' \
  -d 'Direction=inbound'
```

**Expected**:
- TwiML XML response
- Call logged to `phone_calls` table

#### Test 15: Voice Interaction
```bash
# Simulate speech input
curl -X POST \
  'http://localhost:54321/functions/v1/phone-webhook' \
  -d 'CallSid=CAxxxxxxx' \
  -d 'SpeechResult=What are your business hours?'
```

**Expected**:
- TwiML with AI-generated voice response
- Transcript saved to phone_calls table

### Stripe Webhook Function

#### Test 16: Subscription Created
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Create test subscription in Stripe dashboard
stripe trigger customer.subscription.created
```

**Expected**:
- Billing account created
- User plan updated

#### Test 17: Subscription Updated
```bash
stripe trigger customer.subscription.updated
```

**Expected**: Billing account status updated

#### Test 18: Subscription Deleted
```bash
stripe trigger customer.subscription.deleted
```

**Expected**: User downgraded to free plan

### Other Edge Functions

#### Test 19: Create Lead
```bash
curl -X POST \
  'http://localhost:54321/functions/v1/create-lead' \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "<bot-id>",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+15551234567",
    "conversationId": "<conversation-id>"
  }'
```

**Expected**: Lead created in `leads` table

#### Test 20: Install Template
```bash
curl -X POST \
  'http://localhost:54321/functions/v1/marketplace-install-template' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"templateId": "<template-id>"}'
```

**Expected**: Bot created from template for user

---

## Frontend Testing

### Authentication Flow

#### Test 21: Sign Up
1. Navigate to app
2. Click "Sign Up"
3. Enter email/password
4. Submit form

**Expected**:
- User redirected to dashboard
- Profile created in `profiles` table
- Billing account created

#### Test 22: Sign In
1. Sign out
2. Click "Sign In"
3. Enter credentials
4. Submit

**Expected**: User authenticated and redirected to dashboard

#### Test 23: Session Persistence
1. Sign in
2. Refresh page
3. Check user state

**Expected**: User remains authenticated

### Bot Builder

#### Test 24: Create Bot
1. Navigate to Bot Builder
2. Click "New Bot"
3. Configure bot settings (name, prompt, model)
4. Save

**Expected**:
- Bot appears in sidebar
- Bot saved to database
- Success notification shown

#### Test 25: Chat Testing
1. Select bot
2. Type message in chat
3. Send

**Expected**:
- AI response displayed
- Message history persists
- Conversation saved to database

#### Test 26: Knowledge Base Upload
1. Select bot
2. Click "Upload Knowledge"
3. Select PDF/TXT file
4. Upload

**Expected**:
- File processed
- Embeddings created
- Knowledge base count updated

#### Test 27: Model Selection
1. Open bot settings
2. Change model (gpt-4o, gpt-4o-mini)
3. Test chat

**Expected**: Responses use selected model

### CRM & Leads

#### Test 28: Lead Capture
1. Use bot in embed mode
2. Trigger lead capture (e.g., "I want a demo")
3. Fill lead form

**Expected**:
- Lead saved to database
- Lead appears in CRM
- Email notification sent (if configured)

#### Test 29: Lead Management
1. Navigate to CRM/Leads
2. View lead details
3. Update lead status
4. Add notes

**Expected**: Changes persist to database

### Analytics Dashboard

#### Test 30: Usage Metrics
1. Navigate to Analytics
2. View message count
3. Check time range selector (7d/30d/90d)

**Expected**:
- Correct message/lead counts
- Charts update based on time range
- Data matches `usage_events` table

#### Test 31: Real-time Updates
1. Open analytics in one tab
2. Send messages in another tab
3. Watch analytics update

**Expected**: Charts update in real-time via subscriptions

### Usage Quota Widget

#### Test 32: Quota Display
1. Navigate to dashboard
2. View quota widget
3. Check message/bot counts

**Expected**:
- Current usage displayed
- Progress bars show percentage
- Plan name shown

#### Test 33: Quota Warnings
1. Approach quota limit (>80%)
2. Check widget

**Expected**: Orange warning state displayed

#### Test 34: Quota Exceeded
1. Exceed quota limit
2. Try to send message

**Expected**:
- Red error state
- Upgrade CTA shown
- Message blocked

### Marketing Tools

#### Test 35: Content Generation
1. Navigate to Marketing Tools
2. Select content type (email/social/ad)
3. Enter topic and tone
4. Generate

**Expected**:
- AI-generated content displayed
- Copy button works
- Usage tracked

### Reseller Dashboard

#### Test 36: Client Management
1. Sign in as reseller
2. Navigate to reseller dashboard
3. Add new client
4. View client list

**Expected**:
- Client appears in `reseller_clients`
- Referral code generated

#### Test 37: Commission Tracking
1. Client makes purchase
2. Check commissions tab

**Expected**: Commission recorded and displayed

---

## Integration Testing

### End-to-End Scenarios

#### Test 38: Complete User Journey
1. Sign up as new user
2. Create first bot
3. Upload knowledge base
4. Test bot conversation
5. Capture a lead
6. View analytics
7. Upgrade plan
8. Create second bot

**Expected**: All features work seamlessly together

#### Test 39: Reseller White-Label Flow
1. Sign up as reseller
2. Configure white-label domain
3. Add client
4. Client signs up via referral link
5. Client creates bot
6. Verify commission

**Expected**: Full reseller workflow functions correctly

#### Test 40: Phone Agent Integration
1. Configure Twilio credentials
2. Assign phone number to bot
3. Make test call
4. Speak query
5. Check call log

**Expected**: Voice interaction works, transcript saved

---

## Security Testing

### Authentication & Authorization

#### Test 41: JWT Token Validation
```bash
# Use expired token
curl -H "Authorization: Bearer <expired-token>" \
  http://localhost:54321/functions/v1/ai-complete
```

**Expected**: 401 Unauthorized

#### Test 42: Cross-User Access
1. Sign in as User A
2. Get User B's bot ID from database
3. Try to access via API

**Expected**: 403 Forbidden or empty result due to RLS

#### Test 43: SQL Injection
```bash
# Try SQL injection in inputs
curl -X POST http://localhost:54321/functions/v1/create-lead \
  -d '{"email": "test@example.com; DROP TABLE leads;--"}'
```

**Expected**: Input sanitized, no SQL executed

### Data Privacy

#### Test 44: User Data Isolation
1. Create bots as User A
2. Sign in as User B
3. Query bots table

**Expected**: User B sees only their own bots

#### Test 45: Soft Delete
1. Delete a bot
2. Check database

**Expected**: Bot marked as deleted, not hard-deleted (if soft delete implemented)

---

## Performance Testing

### Load Testing

#### Test 46: Concurrent Requests
```bash
# Use Apache Bench or k6
ab -n 100 -c 10 http://localhost:54321/functions/v1/ai-complete
```

**Expected**:
- Requests complete successfully
- Response time < 2s average
- No errors

#### Test 47: Database Query Performance
```sql
-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM conversations WHERE bot_id = '<bot-id>' ORDER BY created_at DESC LIMIT 50;
```

**Expected**: Index used, execution time < 100ms

#### Test 48: Real-time Subscription Performance
1. Open 5 tabs with dashboard
2. Make changes in one tab
3. Measure update latency

**Expected**: Updates propagate within 1 second

### Optimization

#### Test 49: Bundle Size
```bash
npm run build
du -sh dist/assets/*.js
```

**Expected**: Main bundle < 500KB gzipped

#### Test 50: Lighthouse Audit
1. Run Lighthouse in Chrome DevTools
2. Check Performance, Accessibility, Best Practices, SEO

**Expected**: All scores > 90

---

## Automated Testing (Future)

### Unit Tests
```typescript
// Example: aiService.test.ts
import { generateBotResponse } from './aiService';

describe('aiService', () => {
  it('should generate bot response', async () => {
    const response = await generateBotResponse(
      'You are a helpful assistant',
      [],
      'Hello',
      'gpt-4o-mini'
    );
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests
```typescript
// Example: bot-creation.test.ts
import { createBot, getBot } from './dbService';

describe('Bot CRUD', () => {
  it('should create and retrieve bot', async () => {
    const bot = await createBot({ name: 'Test Bot', systemPrompt: 'Test' });
    const retrieved = await getBot(bot.id);
    expect(retrieved.name).toBe('Test Bot');
  });
});
```

---

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: npm install
      - run: npm test
      - run: npm run build
```

---

## Troubleshooting

### Common Issues

**Issue**: Edge function returns 500 error
- Check function logs: `supabase functions logs`
- Verify environment variables
- Check CORS headers

**Issue**: RLS blocking legitimate access
- Verify auth.uid() matches owner_id
- Check user role in profiles table
- Review policy conditions

**Issue**: Real-time subscriptions not working
- Verify Realtime is enabled in Supabase
- Check channel subscription status
- Review browser console for WebSocket errors

**Issue**: Knowledge base search not working
- Verify pgvector extension enabled
- Check embeddings were created
- Validate vector dimensions (1536 for OpenAI)

---

## Test Checklist

Before deploying to production:

- [ ] All 50 tests pass
- [ ] RLS policies prevent cross-user access
- [ ] Edge functions handle errors gracefully
- [ ] Quota enforcement works correctly
- [ ] Real-time updates propagate
- [ ] Analytics data is accurate
- [ ] Phone agent integration functional
- [ ] Stripe webhooks update billing correctly
- [ ] Team collaboration permissions work
- [ ] Knowledge base search returns relevant results
- [ ] Frontend performance meets targets
- [ ] Security audit complete
- [ ] Load testing shows acceptable performance
- [ ] Documentation is up-to-date

---

## Resources

- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright E2E Testing](https://playwright.dev/)
