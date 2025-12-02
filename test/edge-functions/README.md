# Edge Functions Integration Tests

This directory contains integration tests for Supabase Edge Functions.

## Prerequisites

- Supabase CLI installed
- Local Supabase instance running (`supabase start`)
- Deno installed (for running tests)

## Running Tests

### Start Local Supabase

```bash
supabase start
```

### Run Integration Tests

```bash
deno test --allow-all test/edge-functions/
```

## Test Coverage

- ✅ `create-lead` - Lead creation and updates
- ✅ `ai-complete` - AI chat completions
- ✅ `billing-overage-check` - Quota enforcement
- ✅ `embed-knowledge-base` - Embedding generation
- ✅ `marketplace-install-template` - Template installation
- ✅ `reseller-track-referral` - Referral tracking

## Manual Testing

You can also manually test Edge Functions using curl:

```bash
# Get your local Supabase URL and anon key
supabase status

# Create a lead
curl -X POST http://localhost:54321/functions/v1/create-lead \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "bot-id",
    "email": "test@example.com",
    "name": "Test User",
    "score": 85
  }'
```

## Test Structure

Each test file follows this pattern:

1. **Setup**: Create test data (users, bots, etc.)
2. **Execute**: Call the Edge Function
3. **Assert**: Verify the response and side effects
4. **Cleanup**: Remove test data

## Notes

- Tests use a separate test database to avoid affecting development data
- All tests should be idempotent and can be run multiple times
- Edge Functions are tested against the actual Supabase instance for realistic results
