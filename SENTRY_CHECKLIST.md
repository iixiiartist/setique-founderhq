# Sentry Setup Checklist for FounderHQ

Follow these steps to get Sentry fully operational in production.

## Quick Setup (15 minutes)

### 1. Create Sentry Account & Project (5 min)
- [ ] Go to https://sentry.io and sign up/login
- [ ] Click "Create Project" 
- [ ] Select "React" platform
- [ ] Name it "founderhq"
- [ ] Copy your DSN (looks like: `https://abc123@sentry.io/123456`)

### 2. Create Auth Token (2 min)
- [ ] In Sentry, go to Settings → Auth Tokens
- [ ] Click "Create New Token"
- [ ] Select scopes: `project:releases` and `org:read`
- [ ] Name it "netlify-source-maps"
- [ ] Copy the token (you can't see it again!)

### 3. Add to Netlify (3 min)
Go to Netlify Dashboard → Site Settings → Environment Variables and add:

#### Error Tracking (Required):
- [ ] `VITE_SENTRY_DSN` = `https://your-actual-dsn@sentry.io/your-project`
- [ ] `VITE_ENVIRONMENT` = `production`
- [ ] `VITE_APP_VERSION` = `1.0.0`

#### Source Maps (Required for debugging):
- [ ] `SENTRY_ORG` = `your-org-slug` (find in Sentry Settings → Organization Settings)
- [ ] `SENTRY_PROJECT` = `founderhq`
- [ ] `SENTRY_AUTH_TOKEN` = `your-token-from-step-2`

### 4. Deploy & Verify (5 min)
- [ ] Netlify will auto-deploy from your latest push
- [ ] Watch build logs for: `[sentry-vite-plugin] Source maps uploaded successfully`
- [ ] Visit your production site
- [ ] Open browser console, should see: `[Sentry] Initialized in production mode`

### 5. Test Error Tracking (2 min)
**Option A - In Dev Console:**
```javascript
throw new Error('Test Sentry Error');
```

**Option B - Add Test Button (temporary):**
```tsx
<button onClick={() => { throw new Error('Test!'); }}>
  Test Sentry
</button>
```

- [ ] Trigger the error
- [ ] Go to Sentry dashboard → Issues
- [ ] Verify error appears with full stack trace
- [ ] Verify stack trace shows TypeScript source (not minified)

## ✅ Success Criteria

Your Sentry is fully working when:
1. Console shows: `[Sentry] Initialized in production mode`
2. Test errors appear in Sentry dashboard within 10 seconds
3. Stack traces show **original TypeScript code** (not minified bundle)
4. Source file paths visible (e.g., `components/Dashboard.tsx:42`)
5. Build logs show: `Source maps uploaded successfully`

## 🎉 You're Done!

Sentry is now tracking:
- ✅ All unhandled errors
- ✅ React component errors (via ErrorBoundary)
- ✅ Promise rejections
- ✅ Performance metrics (10% sampled)
- ✅ User context (after login)
- ✅ Workspace context

## 📊 What to Monitor

Check Sentry dashboard weekly:
- **Issues** → All errors with frequency
- **Performance** → Slow operations
- **Releases** → Errors per version

Set up alerts:
- New issues (email/Slack)
- Error frequency spikes
- Performance degradation

## 🆘 Troubleshooting

**Issue:** Console shows "Skipping initialization - no DSN configured"
- **Fix:** Add `VITE_SENTRY_DSN` to Netlify environment variables

**Issue:** Errors tracked but no source maps (minified code)
- **Fix:** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to Netlify

**Issue:** Build fails with Sentry plugin error
- **Fix:** Verify token has `project:releases` scope

**Issue:** Too many errors eating free tier
- **Fix:** Adjust `sampleRate` in `lib/sentry.tsx` (0.5 = 50%)

## 📚 Resources

- Full Setup Guide: `docs/SENTRY_SETUP_GUIDE.md`
- Sentry Dashboard: https://sentry.io/organizations/your-org/projects/founderhq/
- Sentry React Docs: https://docs.sentry.io/platforms/javascript/guides/react/

---

**Estimated Time:** 15 minutes
**Cost:** Free (up to 5,000 errors/month)
**Impact:** Catch and fix production errors before users report them!
