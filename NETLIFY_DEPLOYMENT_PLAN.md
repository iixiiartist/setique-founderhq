# Netlify Deployment Plan for Setique Founder Dashboard

## 🎯 Goal
Deploy to Netlify as a static SPA while keeping all server-side logic in Supabase Edge Functions (NOT Netlify Edge Functions).

---

## 📋 Pre-Deployment Checklist

### ✅ Current Status
- [x] Vite-based React SPA
- [x] Supabase backend with Edge Functions
- [x] All AI logic in Supabase Edge Functions
- [x] Environment variables in `.env.local`
- [x] `.gitignore` configured
- [x] Ready for GitHub connection

### ⚠️ Items to Address Before Deployment

#### 1. **Remove Tailwind CDN (Production Warning)**
Currently using CDN in `index.html`. Need to install as PostCSS plugin.

**Action Required:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 2. **Environment Variables Security**
- `.env` and `.env.local` are gitignored ✅
- Need to configure in Netlify dashboard (manual step)

#### 3. **Supabase Edge Functions Deployment**
- Already deployed `gemini-chat` ✅
- Already deployed `accept-invitation` ✅
- Need to verify all functions are deployed

#### 4. **Database Migration**
- `ai_usage_logs` table needs manual SQL execution in Supabase dashboard
- Migration file ready: `supabase/migrations/20241105000003_ai_usage_logs.sql`

---

## 🔧 Configuration Files to Create

### 1. **netlify.toml** (Netlify Configuration)
```toml
[build]
  command = "npm run build"
  publish = "dist"
  
[build.environment]
  NODE_VERSION = "18"

# SPA fallback - all routes go to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2. **Update vite.config.ts** (Already good, but verify)
Current `base: './'` works for Electron but needs to be `base: '/'` for web deployment.

**Action Required:** Update for web deployment:
```typescript
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = env.VITE_ELECTRON === 'true';
    
    return {
      base: isElectron ? './' : '/', // Conditional base path
      // ... rest of config
    }
});
```

### 3. **tailwind.config.js** (To be created)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 4. **postcss.config.js** (To be created)
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## 📝 Step-by-Step Deployment Process

### Phase 1: Local Preparation (Do First)

#### Step 1.1: Install Tailwind Properly
```powershell
# Install Tailwind as PostCSS plugin
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind config
npx tailwindcss init -p
```

#### Step 1.2: Remove Tailwind CDN from index.html
**Current (REMOVE):**
```html
<script src="https://cdn.tailwindcss.com"></script>
```

**Replace with:** Create `src/index.css` (or update existing):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import in `main.tsx`:
```typescript
import './index.css';
```

#### Step 1.3: Update Vite Config
Update `vite.config.ts` to handle both Electron and Web builds:
```typescript
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = env.VITE_ELECTRON === 'true';
    
    return {
      base: isElectron ? './' : '/',
      // ... rest stays the same
    }
});
```

#### Step 1.4: Test Build Locally
```powershell
npm run build
npm run preview  # Test production build locally
```

### Phase 2: GitHub Connection

#### Step 2.1: Initialize Git (if not already)
```powershell
cd "g:\setique-founder-dashboard (2)\setique-founder-dashboard"
git init
git add .
git commit -m "Initial commit: Founder Dashboard with AI features"
```

#### Step 2.2: Connect to Remote Repository
```powershell
git remote add origin https://github.com/iixiiartist/setique-founderhq.git
git branch -M main
git push -u origin main
```

#### Step 2.3: Verify .gitignore
Check that sensitive files are NOT committed:
- ✅ `.env` (gitignored)
- ✅ `.env.local` (gitignored)
- ✅ `node_modules/` (gitignored)
- ✅ `dist/` (gitignored)

### Phase 3: Supabase Verification

#### Step 3.1: Verify Edge Functions Deployed
```powershell
cd "g:\setique-founder-dashboard (2)\setique-founder-dashboard"
npx supabase functions list
```

Should show:
- `gemini-chat` ✅
- `accept-invitation` ✅

#### Step 3.2: Deploy Any Missing Functions
If needed:
```powershell
npx supabase functions deploy gemini-chat --no-verify-jwt
npx supabase functions deploy accept-invitation --no-verify-jwt
```

#### Step 3.3: Execute AI Usage Logs Migration
**Manual Step:** Go to Supabase Dashboard → SQL Editor

Run the SQL from `supabase/migrations/20241105000003_ai_usage_logs.sql`:
```sql
-- (Copy entire contents of migration file)
```

Verify:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'ai_usage_logs';
```

### Phase 4: Netlify Setup

#### Step 4.1: Create Netlify Account
1. Go to https://www.netlify.com/
2. Sign up with GitHub account
3. Authorize Netlify to access `iixiiartist/setique-founderhq`

