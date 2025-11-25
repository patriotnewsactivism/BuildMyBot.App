# BuildMyBot.App - Backend API Specification
## Version 1.0 | November 25, 2025

---

## Overview

This document defines the complete REST API specification for BuildMyBot.App's backend. The frontend is already built and expecting these endpoints to exist.

**Base URL:** `https://buildmybot.app/api` (or `http://localhost:3000/api` for development)

**Authentication:** JWT tokens in `Authorization: Bearer <token>` header

**Error Format:**
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email is required",
    "details": {}
  }
}
```

**Success Format:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-11-25T12:00:00Z"
  }
}
```

---

## 1. AUTHENTICATION

### POST /api/auth/signup
Register a new user account.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "companyName": "Acme Corp",
  "referralCode": "APEX2024" // optional
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "plan": "FREE",
      "role": "OWNER"
    },
    "token": "jwt-token-here"
  }
}
```

**Business Logic:**
- If `referralCode` is valid, link user to reseller
- Send welcome email
- Create Stripe customer
- Log analytics event

---

### POST /api/auth/login
Authenticate existing user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "user": { ... },
    "token": "jwt-token"
  }
}
```

---

### POST /api/auth/logout
Invalidate current session.

**Request:** (requires auth header)
```json
{}
```

**Response:** `200 OK`

---

### GET /api/auth/me
Get current user profile.

**Response:** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "plan": "PROFESSIONAL",
    "role": "OWNER",
    "companyName": "Acme Corp",
    "customDomain": "chat.acmecorp.com",
    "stripeCustomerId": "cus_xxx",
    "subscriptionStatus": "active"
  }
}
```

---

## 2. BOTS

### GET /api/bots
List all bots for authenticated user.

**Query Params:**
- `active` (boolean): Filter by active status
- `type` (string): Filter by bot type

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Sales Assistant",
      "type": "Sales",
      "systemPrompt": "You are a sales assistant...",
      "model": "gpt-4o-mini",
      "temperature": 0.8,
      "active": true,
      "themeColor": "#1e3a8a",
      "conversationsCount": 342,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/bots
Create a new bot.

**Request:**
```json
{
  "name": "Support Bot",
  "type": "Customer Support",
  "systemPrompt": "You are a helpful support agent...",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "themeColor": "#1e3a8a",
  "maxMessages": 20,
  "randomizeIdentity": true,
  "responseDelay": 2000
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "name": "Support Bot",
    "embedCode": "<script src='https://buildmybot.app/embed.js' data-bot-id='uuid'></script>",
    ...
  }
}
```

**Business Logic:**
- Check user's plan limits (number of bots allowed)
- Generate embed code
- Log analytics event

---

### PUT /api/bots/:id
Update bot configuration.

**Request:** (same as POST, all fields optional)

**Response:** `200 OK`

---

### DELETE /api/bots/:id
Delete a bot (soft delete).

**Response:** `204 No Content`

**Business Logic:**
- Soft delete (set `deleted_at`)
- Preserve conversation history
- Deactivate embed code

---

### POST /api/bots/:id/knowledge
Upload knowledge base file.

**Request:** `multipart/form-data`
```
file: <PDF/DOCX/TXT file>
```

**Response:** `201 Created`
```json
{
  "data": {
    "documentId": "uuid",
    "filename": "product-manual.pdf",
    "fileSize": 245678,
    "status": "processing",
    "estimatedTime": "2-3 minutes"
  }
}
```

**Business Logic:**
- Upload to Supabase Storage
- Queue for processing (extract text, chunk, embed)
- Return immediately, process async
- Send webhook when ready

---

### GET /api/bots/:id/knowledge
List knowledge base documents for a bot.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "product-manual.pdf",
      "fileSize": 245678,
      "status": "ready",
      "chunkCount": 42,
      "createdAt": "2025-11-20T10:00:00Z"
    }
  ]
}
```

---

## 3. CHAT / CONVERSATIONS

### POST /api/chat/:botId
Send a message to a bot (public endpoint - no auth required).

**Request:**
```json
{
  "message": "What are your business hours?",
  "conversationId": "uuid-or-null",
  "visitorId": "anonymous-tracking-id",
  "metadata": {
    "page": "https://example.com/pricing",
    "referrer": "https://google.com"
  }
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "conversationId": "uuid",
    "message": "We're open Monday-Friday, 9 AM to 5 PM EST!",
    "isLimitReached": false,
    "leadCaptured": false
  }
}
```

