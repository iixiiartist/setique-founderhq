# FounderHQ - Lightweight GTM Hub with AI

**Your focused workspace for go-to-market teams.** FounderHQ is a lightweight, AI-powered platform designed for founders, consultants, sales professionals, and small business owners who need to manage their entire GTM motion without the complexity of enterprise tools.

## 🎯 What is FounderHQ?

FounderHQ is a comprehensive yet lightweight platform that combines CRM, task management, AI assistants, marketing planning, and financial tracking in one focused workspace. Unlike bloated enterprise tools, FounderHQ gives you exactly what you need for GTM—nothing more, nothing less.

### Perfect For:
- **Founders** - Track investor relationships, manage product development, monitor business metrics
- **Consultants** - Manage multiple client projects, organize deliverables, client communications
- **Sales Professionals** - Track customer pipeline, manage follow-ups, close deals
- **Small Business Owners** - Day-to-day operations, expense tracking, team coordination

## ⚡ Key Features

### 🤝 3-in-1 CRM
Separate pipelines for your entire GTM ecosystem:
- **Investors Pipeline** - Track fundraising conversations, next steps, meeting history
- **Customers Pipeline** - Manage sales opportunities, deal values, customer relationships
- **Partners Pipeline** - Strategic partnerships, integration opportunities, co-marketing deals

### 🤖 AI Assistants for Every GTM Function
Context-aware AI assistants trained on your business profile and data:
- **Platform AI** - Technical guidance, feature prioritization, product roadmap
- **Fundraising AI** - Investor research, outreach emails, pitch deck feedback
- **Sales AI** - Proposal generation, deal strategies, customer insights
- **Partnerships AI** - Partnership opportunities, deal structuring, relationship management
- **Marketing AI** - Campaign planning, content ideas, strategy optimization
- **Financials AI** - Expense analysis, revenue forecasting, financial insights

### ✅ Smart Task Management
- Organize by category (Platform, Investor, Customer, Partner, Marketing, Ops)
- Assign to team members
- Priority tracking with XP rewards
- Gamification for motivation

### 📣 Marketing Planner
- Campaign planning and tracking
- Blog posts, newsletters, social media scheduling
- Status tracking (planned, in progress, published)
- Content calendar view

### 💰 Financial Dashboard
- Track MRR, GMV, signups, and expenses
- Visual trend analysis with interactive charts
- Burn rate monitoring
- Financial forecasting

### 📁 Smart Document Library
- Upload and organize files by module
- AI document analysis and chat
- Reference documents in AI conversations

### 📅 Unified Calendar
- All tasks, meetings, and deadlines in one view
- Filter by type and priority
- Integration with CRM meetings

### 👥 Team Collaboration
- Invite team members to workspace
- Assign tasks and CRM items
- Track team activity
- Role-based permissions

## 🚀 Features

### Core Functionality
- **🔐 User Authentication**: Secure signup/login with Supabase Auth
- **📊 Dashboard Overview**: Daily briefings with key metrics and action items
- **✅ Task Management**: Organize tasks across different business areas
- **👥 CRM System**: Manage investors, customers, and partners with contacts and meetings
- **📈 Marketing Management**: Track campaigns and content creation
- **💰 Financial Tracking**: Monitor MRR, GMV, and other key metrics
- **📁 Document Library**: Store and manage important files
- **🤖 AI Assistant**: Powered by Google Gemini for strategic insights
- **🏆 Achievements & Gamification**: Track progress and maintain motivation
- **📅 Calendar Integration**: View all tasks, meetings, and deadlines

### Production Features
- **🔒 Row-Level Security**: All data is securely isolated per user
- **⚡ Real-time Updates**: Powered by Supabase real-time subscriptions
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🛡️ Error Boundaries**: Graceful error handling and recovery
- **🚀 Performance Optimized**: Code splitting and lazy loading
- **🐳 Docker Support**: Containerized deployment ready
- **📝 Type Safety**: Full TypeScript support with strict types

## 🏗️ Tech Stack & Architecture

### Frontend
- **React 18.3** with TypeScript (strict mode)
- **Vite** for fast builds and HMR
- **Tailwind CSS** with neo-brutalist design system
- **Lucide React** for icons
- **Recharts** for data visualization
- **React Router** for navigation
- **React Hook Form** for form management

### Backend & Database
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **Row-Level Security (RLS)** for multi-tenant data isolation
- **Database Triggers** for automated workflows
- **Audit Logging** for compliance and security

### Architecture Highlights

#### Single Workspace Model
- Each user/team has ONE focused workspace (no workspace switching)
- Workspace owner + invited members collaboration
- All data workspace-scoped with RLS enforcement

#### Multi-Tenant Security
- Database-level RLS policies on all tables
- Helper function pattern: `is_workspace_member(workspace_id)`
- Automated audit logging for critical operations
- See [RLS Architecture](docs/RLS_ARCHITECTURE.md) for details

#### AI Integration
- **Google Gemini AI** (gemini-1.5-flash) for 6 specialized assistants
- Context-aware prompts with business profile integration
- Conversation history stored per workspace
- Streaming responses for real-time feedback

#### Subscription System
- **Stripe** integration for payments
- 3 tiers: Free, Power Individual ($10/mo), Team Pro ($25/mo base + $15/seat)
- Usage limits enforced at database and application level
- Webhook handling for subscription lifecycle

