# BuildMyBot Deployment Checklist

Use this checklist to ensure everything is properly configured before going live.

## Pre-Deployment Checklist

### Database Setup
- [ ] Supabase project created
- [ ] `supabase_schema.sql` migration executed successfully
- [ ] `supabase_admin_policies.sql` policies applied
- [ ] All 13+ tables visible in Table Editor
- [ ] Templates table has 8 seed records
- [ ] RLS policies enabled on all tables

### API Configuration
- [ ] OpenAI API key obtained and tested
- [ ] API key has sufficient credits
- [ ] Rate limits understood and acceptable
- [ ] Fallback error handling in place

### Environment Variables
- [ ] `.env` file created (not committed to Git)
- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly
- [ ] `VITE_OPENAI_API_KEY` set correctly
- [ ] Production environment variables configured in hosting platform

### Authentication
- [ ] Supabase Auth Email provider enabled
- [ ] Email templates configured (optional)
- [ ] Email confirmation settings configured
- [ ] Master admin emails added to `MASTER_EMAILS` array
- [ ] Tested sign up flow
- [ ] Tested sign in flow
- [ ] Tested password reset (if applicable)

### Testing - Core Features
- [ ] Bot creation and editing works
- [ ] AI chat responses working
- [ ] Conversations saved to database
- [ ] Conversations visible in Chat Logs
- [ ] Lead capture functioning
- [ ] Leads visible in CRM
- [ ] Marketing content generation working
- [ ] Marketing content saving to database

### Testing - Analytics & Billing
- [ ] Dashboard shows real conversation data
- [ ] Analytics chart populated with real data
- [ ] Usage tracking working
- [ ] Billing page shows usage stats
- [ ] Usage limits enforced
- [ ] Plan upgrade flow working

### Testing - Admin Features
- [ ] Admin dashboard accessible to master emails only
- [ ] Platform-wide stats showing correctly
- [ ] All users visible to admin
- [ ] Regular users cannot access admin panel
- [ ] Admin can view all bots/leads/conversations

### Testing - Data Isolation
- [ ] User A cannot see User B's bots
- [ ] User A cannot see User B's leads
- [ ] User A cannot see User B's conversations
- [ ] User A cannot see User B's marketing content
- [ ] RLS policies blocking unauthorized access

### Performance
- [ ] Initial page load < 3 seconds
- [ ] Bot responses < 5 seconds
- [ ] Database queries optimized
- [ ] No console errors in production build
- [ ] Images/assets optimized

### Security
- [ ] `.env` file in `.gitignore`
- [ ] API keys never exposed in frontend code
- [ ] RLS policies thoroughly tested
- [ ] No sensitive data in error messages
- [ ] HTTPS enabled on production domain
- [ ] CORS configured correctly

### UI/UX
- [ ] Responsive on mobile devices
- [ ] Responsive on tablets
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Loading states for async operations
- [ ] Error messages user-friendly
- [ ] Success notifications working

## Post-Deployment Checklist

### Monitoring
- [ ] Error tracking set up (e.g., Sentry)
- [ ] Analytics installed (e.g., Google Analytics)
- [ ] Uptime monitoring configured
- [ ] Database performance monitoring enabled
- [ ] API usage monitoring set up

### Documentation
- [ ] SETUP_GUIDE.md reviewed and accurate
- [ ] README.md updated
- [ ] Environment variables documented
- [ ] Admin procedures documented

### User Management
- [ ] Master admin accounts created
- [ ] Test accounts created
- [ ] User roles tested
- [ ] Account suspension working

### Backups
- [ ] Supabase automatic backups verified
- [ ] Database backup schedule confirmed
- [ ] Recovery procedure tested
- [ ] Critical data export working

### Compliance
- [ ] Privacy policy created (if collecting PII)
- [ ] Terms of service created
- [ ] GDPR compliance reviewed (if EU users)
- [ ] Data retention policies defined

## Production Launch

### Final Verification
- [ ] All environment variables double-checked
- [ ] Production build tested (`npm run build`)
- [ ] Production preview tested (`npm run preview`)
- [ ] No hardcoded development URLs
- [ ] No console.log statements in critical paths

### DNS & Hosting
- [ ] Domain purchased/configured
- [ ] DNS records pointing correctly
- [ ] SSL certificate installed
- [ ] CDN configured (if using)
- [ ] Hosting platform configured

### Communication
- [ ] Support email configured
- [ ] Contact information updated
- [ ] Stakeholders notified of launch
- [ ] User onboarding emails prepared

## Common Issues & Solutions

### Build Errors
**Problem**: TypeScript errors during build
**Solution**: Run `npm run build` locally first, fix all errors

### Database Connection Issues
**Problem**: "Supabase client failed"
**Solution**: Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### RLS Blocking Queries
**Problem**: Users can't see their own data
**Solution**: Ensure user is authenticated and profiles table has their record

### OpenAI Rate Limits
**Problem**: 429 errors from OpenAI
**Solution**: Implement rate limiting, upgrade OpenAI tier, or add retry logic

### Admin Access Not Working
**Problem**: Admin email not showing admin features
**Solution**: Verify email is in MASTER_EMAILS array (case-sensitive)

## Rollback Plan

If critical issues occur post-deployment:

1. **Revert Frontend**: Roll back to previous deployment in hosting platform
2. **Database**: Contact Supabase support or restore from backup
3. **Users**: Notify users of temporary issues via status page
4. **Logs**: Capture all error logs for post-mortem analysis

## Success Metrics

Track these metrics to ensure successful deployment:

- [ ] 0 critical errors in first 24 hours
- [ ] < 5% user reported issues
- [ ] Average response time < 2 seconds
- [ ] Database uptime > 99.9%
- [ ] Successful user signups
- [ ] Successful bot creations
- [ ] Successful AI conversations

## Post-Launch Tasks

### Week 1
- [ ] Monitor error logs daily
- [ ] Respond to user feedback
- [ ] Fix critical bugs
- [ ] Optimize slow queries

### Week 2-4
- [ ] Implement user-requested features
- [ ] Optimize performance
- [ ] Review and improve documentation
- [ ] Plan next iteration

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Sign-Off**: _____________

**Status**: ⬜ Ready | ⬜ In Progress | ⬜ Complete
