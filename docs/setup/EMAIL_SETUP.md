# Email Invitation Setup Guide

## 🚨 IMPORTANT: Resend Free Tier Limitations

**Without domain verification:**
- You can only send emails to YOUR OWN email address (the one you signed up with)
- Perfect for testing, but won't work for inviting real team members

**To invite other people's emails:**
- You MUST verify a domain (see Step 4 below)
- Once verified, you can send to anyone

## 1. Sign up for Resend (Free Email Service)

1. Go to https://resend.com/signup
2. Sign up with your email
3. Verify your email address
4. In the Resend dashboard, click "API Keys"
5. Create a new API key and copy it

## 2. Set up Supabase Secrets

Run these commands to configure the email service:

```powershell
# Set your Resend API key
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Set your app URL
# ⚠️ IMPORTANT: Use your PRODUCTION URL, not localhost!
# For production:
npx supabase secrets set APP_URL=https://founderhq.setique.com

# For local development only (testing invites):
# npx supabase secrets set APP_URL=http://localhost:5173
```

**Why this matters**: This URL is used in invitation emails. If set to localhost, invitations won't work for users! Always use your production URL here.

## 3. Deploy the Email Function

```powershell
npx supabase functions deploy send-invitation
```

## 4. Verify Email Domain (REQUIRED for Production!)

**⚠️ CRITICAL: Without domain verification, you can ONLY send emails to YOUR OWN email address!**

Resend's free tier requires domain verification to send to other people. Here's how:

### Quick Test (No Domain Needed):
To test the system, invite **your own email** (joseph@anconsulting.us). This works immediately!

### For Real Team Invitations:

1. In Resend dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `anconsulting.us` or `setique.app`)
4. Resend will show DNS records to add:
   - MX record (for receiving bounces)
   - TXT record (for SPF authentication)  
   - CNAME records (for DKIM signatures)

5. Add these records to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
6. Wait 5-30 minutes for DNS propagation
7. Click **"Verify"** in Resend dashboard
8. Once verified ✅, update the edge function:
   ```typescript
   from: 'Setique <invitations@anconsulting.us>',
   ```
9. Redeploy: `npx supabase functions deploy send-invitation`

## 5. Test the System

1. Refresh your browser
2. Go to Settings → Team Management
3. Click "Invite Team Member"
4. **For testing**: Enter `joseph@anconsulting.us` (your email)
5. **For production**: Verify your domain first, then invite anyone!
6. Check the recipient's inbox for the beautiful invitation email!

## Troubleshooting

If emails aren't sending:
- Check Supabase logs: `npx supabase functions logs send-invitation`
- Verify the RESEND_API_KEY is set correctly
- Make sure the function is deployed
- Check your Resend dashboard for delivery status

## Cost

- **Resend Free Tier**: 3,000 emails/month, 100 emails/day
- **Supabase Edge Functions**: Free tier includes 500K invocations/month
- This should be more than enough for most teams!
