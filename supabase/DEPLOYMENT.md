# Supabase Deployment Guide

This guide explains how to deploy the BuildMyBot.app backend to Supabase.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Create a Supabase account at [supabase.com](https://supabase.com)

## Local Development

### 1. Start Supabase Locally

```bash
supabase start
```

This will start a local Supabase instance with:
- Database on `localhost:54322`
- API on `localhost:54321`
- Studio on `localhost:54323`

### 2. Run Migrations

```bash
supabase db reset
```

This will apply all migrations in the `supabase/migrations` folder.

### 3. Deploy Edge Functions Locally

```bash
supabase functions serve
```

## Production Deployment

### 1. Link to Your Supabase Project

```bash
supabase link --project-ref your-project-ref
```

### 2. Push Database Migrations

```bash
supabase db push
```

This will apply all migrations to your production database.

### 3. Deploy Edge Functions

Deploy all functions:
```bash
supabase functions deploy
```

Or deploy individual functions:
```bash
supabase functions deploy ai-complete
supabase functions deploy create-lead
supabase functions deploy embed-knowledge-base
supabase functions deploy billing-overage-check
supabase functions deploy marketplace-install-template
supabase functions deploy reseller-track-referral
```

### 4. Set Environment Variables

Set secrets for your edge functions:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-key-here
supabase secrets set STRIPE_SECRET_KEY=sk_test_your-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-secret
supabase secrets set TWILIO_ACCOUNT_SID=your-sid
supabase secrets set TWILIO_AUTH_TOKEN=your-token
```

### 5. Update Frontend Environment Variables

Update your `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-your-key
```

Get these from the Supabase dashboard:
- Settings → API → Project URL
- Settings → API → Project API keys → anon public

## Verify Deployment

### Test Database Connection

```bash
supabase db ping
```

### Test Edge Functions

```bash
curl -i --location --request POST 'https://your-project.supabase.co/functions/v1/ai-complete' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"botId":"test","sessionId":"test","message":"Hello"}'
```

## Database Management

### View Logs

```bash
supabase functions logs ai-complete
```

### Run SQL Queries

```bash
supabase db psql
```

### Create New Migration

```bash
supabase migration new your_migration_name
```

## Troubleshooting

### Reset Local Database

```bash
supabase db reset
```

### View Function Logs

```bash
supabase functions logs --tail
```

### Test RLS Policies

Use the Supabase Studio to test RLS policies:
1. Go to Authentication → Users
2. Copy a user's JWT token
3. Go to SQL Editor
4. Run queries with the token

## Security Checklist

- [ ] All RLS policies are enabled
- [ ] Service role key is never exposed to frontend
- [ ] Edge function secrets are set
- [ ] CORS is properly configured
- [ ] Email confirmation is enabled (for production)
- [ ] Rate limiting is configured
- [ ] Database backups are enabled

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
