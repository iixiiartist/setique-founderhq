# Fix Workspace Invite Links - Quick Guide

## Problem
Workspace invitation emails contain localhost links instead of production URLs:
```
http://localhost:3001?token=xxx
```

## Solution
The Supabase Edge Function `send-invitation` needs the `APP_URL` secret set to your production URL.

## Steps to Fix

### 1. Set the Production APP_URL Secret

Run this command with your production URL:

```bash
npx supabase secrets set APP_URL=https://founderhq.setique.com
```

### 2. Verify the Secret is Set

```bash
npx supabase secrets list
```

You should see:
```
APP_URL
RESEND_API_KEY
```

### 3. Restart the Edge Function (if needed)

The function should pick up the new secret automatically, but you can redeploy to be sure:

```bash
npx supabase functions deploy send-invitation
```

3. Test the Fix

1. Go to your app → Settings → Team Members
2. Invite someone (use your own email for testing)
3. Check the email - the link should now be:
   ```
   https://founderhq.setique.com?token=xxx
   ```

## Why This Happens

The Supabase Edge Function has this code:

```typescript
const inviteUrl = `${Deno.env.get('APP_URL') || 'http://localhost:3000'}?token=${invitation.token}`
```

If `APP_URL` is not set, it falls back to localhost.

## Related Files

- **Edge Function**: `supabase/functions/send-invitation/index.ts`
- **Documentation**: `EMAIL_SETUP.md`
- **Environment Example**: `.env.example`

## Important Notes

1. **APP_URL vs VITE_APP_URL**: 
   - `VITE_APP_URL` = Frontend environment variable (in Netlify)
   - `APP_URL` = Supabase secret (for Edge Functions)
   - They should both point to the same production URL

2. **Local Development**:
   - For local testing, you can temporarily set: `APP_URL=http://localhost:5173`
   - Remember to change it back to production URL

3. **Netlify Environment**:
   - Netlify variables (VITE_APP_URL) don't affect Supabase Edge Functions
   - Edge Functions only see Supabase secrets

## Verification Checklist

- [ ] Supabase secret `APP_URL` set to production URL
- [ ] Edge function `send-invitation` deployed
- [ ] Test invitation sent
- [ ] Email contains production URL (not localhost)
- [ ] Invite link works correctly

## Quick Commands Reference

```bash
# View current secrets
npx supabase secrets list

# Set production URL
npx supabase secrets set APP_URL=https://founderhq.netlify.app

# Deploy edge function
npx supabase functions deploy send-invitation

# View function logs (for debugging)
npx supabase functions logs send-invitation
```

---

**After setting the secret, all new invitations will use the production URL! 🎉**
