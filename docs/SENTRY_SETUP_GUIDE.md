# Sentry Setup Guide for FounderHQ

Complete guide to setting up Sentry error tracking and performance monitoring for production.

## Table of Contents
1. [Create Sentry Project](#1-create-sentry-project)
2. [Configure Environment Variables](#2-configure-environment-variables)
3. [Test Locally](#3-test-locally)
4. [Deploy to Production](#4-deploy-to-production)
5. [Verify Integration](#5-verify-integration)
6. [Using Sentry in Code](#6-using-sentry-in-code)

---

## 1. Create Sentry Project

### Step 1: Sign Up / Log In
1. Go to https://sentry.io
2. Sign up for a free account or log in
3. Create a new organization (or use existing)

### Step 2: Create React Project
1. Click **"Create Project"**
2. Select **React** as the platform
3. Set alert frequency: **"Alert me on every new issue"** (recommended for new projects)
4. Project name: `founderhq` (or your preferred name)
5. Click **"Create Project"**

### Step 3: Get Your DSN
After creating the project, you'll see a DSN (Data Source Name). It looks like:
```
https://abc123xyz456@o123456.ingest.sentry.io/789012
```

**Save this DSN** - you'll need it for the next step.

### Step 4: Create Auth Token for Source Maps
1. Go to **Settings** → **Auth Tokens**
2. Click **"Create New Token"**
3. Scopes needed:
   - ✅ `project:releases` (for source map uploads)
   - ✅ `org:read` (for organization info)
4. Token name: `netlify-source-maps`
5. Click **"Create Token"**
6. **Copy and save the token** - you can't see it again!

---

## 2. Configure Environment Variables

### Local Development (.env.local)

Create a `.env.local` file (not committed to git):

```bash
# Sentry DSN for error tracking
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id

# Optional: Sentry configuration for local source map testing
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=founderhq
SENTRY_AUTH_TOKEN=your-auth-token-from-step-4
```

### Netlify Production Environment Variables

Add these in Netlify Dashboard → Site Settings → Environment Variables:

#### Required for Error Tracking:
```bash
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
VITE_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0
```

#### Required for Source Map Uploads:
```bash
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=founderhq
SENTRY_AUTH_TOKEN=your-auth-token-from-step-4
```

**Important Notes:**
- `VITE_SENTRY_DSN` is **public** and safe to expose (it's in the frontend bundle)
- `SENTRY_AUTH_TOKEN` is **sensitive** and should only be in Netlify (NOT in git)
- Source maps are automatically uploaded during build and then deleted from deployment

---

## 3. Test Locally

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

### Step 3: Verify Sentry Initialization
Open browser console and look for:
```
[Sentry] Initialized in development mode
```

If you see:
```
[Sentry] Skipping initialization - no DSN configured
```
Then your `VITE_SENTRY_DSN` is not set in `.env.local`.

### Step 4: Test Error Tracking

Add a test button to any component:
```tsx
<button onClick={() => {
  throw new Error('Test Sentry Error!');
}}>
  Test Sentry
</button>
```

Click the button and check:
1. Browser console shows the error
2. Go to Sentry dashboard → Issues
3. You should see the error appear within seconds

### Step 5: Test Production Build Locally
```bash
npm run build
npm run preview
```

Visit the preview URL and test the error again. Check Sentry dashboard.

---

## 4. Deploy to Production

### Step 1: Commit and Push
```bash
git add .
git commit -m "Add Sentry error tracking"
git push origin main
```

### Step 2: Netlify Build
Netlify will automatically:
1. Run `npm run build`
2. Vite will generate source maps
3. Sentry plugin uploads source maps
4. Source maps are deleted from deployment (security)
5. Site deploys with error tracking enabled

### Step 3: Check Build Logs
In Netlify build logs, look for:
```
[sentry-vite-plugin] Uploading source maps...
[sentry-vite-plugin] Source maps uploaded successfully
```

If you see errors about authentication, verify your `SENTRY_AUTH_TOKEN` is set correctly in Netlify.

---

## 5. Verify Integration

### Check 1: Production Console
Open your production site and check browser console:
```
✅ Environment validated successfully (production)
[Sentry] Initialized in production mode
```

### Check 2: Trigger Test Error
1. In production, trigger an error (use test button or cause a real error)
2. Go to Sentry dashboard
3. Error should appear with:
   - ✅ Full stack trace
   - ✅ Source mapped to original TypeScript code
   - ✅ User context (if logged in)
   - ✅ Breadcrumbs (user actions leading to error)

### Check 3: Sentry Dashboard
Navigate to:
- **Issues** → See all errors
- **Performance** → See app performance metrics
- **Releases** → See deployed versions with source maps

---

## 6. Using Sentry in Code

### Automatic Error Tracking
Errors are automatically tracked via:
- `ErrorBoundary` components (React component errors)
- Global error handlers (unhandled exceptions)
- Promise rejections

### Manual Error Capture
```tsx
import { captureError, captureMessage } from './lib/sentry';

// Capture an error with context
try {
  riskyOperation();
} catch (error) {
  captureError(error, {
    userId: user.id,
    workspaceId: workspace.id,
    operation: 'riskyOperation'
  });
}

// Capture a message
captureMessage('User completed onboarding', 'info');
```

### User Context
```tsx
import { setUser, setWorkspaceContext } from './lib/sentry';

// After user logs in
setUser({ id: user.id, email: user.email });

// After workspace loads
setWorkspaceContext({
  id: workspace.id,
  name: workspace.name,
  planType: workspace.plan_type
});

// On logout
setUser(null);
setWorkspaceContext(null);
```

### Track User Actions
```tsx
import { trackAction } from './lib/sentry';

// Track important actions
trackAction('task_created', { taskId: task.id });
trackAction('subscription_upgraded', { plan: 'power-individual' });
trackAction('invite_sent', { recipientEmail: email });
```

### Performance Monitoring
```tsx
import { measurePerformance } from './lib/sentry';

// Measure async operations
const data = await measurePerformance('load-workspace-data', async () => {
  return await fetchWorkspaceData(workspaceId);
});
```

---

## Common Issues & Solutions

### Issue: "Skipping initialization - no DSN configured"
**Solution:** Set `VITE_SENTRY_DSN` in your environment variables.

### Issue: No source maps in Sentry
**Solution:** 
1. Verify `SENTRY_AUTH_TOKEN` is set in Netlify
2. Check Netlify build logs for upload errors
3. Ensure `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings

### Issue: Too many errors reported
**Solution:** Adjust sampling rates in `lib/sentry.tsx`:
```tsx
sampleRate: 0.5, // Capture 50% of errors
tracesSampleRate: 0.1, // Sample 10% of transactions
```

### Issue: Sensitive data in error reports
**Solution:** Data is already filtered in `beforeSend` hook. Review and add more filters if needed.

### Issue: Build fails with Sentry plugin errors
**Solution:** 
1. Temporarily disable by removing `SENTRY_AUTH_TOKEN` from Netlify
2. Build will succeed but won't upload source maps
3. Errors will still be tracked, just without source mapping

---

## Monitoring Best Practices

### 1. Set Up Alerts
In Sentry dashboard:
- Go to **Alerts** → **Create Alert Rule**
- Set up email/Slack notifications for:
  - New issues
  - Regression (resolved issues return)
  - High error frequency

### 2. Review Weekly
- Check error trends
- Prioritize issues by frequency and user impact
- Mark false positives as ignored

### 3. Use Releases
Every deployment creates a new release in Sentry, allowing you to:
- Track which errors are introduced in which version
- See error frequency per release
- Correlate deployments with error spikes

### 4. Monitor Performance
- Review Performance tab weekly
- Identify slow endpoints/operations
- Set performance budgets

---

## Cost Considerations

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance units/month
- 1 project
- 1 team member

### Tips to Stay Under Limits
1. Use sampling for high-traffic apps
2. Filter out known/expected errors
3. Monitor usage in Sentry dashboard
4. Upgrade to paid plan if needed ($26/month for 50k errors)

---

## Security Notes

### ✅ Safe to Expose
- `VITE_SENTRY_DSN` - public identifier

### ❌ Keep Secret
- `SENTRY_AUTH_TOKEN` - gives write access to your Sentry project
- Only set in Netlify, never commit to git

### Best Practices
- Source maps are uploaded then deleted from deployment
- Sensitive data filtered in `beforeSend` hook
- User emails/IDs used for context (not PII)
- Review error details before sharing externally

---

## Next Steps

1. ✅ Complete Steps 1-4 above
2. ✅ Verify errors are being tracked in production
3. ✅ Set up Slack/email alerts in Sentry
4. ✅ Add user context tracking after login
5. ✅ Monitor dashboard weekly
6. 📚 Read Sentry docs: https://docs.sentry.io/platforms/javascript/guides/react/

---

## Support

- Sentry Documentation: https://docs.sentry.io
- Sentry Community: https://forum.sentry.io
- FounderHQ Internal: Check #engineering channel

**Last Updated:** November 8, 2025
