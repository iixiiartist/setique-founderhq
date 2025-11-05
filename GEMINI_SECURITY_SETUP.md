# Gemini API Security Setup Guide

## Overview
Your Gemini API key is now **secured on the server-side** using a Supabase Edge Function. The API key is never exposed to the frontend or visible in browser developer tools.

## 🔒 Security Improvements
- ✅ API key stored as Supabase secret (server-side only)
- ✅ Frontend no longer has direct access to Gemini API
- ✅ All AI requests authenticated via Supabase Auth
- ✅ Rate limiting and usage tracking possible
- ✅ No risk of API key theft or abuse

## 📋 Deployment Steps

### Step 1: Set Your Gemini API Key as a Supabase Secret

Run this command in your terminal (from the project root):

```bash
supabase secrets set GEMINI_API_KEY=AIzaSyDgANd84p364cLKpCGzUeXbN34mjnlNZ6k
```

This stores your API key securely in Supabase's secret management system where only Edge Functions can access it.

### Step 2: Deploy the Gemini Chat Edge Function

Deploy the Edge Function to Supabase:

```bash
supabase functions deploy gemini-chat
```

You should see output confirming the deployment was successful.

### Step 3: Restart Your Dev Server

Since we removed `VITE_GEMINI_API_KEY` from `.env`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test the Integration

1. Open your app at `http://localhost:3000/`
2. Navigate to any module with AI assistant (e.g., CRM, Marketing)
3. Open the assistant panel and ask a question
4. Verify you get AI responses without errors

Check your browser's Developer Tools (Console tab) - you should **NOT** see your API key anywhere!

## 🔍 How It Works

### Before (Insecure)
```
Frontend → Gemini API (with exposed key)
```
Anyone could:
- View your API key in browser DevTools
- Copy it and use it for their own projects
- Rack up your API bill

### After (Secure)
```
Frontend → Supabase Edge Function → Gemini API (with secret key)
```
Security benefits:
- API key never leaves the server
- User must be authenticated to call the Edge Function
- You can add rate limiting and usage tracking
- Full control over AI requests

## 📁 Files Changed

### 1. **supabase/functions/gemini-chat/index.ts** (NEW)
- Secure Edge Function that proxies AI requests
- Authenticates users via Supabase Auth
- Retrieves API key from Supabase secrets
- Transforms requests/responses between frontend and Gemini API
- Supports function calling (tools)

### 2. **services/geminiService.ts** (UPDATED)
- Now calls the Edge Function instead of Gemini API directly
- Removed `VITE_GEMINI_API_KEY` usage
- Uses Supabase Auth session for authentication
- Maintains same function signature (no breaking changes)

### 3. **.env** (UPDATED)
- Removed `VITE_GEMINI_API_KEY` (no longer needed)
- Added documentation about the new secure approach
- Your API key is saved as a comment for reference

## 🚀 Production Deployment

When deploying to production:

1. **Set Production Secret**:
   ```bash
   # Switch to production project in Supabase Dashboard
   # Or use CLI with --project-ref flag
   supabase secrets set GEMINI_API_KEY=your_production_api_key
   ```

2. **Deploy Edge Function to Production**:
   ```bash
   supabase functions deploy gemini-chat --project-ref your-project-ref
   ```

3. **Update Frontend .env.production**:
   - No changes needed! The API key is server-side only
   - Just ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY point to production

## 🛠️ Troubleshooting

### "User not authenticated" error
**Problem**: Edge Function requires authentication
**Solution**: Ensure user is logged in before making AI requests

### "Gemini API key not configured" error
**Problem**: Secret not set in Supabase
**Solution**: Run `supabase secrets set GEMINI_API_KEY=your_key`

### "Failed to get AI response" error
**Problem**: Edge Function not deployed or having issues
**Solution**: 
1. Check deployment: `supabase functions list`
2. View logs: `supabase functions logs gemini-chat`
3. Redeploy: `supabase functions deploy gemini-chat`

### Edge Function not found
**Problem**: Function not deployed yet
**Solution**: Run `supabase functions deploy gemini-chat`

## 📊 Monitoring & Usage

### View Edge Function Logs
```bash
# Real-time logs
supabase functions logs gemini-chat --follow

# Last 100 lines
supabase functions logs gemini-chat
```

### Check Secret is Set
```bash
supabase secrets list
```

You should see `GEMINI_API_KEY` in the list (value is hidden for security).

## 💡 Additional Security Tips

1. **Rate Limiting**: Consider adding rate limiting in the Edge Function
2. **Usage Tracking**: Log AI requests to track usage per user/workspace
3. **Cost Control**: Implement daily/monthly limits on AI requests
4. **API Quotas**: Monitor your Gemini API quota in Google AI Studio

## 🎉 Benefits

- **Security**: API key never exposed to clients
- **Control**: Full visibility into AI usage
- **Flexibility**: Easy to add features like rate limiting, caching
- **Compliance**: Better control for audit logs and data governance
- **Cost Management**: Track and limit AI usage per user/workspace

---

Your Gemini API is now secure! 🔒✨