**Business Logic:**
- Track usage for billing
- Check plan limits (enforce max conversations)
- If knowledge base exists, do RAG lookup
- Apply `responseDelay` on backend
- Detect lead intent (email/phone mentioned)
- Calculate lead score
- Trigger webhooks if lead captured

---

### GET /api/conversations
Get conversation history for authenticated user.

**Query Params:**
- `botId` (uuid): Filter by bot
- `sentiment` (string): Filter by sentiment
- `limit` (number): Max results (default: 50)
- `offset` (number): Pagination offset

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "botId": "uuid",
      "visitorName": "Jane Doe",
      "visitorEmail": "jane@example.com",
      "sentiment": "Positive",
      "messageCount": 8,
      "leadScore": 85,
      "startedAt": "2025-11-25T10:00:00Z",
      "completedAt": "2025-11-25T10:15:00Z"
    }
  ],
  "meta": {
    "total": 342,
    "limit": 50,
    "offset": 0
  }
}
```

---

### GET /api/conversations/:id
Get full conversation transcript.

**Response:** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "messages": [
      {
        "role": "user",
        "content": "Hi, I need help",
        "timestamp": "2025-11-25T10:00:00Z"
      },
      {
        "role": "assistant",
        "content": "Hi! How can I help you today?",
        "timestamp": "2025-11-25T10:00:02Z"
      }
    ],
    "sentiment": "Positive",
    "leadScore": 85
  }
}
```

---

### POST /api/conversations/export
Export conversations as CSV.

**Request:**
```json
{
  "botId": "uuid-or-null",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "format": "csv"
}
```

**Response:** `200 OK`
```
Content-Type: text/csv
Content-Disposition: attachment; filename="conversations-nov-2025.csv"

ID,Bot,Visitor,Email,Sentiment,Score,Messages,Started,Completed
uuid,Sales Assistant,Jane Doe,jane@example.com,Positive,85,8,2025-11-25 10:00,2025-11-25 10:15
...
```

---

## 4. LEADS

### GET /api/leads
Get all leads for authenticated user.

