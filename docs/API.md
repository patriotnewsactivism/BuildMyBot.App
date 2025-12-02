# BuildMyBot API Documentation

This document describes the Edge Functions API for BuildMyBot.app.

## Base URL

```
Production: https://your-project.supabase.co/functions/v1
Local: http://localhost:54321/functions/v1
```

## Authentication

All API requests require authentication using Supabase JWT tokens. Include the token in the `Authorization` header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Edge Functions

### 1. AI Complete

Generate AI chat completions with conversation history and knowledge base integration.

**Endpoint:** `POST /ai-complete`

**Request Body:**
```json
{
  "botId": "string",
  "conversationId": "string (optional)",
  "message": "string",
  "sessionId": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "response": "AI generated response",
  "conversationId": "conv-123",
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50,
    "totalTokens": 150
  }
}
```

**Example:**
```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-complete`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    botId: 'bot-123',
    message: 'Hello, how can you help me?'
  })
});
```

---

### 2. Create Lead

Create or update lead records from bot conversations.

**Endpoint:** `POST /create-lead`

**Request Body:**
```json
{
  "botId": "string",
  "conversationId": "string (optional)",
  "name": "string (optional)",
  "email": "string",
  "phone": "string (optional)",
  "company": "string (optional)",
  "score": "number (0-100, optional, default: 75)",
  "metadata": "object (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "leadId": "lead-123",
  "message": "Lead created" | "Lead updated"
}
```

**Example:**
```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-lead`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    botId: 'bot-123',
    email: 'john@example.com',
    name: 'John Doe',
    company: 'Acme Inc',
    score: 85
  })
});
```

---

### 3. Embed Knowledge Base

Generate embeddings for knowledge base content.

**Endpoint:** `POST /embed-knowledge-base`

**Request Body:**
```json
{
  "botId": "string",
  "content": "string",
  "sourceType": "pdf" | "url" | "text",
  "sourceUrl": "string (optional)",
  "title": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "embeddingId": "embed-123",
  "chunksCreated": 5
}
```

---

### 4. Billing Overage Check

Check if user has exceeded their plan limits.

**Endpoint:** `POST /billing-overage-check`

**Request Body:**
```json
{
  "checkType": "messages" | "bots" | "leads"
}
```

**Response:**
```json
{
  "allowed": true,
  "usage": {
    "current": 150,
    "limit": 1000,
    "remaining": 850
  },
  "plan": "pro"
}
```

---

### 5. Marketplace Install Template

Install a marketplace template as a new bot.

**Endpoint:** `POST /marketplace-install-template`

**Request Body:**
```json
{
  "templateId": "string",
  "customizations": {
    "name": "string (optional)",
    "themeColor": "string (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "botId": "bot-123",
  "message": "Template installed successfully"
}
```

---

### 6. Reseller Track Referral

Track referral codes and create reseller-client relationships.

**Endpoint:** `POST /reseller-track-referral`

**Request Body:**
```json
{
  "referralCode": "string",
  "clientEmail": "string"
}
```

**Response:**
```json
{
  "success": true,
  "referralId": "ref-123",
  "message": "Referral tracked successfully"
}
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found (resource doesn't exist)
- `429` - Rate limit exceeded
- `500` - Internal server error

---

## Rate Limits

- **Free Plan:** 100 requests/hour
- **Pro Plan:** 1000 requests/hour
- **Business Plan:** 10000 requests/hour
- **Enterprise Plan:** Unlimited

---

## Webhooks

BuildMyBot supports webhooks for real-time notifications.

### Webhook Events

- `lead.created` - New lead captured
- `conversation.started` - New conversation initiated
- `bot.created` - New bot created
- `billing.updated` - Billing status changed

### Webhook Payload

```json
{
  "event": "lead.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "leadId": "lead-123",
    "email": "john@example.com",
    "source": "bot-123"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Call Edge Function
const { data, error } = await supabase.functions.invoke('ai-complete', {
  body: {
    botId: 'bot-123',
    message: 'Hello!'
  }
});
```

### cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-lead \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "bot-123",
    "email": "john@example.com",
    "name": "John Doe"
  }'
```

---

## Support

For API support, contact: [support@buildmybot.app](mailto:support@buildmybot.app)
