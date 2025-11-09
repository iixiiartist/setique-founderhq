# Groq AI Security Setup Guide

## Overview
Your Groq API key is **secured on the server-side** using a Supabase Edge Function. The API key is never exposed to the frontend or visible in browser developer tools.

## 🔒 Security Improvements
- ✅ API key stored as Supabase secret (server-side only)
- ✅ Frontend no longer has direct access to Groq API
- ✅ All AI requests authenticated via Supabase Auth
- ✅ Rate limiting and usage tracking possible
- ✅ No risk of API key theft or abuse

## 🚀 Why Groq?
- **Ultra-fast inference**: 10-100x faster than traditional models
- **Better rate limits**: 30 RPM vs 10 RPM (3x improvement)
- **Generous daily limits**: 14,400 RPD vs 250 RPD (57x improvement)
- **Advanced model**: Llama 3.1 70B with excellent function calling
- **Free tier**: Powerful enough for production use
- **LPU Technology**: Purpose-built Language Processing Units

## 📋 Deployment Steps

### Step 1: Get Your Groq API Key

1. Visit [https://console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll use it in the next step)

### Step 2: Set Your Groq API Key as a Supabase Secret

Run this command in your terminal (from the project root):

```bash
npx supabase secrets set GROQ_API_KEY=your_actual_groq_api_key_here
```

This stores your API key securely in Supabase's secret management system where only Edge Functions can access it.

### Step 3: Deploy the Groq Chat Edge Function

Deploy the Edge Function to Supabase:

```bash
npx supabase functions deploy groq-chat
```

You should see output confirming the deployment was successful.

### Step 4: Restart Your Dev Server

Restart your dev server to ensure all changes are picked up:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test the Integration

1. Open your app at `http://localhost:5173/` (or your configured port)
2. Navigate to any module with AI assistant (e.g., CRM, Marketing, Tasks)
3. Open the assistant panel and ask a question
4. Verify you get AI responses without errors

## ✅ Verification Checklist

- [ ] Groq API key obtained from console.groq.com
- [ ] API key set in Supabase secrets (`npx supabase secrets set GROQ_API_KEY=...`)
- [ ] Edge function deployed (`npx supabase functions deploy groq-chat`)
- [ ] Dev server restarted
- [ ] AI assistants responding correctly
- [ ] No errors in browser console
- [ ] No errors in Supabase Edge Function logs

## 📊 Rate Limits

Groq's free tier provides:
- **30 requests per minute** (RPM)
- **14,400 requests per day** (RPD)
- **Fast inference**: Typically 100-200 tokens/second

## 🔧 Troubleshooting

### AI Assistant Not Responding

1. **Check Edge Function Logs**:
   ```bash
   npx supabase functions logs groq-chat
   ```
   Look for errors or 401 (unauthorized) responses.

2. **Verify API Key**:
   - Ensure you set `GROQ_API_KEY` (not `GROK_API_KEY`)
   - Check the key is valid at console.groq.com
   - Redeploy if you updated the secret:
     ```bash
     npx supabase functions deploy groq-chat --no-verify-jwt
     ```

3. **Check Network**:
   - Open browser DevTools → Network tab
   - Look for requests to `/functions/v1/groq-chat`
   - Check for 400/401/500 errors

### Rate Limit Errors

If you see "Rate limit exceeded" errors:
- Groq's free tier: 30 RPM, 14,400 RPD
- The app includes automatic retry logic with exponential backoff
- Consider upgrading to Groq's paid tier if needed

### Function Call Failures

If AI asks questions but doesn't execute actions:
- Check browser console for errors
- Verify Supabase Auth is working (user must be logged in)
- Check Edge Function logs for function calling errors
- Ensure database permissions (RLS policies) allow the operations

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
│   (React)   │
└──────┬──────┘
       │ 1. User message
       ▼
┌─────────────────┐
│  groqService.ts │
│  (Frontend)     │
└──────┬──────────┘
       │ 2. Call Edge Function
       │    (includes auth token)
       ▼
┌──────────────────────┐
│  groq-chat Function  │
│  (Supabase Edge)     │
│  - Gets GROQ_API_KEY │
│  - Adds system msg   │
│  - Includes tools    │
└──────┬───────────────┘
       │ 3. API request
       ▼
┌────────────────┐
│   Groq API     │
│  (Llama 3.1)   │
└──────┬─────────┘
       │ 4. Response
       │    (text + function calls)
       ▼
┌──────────────────────┐
│  groq-chat Function  │
│  - Formats response  │
└──────┬───────────────┘
       │ 5. Return to frontend
       ▼
┌─────────────────┐
│  groqService.ts │
│  - Execute      │
│    function     │
│    calls        │
│  - Update UI    │
└─────────────────┘
```

## 📚 Function Calling

The AI has access to 19 functions across all modules:

**Tasks**: createTask, updateTask, deleteTask, getTasks, listTasks
**CRM**: createClient, updateClient, deleteClient, getClients
**Marketing**: createCampaign, updateCampaign, deleteCampaign
**Notes**: createNote, updateNote, deleteNote
**Dashboard**: getDashboardData, generateDailyBriefing
**Business**: getBusinessProfile, updateBusinessProfile

These allow the AI to:
- Create and manage tasks with due dates
- Add and update CRM contacts
- Create marketing campaigns
- Take notes
- Fetch business insights
- Generate daily briefings

## 🔐 Security Best Practices

1. **Never commit API keys**: API key only in Supabase secrets
2. **Use Supabase Auth**: All Edge Function calls require authentication
3. **Rate limiting**: Built into Groq's API + our usage tracking
4. **Minimal permissions**: Edge function only has access to what it needs
5. **Audit logs**: Check Supabase Edge Function logs regularly

## 📖 Additional Resources

- [Groq Documentation](https://console.groq.com/docs)
- [Groq API Reference](https://console.groq.com/docs/api-reference)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Llama 3.1 Model Card](https://www.llama.com/docs/model-cards-and-prompt-formats/meta-llama-3/)

## 🆘 Support

If you encounter issues:
1. Check this guide first
2. Review Edge Function logs
3. Test API key at console.groq.com
4. Check Supabase project status
5. Open an issue with logs and error messages