**Query Params:**
- `status` (string): Filter by status
- `minScore` (number): Minimum lead score
- `botId` (uuid): Filter by bot

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+15551234567",
      "score": 85,
      "status": "New",
      "sourceBotId": "uuid",
      "conversationId": "uuid",
      "createdAt": "2025-11-25T10:15:00Z"
    }
  ]
}
```

---

### PUT /api/leads/:id
Update lead status or add notes.

**Request:**
```json
{
  "status": "Contacted",
  "notes": "Called on Nov 25, interested in Pro plan",
  "assignedTo": "user-uuid"
}
```

**Response:** `200 OK`

---

### POST /api/leads/export
Export leads as CSV.

**Response:** `200 OK` (CSV file download)

---

## 5. BILLING

### POST /api/billing/create-checkout
Create Stripe Checkout session for plan upgrade.

**Request:**
```json
{
  "priceId": "price_xxxxx",
  "plan": "PROFESSIONAL"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_xxxxx"
  }
}
```

**Business Logic:**
- Create Stripe Checkout Session
- Set success/cancel URLs
- Include user metadata
- Return redirect URL

---

### POST /api/webhooks/stripe
Handle Stripe webhook events (public endpoint).

**Headers:**
- `stripe-signature`: Webhook signature for verification

**Events to Handle:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Update plan
- `customer.subscription.deleted` - Downgrade to free
- `invoice.payment_failed` - Mark subscription past_due

**Response:** `200 OK`

---

### GET /api/billing/usage
Get current usage stats for authenticated user.

**Response:** `200 OK`
```json
{
  "data": {
    "plan": "PROFESSIONAL",
    "limits": {
      "conversations": 5000,
      "bots": 5
    },
    "usage": {
      "conversations": 3420,
      "bots": 3
    },
    "overage": {
      "conversations": 0,
      "cost": 0
    },
    "resetDate": "2025-12-01T00:00:00Z"
  }
}
```

---

### POST /api/billing/portal
Create Stripe Customer Portal session.

**Response:** `200 OK`
```json
{
  "data": {
    "portalUrl": "https://billing.stripe.com/session/xxxxx"
  }
}
```

---

## 6. RESELLER / PARTNER

### GET /api/reseller/stats
Get reseller statistics.

**Response:** `200 OK`
```json
{
  "data": {
    "totalClients": 64,
    "activeClients": 62,
    "totalRevenue": 5200,
    "totalCommissions": 1560,
    "pendingPayout": 1560,
    "currentTier": "Silver",
    "commissionRate": 0.30,
    "nextTier": {
      "name": "Gold",
      "minClients": 150,
      "commissionRate": 0.40
    }
  }
}
```

---

### GET /api/reseller/clients
Get list of referred clients.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "plan": "PROFESSIONAL",
      "status": "active",
      "monthlyRevenue": 99,
      "yourCommission": 29.70,
      "joinedAt": "2025-10-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/reseller/request-payout
Request commission payout.

**Request:**
```json
{
  "amount": 1560,
  "method": "stripe",
  "bankDetails": {
    "accountNumber": "****1234",
    "routingNumber": "****5678"
  }
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "payoutId": "uuid",
    "amount": 1560,
    "status": "pending",
    "estimatedDate": "2025-12-01"
  }
}
```

---

## 7. ANALYTICS

### GET /api/analytics/dashboard
Get dashboard analytics for date range.

**Query Params:**
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)
- `botId` (uuid): Optional filter

**Response:** `200 OK`
```json
{
  "data": {
    "summary": {
      "totalConversations": 652,
      "totalLeads": 142,
      "avgResponseTime": 1.2,
      "leadConversionRate": 0.218
    },
    "timeSeries": [
      {
        "date": "2025-11-25",
        "conversations": 89,
        "leads": 12
      }
    ],
    "topPerformingBots": [
      {
        "botId": "uuid",
        "name": "Sales Assistant",
        "conversations": 245,
        "leads": 52
      }
    ]
  }
}
```

---

## 8. WEBHOOKS (Outgoing)

### POST /api/webhooks
Create webhook endpoint.

**Request:**
```json
{
  "url": "https://mysite.com/webhook",
  "events": ["lead.captured", "conversation.completed"],
  "secret": "optional-secret-for-signing"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "url": "https://mysite.com/webhook",
    "events": ["lead.captured"],
    "active": true
  }
}
```

---

### Webhook Delivery Format

When events occur, POST to customer's webhook URL:

**Event: `lead.captured`**
```json
{
  "event": "lead.captured",
  "timestamp": "2025-11-25T12:00:00Z",
  "data": {
    "leadId": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+15551234567",
    "score": 85,
    "botId": "uuid",
    "botName": "Sales Assistant",
    "conversationId": "uuid"
  },
  "signature": "hmac-sha256-signature"
}
```

**Event: `conversation.completed`**
```json
{
  "event": "conversation.completed",
  "timestamp": "2025-11-25T12:00:00Z",
  "data": {
    "conversationId": "uuid",
    "botId": "uuid",
    "messageCount": 8,
    "sentiment": "Positive",
    "leadScore": 85,
    "duration": 900
  }
}
```

---

## 9. MARKETING

### POST /api/marketing/generate
Generate marketing content using AI.

**Request:**
```json
{
  "type": "email",
  "topic": "Black Friday sale for AI chatbots",
  "tone": "Urgent"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "content": "Subject: 🔥 Last Chance: 50% Off AI Chatbots...",
    "tokensUsed": 250
  }
}
```

---

## 10. WEBSITE BUILDER

### POST /api/websites/generate
Generate landing page structure.

**Request:**
```json
{
  "businessName": "Acme Coffee",
  "description": "Premium coffee roastery in Brooklyn"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "headline": "Brooklyn's Finest Coffee",
    "subheadline": "Ethically sourced, expertly roasted",
    "features": ["Single-origin beans", "Free delivery", "Barista training"],
    "ctaText": "Order Now"
  }
}
```

---

### POST /api/websites/publish
Publish generated website to custom domain.

**Request:**
```json
{
  "siteData": { ... },
  "domain": "coffee.acmecorp.com"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "websiteId": "uuid",
    "url": "https://coffee.acmecorp.com",
    "status": "deploying"
  }
}
```

---

## 11. PHONE AGENT

### POST /api/phone/configure
Configure Twilio phone agent.

**Request:**
```json
{
  "botId": "uuid",
  "phoneNumber": "+15551234567",
  "voice": "alloy",
  "greetingMessage": "Thanks for calling Acme!"
}
```

**Response:** `200 OK`

---

### POST /api/webhooks/twilio/voice
Handle incoming Twilio voice calls (TwiML endpoint).

**Request:** (from Twilio)
```
Form data with CallSid, From, To, etc.
```

**Response:** TwiML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://buildmybot.app/ws/phone/:botId" />
    </Connect>
</Response>
```

