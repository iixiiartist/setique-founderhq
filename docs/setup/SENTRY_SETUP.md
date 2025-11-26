# Sentry Error Tracking - Setup Complete

## Overview

Sentry error tracking is fully integrated into FounderHQ for production monitoring, error capture, and user flow tracking.

---

## ✅ What's Implemented

### 1. Core Integration
- **Sentry SDK**: `@sentry/react` installed and configured
- **ErrorBoundary**: Wraps entire app in `App.tsx`
- **Initialization**: Automatic on app load with environment-based DSN
- **Custom Fallback**: Neo-brutalism styled error UI with retry functionality

### 2. Error Capture
- ✅ Unhandled exceptions automatically captured
- ✅ React component errors caught by ErrorBoundary
- ✅ Network errors from failed API calls
- ✅ Custom error handling with `captureError()`

### 3. User Context Tracking
```typescript
// Automatically set on login
setSentryUser({
  id: user.id,
  email: user.email
});

// Automatically set when workspace loads
setWorkspaceContext({
  id: workspace.id,
  name: workspace.name,
  plan: workspace.planType
});
```

### 4. User Action Breadcrumbs
Critical user actions are tracked as breadcrumbs for debugging:

| Action | Tracked Event | Data Captured |
|--------|--------------|---------------|
| Task Created | `task_created` | category, priority, hasDate |
| Task Updated | `task_updated` | taskId, status, wasCompleted |
| Task Deleted | `task_deleted` | taskId, category |
| CRM Item Created | `crm_item_created` | collection |
| CRM Item Updated | `crm_item_updated` | itemId, collection |
| Marketing Created | `marketing_item_created` | type, status |
| Marketing Updated | `marketing_item_updated` | itemId, status, wasPublished |
| Financial Logged | `financial_logged` | date |

### 5. Privacy & Data Protection
- **PII Filtering**: Passwords, tokens, and secrets are redacted
- **Console Log Filtering**: Sensitive keywords removed from breadcrumbs
- **Request Data Redaction**: Form data sanitized before sending
- **Configurable Sampling**: 100% error capture, adjustable via config

---

## 📝 Configuration

### Environment Variables

Add to your `.env` file:
```bash
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_SENTRY_RELEASE=optional_release_version
```

### Get Your Sentry DSN

1. Create account at [sentry.io](https://sentry.io)
2. Create new project → Select "React"
3. Copy the DSN from project settings
4. Add to `.env` file

### File: `lib/sentry.tsx`

```typescript
// Initialize Sentry
initializeSentry();

// Set user context (called automatically on login)
setUser({ id: 'user-123', email: 'user@example.com' });

// Set workspace context (called automatically on workspace load)
setWorkspaceContext({ 
  id: 'workspace-123', 
  name: 'My Workspace', 
  planType: 'pro' 
});

// Track custom actions
trackAction('custom_action', { key: 'value' });

// Manually capture errors
captureError(new Error('Something went wrong'), { 
  context: 'additional-info' 
});

// Capture messages
captureMessage('Info message', 'info');
```

---

## 🧪 Testing Sentry

### Test Error Capture

Add this button temporarily to test:
```tsx
<button onClick={() => {
  throw new Error('Test Sentry error capture');
}}>
  Trigger Test Error
</button>
```

Expected behavior:
1. Error boundary catches error
2. Custom fallback UI appears
3. Error sent to Sentry dashboard
4. User sees "Try Again" and "Go Home" buttons

### Test Breadcrumbs

1. Create a task
2. Update task status
3. Delete task
4. Trigger an error
5. Check Sentry dashboard → Event → Breadcrumbs

You should see a timeline of actions before the error.

### Test User Context

1. Login to app
2. Trigger an error
3. Check Sentry dashboard → Event → User

Should show:
- User ID
- Email
- Workspace name
- Plan type

---

## 📊 Monitoring in Production

### Sentry Dashboard Navigation

1. **Issues** → See all errors grouped by similarity
2. **Performance** → Track slow API calls (if enabled)
3. **Releases** → Track errors by deployment version
4. **Alerts** → Configure notifications for critical errors

### Recommended Alerts

Set up notifications for:
- **High-frequency errors**: >10 occurrences in 1 hour
- **New issues**: First occurrence of new error type
- **Critical errors**: Errors affecting ≥10% of users

### Release Tracking

When deploying, set release version:
```bash
# In your build process
export VITE_SENTRY_RELEASE="founderhq@$(git rev-parse --short HEAD)"
npm run build
```

This allows you to:
- Track which errors came from which deployment
- Compare error rates across releases
- Identify regressions quickly

---

## 🔧 Common Debugging Patterns

### Error: "Session Missing" or "Auth Error"
**Status**: Ignored by default (see `ignoreErrors` in config)
**Reason**: Common during logout, handled gracefully by app

### Error: "Network Request Failed"
**Status**: Ignored by default
**Reason**: User's network issue, not actionable

### Error: "Cannot read property X of undefined"
**Status**: Captured and tracked
**Action**: Check breadcrumbs to see user's actions before error
**Fix**: Add null checks or improve data loading state

### Error: Database RLS Policy Violation
**Status**: Captured with full context
**Action**: Check user/workspace context in Sentry event
**Fix**: Review RLS policies for affected table

---

## 🚀 Future Enhancements

### Performance Monitoring
```typescript
// Enable in lib/sentry.tsx
tracesSampleRate: 0.1, // 10% of transactions

// Track slow operations
const result = await measurePerformance('loadTasks', async () => {
  return await loadTasks();
});
```

### Source Maps
For production debugging with original source code:
```bash
# Install Sentry CLI
npm install --save-dev @sentry/cli

# Add to build script
sentry-cli releases files RELEASE upload-sourcemaps ./dist
```

### Session Replay (Premium Feature)
Record user sessions leading up to errors:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  // ... existing config
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

## 📖 Resources

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Error Boundary Guide](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/)
- [Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)
- [Release Tracking](https://docs.sentry.io/product/releases/)

---

## ✅ Verification Checklist

Before going to production:
- [ ] Sentry DSN configured in production environment
- [ ] Error boundary wraps app
- [ ] User context set on login
- [ ] Workspace context set on workspace load
- [ ] Critical actions tracked as breadcrumbs
- [ ] Tested error capture in staging
- [ ] Alerts configured for critical errors
- [ ] Team members added to Sentry project
- [ ] Source maps uploaded (optional but recommended)

**Status**: ✅ Sentry fully integrated and ready for production!
