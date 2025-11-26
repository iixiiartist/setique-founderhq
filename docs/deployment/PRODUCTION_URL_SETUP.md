# Production URL Configuration

## Overview
The application now uses an environment variable (`VITE_APP_URL`) to generate invite links and other URL-dependent features. This ensures that invite links always point to the production domain, even when testing locally.

## Setup Instructions

### For Production Deployment (founderhq.setique.com)

1. **Add Environment Variable in Netlify:**
   - Go to your Netlify site settings
   - Navigate to: Site Settings → Environment Variables
   - Add a new environment variable:
     ```
     Key: VITE_APP_URL
     Value: https://founderhq.setique.com
     ```

2. **Redeploy the site:**
   - Netlify will automatically rebuild with the new environment variable
   - Or manually trigger a deploy from the Netlify dashboard

### For Local Development

1. **Create a `.env` file** (if you don't have one):
   ```bash
   cp .env.example .env
   ```

2. **Set the app URL for testing:**
   - For local testing: `VITE_APP_URL=http://localhost:3001`
   - For testing with production URLs: `VITE_APP_URL=https://founderhq.setique.com`

## How It Works

The invite link generation now works as follows:

```typescript
// Uses VITE_APP_URL if set, otherwise falls back to window.location.origin
const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
const inviteLink = `${appUrl}?token=${data.token}`;
```

### Benefits:
- ✅ **Production invite links always use the production domain** (founderhq.setique.com)
- ✅ **No hardcoded URLs** - easy to change domains
- ✅ **Works in all environments** - development, staging, production
- ✅ **Graceful fallback** - uses current origin if env var not set

## Testing

### To test invite links locally with production URL:

1. Set in your `.env`:
   ```
   VITE_APP_URL=https://founderhq.setique.com
   ```

2. Restart your dev server:
   ```bash
   npm run dev
   ```

3. Create an invite - the link will now use founderhq.setique.com

### To verify in production:

1. Deploy to Netlify with the environment variable set
2. Go to your workspace and invite a team member
3. Check that the generated link uses `https://founderhq.setique.com?token=...`

## Files Modified

- `.env.example` - Added `VITE_APP_URL` configuration
- `components/shared/InviteTeamMemberModal.tsx` - Updated invite link generation
- Created this documentation file

## Related Features

This configuration also affects:
- Email confirmation links (when email service is configured)
- Password reset links
- Any other feature that generates shareable URLs

Consider using `VITE_APP_URL` for all URL generation throughout the app for consistency.
