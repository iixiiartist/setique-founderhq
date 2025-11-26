# Custom Domain Setup: founderhq.setique.com

This guide will help you set up your custom subdomain `founderhq.setique.com` for your Netlify deployment.

## Step 1: Deploy to Netlify First

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → Select `iixiiartist/setique-founderhq`
4. Configure build settings (should auto-detect from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**

Your site will get a random Netlify URL like: `https://random-name-123.netlify.app`

## Step 2: Add Custom Domain in Netlify

1. In your Netlify site dashboard, go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `founderhq.setique.com`
4. Netlify will give you DNS records to add

## Step 3: Configure DNS Records

You need to add DNS records to your domain provider (where you manage `setique.com`):

### Option A: If using Netlify DNS (Recommended)
Netlify will show you nameservers to add. Update your domain's nameservers to Netlify's.

### Option B: If using external DNS provider
Add these DNS records to `setique.com`:

**For HTTPS (Recommended):**
```
Type: CNAME
Name: founderhq
Value: [your-netlify-site].netlify.app
TTL: 3600 (or Auto)
```

**Example:**
```
CNAME   founderhq   random-name-123.netlify.app
```

## Step 4: Enable HTTPS

1. After DNS records propagate (5 minutes - 48 hours), go back to Netlify
2. In **Domain management** → **HTTPS**, click **"Verify DNS configuration"**
3. Once verified, click **"Provision certificate"**
4. Netlify will automatically provision a free SSL certificate from Let's Encrypt

## Step 5: Update Supabase Redirect URLs

Once your custom domain is working, update Supabase:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update **Site URL** to: `https://founderhq.setique.com`
5. Add to **Redirect URLs**:
   - `https://founderhq.setique.com`
   - `https://founderhq.setique.com/**`
   - `http://localhost:3001/**` (keep for local development)

## Step 6: Test Your Deployment

1. Visit `https://founderhq.setique.com`
2. Test login/signup
3. Test AI assistant
4. Verify all features work

## Troubleshooting

### DNS Not Propagating
- Wait 24-48 hours for full propagation
- Test with: `nslookup founderhq.setique.com`
- Clear your browser cache

### SSL Certificate Issues
- Make sure DNS is fully propagated first
- Try "Provision certificate" again in Netlify
- Check that your CNAME points to the correct Netlify domain

### Login Not Working
- Make sure you updated Supabase redirect URLs
- Check browser console for CORS errors
- Verify environment variables are set in Netlify

### 404 Errors on Page Refresh
- Already configured in `netlify.toml` with SPA redirect
- If issues persist, check Netlify's **Redirects** settings

## DNS Providers Quick Links

Common DNS providers where you might manage `setique.com`:

- **Cloudflare**: Dashboard → DNS → Add Record
- **GoDaddy**: DNS Management → Add → CNAME
- **Namecheap**: Domain List → Manage → Advanced DNS
- **Google Domains**: DNS → Custom records
- **AWS Route 53**: Hosted zones → Create record

## Final Checklist

- [ ] Site deployed to Netlify with env vars
- [ ] Custom domain added in Netlify
- [ ] DNS CNAME record added
- [ ] DNS propagated (check with `nslookup`)
- [ ] SSL certificate provisioned
- [ ] Supabase redirect URLs updated
- [ ] Site accessible at `https://founderhq.setique.com`
- [ ] Login/signup working
- [ ] All features tested

---

**Need Help?**
- Netlify DNS docs: https://docs.netlify.com/domains-https/custom-domains/
- Netlify SSL docs: https://docs.netlify.com/domains-https/https-ssl/
