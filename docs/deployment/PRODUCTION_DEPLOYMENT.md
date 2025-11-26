# Production Deployment Guide

This guide covers deploying FounderHQ to production on Netlify with proper environment configuration, monitoring, and best practices.

## Prerequisites

- [ ] Netlify account with site created
- [ ] Production Supabase project configured
- [ ] Production Stripe account with products created
- [ ] Sentry project for error tracking (recommended)
- [ ] GitHub repository connected to Netlify

## Environment Variables Setup

### Required Variables

Set these in **Netlify Dashboard → Site Settings → Environment Variables**:

#### Groq AI (Server-side)
```bash
# Set via Supabase secrets (not Netlify)
npx supabase secrets set GROQ_API_KEY=your_production_groq_key
```

#### Supabase (Production Project)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

#### Stripe (Live Keys)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_PRO_INDIVIDUAL=price_xxx
VITE_STRIPE_PRICE_POWER_INDIVIDUAL=price_xxx
VITE_STRIPE_PRICE_TEAM_STARTER_BASE=price_xxx
VITE_STRIPE_PRICE_TEAM_PRO_BASE=price_xxx
VITE_STRIPE_PRICE_TEAM_STARTER_SEAT=price_xxx
VITE_STRIPE_PRICE_TEAM_PRO_SEAT=price_xxx
```

#### Application Configuration
```bash
VITE_APP_NAME=Setique Founder Dashboard
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
VITE_APP_URL=https://founderhq.setique.com
```

### Recommended Variables

#### Sentry (Error Tracking)
```bash
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

#### Analytics (Optional)
```bash
VITE_ANALYTICS_ID=your_analytics_id
```

## Supabase Edge Functions Secrets

Stripe secret key must be set in Supabase (never in frontend):

1. Go to **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
2. Add secret:
   ```bash
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
   ```

## Pre-Deployment Checklist

### 1. Code Validation
```bash
# Run all tests
npm run test -- --run
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint

# Build validation
npm run build
```

### 2. Environment Validation

The app will automatically validate environment variables at startup. Test locally with production-like config:

```bash
# Copy production template
cp .env.production .env.local

# Fill in actual values
# Edit .env.local with production values

# Test build
npm run build && npm run preview
```

### 3. Supabase Configuration

Verify production database:
- [ ] RLS policies enabled on all tables
- [ ] Workspace member triggers active
- [ ] Row-level logging enabled (optional)
- [ ] Backups configured
- [ ] Edge functions deployed

```bash
# Deploy edge functions
cd supabase/functions
supabase functions deploy stripe-webhook --project-ref your-project-ref
supabase functions deploy create-checkout-session --project-ref your-project-ref
```

### 4. Stripe Configuration

- [ ] Products created in Stripe Dashboard
- [ ] Price IDs copied to environment variables
- [ ] Webhook endpoint configured: `https://your-project.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook secret added to Supabase Edge Functions secrets
- [ ] Test payment in test mode first

## Deployment Process

### Automatic Deployment (Recommended)

Netlify auto-deploys from GitHub on push to `main` branch:

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Monitor Build**
   - Go to Netlify Dashboard → Deploys
   - Watch build logs for errors
   - Build should complete in 2-3 minutes

3. **Verify Deploy**
   - Check deploy preview URL
   - Test critical user flows
   - Verify no console errors

4. **Publish**
   - If deploy preview looks good, Netlify automatically publishes to production domain

### Manual Deployment

If needed, trigger manual deploy:

1. **Netlify Dashboard**
   - Go to Deploys tab
   - Click "Trigger deploy" → "Deploy site"

2. **Netlify CLI**
   ```bash
   netlify deploy --prod
   ```

## Post-Deployment Verification

### 1. Smoke Tests

Test these critical flows immediately after deployment:

- [ ] Home page loads without errors
- [ ] User can sign up with email
- [ ] Email confirmation works
- [ ] User can log in
- [ ] Dashboard loads with correct workspace
- [ ] Task creation works
- [ ] CRM item creation works
- [ ] Marketing planner accessible
- [ ] File upload works
- [ ] Team invite sends email
- [ ] Stripe checkout opens (don't complete payment)
- [ ] Settings page loads

### 2. Monitor Error Logs

**Sentry Dashboard:**
- Check for new errors in first hour
- Set up alert for error spike

**Netlify Logs:**
- Functions tab → Check for Edge Function errors
- Analytics tab → Check for 4xx/5xx responses

**Browser Console:**
- Open incognito window
- Check console for errors
- Verify no failed network requests

### 3. Performance Checks

```bash
# Lighthouse audit
npm run build:analyze

