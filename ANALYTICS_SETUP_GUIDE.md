# Analytics Setup Guide

This guide explains how to configure and use the analytics system in FounderHQ.

## Overview

FounderHQ includes a comprehensive analytics system that supports multiple providers:
- **Google Analytics 4** (gtag.js)
- **Mixpanel**
- **Segment** (Analytics.js)
- **PostHog**

The system automatically:
- Tracks page views on route changes
- Identifies users on login/logout
- Tracks key user actions (tasks, CRM, form submissions)
- Respects Do Not Track (DNT) browser settings
- Anonymizes IP addresses for privacy

## Environment Configuration

### 1. Add to `.env` file

```bash
# Analytics Configuration
VITE_ANALYTICS_ENABLED=true

# Google Analytics (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Mixpanel (Optional)
VITE_MIXPANEL_TOKEN=your_mixpanel_token

# Segment (Optional)
VITE_SEGMENT_WRITE_KEY=your_segment_write_key

# PostHog (Optional)
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

### 2. Provider Setup

**Google Analytics:**
1. Create a GA4 property at https://analytics.google.com
2. Copy your Measurement ID (format: `G-XXXXXXXXXX`)
3. Set `VITE_GA_MEASUREMENT_ID` in your `.env` file

**Mixpanel:**
1. Create a project at https://mixpanel.com
2. Copy your Project Token from Settings
3. Set `VITE_MIXPANEL_TOKEN` in your `.env` file

**Segment:**
1. Create a workspace at https://segment.com
2. Create a JavaScript source
3. Copy the Write Key
4. Set `VITE_SEGMENT_WRITE_KEY` in your `.env` file

**PostHog:**
1. Create an account at https://posthog.com
2. Copy your Project API Key
3. Set `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in your `.env` file

## What's Tracked Automatically

### Page Views
- Tracked on every route change
- Includes: `path`, `title`, `referrer`, `timestamp`

### User Identification
- Automatically identifies users on login
- Includes: `userId`, `email`, `name`, `workspace`
- Resets on logout

### Authentication Events
- `login_attempt` - User attempts to log in
- `login_success` - Successful login
- `login_failed` - Failed login with error
- `signup_attempt` - User attempts to sign up
- `signup_success` - Successful signup
- `signup_failed` - Failed signup with error

### Business Profile Events
- `business_profile_step_completed` - User completes a profile step
- `business_profile_validation_error` - Validation errors on step
- `business_profile_completed` - Full profile completed

### Task Management Events
- `task_created` - New task created
  - Properties: `category`, `priority`, `has_due_date`, `has_assignee`
- `task_updated` - Task updated
  - Properties: `status`, `was_completed`, `category`
- `task_deleted` - Task deleted
  - Properties: `category`

### Navigation Events
- `tab_switched` - User switches dashboard tabs
  - Properties: `from`, `to`

## Usage in Components

### Track Custom Events

```typescript
import { useAnalytics } from './hooks/useAnalytics'

function MyComponent() {
  const { track } = useAnalytics()
  
  const handleAction = () => {
    track('custom_event', {
      property1: 'value1',
      property2: 123
    })
  }
  
  return <button onClick={handleAction}>Do Something</button>
}
```

### Track Clicks

```typescript
const { trackClick } = useAnalytics()

<button onClick={() => trackClick('submit_button', { form: 'contact' })}>
  Submit
</button>
```

### Track Form Submissions

```typescript
const { trackFormSubmit } = useAnalytics()

const handleSubmit = async (e) => {
  e.preventDefault()
  trackFormSubmit('contact_form', { fields: 5 })
  // ... submit logic
}
```

### Track Errors

```typescript
const { trackError } = useAnalytics()

try {
  await riskyOperation()
} catch (error) {
  trackError(error, { context: 'user_profile_update' })
  throw error
}
```

### Track Performance

```typescript
const { trackPerformance } = useAnalytics()

const start = performance.now()
await loadData()
const duration = performance.now() - start

trackPerformance('data_load', duration, { items: 100 })
```

### Track Component Usage

```typescript
import { useComponentTracking } from './hooks/useAnalytics'

function MyComponent() {
  useComponentTracking('MyComponent') // Auto-tracks mount/unmount time
  return <div>...</div>
}
```

### Track Feature Usage

