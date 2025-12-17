# BuildMyBot Deployment Guide

This guide provides step-by-step instructions for deploying BuildMyBot to production.

## Prerequisites

- Node.js 18+ installed locally
- Supabase account and project created
- OpenAI API key
- Docker (for containerized deployment)
- Google Cloud account (for Cloud Run deployment) or Vercel/Netlify account

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Save your project URL and anon key

### Apply Database Schema

1. Navigate to the SQL Editor in your Supabase dashboard
2. Run the migrations in order:
   ```sql
   -- Run these files in sequence:
   -- 1. supabase/migrations/20250109000000_initial_schema.sql
   -- 2. supabase/migrations/20250204000000_add_phone_call_metadata.sql
   -- 3. supabase/migrations/20251216_create_audit_logs.sql
   ```

### Deploy Edge Functions

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Set Edge Function secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=your-openai-key
   supabase secrets set STRIPE_SECRET_KEY=your-stripe-key  # If using Stripe
   supabase secrets set STRIPE_WEBHOOK_SECRET=your-webhook-secret  # If using Stripe
   ```

5. Deploy all Edge Functions:
   ```bash
   supabase functions deploy ai-complete
   supabase functions deploy embed-knowledge-base
   supabase functions deploy create-lead
   supabase functions deploy billing-overage-check
   supabase functions deploy marketplace-install-template
   supabase functions deploy reseller-track-referral
   supabase functions deploy scrape-url
   supabase functions deploy twilio-call-webhook
   ```

### Create Storage Buckets

Run this SQL in your Supabase SQL Editor:
```sql
-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-files', 'knowledge-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('website-exports', 'website-exports', true)
ON CONFLICT (id) DO NOTHING;
```

## 2. Environment Configuration

Create a `.env.production` file with the following variables:

```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-...

# Gemini Configuration (optional)
VITE_GEMINI_API_KEY=...

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Sentry Configuration (optional but recommended)
VITE_SENTRY_DSN=...
VITE_SENTRY_ORG=...
VITE_SENTRY_PROJECT=...
VITE_SENTRY_AUTH_TOKEN=...

# For Vercel deployments, also add:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Build the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build for production:
   ```bash
   npm run build
   ```

3. Test the production build locally:
   ```bash
   npm run preview
   ```

## 4. Deployment Options

### Option A: Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t buildmybot .
   ```

2. Run locally to test:
   ```bash
   docker run -p 80:80 buildmybot
   ```

3. Push to a container registry:
   ```bash
   # For Google Container Registry
   docker tag buildmybot gcr.io/your-project/buildmybot
   docker push gcr.io/your-project/buildmybot

   # For Docker Hub
   docker tag buildmybot yourusername/buildmybot
   docker push yourusername/buildmybot
   ```

### Option B: Google Cloud Run

1. Ensure you have gcloud CLI installed and configured
2. Deploy using Cloud Build:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy buildmybot \
     --image gcr.io/your-project/buildmybot:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 80
   ```

### Option C: Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Set environment variables in Vercel dashboard

### Option D: Netlify Deployment

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build and deploy:
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. Set environment variables in Netlify dashboard

## 5. Post-Deployment Setup

### Configure Master Admin Emails

Update the `MASTER_EMAILS` array in `App.tsx:35` with your admin email addresses before deployment:

```typescript
const MASTER_EMAILS = [
  'your-admin@email.com',
  'another-admin@email.com'
];
```

### Set Up Custom Domain (Optional)

1. In your hosting provider, configure your custom domain
2. Update DNS records as required
3. Enable SSL/HTTPS

### Configure CORS (if needed)

If deploying frontend and backend separately, update CORS headers in Edge Functions:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://your-domain.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

## 6. Monitoring and Maintenance

### Enable Sentry Error Tracking

1. Create a Sentry project at [sentry.io](https://sentry.io)
2. Add Sentry configuration to your environment variables
3. Errors will be automatically tracked in production

### Monitor Usage

Check Supabase dashboard for:
- Database usage and performance
- Edge Function invocations
- Storage usage
- Authentication metrics

### Database Backups

Supabase automatically creates daily backups. For additional backup:

```bash
# Export database
pg_dump -h your-db-host -U postgres -d postgres > backup.sql
```

## 7. Troubleshooting

### Common Issues

1. **Edge Functions not working**
   - Check function logs: `supabase functions logs function-name`
   - Verify environment variables are set
   - Check CORS configuration

2. **Authentication issues**
   - Verify Supabase URL and anon key
   - Check RLS policies are correctly applied
   - Ensure user has proper role/permissions

3. **Build failures**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version (should be 18+)
   - Verify all environment variables are set

4. **Storage issues**
   - Verify storage buckets are created
   - Check storage policies are applied
   - Ensure file size limits are configured

### Getting Help

- Check logs in Supabase dashboard
- Review [Supabase Documentation](https://supabase.com/docs)
- File issues at [GitHub Issues](https://github.com/your-org/buildmybot/issues)

## 8. Security Checklist

Before going to production:

- [ ] All environment variables are properly set
- [ ] RLS policies are enabled and tested
- [ ] Edge Functions use service role key only where necessary
- [ ] Master admin emails are configured
- [ ] SSL/HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Sensitive data is not logged
- [ ] Rate limiting is configured (if needed)
- [ ] Database connection pooling is configured
- [ ] Backup strategy is in place

## 9. Performance Optimization

### Frontend Optimization

- Enable gzip compression in nginx/hosting provider
- Configure proper cache headers for static assets
- Use CDN for global distribution (optional)

### Database Optimization

- Monitor slow queries in Supabase dashboard
- Add appropriate indexes as needed
- Configure connection pooling for high traffic

### Edge Function Optimization

- Monitor function execution times
- Implement caching where appropriate
- Use batch operations when possible

## 10. Scaling Considerations

As your application grows:

1. **Database Scaling**
   - Upgrade Supabase plan for more resources
   - Consider read replicas for heavy read workloads
   - Implement caching layer (Redis) if needed

2. **Edge Function Scaling**
   - Monitor concurrent execution limits
   - Implement queuing for heavy workloads
   - Consider splitting functions for better isolation

3. **Storage Scaling**
   - Monitor storage usage and limits
   - Implement file size limits
   - Consider CDN for serving static files

## Next Steps

After successful deployment:

1. Test all features in production
2. Set up monitoring and alerting
3. Create user documentation
4. Plan for regular updates and maintenance
5. Implement CI/CD pipeline for automated deployments