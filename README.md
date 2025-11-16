# FounderHQ

**A comprehensive platform for founders to manage their startup operations, fundraising, customer relationships, and go-to-market strategy.**

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

FounderHQ is a Setique tool designed specifically for startup founders and early-stage teams. It combines CRM functionality, task management, financial tracking, marketing campaign management, and AI-powered assistance into a single, integrated platform.

**Key Capabilities:**
- **CRM Management**: Track investors, customers, and partners with contact management and deal flow
- **Task & Project Management**: Organize work across products, services, marketing, and fundraising
- **Financial Dashboard**: Monitor MRR, burn rate, expenses, and revenue transactions
- **Marketing Campaigns**: Plan, execute, and measure campaign performance
- **AI Assistant**: Context-aware AI helper for each module (powered by Groq)
- **Document Library**: Centralized storage for pitch decks, case studies, and GTM materials
- **Team Collaboration**: Multi-user workspaces with role-based access control
- **Subscription Management**: Stripe-powered billing with tiered plans

---

## ✨ Features

### Business Operations
- Multi-workspace support with team collaboration
- Real-time data synchronization via Supabase
- Comprehensive business profile and onboarding flow
- Role-based permissions (Owner, Admin, Member)

### CRM & Sales
- Investor pipeline management with check size tracking
- Customer relationship tracking with deal values
- Partner opportunity management
- Contact management with meeting notes and follow-ups
- Deal flow tracking across multiple stages

### Financial Management
- Revenue transaction tracking
- Expense management and categorization
- Financial forecasting and budget planning
- MRR/ARR calculations and burn rate monitoring

### Marketing & Growth
- Campaign planning and execution
- Marketing attribution and ROI tracking
- Campaign analytics and performance metrics
- Calendar integration for campaign scheduling

### AI-Powered Features
- Context-aware AI assistant for each module
- Natural language task creation and management
- Automated insights and recommendations
- Function calling for direct data manipulation

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
supabase functions deploy groq-chat
supabase functions deploy stripe-webhook
```

Set Edge Function secrets via Supabase dashboard:
```bash
supabase secrets set GROQ_API_KEY=your-key-here
supabase secrets set STRIPE_SECRET_KEY=your-key-here
supabase secrets set STRIPE_WEBHOOK_SECRET=your-key-here
```

---

## 📁 Project Structure

```
setique-founderhq/
├── src/
│   ├── components/          # React components
│   │   ├── assistant/       # AI assistant UI
│   │   ├── crm/            # CRM modules
│   │   ├── financials/     # Financial dashboards
│   │   ├── marketing/      # Marketing tools
│   │   ├── shared/         # Reusable components
│   │   └── ui/             # Base UI components
│   ├── contexts/           # React contexts (Auth, Workspace)
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── config/         # Configuration & env validation
│   │   ├── services/       # Business logic & API clients
│   │   └── utils/          # Utility functions
│   ├── services/           # Domain services
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   └── migrations/         # Database migrations
├── scripts/                # Build & utility scripts
├── tests/                  # Test suites
├── electron/               # Electron app configuration
├── public/                 # Static assets
├── .env.example            # Environment variable template
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── README.md              # This file
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