```typescript
import { useFeatureTracking } from './hooks/useAnalytics'

function AIDashboard() {
  const trackFeatureUse = useFeatureTracking('ai_dashboard')
  
  const handleGenerate = () => {
    trackFeatureUse('generate_content', { type: 'blog_post' })
    // ... generation logic
  }
  
  return <button onClick={handleGenerate}>Generate</button>
}
```

## Privacy Features

### Do Not Track (DNT)
- Automatically respects browser DNT settings
- When DNT is enabled, analytics is completely disabled
- Check: `navigator.doNotTrack === '1'`

### IP Anonymization
- All providers configured with IP anonymization
- Google Analytics: `anonymize_ip: true`
- PostHog: `property_blacklist: ['$ip']`

### User Consent
- Analytics disabled by default until `analytics.initialize()` is called
- Can check if user has DNT enabled before showing consent banner
- Call `analytics.reset()` to clear user data

## Debug Mode

In development, analytics runs in debug mode:
- All events logged to console
- Shows which providers received each event
- Helps verify tracking implementation

```typescript
// Check debug output in browser console:
[Analytics] Initialized: {providers: ['google', 'mixpanel']}
[Analytics] Page view tracked: {path: '/dashboard', title: 'Dashboard'}
[Analytics] Event tracked: task_created {category: 'customerTasks'}
```

## Testing Analytics

### 1. Enable Debug Mode

```bash
# In .env
VITE_ANALYTICS_ENABLED=true
NODE_ENV=development
```

### 2. Check Browser Console

Open DevTools console and look for `[Analytics]` logs showing:
- Provider initialization
- Page view tracking
- Event tracking
- User identification

### 3. Verify Provider Dashboards

**Google Analytics:**
- Go to Reports > Realtime
- Verify events appear within 30 seconds

**Mixpanel:**
- Go to Events page
- Check Live View for real-time events

**Segment:**
- Go to Debugger
- Verify events are received

**PostHog:**
- Go to Events
- Check recent activity

### 4. Test DNT

```javascript
// In browser console
navigator.doNotTrack = '1'
location.reload()
// Analytics should be disabled
```

## Performance Impact

The analytics system is optimized for minimal performance impact:

1. **Lazy Loading**: Provider SDKs loaded asynchronously
2. **Event Batching**: Events batched when possible
3. **No Blocking**: All tracking is non-blocking
4. **Conditional Loading**: Only configured providers are loaded

Typical overhead: <50KB additional bundle size per provider

## Troubleshooting

### Events Not Appearing

1. Check environment variables are set correctly
2. Verify `VITE_ANALYTICS_ENABLED=true`
3. Check browser console for errors
4. Verify provider credentials are valid
5. Disable ad blockers (may block analytics scripts)

### Multiple Events Firing

- This is normal in React StrictMode (development only)
- Production builds will fire events once

### DNT Blocking Everything

- This is expected behavior
- Users with DNT enabled won't be tracked
- Check: `navigator.doNotTrack` in console

### Provider Not Loading

1. Check network tab for script loading errors
2. Verify credentials format (no extra spaces/quotes)
3. Check for Content Security Policy (CSP) issues
4. Verify provider status pages for outages

## Best Practices

### 1. Event Naming
- Use snake_case: `user_signed_up`
- Be specific: `task_completed` not `action_done`
- Include action: `button_clicked`, `form_submitted`

### 2. Properties
- Keep properties flat (no deep nesting)
- Use consistent types (string, number, boolean)
- Avoid PII (personal identifiable information)

### 3. Performance
- Don't track on every keystroke (use debouncing)
- Batch related events when possible
- Use `useComponentTracking` sparingly (only key components)

### 4. Privacy
- Don't include email, phone, address in properties
- Use user IDs instead of names where possible
- Document what data you collect in privacy policy

## Architecture

```
analytics.ts (Service)
├── Initialize providers
├── Track events
├── Identify users
├── Page tracking
└── Performance tracking

useAnalytics.ts (Hooks)
├── usePageTracking() - Auto page views
├── useUserTracking() - Auto user ID
├── useAnalytics() - Manual tracking
├── useComponentTracking() - Component lifecycle
└── useFeatureTracking() - Feature usage

Integration Points:
├── App.tsx - Page & user tracking
├── LoginForm.tsx - Auth events
├── BusinessProfileSetup.tsx - Onboarding events
└── DashboardApp.tsx - Task & navigation events
```

## Support

For issues or questions:
1. Check browser console for `[Analytics]` logs
2. Review this documentation
3. Check provider documentation
4. Contact support with console logs and reproduction steps