---

### GET /api/phone/calls
Get call history for authenticated user.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "callSid": "CA...",
      "from": "+15559876543",
      "to": "+15551234567",
      "duration": 180,
      "status": "completed",
      "recordingUrl": "https://...",
      "transcription": "Caller asked about pricing...",
      "createdAt": "2025-11-25T12:00:00Z"
    }
  ]
}
```

---

## 12. ADMIN (Requires ADMIN role)

### GET /api/admin/users
Get all users (paginated).

**Query Params:**
- `plan` (string): Filter by plan
- `search` (string): Search by name/email
- `limit` / `offset`: Pagination

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "plan": "ENTERPRISE",
      "status": "active",
      "mrr": 399,
      "conversationsThisMonth": 4200,
      "joinedAt": "2025-09-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/admin/users/:id/impersonate
Generate impersonation token to log in as user.

**Response:** `200 OK`
```json
{
  "data": {
    "token": "temporary-jwt-token",
    "expiresIn": 3600
  }
}
```

---

### PUT /api/admin/users/:id/plan
Manually change user's plan.

**Request:**
```json
{
  "plan": "PROFESSIONAL",
  "reason": "Customer support upgrade"
}
```

**Response:** `200 OK`

---

## 13. MARKETPLACE

### GET /api/marketplace/templates
Get all bot templates.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Real Estate Scheduler",
      "category": "Real Estate",
      "description": "Qualifies leads and schedules appointments",
      "price": 0,
      "installs": 1240,
      "rating": 4.8,
      "systemPrompt": "You are a real estate assistant...",
      "previewUrl": "https://..."
    }
  ]
}
```

---

### POST /api/marketplace/templates/:id/clone
Clone a template to user's account.

**Response:** `201 Created`
```json
{
  "data": {
    "botId": "uuid",
    "name": "Real Estate Scheduler (Copy)"
  }
}
```

**Business Logic:**
- Create new bot with template's config
- Log analytics event
- Charge if paid template

---

### POST /api/marketplace/templates
Submit user-created template (future feature).

**Request:**
```json
{
  "botId": "uuid",
  "name": "My Custom Template",
  "category": "Custom",
  "description": "...",
  "price": 29
}
```

**Response:** `201 Created`

---

## RATE LIMITS

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/chat/:botId` | 100 req/min | Per IP |
| `/api/auth/login` | 5 req/min | Per IP |
| `/api/auth/signup` | 3 req/hr | Per IP |
| All other endpoints | 60 req/min | Per user |

**Response when rate limited:** `429 Too Many Requests`
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

---

## IMPLEMENTATION NOTES

### Technology Recommendations

**Option 1: Next.js (Recommended)**
- Use Next.js 14 App Router
- API routes in `app/api/*/route.ts`
- Middleware for auth validation
- Easy Vercel deployment

**Option 2: Express.js**
- Separate backend service
- More control, steeper learning curve
- Deploy to Railway/Render

### Authentication Flow
1. User signs up → Supabase Auth creates user
2. Backend creates entry in `public.users` table
3. Return JWT token
4. Frontend stores token in localStorage
5. All requests include `Authorization: Bearer <token>`
6. Backend validates token with Supabase

### Security Checklist
- ✅ All OpenAI calls on backend (never expose API key)
- ✅ Rate limiting on all endpoints
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (parameterized queries)
- ✅ CSRF tokens for state-changing operations
- ✅ CORS properly configured
- ✅ Stripe webhook signature verification

---

## TESTING CHECKLIST

Before deploying to production:

- [ ] Sign up flow works end-to-end
- [ ] Stripe payment succeeds
- [ ] Bot creation and saving persists
- [ ] Chat widget embed code works on external site
- [ ] Conversation logging works
- [ ] Lead capture triggers webhook
- [ ] Email notifications send
- [ ] Usage limits are enforced
- [ ] Reseller commission calculation is correct
- [ ] Admin can impersonate users
- [ ] Webhook retries work on failure
- [ ] Rate limiting prevents abuse
- [ ] All environment variables are documented

---

*This API spec is ready for implementation. Estimated development time: 3-4 weeks for full MVP.*