# Check bundle sizes
# vendor.js should be ~780 KB (234 KB gzipped)
# Component chunks should be 5-122 KB each
```

**Metrics to monitor:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1

## Environment-Specific Behavior

The app automatically adjusts based on `VITE_ENVIRONMENT`:

### Production
- Console logs minimized (warn/error only)
- Source maps hidden
- Sentry error tracking enabled
- Analytics enabled
- Detailed logging disabled

### Staging
- Moderate console logging
- Source maps visible
- Sentry enabled
- Analytics disabled
- Detailed logging enabled

### Development
- Full console logging
- Source maps visible
- Sentry disabled (optional)
- Analytics disabled
- Detailed logging enabled

## Rollback Procedure

If deployment causes issues:

### 1. Quick Rollback (Netlify)
```bash
# Netlify Dashboard → Deploys → Previous deploy → "Publish deploy"
# or
netlify rollback
```

### 2. Git Revert
```bash
# Find bad commit
git log --oneline

# Revert to previous working commit
git revert <bad-commit-hash>
git push origin main
```

### 3. Emergency Fix
```bash
# Create hotfix branch
git checkout -b hotfix/critical-issue
# Make fix
git commit -m "Hotfix: Fix critical issue"
git push origin hotfix/critical-issue
# Create PR and merge immediately
```

## Troubleshooting

### Build Fails

**"Missing environment variable"**
- Check all required variables are set in Netlify
- Variable names must exactly match (case-sensitive)
- No trailing spaces in values

**"Module not found"**
- Clear build cache: Netlify Dashboard → Deploys → Deploy settings → Clear cache
- Check package-lock.json is committed
- Verify node version matches local (check netlify.toml)

### Runtime Errors

**"Configuration Error" on page load**
- Environment validation failed
- Check browser console for specific missing variables
- Verify Netlify deployed with correct environment variables

**Supabase connection fails**
- Verify VITE_SUPABASE_URL is production project
- Check anon key is for correct project
- Verify RLS policies allow operations

**Stripe checkout doesn't open**
- Check VITE_STRIPE_PUBLISHABLE_KEY starts with `pk_live_`
- Verify price IDs exist in Stripe Dashboard
- Check browser console for Stripe errors

## Monitoring & Alerts

### Sentry Alerts

Set up alerts for:
- New issues (immediate)
- Error spike (> 10 errors/min)
- Performance regression (> 5s page load)

### Netlify Notifications

Enable notifications for:
- Deploy failed
- Deploy succeeded
- Functions error rate > 5%

### Uptime Monitoring

Use external service (e.g., UptimeRobot, Pingdom):
- Ping: `https://founderhq.setique.com/health` every 5 minutes
- Alert if down for > 5 minutes

## Security Best Practices

- [ ] Use environment variables for all secrets
- [ ] Never commit .env files with real values
- [ ] Rotate API keys regularly (quarterly)
- [ ] Enable Netlify's "Sensitive variable policy"
- [ ] Use branch deploy previews for testing
- [ ] Require PR reviews before merging to main
- [ ] Enable GitHub's secret scanning
- [ ] Use Dependabot for dependency updates

## Performance Optimization

### CDN Configuration

Netlify handles CDN automatically, but verify:
- [ ] Static assets cached with long TTL
- [ ] Brotli compression enabled
- [ ] HTTP/2 enabled

### Asset Optimization

Already configured in vite.config.ts:
- [ ] Code splitting enabled (component-level)
- [ ] Tree shaking active
- [ ] Minification enabled (Terser)
- [ ] Source maps hidden in production

### Database Optimization

- [ ] Supabase connection pooling enabled
- [ ] Indexes on frequently queried columns
- [ ] RLS policies optimized with indexes
- [ ] Query performance monitored

## Maintenance Windows

For zero-downtime deploys:
1. Deploy to preview URL first
2. Run smoke tests on preview
3. Promote preview to production
4. Monitor for 15 minutes
5. If issues, rollback immediately

For breaking changes:
1. Schedule maintenance window
2. Notify users 24h in advance
3. Put up maintenance page
4. Deploy changes
5. Run full test suite
6. Remove maintenance page

## Support Contacts

- **Netlify Support**: support@netlify.com
- **Supabase Support**: support@supabase.com
- **Stripe Support**: support@stripe.com
- **Sentry Support**: support@sentry.io

## References

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Stripe Production Checklist](https://stripe.com/docs/keys#test-live-modes)
- [Vite Build Options](https://vitejs.dev/guide/build.html)
