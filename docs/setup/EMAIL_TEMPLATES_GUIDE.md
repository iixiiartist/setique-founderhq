# Supabase Email Templates - Setup Guide

All email templates have been created with FounderHQ's neo-brutalism branding.

## Templates Created

1. ✅ **Confirmation Email** (`supabase-email-template-confirmation.html`)
   - Used for: New user signup email verification
   - Supabase Setting: Authentication → Email Templates → "Confirm signup"

2. ✅ **Invite User** (`supabase-email-template-invite.html`)
   - Used for: Team member invitations
   - Supabase Setting: Authentication → Email Templates → "Invite user"

3. ✅ **Magic Link** (`supabase-email-template-magic-link.html`)
   - Used for: Passwordless sign-in
   - Supabase Setting: Authentication → Email Templates → "Magic Link"

4. ✅ **Change Email** (`supabase-email-template-change-email.html`)
   - Used for: Email address change confirmation
   - Supabase Setting: Authentication → Email Templates → "Change Email Address"

5. ✅ **Reset Password** (`supabase-email-template-reset-password.html`)
   - Used for: Password reset requests
   - Supabase Setting: Authentication → Email Templates → "Reset Password"

6. ✅ **Reauthentication** (`supabase-email-template-reauthentication.html`)
   - Used for: Sensitive action verification
   - Supabase Setting: Authentication → Email Templates → "Reauthentication"

## How to Apply Templates

1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Email Templates**
3. Select each template type from the dropdown
4. Copy the contents of the corresponding HTML file
5. Paste into the template editor
6. Click **Save**

## Template Variables

All templates use Supabase's built-in variables:
- `{{ .ConfirmationURL }}` - The action link
- `{{ .Email }}` - The user's email (used in change email template)
- `{{ .SiteURL }}` - Your site URL (not used but available)

## Design Features

All templates include:
- ✅ Neo-brutalism design (thick black borders, shadows)
- ✅ FounderHQ branding (black header, yellow accents)
- ✅ Monospace fonts for tech aesthetic
- ✅ Mobile responsive
- ✅ Security notices where appropriate
- ✅ Clear CTAs with prominent buttons
- ✅ Fallback URL text for email clients that block buttons

## Brand Colors

- Primary: Yellow (#fbbf24)
- Background: Light gray (#f3f4f6)
- Text: Black (#000000)
- Borders: Black, 2-3px thick
- Shadows: 4-8px offset black shadows

## Testing

After applying each template, test by:
1. Creating a new account (confirmation email)
2. Requesting password reset (reset password)
3. Using magic link sign-in (magic link)
4. Changing email in settings (change email)
5. Inviting team member (invite user)

## Support

Questions? Contact joe@setique.com or visit founderhq.setique.com
