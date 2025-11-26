# Email Confirmation Setup Guide

## Overview
Enable custom-branded email confirmations for all new signups using Resend.

## Prerequisites
- Resend API key (already set up)
- Domain verification in Resend (noreply@founderhq.setique.com)

## Step 1: Deploy Email Functions

```bash
# Deploy the confirmation email sender
npx supabase functions deploy send-confirmation-email

# Deploy the auth webhook handler (optional - for custom flow)
npx supabase functions deploy auth-webhook
```

## Step 2: Configure Supabase Auth

### Option A: Use Supabase's Built-in Email (Recommended)

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Click **"Confirm signup"**
3. Replace the HTML with our custom template (copy from `/supabase/functions/send-confirmation-email/index.ts` - the `html` variable)
4. Use these variables in the template:
   - `{{ .ConfirmationURL }}` - The confirmation link
   - `{{ .Email }}` - User's email
   - `{{ .Data.full_name }}` - User's name (if provided)

5. Go to **Authentication** → **Providers** → **Email**
6. Enable **"Confirm email"** toggle
7. Set **"Confirm email redirect to"**: `https://founderhq.setique.com/app`

### Option B: Use Custom SMTP with Resend

1. Go to **Supabase Dashboard** → **Project Settings** → **Auth**
2. Scroll to **"SMTP Settings"**
3. Click **"Enable Custom SMTP"**
4. Fill in:
   - **Sender email**: `noreply@founderhq.setique.com`
   - **Sender name**: `FounderHQ`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: Your Resend API key

5. Save changes

### Option C: Use Edge Function Webhook (Advanced)

This gives you full control but requires more setup:

1. Enable the auth webhook in Supabase
2. Set up a database webhook to trigger on `auth.users` INSERT
3. The webhook calls our Edge Function to send the email

## Step 3: Verify Domain in Resend

**IMPORTANT**: You must verify `founderhq.setique.com` in Resend first!

1. Go to **Resend Dashboard** → **Domains**
2. Click **"Add Domain"**
3. Enter: `founderhq.setique.com`
4. Add these DNS records to your domain (in Netlify DNS or your registrar):

```
Type    Name                              Value
TXT     founderhq.setique.com             [Resend verification code]
MX      founderhq.setique.com             feedback-smtp.resend.com (Priority: 10)
TXT     resend._domainkey.founderhq...    [DKIM key]
```

5. Click **"Verify"** in Resend
6. Wait for verification (usually 5-30 minutes)

## Step 4: Test Email Confirmation

1. Sign out of FounderHQ
2. Go to landing page → Click "Get Started"
3. Sign up with a new email
4. Check your inbox for the confirmation email
5. Click the "CONFIRM EMAIL →" button
6. You should be redirected to the app and logged in

## Email Template Features

✅ **Neo-brutalism design** matching FounderHQ branding
✅ **Mobile responsive** 
✅ **Plain text fallback** for email clients without HTML
✅ **Clear CTA button** with branded colors
✅ **Helpful next steps** (what to do after confirming)
✅ **Professional sender**: `FounderHQ <noreply@founderhq.setique.com>`

## Troubleshooting

### Emails not sending:
- Check Resend dashboard for delivery status
- Verify domain is fully verified in Resend
- Check Supabase Edge Function logs: `npx supabase functions logs send-confirmation-email`
- Ensure RESEND_API_KEY secret is set

### Users not getting confirmed:
- Check the confirmation URL is correct
- Ensure redirect URL is set in Supabase Auth settings
- Check browser console for errors

### Wrong sender email:
- Update the `from` field in `/supabase/functions/send-confirmation-email/index.ts`
- Redeploy: `npx supabase functions deploy send-confirmation-email`

## Cost

- **Resend**: 3,000 emails/month free (plenty for confirmations)
- **Supabase**: Free tier includes email sending

## Security Notes

- Email confirmation prevents fake signups
- Confirmation links expire after 24 hours
- Users can't access the app until email is verified
- One-time use tokens prevent replay attacks
