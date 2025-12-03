# BuildMyBot.app API Documentation

Complete API reference for BuildMyBot.app platform.

## Base URL

- **Production:** `https://your-domain.com`
- **Development:** `http://localhost:3000`

## Authentication

All API requests require authentication via Supabase JWT token.

### Headers

```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### Getting Access Token

```typescript
import { supabase } from '@/lib/supabase';

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## API Routes

### Health Check

Check system health and availability.

**Endpoint:** `GET /api/health`

**Authentication:** None required

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-29T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "ok", "latency": 45 },
    "environment": { "status": "ok" },
    "stripe": { "status": "ok" }
  }
}
```

**Status Codes:**
- `200` - All systems operational
- `503` - One or more systems unhealthy

---

### Check Plan Limits

Validate if user can create more resources based on their plan.

**Endpoint:** `POST /api/billing/check-limits`

**Authentication:** Required

**Request Body:**

```json
{
  "resourceType": "bot" | "conversation" | "knowledge_base"
}
```

**Response:**

```json
{
  "allowed": true,
  "message": "You can create more bots (0/1)",
  "currentUsage": 0,
  "limit": 1,
  "plan": "FREE",
  "billingStatus": "active"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid resource type
- `401` - Unauthorized
- `404` - User profile not found

---

### Stripe Webhooks

Process Stripe subscription and payment events.

**Endpoint:** `POST /api/webhooks/stripe`

**Authentication:** Stripe signature verification

**Headers:**

```http
stripe-signature: t=1234567890,v1=abc123...
```

**Supported Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

**Response:**

```json
{
  "received": true
}
```

**Status Codes:**
- `200` - Event processed
- `400` - Invalid signature or payload
- `500` - Processing error

---

## Edge Functions

Supabase Edge Functions for secure backend operations.

### AI Complete

Generate AI chat responses with knowledge base integration.

**Endpoint:** `POST /functions/v1/ai-complete`

**Authentication:** Required

**Rate Limit:** 30 requests/minute

**Request Body:**

```json
{
  "botId": "uuid",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ],
  "sessionId": "session_12345" // optional
}
```

**Response:**

```json
{
  "message": "AI generated response",
  "conversationId": "uuid",
  "tokensUsed": 150
}
```

**Error Responses:**

```json
{
  "error": "Rate limit exceeded. Please wait before retrying.",
  "resetAt": "2025-11-29T12:01:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized
- `429` - Rate limit exceeded

---

### Create Lead

Create a new lead from a conversation.

**Endpoint:** `POST /functions/v1/create-lead`

**Authentication:** Required

**Request Body:**

```json
{
  "botId": "uuid",
  "conversationId": "uuid", // optional
  "name": "John Doe",
  "email": "john@example.com", // optional
  "phone": "+1234567890", // optional
  "score": 85, // optional, calculated if not provided
  "notes": "Hot lead from product demo"
}
```

**Response:**

```json
{
  "lead": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "score": 85,
    "status": "New",
    "sourceBotId": "uuid",
    "createdAt": "2025-11-29T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Lead created
- `400` - Validation error
- `401` - Unauthorized

---

### Embed Knowledge Base

Generate embeddings for knowledge base content.

**Endpoint:** `POST /functions/v1/embed-knowledge-base`

**Authentication:** Required

**Request Body:**

```json
{
  "botId": "uuid",
  "content": "Long form text content to embed...",
  "sourceType": "pdf" | "url" | "text",
  "sourceUrl": "https://example.com/doc.pdf", // optional
  "metadata": { "title": "Product Documentation" } // optional
}
```

**Response:**

```json
{
  "success": true,
  "chunksProcessed": 5,
  "knowledgeBaseIds": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"]
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `401` - Unauthorized

---

### Billing Overage Check

Check if user has exceeded plan limits.

**Endpoint:** `POST /functions/v1/billing-overage-check`

**Authentication:** Required

**Request Body:**

```json
{
  "resourceType": "bot" | "conversation"
}
```

**Response:**

```json
{
  "allowed": false,
  "message": "Bot limit reached (1/1). Please upgrade your plan.",
  "currentUsage": 1,
  "limit": 1,
  "plan": "FREE",
  "billingStatus": "active"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized

---

### Marketplace Install Template

Install a marketplace template as a new bot.

**Endpoint:** `POST /functions/v1/marketplace-install-template`

**Authentication:** Required

**Request Body:**

```json
{
  "templateId": "uuid",
  "botName": "My Custom Bot", // optional
  "customizations": {
    "themeColor": "#3B82F6",
    "avatar": "🤖",
    "temperature": 0.8
  } // optional
}
```

**Response:**

```json
{
  "success": true,
  "bot": {
    "id": "uuid",
    "name": "My Custom Bot",
    "type": "Customer Support",
    "active": true
  },
  "message": "Bot 'My Custom Bot' created successfully from template"
}
```

**Status Codes:**
- `200` - Success
- `400` - Template not found or plan limit reached
- `401` - Unauthorized

---

### Reseller Track Referral

Track referral signups for resellers.

**Endpoint:** `POST /functions/v1/reseller-track-referral`

**Authentication:** Required

**Request Body:**

```json
{
  "referralCode": "RESELLER123",
  "newUserId": "uuid", // optional, provide after signup
  "email": "prospect@example.com" // optional
}
```

**Response (Pending):**

```json
{
  "success": true,
  "message": "Referral code validated",
  "referralId": "uuid"
}
```

**Response (Converted):**

```json
{
  "success": true,
  "message": "Referral tracked successfully",
  "reseller": {
    "tier": "Bronze",
    "commissionRate": 0.20,
    "totalClients": 1
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid referral code
- `401` - Unauthorized

---

## Error Handling

All API endpoints use consistent error format.

### Error Response Structure

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "metadata": {
      "field": "fieldName",
      "additionalInfo": "value"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `PLAN_LIMIT_EXCEEDED` | 402 | User exceeded plan quota |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `CONFLICT` | 409 | Resource already exists |
| `EXTERNAL_SERVICE_ERROR` | 502 | Third-party service unavailable |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

Rate limits vary by plan and endpoint.

### Limits by Plan

| Plan | Requests/Min | AI Calls/Hour |
|------|--------------|---------------|
| FREE | 10 | 60 |
| STARTER | 30 | 500 |
| PROFESSIONAL | 100 | 3,000 |
| EXECUTIVE | 300 | 10,000 |
| ENTERPRISE | 1,000 | 50,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2025-11-29T12:01:00.000Z
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "metadata": {
      "resetAt": "2025-11-29T12:01:00.000Z"
    }
  }
}
```

---

## Webhooks

### Configuring Webhooks

Webhooks allow real-time notifications of platform events.

**Supported Events:**
- `bot.created`
- `bot.updated`
- `bot.deleted`
- `lead.created`
- `conversation.completed`

**Webhook Payload:**

```json
{
  "event": "bot.created",
  "data": {
    "id": "uuid",
    "name": "Customer Support Bot",
    "createdAt": "2025-11-29T12:00:00.000Z"
  },
  "timestamp": "2025-11-29T12:00:00.000Z",
  "userId": "uuid"
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { supabase } from '@/lib/supabase';

// Check plan limits
async function checkCanCreateBot() {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/api/billing/check-limits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resourceType: 'bot' }),
  });

  const result = await response.json();
  return result.allowed;
}

// Create AI completion
async function chat(botId: string, messages: any[]) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-complete`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ botId, messages }),
    }
  );

  return response.json();
}
```

### Python

```python
import requests

SUPABASE_URL = "https://your-project.supabase.co"
ACCESS_TOKEN = "your-access-token"

# Check plan limits
def check_plan_limits(resource_type):
    response = requests.post(
        f"{SUPABASE_URL}/api/billing/check-limits",
        headers={
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"resourceType": resource_type}
    )
    return response.json()

# Create lead
def create_lead(bot_id, name, email):
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/create-lead",
        headers={
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        json={
            "botId": bot_id,
            "name": name,
            "email": email
        }
    )
    return response.json()
```

---

## Support

For API support or bug reports:
- GitHub Issues: https://github.com/your-org/buildmybot/issues
- Email: api-support@buildmybot.app
- Documentation: https://docs.buildmybot.app

---

**API Version:** 1.0
**Last Updated:** 2025-11-29
