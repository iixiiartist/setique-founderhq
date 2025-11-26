# Local Development Setup Guide

## Quick Start

### 1. Environment Variables Setup

Your `.env` file is already created and git-ignored. You need to add your Supabase credentials:

```bash
# Edit .env file and add:
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Getting Supabase Credentials

**Option A: Use Existing Production Project**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys → anon/public** → `VITE_SUPABASE_ANON_KEY`

**Option B: Create New Development Project**
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name it something like "founderhq-dev"
4. Wait for setup to complete (~2 minutes)
5. Copy the URL and anon key as above
6. Apply migrations (see below)

### 3. Apply Database Migrations

If using a new Supabase project, you need to apply the database schema:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_ID

# Push all migrations
npx supabase db push
```

Or manually run the migrations in the Supabase SQL Editor:
1. Go to your Supabase project → SQL Editor
2. Run migrations in order from `supabase/migrations/` folder
3. Start with the earliest timestamps first

### 4. Start Development Server

```bash
npm run dev
```

The app should now load at http://localhost:5173

### 5. Create Test User

1. Open the app in browser
2. Sign up with a test email
3. Check your email for confirmation link (or use Supabase Dashboard → Auth → Users to confirm manually)

## Environment Variables Reference

### Required for App to Work
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### Optional for Full Functionality
- `VITE_STRIPE_PUBLISHABLE_KEY` - For payment features (can skip for UI testing)
- `VITE_STRIPE_PRICE_*` - Stripe price IDs (can skip for UI testing)
- `VITE_GROQ_ENABLED=true` - Enable AI features
- `VITE_GROQ_MODEL=openai/gpt-oss-120b` - AI model selection

## Troubleshooting

### "Blank page with Supabase error"
- **Cause**: Missing or invalid Supabase credentials
- **Fix**: Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`
- **Note**: Restart dev server after changing `.env` file

### "Database schema errors"
- **Cause**: Migrations not applied
- **Fix**: Run migrations in Supabase SQL Editor or use `npx supabase db push`

### "Auth errors"
- **Cause**: Database policies not set up
- **Fix**: Apply all migrations, especially RLS policies

### "Changes to .env not working"
- **Cause**: Vite caches environment variables
- **Fix**: Stop dev server (Ctrl+C) and restart with `npm run dev`

## Working with Production

Your `.env` file is **git-ignored** and will never be committed. This means:

✅ **Safe to add real credentials locally**
✅ **Won't accidentally push to GitHub**
✅ **Each developer can have their own credentials**

When deploying to production:
- Set environment variables in Netlify Dashboard (not in code)
- Use `.env.production` as a template (but don't commit real values)
- See `DEPLOYMENT.md` for full deployment guide

## Testing GTM Docs Feature

Once the app loads:

1. **Navigate to GTM Docs tab** (Workspace icon in sidebar)
2. **Create templates** (click "Create GTM Templates" button)
3. **Test mobile view** (resize browser or use DevTools device emulation)
4. **Create a document** (click "+ New" button)
5. **Test rich text editor** (toolbar with Bold, Italic, Headings, etc.)
6. **Test Save/Load** (save doc, refresh page, verify it loads)

## Need Help?

- Check `SUPABASE_QUICK_SETUP.md` for detailed Supabase setup
- Check `DEPLOYMENT.md` for production deployment
- Check `GTM_DOCS_SESSION_PROGRESS.md` for feature status
