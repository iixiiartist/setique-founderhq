# 🚀 Quick Deployment Checklist

## Before You Start
- [ ] Review `NETLIFY_DEPLOYMENT_PLAN.md` for full details
- [ ] Backup your `.env.local` file (you'll need these values for Netlify)
- [ ] Ensure you have GitHub access to https://github.com/iixiiartist/setique-founderhq

---

## Phase 1: Install Tailwind Properly (5 minutes)

```powershell
# 1. Install Tailwind as PostCSS plugin
npm install -D tailwindcss postcss autoprefixer

# 2. Files already created for you:
#    ✅ tailwind.config.js
#    ✅ postcss.config.js
#    ✅ netlify.toml
```

### Update index.html
Remove this line:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### Create src/index.css (if doesn't exist)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Import in main.tsx
Add at the top:
```typescript
import './index.css';
```

### Test Build
```powershell
npm run build
npm run preview  # Visit http://localhost:4173 to test
```

---

## Phase 2: Update Vite Config for Web (2 minutes)

Update `vite.config.ts`:
```typescript
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = env.VITE_ELECTRON === 'true';
    
    return {
      base: isElectron ? './' : '/', // ← Add this line
      // ... rest of config stays the same
    }
});
```

Test again:
```powershell
npm run build
npm run preview
```

---

## Phase 3: Supabase Migration (5 minutes)

### Run AI Usage Logs Migration
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy contents of `supabase/migrations/20241105000003_ai_usage_logs.sql`
5. Paste and run

### Verify
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'ai_usage_logs';
```

Should return 1 row.

### Verify Edge Functions
```powershell
npx supabase functions list
```

Should show:
- ✅ groq-chat
- ✅ accept-invitation

---

## Phase 4: GitHub Push (3 minutes)

```powershell
cd "g:\setique-founder-dashboard (2)\setique-founder-dashboard"

# Initialize if needed
git init

# Add all files
git add .

# Commit
git commit -m "feat: Add AI collaboration features and prepare for Netlify deployment"

# Connect to remote
git remote add origin https://github.com/iixiiartist/setique-founderhq.git

# Push
git branch -M main
git push -u origin main
```

---

## Phase 5: Netlify Deployment (10 minutes)

### Step 1: Connect Netlify to GitHub
1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub"
4. Select `iixiiartist/setique-founderhq`

### Step 2: Configure Build Settings
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18

### Step 3: Add Environment Variables
Go to Site settings → Environment variables → Add:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Get these values from your `.env.local` file**

### Step 4: Deploy!
Click "Deploy site"

Wait 2-3 minutes for build to complete.

---

## Phase 6: Verification (5 minutes)

### Test on Netlify URL
Visit your deployed site (Netlify will show URL)

- [ ] Site loads
- [ ] Can login
- [ ] Workspace loads
- [ ] CRM data displays
- [ ] AI assistant responds
- [ ] Team members visible
- [ ] No console errors about Tailwind CDN
- [ ] Mobile responsive

### Check Lighthouse
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Run audit
4. Aim for score > 90

---

## 🎉 Success!

Your app is now:
- ✅ Deployed to Netlify
- ✅ Using Supabase Edge Functions (NOT Netlify functions)
- ✅ Secured with RLS policies
- ✅ Auto-deploys on every `git push`

---

## 🔄 Continuous Deployment

From now on, just:
```powershell
git add .
git commit -m "Your changes"
git push
```

Netlify automatically rebuilds and deploys! 🚀

---

## 🆘 Troubleshooting

### Build Fails on Netlify
1. Check build logs in Netlify dashboard
2. Test locally: `npm run build`
3. Verify all dependencies in package.json

### Environment Variables Not Working
1. Double-check variable names have `VITE_` prefix
2. Redeploy after adding variables
3. Clear cache: Deploy settings → Clear cache and retry

### AI Not Working
1. Verify Supabase Edge Functions are deployed
2. Check Supabase logs
3. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

### White Screen
1. Check console for errors
2. Verify `base: '/'` in vite.config.ts
3. Check Netlify redirect rules in netlify.toml

---

## 📞 Need Help?

Refer to full documentation:
- `NETLIFY_DEPLOYMENT_PLAN.md` - Complete deployment guide
- `AI_COLLABORATION_UPDATE.md` - AI features documentation
- Netlify support: https://docs.netlify.com/
- Supabase support: https://supabase.com/docs
