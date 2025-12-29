# BuildMyBot Monitoring & Observability Setup

Complete guide for setting up error tracking, analytics, and monitoring for your BuildMyBot deployment.

## 📊 Overview

BuildMyBot includes three monitoring systems:

1. **Sentry** - Error tracking & performance monitoring
2. **PostHog** - Product analytics & feature flags
3. **Supabase Logs** - Database & Edge Function logs

## 🔴 Sentry Error Tracking

### Setup

1. **Create Sentry Account**
   - Go to https://sentry.io/
   - Sign up for free account
   - Create new project (select React + Next.js)

2. **Get DSN**
   - Copy your DSN from project settings
   - Format: `https://abc123@o123456.ingest.sentry.io/789012`

3. **Configure Environment**
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   NEXT_PUBLIC_ENVIRONMENT=production
   ```

4. **Deploy with Sentry**
   - Sentry is automatically initialized in `services/sentryInit.ts`
   - Errors will be captured automatically
   - Performance monitoring enabled by default

### Features Enabled

- ✅ Automatic error boundary integration
- ✅ Session replay for debugging
- ✅ Performance transaction tracking
- ✅ Source maps for readable stack traces
- ✅ Release tracking
- ✅ User context (authenticated users)

### Testing Sentry Integration

```javascript
// Test error tracking (in browser console)
throw new Error("Test error for Sentry");

// Sentry should capture and report this error
```

### Sentry Dashboard Features

- **Issues**: View all errors with stack traces
- **Performance**: Monitor transaction durations
- **Releases**: Track which version caused errors
- **Alerts**: Get notified of new errors via Slack/email

## 📈 PostHog Product Analytics

### Setup

1. **Create PostHog Account**
   - Go to https://posthog.com/
   - Sign up for free account
   - Create new project

2. **Get API Key**
   - Go to Project Settings
   - Copy your API key (starts with `phc_`)
   - Copy your host URL (usually `https://app.posthog.com`)

3. **Configure Environment**
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_POSTHOG_API_KEY=phc_your_api_key
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

4. **Deploy with PostHog**
   - PostHog is automatically initialized in `services/posthogInit.ts`
   - Events tracked automatically
   - Session recording enabled

### Features Enabled

- ✅ Automatic pageview tracking
- ✅ Session recording
- ✅ Custom event tracking
- ✅ User identification
- ✅ Feature flags support
- ✅ A/B testing capability

### Custom Events Tracked

BuildMyBot automatically tracks:
- `bot_created` - When user creates a bot
- `chat_message_sent` - When user sends chat message
- `lead_captured` - When a lead is captured
- `plan_upgraded` - When user upgrades plan
- `widget_embedded` - When widget is embedded
- `phone_call_started` - When phone agent call starts
- `knowledge_base_uploaded` - When knowledge base is uploaded

### Testing PostHog Integration

```javascript
// Test event tracking (in browser console)
if (window.posthog) {
  window.posthog.capture('test_event', {
    property: 'test_value'
  });
}
```

### PostHog Dashboard Features

- **Insights**: Create custom charts and funnels
- **Session Recording**: Watch user sessions
- **Feature Flags**: Enable features for specific users
- **Experiments**: Run A/B tests
- **Cohorts**: Group users by behavior

## 📝 Supabase Logs

### Edge Function Logs

View real-time logs for Edge Functions:

```bash
# View logs for specific function
npx supabase functions logs ai-complete --tail

# View logs with filters
npx supabase functions logs stripe-webhooks --tail --level error

# View all function logs
npx supabase functions logs --tail
```

### Database Logs

```bash
# View database logs
npx supabase db logs --tail

# Filter by level
npx supabase db logs --tail --level error
```

### Common Log Patterns to Watch

**Successful AI Completion:**
```
[ai-complete] User abc123 requested completion with gpt-4o
[ai-complete] Completion successful, 150 tokens used
```

**Failed Stripe Webhook:**
```
[stripe-webhooks] ERROR: Invalid signature
[stripe-webhooks] Webhook rejected
```

**Phone Agent Call:**
```
[twilio-voice-stream] WebSocket connection established
[twilio-voice-stream] User spoke: "Hello, I need help"
[twilio-voice-stream] AI responded: "Hello! How can I help you today?"
```

## 🚨 Alert Configuration

### Sentry Alerts

1. Go to Sentry Project > Alerts
2. Create alert rule:
   - **Trigger**: Error count > 10 in 1 hour
   - **Action**: Send Slack notification
   - **Filter**: Environment = production

### PostHog Alerts

1. Go to PostHog > Insights
2. Create insight for key metric
3. Set up alert:
   - **Metric**: Chat messages sent
   - **Threshold**: < 10 per day (indicates issue)
   - **Action**: Email notification

## 📊 Custom Dashboards

### PostHog Dashboard Example

Create a dashboard with:
1. **Total Bots Created** (trend over time)
2. **Chat Messages Sent** (by day)
3. **Lead Conversion Rate** (funnel)
4. **Phone Call Duration** (average)
5. **Active Users** (daily/weekly/monthly)