### DevOps & Monitoring
- **Netlify** for hosting and CI/CD
- **Sentry** for error tracking and performance monitoring
- **GitHub Actions** for automated daily database backups
- **Automated source maps** upload for debugging
- See [Sentry Setup Guide](docs/SENTRY_SETUP_GUIDE.md)

### Testing
- **Vitest** for unit tests (57 tests passing)
- **RLS policy tests** for security validation
- Environment validation at build time and runtime

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- Stripe account (test mode)
- Google Gemini API key (optional, for AI features)
- Sentry account (optional, for error tracking)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iixiiartist/setique-founderhq.git
   cd setique-founderhq
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Required
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_APP_URL=http://localhost:5173

   # Optional but recommended
   VITE_GEMINI_API_KEY=your-gemini-key
   VITE_SENTRY_DSN=https://...
   ```

4. **Set up the database**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Navigate to SQL Editor
   - Run migrations from `supabase/migrations/` in order (001, 002, etc.)
   - Migrations include tables, RLS policies, triggers, and functions

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to see the application.

**New Developer?** See [Developer Onboarding Guide](docs/ONBOARDING.md) for comprehensive setup instructions.

### Desktop Application

Want to run as a standalone desktop app? See [DESKTOP_APP_QUICKSTART.md](./DESKTOP_APP_QUICKSTART.md)

```bash
# Run as desktop app
npm run electron:dev

# Build installer
npm run electron:build:win  # or :mac or :linux
```

## 📖 Documentation

### For Developers
- **[Developer Onboarding](docs/ONBOARDING.md)** - Complete guide for new team members
- **[RLS Architecture](docs/RLS_ARCHITECTURE.md)** - Multi-tenant security patterns
- **[Sentry Setup](docs/SENTRY_SETUP_GUIDE.md)** - Error tracking configuration
- **[Audit Logging](docs/SUPABASE_AUDIT_LOGGING.md)** - Compliance and backup strategies

### Database
- **Schema**: All tables defined in `supabase/migrations/`
- **Security**: Row-Level Security (RLS) enabled on all tables
- **Migrations**: Version-controlled database changes

#### Key Tables
- `workspaces` - User workspaces (one per user)
- `workspace_members` - Team collaboration
- `profiles` - User profile data
- `tasks` - Task management
- `crm_items` - CRM pipeline (investors, customers, partners)
- `contacts` - Contact information
- `meetings` - Meeting records
- `marketing_items` - Marketing campaigns
- `financial_logs` - Financial metrics tracking
- `documents` - Document storage metadata
- `subscriptions` - Stripe subscription data
- `audit.operation_log` - Audit trail for compliance

## 🚀 Deployment

### Production (Netlify)
The application is automatically deployed to Netlify on push to `main`:

**Build Configuration:**
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18+

**Environment Variables (Required):**
```env
VITE_SUPABASE_URL=https://jffnzpdcmdalxqhkfymx.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=<your-live-key>
VITE_APP_URL=https://founderhq.netlify.app
VITE_GEMINI_API_KEY=<your-gemini-key>
VITE_SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-token>  # For source maps
SENTRY_ORG=setique
SENTRY_PROJECT=founderhq
```

**Automated Features:**
- ✅ Build validation (environment + TypeScript + ESLint)
- ✅ Sentry source maps upload
- ✅ Deploy previews for PRs
- ✅ Production deploys on merge to main

See [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md) for detailed instructions.

### Alternative: Docker
```bash
# Build image
docker build -t founderhq .

# Run container
docker run -p 5173:80 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_ANON_KEY=... \
  founderhq
```

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests (Vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run validate-env` - Validate environment variables

### Testing
```bash
# Run all tests
npm run test

# Watch mode for development
npm run test:watch

# RLS policy tests (requires Supabase connection)
npm run test:rls

# Coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ 57 unit tests passing
- ✅ RLS policy validation tests
- ✅ Environment validation tests

### Code Quality
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced on build
- **Prettier**: Consistent formatting
- **Vitest**: Unit testing framework

### Environment Variables

See `.env.example` for all available variables.

**Required (4):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (test or live)
- `VITE_APP_URL` - Application URL

**Important (7):**
- `VITE_GEMINI_API_KEY` - Google Gemini AI API key (for AI assistants)
- `VITE_STRIPE_PRICE_POWER_INDIVIDUAL` - Stripe price ID
- `VITE_STRIPE_PRICE_TEAM_PRO_BASE` - Stripe price ID
- `VITE_STRIPE_PRICE_TEAM_PRO_SEAT` - Stripe price ID
- `VITE_APP_NAME` - Application display name
- `VITE_APP_VERSION` - Version number
- `VITE_SENTRY_DSN` - Sentry error tracking DSN

**Build-time only:**
- `SENTRY_AUTH_TOKEN` - Sentry auth token (for source map uploads)
- `SENTRY_ORG` - Sentry organization slug
- `SENTRY_PROJECT` - Sentry project name
| `VITE_ENVIRONMENT` | Environment (dev/prod) | No |

## 🔒 Security

- **Authentication**: Powered by Supabase Auth with secure JWT tokens
- **Authorization**: Row Level Security ensures data isolation
- **API Security**: All API keys are properly scoped for client-side use
- **HTTPS**: Enforced in production with security headers
- **CSP**: Content Security Policy configured for XSS protection

## 🤝 Contributing

While this is a personal project, feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues:
1. Check the `DEPLOYMENT.md` for deployment help
2. Review the database schema in `supabase/schema.sql`
3. Open an issue on GitHub

---

Built with ❤️ for solo founders who need to stay organized and focused on what matters most.
