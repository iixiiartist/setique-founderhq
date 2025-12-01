# FounderHQ

**The AI-powered GTM workspace. CRM, pipeline, marketing, email, documents, calendar, financials, and team chat—unified for teams that scale.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.80-3ecf8e.svg)](https://supabase.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Installation](#installation)
  - [Development](#development)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## 🎯 Overview

FounderHQ is a complete GTM (Go-to-Market) workspace that replaces 10+ tools with one AI-powered platform. Built for founders, sales teams, and GTM consultants who want to stop juggling disconnected apps and start scaling.

**What FounderHQ Replaces:**
- **CRM**: HubSpot, Pipedrive, Salesforce
- **Team Chat**: Slack, Microsoft Teams
- **Task Management**: Asana, Monday.com
- **Documents & Wikis**: Notion, Google Docs
- **Email Client**: Gmail, Outlook
- **Calendar**: Google Calendar, Calendly
- **Expense Tracking**: Expensify, QuickBooks
- **AI Tools**: ChatGPT, various point solutions

**Key Capabilities:**
- **CRM & Pipeline**: Manage leads, contacts, accounts, and deals with AI-powered insights
- **Huddle Team Chat**: Real-time messaging with AI assistance, file sharing, and threaded conversations
- **Marketing & Campaigns**: Plan campaigns, generate content with AI, track outreach and attribution
- **Email & Outreach**: Integrated email with AI-drafted responses, templates, and automatic CRM logging
- **Documents & Files**: Centralized document hub with smart search, version control, and AI summaries
- **Calendar & Scheduling**: Unified calendar for meetings, deadlines, and follow-ups
- **Financial Tracking**: Log expenses, track revenue, monitor cash flow with AI auto-categorization
- **Analytics & Reports**: AI-generated insights, customizable dashboards, and strategic forecasts
- **AI Research Agents**: Specialized agents for market research, competitive analysis, and deal strategy
- **AI Content Creation**: Generate emails, proposals, marketing copy—all trained on your business context
- **Task Management**: Organize work with AI-powered task creation, automation, and tracking
- **Team Collaboration**: Multi-user workspaces with role-based access control

---

## ✨ Features

### Complete GTM Toolkit

| Feature | Description |
|---------|-------------|
| **CRM & Pipeline** | Full contact, account, and deal management with custom fields, stages, and AI insights |
| **Huddle Chat** | Real-time team messaging with AI assistant, file sharing, threads, and reactions |
| **Marketing Hub** | Campaign planning, content calendar, outreach tracking, and ROI analytics |
| **Email Integration** | Gmail sync, AI-drafted responses, templates, and automatic CRM activity logging |
| **Document Library** | Centralized storage for pitch decks, proposals, contracts with smart search |
| **Calendar** | Unified view of meetings, deadlines, follow-ups, and team schedules |
| **Financials** | Expense logging, revenue tracking, cash flow monitoring, budget planning |
| **Analytics** | Custom dashboards, sales forecasts, pipeline reports, and AI recommendations |
| **Tasks** | Project and task management with AI creation, assignments, and automation |

### AI Throughout Every Workflow

AI isn't just a chatbot—it's woven into every feature:

- **Content Creation**: Generate emails, proposals, marketing copy, and more
- **Strategic Insights**: AI-powered forecasts, deal scoring, and next-step suggestions
- **Smart Data Entry**: Auto-create contacts, log expenses, and update records via natural language
- **Market Research**: Research prospects, competitors, and market trends with AI agents
- **Task Automation**: Auto-assign tasks, set reminders, and track workflows
- **Deal Intelligence**: Pipeline analysis, risk identification, and strategy recommendations

### AI Research Agents

Specialized agents powered by You.com API with SSE streaming:

- **Research & Briefing Agent**: Deep-dive company research, ICP analysis, competitive intelligence
- **Why Now Agent**: Timing signals, buying triggers, and outreach recommendations  
- **Deal Strategist Agent**: CRM-to-strategy analysis, pipeline risks, and next moves
- Report saving, HTML/PDF export, and file library integration

### Business Operations

- Multi-workspace support with team collaboration
- Real-time data synchronization via Supabase
- Comprehensive business profile and onboarding flow
- Role-based permissions (Owner, Admin, Member)
- Stripe-powered subscription management with tiered plans

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - UI framework
- **TypeScript 5.7** - Type safety
- **Vite 6.0** - Build tool and dev server
- **TailwindCSS** - Utility-first styling
- **React Query** - Server state management
- **React Router** - Client-side routing
- **Tiptap** - Rich text editor

### Backend & Infrastructure
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Row-level security (RLS)
  - Edge Functions (Deno)
  - Real-time subscriptions
  - Authentication & authorization
- **Stripe** - Payment processing
- **Groq** - AI inference (via Edge Functions)
- **You.com Agents API** - Custom AI research agents with SSE streaming

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **Electron** - Desktop app packaging (optional)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0 (LTS recommended)
- **npm** >= 9.0.0 or **yarn** >= 1.22.0
- **Git** for version control
- **Supabase Account** (free tier available at [supabase.com](https://supabase.com))
- **Stripe Account** (for payment features)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/iixiiartist/setique-founderhq.git
   cd setique-founderhq
   ```

2. **Copy environment template**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**

   Edit `.env` with your configuration:

   ```bash
   # Supabase Configuration (REQUIRED)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

   # Application Configuration (REQUIRED)
   VITE_APP_URL=http://localhost:3000
   VITE_APP_NAME=FounderHQ
   VITE_APP_VERSION=1.0.0
   VITE_ENVIRONMENT=development

   # Stripe Configuration (REQUIRED for payments)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
   VITE_STRIPE_PRICE_POWER_INDIVIDUAL=price_xxx
   VITE_STRIPE_PRICE_TEAM_PRO_BASE=price_xxx
   VITE_STRIPE_PRICE_TEAM_PRO_SEAT=price_xxx

   # AI Configuration (OPTIONAL)
   VITE_GROQ_ENABLED=true
   VITE_GROQ_MODEL=llama-3.3-70b-versatile

   # Monitoring (OPTIONAL)
   VITE_SENTRY_DSN=https://your-sentry-dsn
   ```

   **Important Notes:**
   - Get Supabase credentials from your [Supabase dashboard](https://app.supabase.com)
   - Stripe keys are required for subscription features to work
   - GROQ API key is configured server-side in Supabase secrets (not in .env)
   - Use `pk_test_` Stripe keys for development, `pk_live_` for production

4. **Set up Supabase database**
   
   Run migrations to create required tables:
   ```bash
   npm run generate-types  # Generate TypeScript types from schema
   ```

   Apply database migrations via Supabase dashboard or CLI.

   **Structured block storage bucket:**

   - Run `create_doc_block_assets_bucket.sql` for each environment (dev/staging/prod) to provision the `doc-block-assets` bucket Supabase Storage uses for signature PNGs.
   - Follow the step-by-step guide in [`DOC_BLOCK_ASSETS_BUCKET_SETUP.md`](DOC_BLOCK_ASSETS_BUCKET_SETUP.md) for CLI commands, validation queries, and troubleshooting tips.

### Installation

Install project dependencies:

```bash
npm install
```

This will install all required packages including:
- Runtime dependencies (React, Supabase client, Stripe, etc.)
- Development tools (TypeScript, Vite, testing frameworks)

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

**Development Features:**
- Hot module replacement (HMR)
- TypeScript type checking
- Environment variable validation
- Source maps for debugging

**Additional Commands:**
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix linting issues
npm run type-check    # Run TypeScript type checking
npm test             # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:e2e     # Run E2E tests
```

---

## 🏗️ Building for Production

### Web Build

Build the production-ready application:

```bash
npm run build
```

This command will:
1. ✅ Validate all required environment variables
2. 🔨 Compile TypeScript to JavaScript
3. 📦 Bundle and optimize assets
4. 🗜️ Minify code and remove dead code
5. 📁 Output to `dist/` directory

**Preview production build locally:**
```bash
npm run preview
```

**Skip environment validation** (for CI/CD):
```bash
npm run build:skip-validation
```

### Electron Desktop Build

Build cross-platform desktop applications:

```bash
# Build for your current platform
npm run electron:build

# Platform-specific builds
npm run electron:build:win     # Windows
npm run electron:build:mac     # macOS
npm run electron:build:linux   # Linux
```

Output files will be in the `release/` directory.

---

## 🚢 Deployment

### Netlify (Recommended for Web)

1. **Connect repository** to Netlify
2. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Set environment variables** in Netlify dashboard
4. **Deploy**

### Vercel

1. **Import project** to Vercel
2. **Configure:**
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Add environment variables**
4. **Deploy**

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t founderhq .

# Run container
docker run -p 80:80 founderhq
```

Or use docker-compose:

```bash
docker-compose up -d
```

### Edge Functions (Supabase)

Deploy Edge Functions separately:

```bash
cd supabase/functions

# AI Chat assistant
supabase functions deploy groq-chat

# AI Research Agents (with streaming support)
supabase functions deploy you-agent-run --no-verify-jwt

# Payment webhooks
supabase functions deploy stripe-webhook
```

Set Edge Function secrets via Supabase dashboard or CLI:
```bash
supabase secrets set GROQ_API_KEY=your-key-here
supabase secrets set YOUCOM_API_KEY=your-you-com-api-key
supabase secrets set STRIPE_SECRET_KEY=your-key-here
supabase secrets set STRIPE_WEBHOOK_SECRET=your-key-here
```

---

## 📁 Project Structure

```
setique-founderhq/
├── components/
│   ├── agents/              # AI Research Agents (Research, Why Now, Deal Strategist)
│   ├── assistant/           # AI Assistant UI and chat interface
│   ├── auth/                # Authentication components
│   ├── business-profile/    # Business profile setup and onboarding
│   ├── calendar/            # Calendar and scheduling
│   ├── crm/                 # CRM modules (contacts, accounts, pipeline)
│   ├── dashboard/           # Main dashboard widgets and views
│   ├── documents/           # Document editor and library
│   ├── email/               # Email integration and composer
│   ├── files/               # File library and management
│   ├── financials/          # Financial tracking (expenses, revenue)
│   ├── forms/               # Form builder and responses
│   ├── huddle/              # Team chat (Huddle) components
│   ├── landing/             # Landing page sections
│   ├── marketing/           # Marketing campaigns and analytics
│   ├── notifications/       # Notification system
│   ├── reporting/           # Reports and analytics
│   ├── settings/            # User and workspace settings
│   ├── shared/              # Reusable shared components
│   ├── tasks/               # Task management
│   ├── team/                # Team management and invites
│   ├── ui/                  # Base UI components
│   └── workspace/           # Workspace management
├── contexts/                # React contexts (Auth, Workspace, Notifications)
├── hooks/                   # Custom React hooks
├── lib/
│   ├── config/              # Configuration & env validation
│   ├── services/            # Business logic & API clients
│   └── utils/               # Utility functions
├── services/                # Domain services
├── types/                   # TypeScript type definitions
├── supabase/
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── groq-chat/       # AI chat assistant
│   │   ├── you-agent-run/   # AI research agents
│   │   └── stripe-webhook/  # Payment webhooks
│   └── migrations/          # Database migrations
├── scripts/                 # Build & utility scripts
├── tests/                   # Test suites
├── electron/                # Electron desktop app configuration
├── public/                  # Static assets
├── App.tsx                  # Main app component with routing
├── DashboardApp.tsx         # Dashboard layout and tab navigation
├── .env.example             # Environment variable template
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── README.md                # This file
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with clear commit messages
4. **Run tests** (`npm test`)
5. **Submit a pull request**

**Code Style:**
- Follow existing code patterns
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Run `npm run lint:fix` before committing

---

## 🔧 Troubleshooting

### Common Issues

**❌ "Missing required environment variable: VITE_SUPABASE_URL"**
- Ensure `.env` file exists and contains all required variables
- Copy from `.env.example`: `cp .env.example .env`
- Restart dev server after updating `.env`

**❌ "Module not found: @supabase/supabase-js"**
- Run `npm install` to ensure all dependencies are installed
- Check that `node_modules/` directory exists
- Try deleting `node_modules/` and running `npm install` again

**❌ "Database connection failed"**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase project is not paused (free tier limit)
- Ensure database migrations have been applied

**❌ "AI assistant not working"**
- Verify Edge Function `groq-chat` is deployed
- Check `GROQ_API_KEY` is set in Supabase secrets
- Ensure workspace has AI usage quota remaining

**❌ "AI Agents timing out or returning 504"**
- Ensure `you-agent-run` Edge Function is deployed with latest streaming support
- Check `YOUCOM_API_KEY` is set in Supabase secrets
- Try a more specific query (e.g., company name instead of broad market segment)
- The agents use SSE streaming to prevent timeouts on long-running research

**❌ "Payment features not working"**
- Verify Stripe publishable key is set
- Check Stripe webhook is configured correctly
- Ensure Stripe price IDs match your Stripe products

### Build Issues

**TypeScript errors:**
```bash
npm run type-check  # Check for type errors
```

**Dependency conflicts:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Environment validation fails:**
```bash
node scripts/validate-env.js  # Test env validation
```

### Getting Help

- **Documentation**: Check inline code comments and JSDoc
- **GitHub Issues**: [Report bugs or request features](https://github.com/iixiiartist/setique-founderhq/issues)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

## 📄 License

This project is proprietary software developed by Setique. All rights reserved.

For licensing inquiries, contact: [licensing@setique.com](mailto:licensing@setique.com)

---

## 🙏 Acknowledgments

Built with:
- [React](https://reactjs.org/) - UI framework
- [Supabase](https://supabase.com/) - Backend platform
- [Stripe](https://stripe.com/) - Payment processing
- [Groq](https://groq.com/) - AI inference
- [Vite](https://vitejs.dev/) - Build tool

---

**Made with ❤️ by Setique**