### Sentry Dashboard Example

Monitor:
1. **Error Rate** (errors per hour)
2. **Performance** (average transaction time)
3. **Affected Users** (unique users experiencing errors)
4. **Browser Breakdown** (which browsers have issues)

## 🔍 Debugging Workflow

### When Error Occurs

1. **Check Sentry**
   - View error details
   - See stack trace
   - Watch session replay
   - Identify affected users

2. **Check PostHog**
   - See user's journey before error
   - Identify patterns (specific feature, browser, etc.)
   - Check if error affects cohort

3. **Check Supabase Logs**
   - See Edge Function logs
   - Check database queries
   - Verify webhook delivery

### When Performance Issue Occurs

1. **Sentry Performance**
   - Check transaction durations
   - Identify slow API calls
   - See database query times

2. **PostHog Funnels**
   - Where do users drop off?
   - Which features are slow?
   - User behavior before leaving

## 🎯 Key Metrics to Monitor

### Technical Health
- Error rate (< 0.1% of requests)
- API response time (< 500ms p95)
- Database query time (< 100ms p95)
- Edge Function success rate (> 99.9%)

### Business Metrics
- Daily active users
- Bots created per day
- Chat messages sent
- Lead conversion rate
- Plan upgrade rate
- Phone agent call duration

### User Experience
- Time to first chat response
- Widget load time
- Page load time
- Session duration
- Feature usage

## 🔐 Security Monitoring

### Audit Logs

BuildMyBot includes database audit logs:

```sql
-- View recent security events
SELECT * FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- View failed login attempts
SELECT * FROM audit_logs
WHERE op = 'auth_failed'
ORDER BY created_at DESC;
```

### Monitoring Failed Logins

Set up alert in Sentry for:
- Multiple failed login attempts
- Unusual access patterns
- API key usage anomalies

## 📱 Mobile App Monitoring

If building mobile apps, integrate:
- **Sentry Mobile SDK** for iOS/Android
- **PostHog Mobile SDK** for analytics

## 🌐 CDN & Network Monitoring

Monitor widget performance:
- **Cloudflare Analytics** (if using CF)
- **Vercel Analytics** (if using Vercel)
- **Google Cloud Monitoring** (if using Cloud Run)

## 💰 Cost Monitoring

### Sentry Pricing
- Free tier: 5,000 errors/month
- Growth: $26/month for 50,000 errors
- Monitor error quota in dashboard

### PostHog Pricing
- Free tier: 1M events/month
- Growth: $0.00031 per event after free tier
- Monitor event quota in dashboard

### Supabase Pricing
- Free tier: 500,000 Edge Function invocations
- Pro: $25/month + usage
- Monitor usage in Supabase dashboard

## 🎓 Best Practices

1. **Set up alerts before issues occur**
   - Don't wait for problems to configure monitoring
   - Alert on trends, not just absolute values

2. **Regular dashboard reviews**
   - Weekly review of key metrics
   - Monthly review of user behavior

3. **Tag releases in Sentry**
   - Know which version caused errors
   - Track improvements over time

4. **Use feature flags for rollouts**
   - Test new features with small % of users
   - Rollback instantly if issues occur

5. **Monitor costs**
   - Set budget alerts
   - Archive old session replays
   - Sample events if hitting limits

## 🆘 Troubleshooting

### Sentry not capturing errors

```bash
# Check DSN is set
echo $NEXT_PUBLIC_SENTRY_DSN

# Check Sentry is initialized
# In browser console:
console.log(window.Sentry)

# Test error capture
window.Sentry?.captureException(new Error("Test"))
```

### PostHog not tracking events

```bash
# Check API key is set
echo $NEXT_PUBLIC_POSTHOG_API_KEY

# Check PostHog is loaded
# In browser console:
console.log(window.posthog)

# Test event
window.posthog?.capture('test')
```

### Supabase logs not showing

```bash
# Verify you're logged in
npx supabase status

# Check project is linked
npx supabase link

# Try specific function
npx supabase functions logs ai-complete
```

## 📚 Resources

- Sentry Docs: https://docs.sentry.io/
- PostHog Docs: https://posthog.com/docs
- Supabase Logs: https://supabase.com/docs/guides/functions/logging
- Next.js Monitoring: https://nextjs.org/docs/advanced-features/measuring-performance

## ✅ Verification Checklist

After setup, verify:
- [ ] Sentry captures test error
- [ ] PostHog tracks test event
- [ ] Supabase logs show function calls
- [ ] Sentry session replay works
- [ ] PostHog session recording works
- [ ] Alerts configured and tested
- [ ] Dashboard created with key metrics
- [ ] Team members have access
- [ ] Budget alerts configured
- [ ] Weekly review scheduled

## 🎉 Success!

With monitoring fully configured, you can:
- 🔍 Debug issues faster with session replay
- 📊 Make data-driven decisions with analytics
- 🚨 Get alerted before users report issues
- 📈 Track growth and user behavior
- 🔒 Monitor security events
- 💰 Optimize costs based on usage

Your BuildMyBot platform is now fully observable! 🚀
