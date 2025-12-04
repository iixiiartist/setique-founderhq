# Open Graph Meta Tags & SEO Implementation

## Overview

This document describes the implementation of dynamic Open Graph (OG) meta tags for shared content (market briefs, reports, and forms) to enable rich link previews on social platforms like LinkedIn, Slack, iMessage, etc.

## Current Status: ✅ Working

| Platform | Status | Notes |
|----------|--------|-------|
| LinkedIn | ✅ Working | Rich previews with title & description |
| Desktop Browsers | ✅ Working | Full SPA loads correctly |
| Slack/Discord | ✅ Working | In-app browser taps redirect to SPA |
| Mobile Browsers | ✅ Working | JS redirect fallback catches misclassified browsers |
| WhatsApp/iMessage | ✅ Working | Preview shows OG tags, tap opens SPA |

## Architecture

### How It Works

1. **Netlify Edge Function** (`netlify/edge-functions/og-meta.ts`) intercepts requests to:
   - `/share/brief/*` - Shared market briefs
   - `/share/report/*` - Shared agent reports
   - `/forms/*` - Public forms

2. **Crawler Detection**: The edge function uses multiple signals:
   - User-Agent matching for known bots (LinkedInBot, facebookexternalhit, etc.)
   - **Navigation signals** (Sec-Fetch-Mode, Sec-Fetch-Dest, Sec-Fetch-User, Accept header)
   - Preview headers (X-Purpose, X-FB-Purpose)
   - If crawler UA is detected BUT navigation signals are present → treat as real browser
   - If crawler UA is detected AND no navigation signals → serve OG HTML

3. **Data Fetching**: For crawlers, the function calls Supabase RPC functions:
   - `get_shared_market_brief` - Fetches brief data
   - `get_shared_report` - Fetches report data
   - `get_public_form` - Fetches form data

4. **OG HTML Response**: Returns HTML with meta tags that crawlers can parse, plus a **JS redirect fallback** that immediately loads the SPA for any misclassified browsers (crawlers don't execute JavaScript).

### Files Involved

```
netlify/
  edge-functions/
    og-meta.ts           # Main edge function (Netlify)

supabase/
  functions/
    og-meta/
      index.ts           # Backup Supabase function (not currently used)

public/
  _redirects             # Netlify redirect rules

netlify.toml             # Edge function configuration

hooks/
  useSEO.ts              # Client-side SEO hook for SPA
```

## Configuration

### netlify.toml

```toml
[[edge_functions]]
  function = "og-meta"
  path = "/share/brief/*"

[[edge_functions]]
  function = "og-meta"
  path = "/share/report/*"

[[edge_functions]]
  function = "og-meta"
  path = "/forms/*"
```

### Crawler Detection

The following User-Agent patterns are detected as crawlers:

```typescript
const crawlers = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'whatsapp/',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'telegrambot',
  'applebot',
  'googlebot',
  'bingbot',
  'pinterestbot',
  'redditbot',
  // ... and more
];
```

## RPC Functions (Supabase)

These functions are granted to the `anon` role for public access:

### get_shared_market_brief

```sql
-- Returns: { success, brief: { query, hero_line, raw_report }, error }
SELECT get_shared_market_brief(p_token, p_password);
```

### get_shared_report

```sql
-- Returns: { success, report: { target, goal, output }, title_override }
SELECT get_shared_report(p_token);
```

### get_public_form

```sql
-- Returns: { success, form: { name, title, description } }
SELECT get_public_form(p_slug);
```

## Known Issues & Limitations

### In-App Browser Detection

Apps like WhatsApp, Slack, and Discord include their name in the User-Agent when their in-app browser opens a link. The edge function now uses **navigation signals** to distinguish between:
- **Preview fetch**: Bot fetching link for preview card (no navigation signals)
- **User tap**: User tapped the link in the app (has navigation signals like `Sec-Fetch-Mode: navigate`)

**Solution implemented**:
- Check `Sec-Fetch-Mode`, `Sec-Fetch-Dest`, `Sec-Fetch-User` headers
- Check `Accept` header for `text/html`
- If navigation signals present, treat as real browser even if UA matches crawler
- JS redirect fallback in OG HTML catches any remaining edge cases

**Attempted fixes**:

- Removed `'iphone'`, `'cfnetwork'`, `'darwin'` from crawler list
- Added Accept header check (real browsers include `text/html`)
- Checked for Safari in UA for iOS detection

### Cache Considerations

- LinkedIn caches previews for up to 7 days
- Use [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) to force refresh
- Edge function adds `Cache-Control: public, max-age=300` (5 minutes)

## Testing

### Test with LinkedIn Post Inspector

1. Go to https://www.linkedin.com/post-inspector/
2. Enter URL: `https://founderhq.setique.com/share/brief/{token}`
3. Click "Inspect" to see current metadata

### Test Crawler Response Locally

```powershell
# Simulate LinkedIn crawler
$headers = @{ "User-Agent" = "LinkedInBot/1.0" }
(Invoke-WebRequest -Uri "https://founderhq.setique.com/share/brief/TOKEN" -Headers $headers).Content.Substring(0, 500)
```

### Test Browser Response

```powershell
# Simulate regular browser
$headers = @{ 
  "User-Agent" = "Mozilla/5.0 Chrome/120.0"
  "Accept" = "text/html,application/xhtml+xml"
}
(Invoke-WebRequest -Uri "https://founderhq.setique.com/share/brief/TOKEN" -Headers $headers).Content.Substring(0, 500)
```

## Client-Side SEO (useSEO Hook)

For the SPA, we also have a client-side SEO hook that updates meta tags after React renders:

```typescript
// hooks/useSEO.ts
import { useSEO } from '../hooks/useSEO';

// In component:
useSEO({
  title: 'Market Brief: Company Name',
  description: 'Brief description here',
});
```

This is used in:
- `SharedBriefPage.tsx`
- `SharedReportPage.tsx`
- `PublicFormPage.tsx`

**Note**: Client-side meta tags don't work for crawlers (they don't execute JavaScript), which is why we need the edge function.

## Deployment

1. Push changes to `main` branch
2. Netlify automatically deploys edge functions
3. Wait 2-3 minutes for deployment
4. Test with LinkedIn Post Inspector

## Future Improvements

1. **Better mobile detection**: Could use a more sophisticated UA parser
2. **Dynamic OG images**: Generate images with brief/report titles
3. **Twitter Card support**: Already included, could be enhanced
4. **Analytics**: Track which shared links are getting previewed

## Troubleshooting

### LinkedIn shows wrong preview

1. Go to LinkedIn Post Inspector
2. Enter URL and click "Inspect"
3. This forces a cache refresh

### Edge function not running

1. Check `public/_redirects` isn't catching routes before edge function
2. Verify `netlify.toml` has correct `[[edge_functions]]` config
3. Check Netlify deploy logs for errors

### RPC function failing

1. Verify Supabase anon key is correct in edge function
2. Check RPC function is granted to `anon` role
3. Test RPC directly via curl/PowerShell

---

*Last updated: December 4, 2025*
