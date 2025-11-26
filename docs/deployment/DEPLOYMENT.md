# Setique Founder Dashboard - Deployment Guide

## Prerequisites

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > Database and copy your connection string
3. Go to Settings > API and copy your URL and anon key
4. In the SQL editor, run the contents of `supabase/schema.sql`

### 2. Groq AI Setup (server-side)
1. Groq API keys must be stored server-side as Supabase secrets.
2. Set your Groq API key in Supabase: `npx supabase secrets set GROQ_API_KEY=your_key`
3. Optionally pin a model with the `GROQ_MODEL` secret (e.g. `llama-3.3-70b-versatile`)

## Local Development

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in your environment variables (frontend):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GROQ_ENABLED=true        # optional - toggles UI exposure of Groq features
   VITE_GROQ_MODEL=llama-3.3-70b-versatile  # optional - pins a model for local dev
   ```
4. Install dependencies: `npm install`
5. Start development server: `npm run dev`

## Production Deployment

### Option 1: Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard (frontend-only vars):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ENVIRONMENT=production`
   - (optional) `VITE_GROQ_ENABLED` / `VITE_GROQ_MODEL`

Note: The Groq API key (GROQ_API_KEY) must be stored as a Supabase secret and is not a client-side variable.
3. Deploy

### Option 2: Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Set environment variables in Netlify dashboard
5. Deploy

### Option 3: Docker

1. Build the Docker image: `docker build -t setique-dashboard .`
2. Run the container: `docker run -p 3000:3000 setique-dashboard`

### Option 4: Traditional VPS

1. Build the application: `npm run build`
2. Upload the `dist` folder to your server
3. Configure your web server (nginx/apache) to serve the static files
4. Set up SSL certificate

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GROQ_ENABLED` | Feature flag to expose Groq assistant UI | No |
| `VITE_GROQ_MODEL` | Optional pinned Groq model for local dev | No |
| `GROQ_API_KEY` (server-side) | Groq API key stored in Supabase secrets | Yes (server)
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_ENVIRONMENT` | Environment (development/production) | No |
| `VITE_APP_NAME` | Application name | No |
| `VITE_APP_VERSION` | Application version | No |
| `VITE_ANALYTICS_ID` | Analytics tracking ID | No |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | No |

## Post-Deployment Checklist

- [ ] Test user registration and login
- [ ] Verify all dashboard features work
- [ ] Test AI assistant functionality
- [ ] Check mobile responsiveness
- [ ] Verify error handling
- [ ] Test data persistence
- [ ] Check performance metrics
- [ ] Set up monitoring and alerts

## Monitoring

Consider setting up:
- Error tracking (Sentry)
- Analytics (Google Analytics, Plausible)
- Uptime monitoring
- Performance monitoring

## Security

- All data is secured with Supabase Row Level Security (RLS)
- API keys are properly configured for client-side use
- Authentication is handled by Supabase Auth
- All user data is isolated per account