#### Step 4.2: Import GitHub Repository
1. Click "Add new site" → "Import an existing project"
2. Choose GitHub
3. Select `iixiiartist/setique-founderhq`
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18

#### Step 4.3: Configure Environment Variables
In Netlify Dashboard → Site settings → Environment variables:

Add these variables (get values from your `.env.local`):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key (OPTIONAL - Edge Function has it)
```

**IMPORTANT:** 
- ✅ Use `VITE_` prefix for client-side variables
- ✅ Never commit these to GitHub
- ✅ Gemini API key is already in Supabase Edge Function secrets (secure!)

#### Step 4.4: Deploy
1. Click "Deploy site"
2. Netlify will:
   - Clone from GitHub
   - Run `npm install`
   - Run `npm run build`
   - Publish `dist/` folder

---

## 🔒 Security Considerations

### ✅ What's Secure (Current Setup)
1. **Gemini API Key:** Stored in Supabase Edge Function secrets (NOT in client code) ✅
2. **Supabase Anon Key:** Public by design, protected by RLS ✅
3. **Database Access:** Protected by Row Level Security policies ✅
4. **Admin Features:** Protected by `is_admin` RLS policies ✅
5. **AI Usage Logs:** Admin-only via database RLS ✅

### 🎯 Architecture Confirmation
```
┌─────────────────┐
│  Netlify (SPA)  │
│   React + Vite  │
└────────┬────────┘
         │
         │ HTTPS (Supabase Client)
         │
         ▼
┌────────────────────────────┐
│     Supabase Cloud         │
│  ┌──────────────────────┐  │
│  │  Edge Functions      │  │
│  │  - gemini-chat       │  │ ← Gemini API Key HERE (secure)
│  │  - accept-invitation │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │  PostgreSQL + RLS    │  │
│  │  - workspaces        │  │
│  │  - profiles          │  │
│  │  - ai_usage_logs     │  │
│  └──────────────────────┘  │
└────────────────────────────┘
         │
         │ API Call
         │
         ▼
┌────────────────────────────┐
│   Google Gemini API        │
└────────────────────────────┘
```

**Why This Works:**
- ✅ NO server-side code on Netlify (pure static hosting)
- ✅ ALL backend logic in Supabase Edge Functions
- ✅ API keys never exposed to client
- ✅ RLS protects all database access
- ✅ Scales automatically with Netlify CDN

---

## 🚀 Deployment Commands Summary

### One-Time Setup
```powershell
# 1. Install Tailwind properly
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 2. Test build
npm run build
npm run preview

# 3. Connect to GitHub
git remote add origin https://github.com/iixiiartist/setique-founderhq.git
git branch -M main
git push -u origin main

# 4. Deploy Supabase functions (if needed)
npx supabase functions deploy gemini-chat --no-verify-jwt
npx supabase functions deploy accept-invitation --no-verify-jwt

# 5. Run migration SQL in Supabase Dashboard (manual)
```

### Continuous Deployment (After Setup)
```powershell
# Make changes to code
git add .
git commit -m "Description of changes"
git push

# Netlify automatically rebuilds and deploys! 🎉
```

---

## 📊 Post-Deployment Verification

### Test Checklist
- [ ] Site loads at Netlify URL
- [ ] Login works
- [ ] Workspace data loads
- [ ] CRM tab displays correctly
- [ ] AI assistant responds (test in any tab)
- [ ] Task creation works
- [ ] Team members visible
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Custom domain (optional)

### Performance Checks
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] No Tailwind CDN warning

---

## 🎯 Next Steps After Deployment

### Immediate
1. Set up custom domain (if needed)
2. Enable HTTPS (automatic on Netlify)
3. Test all features end-to-end
4. Monitor Supabase usage

### Future Enhancements
1. Add preview deployments for branches
2. Set up staging environment
3. Configure Netlify forms (if needed)
4. Add performance monitoring
5. Set up error tracking (Sentry, etc.)

---

## 🔄 Rollback Plan

If deployment fails:
1. Check Netlify build logs
2. Verify environment variables
3. Test build locally with `npm run build`
4. Check Supabase Edge Function logs
5. Rollback to previous deployment in Netlify dashboard

---

## 📞 Support Resources

- **Netlify Docs:** https://docs.netlify.com/
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev/guide/build.html
- **This Codebase Docs:** Check all `*.md` files in project root

---

## ✨ Why This Setup is Optimal

1. **Cost-Effective:** Netlify free tier + Supabase free tier
2. **Secure:** API keys in Edge Functions, never in client
3. **Scalable:** CDN + serverless functions scale automatically
4. **Fast:** Static files served from global CDN
5. **Simple:** No server management, auto-deploys from GitHub
6. **Reliable:** 99.9% uptime SLA from both providers

---

**Ready to Deploy?** Follow Phase 1 → Phase 2 → Phase 3 → Phase 4 in order.

Let me know when you're ready to start Phase 1! 🚀
