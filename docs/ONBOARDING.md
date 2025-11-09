# Developer Onboarding Guide

Welcome to **FounderHQ**! This guide will help you get up to speed with the codebase, architecture, and development workflow.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Key Concepts](#key-concepts)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Deployment Process](#deployment-process)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

---

## Overview

**FounderHQ** is a lightweight, AI-powered GTM (Go-To-Market) platform designed for founders, consultants, sales professionals, and small business owners. It combines CRM, task management, AI assistants, marketing planning, and financial tracking in one focused workspace.

### What Makes FounderHQ Different?

- **Lightweight**: No enterprise bloat—only the features GTM teams need
- **AI-Powered**: 6 specialized AI assistants (Platform, Fundraising, Sales, Partnerships, Marketing, Financials)
- **Multi-Pipeline CRM**: Separate pipelines for Investors, Customers, and Partners
- **Gamification**: XP rewards and achievements for task completion
- **Single Workspace Model**: Each user/team has one focused workspace (no workspace switching)

### Product Philosophy

1. **Simplicity Over Features**: Better to do 10 things great than 100 things poorly
2. **GTM-Focused**: Every feature serves go-to-market needs
3. **AI-First**: AI should enhance productivity, not complicate it
4. **Privacy-First**: User data security and privacy are paramount

---

## Tech Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite** for fast builds and HMR
- **TailwindCSS** for styling
- **Lucide React** for icons
- **Recharts** for data visualization
- **React Router** for navigation
- **React Hook Form** for form management

### Backend & Database
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **Row-Level Security (RLS)** for multi-tenant data isolation
- **Database Functions** for complex business logic
- **Triggers** for automated workflows

### AI & Integrations
- **Groq AI** (Llama 3.1 70B) for AI assistants
- **Stripe** for subscription payments
- **Sentry** for error tracking and performance monitoring

### DevOps & Tools
- **Netlify** for hosting and CI/CD
- **GitHub Actions** for automated backups
- **Vitest** for unit testing
- **ESLint + Prettier** for code quality

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Git** for version control
- **Supabase** account (free tier works)
- **Stripe** account (test mode)
- **Sentry** account (optional, for error tracking)

### Initial Setup

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

   Edit `.env.local` with your credentials:
   ```env
   # Required
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_APP_URL=http://localhost:5173

   # Optional but recommended
   VITE_SENTRY_DSN=https://...
   
   # Note: Groq API key is server-side (set via Supabase secrets)
   # npx supabase secrets set GROQ_API_KEY=your-groq-key
   ```

4. **Set up Supabase database**
   
   Navigate to your Supabase project → SQL Editor and run migrations in order:
   ```bash
   # Run migrations from supabase/migrations/ in order
   # Start with 001_initial_schema.sql
   # Then 002_add_workspace_team_schema.sql
   # Continue through all numbered migrations
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:5173` and create an account!

### Verify Setup

1. ✅ Can create an account and log in
2. ✅ Can create tasks and see them in the UI
3. ✅ Can create CRM items (test Investors/Customers/Partners pipelines)
4. ✅ AI chat works (requires GROQ_API_KEY in Supabase secrets)
5. ✅ No console errors related to environment variables

---

## Project Architecture

### Directory Structure

```
founderhq/
├── docs/                          # Documentation
│   ├── ONBOARDING.md             # This file
│   ├── RLS_ARCHITECTURE.md       # Database security patterns
│   ├── SENTRY_SETUP_GUIDE.md     # Error tracking setup
│   └── SUPABASE_AUDIT_LOGGING.md # Audit log system
│
├── src/
│   ├── components/               # React components
│   │   ├── Calendar.tsx          # Task calendar view
│   │   ├── CRM.tsx              # CRM pipelines
│   │   ├── Tasks.tsx            # Task management
│   │   ├── Marketing.tsx        # Marketing planner
│   │   ├── Financial.tsx        # Financial dashboard
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── supabaseClient.ts    # Supabase initialization
│   │   ├── config/
│   │   │   └── env.ts           # Environment validation
│   │   ├── hooks/
│   │   │   ├── useWorkspace.ts  # Workspace management
│   │   │   ├── useTasks.ts      # Task CRUD operations
│   │   │   └── ...
│   │   └── utils/
│   │       ├── aiHelpers.ts     # AI integration utilities
│   │       └── subscriptionConstants.ts
│   │
│   ├── types/                   # TypeScript type definitions
│   ├── App.tsx                  # Main app component
│   └── main.tsx                 # Entry point
│
├── supabase/
│   └── migrations/              # Database migrations
│       ├── 001_initial_schema.sql
│       ├── 002_add_workspace_team_schema.sql
│       └── ...
│
├── tests/                       # Test files
│   ├── rls/                    # RLS policy tests
│   │   └── tasks.test.ts
│   └── unit/                   # Unit tests
│
├── scripts/
│   └── validate-env.js         # Build-time env validation
│
├── .github/
│   └── workflows/
│       └── backup-database.yml # Automated DB backups
│
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # TailwindCSS configuration
└── package.json                # Dependencies
```

### Key Modules

#### **Workspace Management** (`lib/hooks/useWorkspace.ts`)
- Single workspace per user model
- Automatic workspace creation on signup
- Owner + invited member roles
- Workspace-scoped data isolation

#### **Authentication** (`lib/supabaseClient.ts`)
- Supabase Auth with email/password
- Email confirmation required (SMTP configured)
- Session management with token refresh
- Admin bypass for testing

#### **CRM System** (`components/CRM.tsx`)
- Three separate pipelines: Investors, Customers, Partners
- Kanban board view with drag-and-drop
- Pipeline stages: Lead → Qualified → Proposal → Negotiation → Won/Lost
- Deal value tracking for Customers pipeline

#### **AI Assistants** (`lib/utils/aiHelpers.ts`)
- 6 specialized assistants with context-aware prompts
- Business profile integration for personalized responses
- Conversation history stored per workspace
- Llama 3.1 70B via Groq for ultra-fast inference (10-100x faster)

#### **Task Management** (`components/Tasks.tsx`)
- Category-based organization (Platform, Investor, Customer, Partner, Marketing, Ops)
- Priority levels (Low, Medium, High, Critical)
- Team member assignment
- XP rewards and gamification
- Calendar view integration

#### **Marketing Planner** (`components/Marketing.tsx`)
- Campaign planning and tracking
- Content types: Blog, Newsletter, Social Media, Campaign
- Publication scheduling with time tracking
- Status workflow: Planned → In Progress → Published

#### **Financial Dashboard** (`components/Financial.tsx`)
- MRR, GMV, Signups, and Expenses tracking
- Visual trend analysis with Recharts
- Burn rate monitoring
- CSV export functionality

---

## Key Concepts

### 1. Single Workspace Model

**Why?** Most small teams don't need multiple workspaces—they need ONE focused workspace.

**How it works:**
- Each user gets ONE workspace (auto-created on signup)
- Workspace owner can invite team members via email
- All data (tasks, CRM, marketing, etc.) is workspace-scoped
- RLS policies enforce data isolation between workspaces

**Database Schema:**
```sql
-- workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  -- One workspace per user enforced by unique constraint
  UNIQUE(owner_id)
);

-- workspace_members table (for team collaboration)
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces,
  user_id UUID REFERENCES auth.users,
  role TEXT CHECK (role IN ('owner', 'member')),
  PRIMARY KEY (workspace_id, user_id)
);
```

### 2. Row-Level Security (RLS)

**Why?** Multi-tenant security—users should ONLY see their workspace's data.

**Pattern:**
```sql
-- Helper function (SECURITY DEFINER to avoid recursion)
CREATE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces WHERE id = workspace_uuid AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all content tables
CREATE POLICY "workspace_members_select_tasks"
ON tasks FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));
```

**See:** `docs/RLS_ARCHITECTURE.md` for comprehensive RLS patterns.

### 3. Subscription Plans

**Tiers:**
- **Free** (0/month): 1 user, 3 CRM items, 10 tasks, 5 marketing items
- **Power Individual** ($10/month): 1 user, unlimited everything
- **Team Pro** ($25/month base + $15/seat): Unlimited users, unlimited everything

**Implementation:**
- Stripe Checkout for payments
- Supabase `subscriptions` table tracks plan and limits
- Frontend checks limits before allowing creation
- Backend RLS policies enforce limits (defense in depth)

**Limits Enforcement:**
```typescript
// Frontend check (user-friendly)
if (tasks.length >= workspace.task_limit) {
  toast.error("Task limit reached. Upgrade to create more.");
  return;
}

// Backend check (security)
CREATE POLICY "enforce_task_limit" ON tasks
FOR INSERT WITH CHECK (
  (SELECT COUNT(*) FROM tasks WHERE workspace_id = NEW.workspace_id) 
  < (SELECT task_limit FROM subscriptions WHERE workspace_id = NEW.workspace_id)
);
```

### 4. AI Context Loading

**How AI assistants work:**
1. User selects an AI assistant (e.g., "Sales AI")
2. System loads business profile from database
3. Constructs context prompt with business details
4. Sends user message + context to Groq API (via Supabase Edge Function)
5. Streams response back to UI

**Context Structure:**
```typescript
const systemPrompt = `
You are the ${aiType} AI assistant for FounderHQ.

Business Context:
- Company: ${businessName}
- Industry: ${industry}
- Stage: ${stage}
- Target Market: ${targetMarket}
- ...

Your role: ${roleDescription}
Guidelines: ${guidelines}
`;
```

**See:** `lib/utils/aiHelpers.ts` for full implementation.

### 5. Gamification System

**Mechanics:**
- Complete tasks → Earn XP
- XP based on priority: Low=5, Medium=10, High=20, Critical=50
- Level up at XP thresholds: [100, 250, 500, 1000, 2000, ...]
- Achievements unlock at milestones (10 tasks, 50 tasks, etc.)

**Visual Feedback:**
- XP bar with animated progress
- Level badges
- Achievement notifications
- Leaderboard (future feature)

---

## Development Workflow

### Branch Strategy

- **main**: Production-ready code (protected)
- **dev**: Active development (auto-deploys to staging)
- **feature/xyz**: Feature branches (PR to dev)
- **fix/xyz**: Bug fix branches (PR to dev or main)

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/new-crm-filter
   ```

2. **Make your changes**
   - Write code following existing patterns
   - Add TypeScript types for new data structures
   - Update components using existing UI patterns

3. **Test locally**
   ```bash
   npm run dev
   # Manually test the feature
   npm run test  # Run unit tests
   ```

4. **Commit with descriptive message**
   ```bash
   git add .
   git commit -m "Add CRM filter by stage and date range"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/new-crm-filter
   # Create PR on GitHub with description
   ```

6. **Code review and merge**
   - Address review feedback
   - Squash merge to dev or main

### Code Style

- **TypeScript**: Strict mode enabled, avoid `any` types
- **Components**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Imports**: Absolute imports for `lib/`, relative for same directory
- **Comments**: Explain "why", not "what"

**Example:**
```typescript
// ✅ Good
interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ❌ Bad
interface Task {
  id: any;  // Too vague
  title: string;
  priority: string;  // Should be union type
}
```

### Database Changes

**Always use migrations!** Never edit the database directly in production.

1. **Create migration file**
   ```bash
   # Name with timestamp: YYYYMMDDHHMMSS_description.sql
   touch supabase/migrations/20251108120000_add_task_tags.sql
   ```

2. **Write idempotent SQL**
   ```sql
   -- Add tags column if it doesn't exist
   DO $$ 
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'tasks' AND column_name = 'tags'
     ) THEN
       ALTER TABLE tasks ADD COLUMN tags TEXT[];
     END IF;
   END $$;
   ```

3. **Test in local Supabase**
   ```bash
   # Run migration in Supabase SQL Editor
   # Verify no errors
   ```

4. **Apply to production**
   - Run in production Supabase SQL Editor
   - Document in migration README
   - Commit migration file to repo

---

## Testing Strategy

### Unit Tests (Vitest)

**Run tests:**
```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Example test:**
```typescript
// tests/unit/taskHelpers.test.ts
import { describe, it, expect } from 'vitest';
import { calculateXP } from '@/lib/utils/taskHelpers';

describe('calculateXP', () => {
  it('returns correct XP for each priority', () => {
    expect(calculateXP('low')).toBe(5);
    expect(calculateXP('medium')).toBe(10);
    expect(calculateXP('high')).toBe(20);
    expect(calculateXP('critical')).toBe(50);
  });
});
```

### RLS Policy Tests

**Run RLS tests:**
```bash
npm run test:rls
```

**What they test:**
- Users can only see their workspace's data
- Non-members cannot access other workspaces
- Workspace owners can manage members
- Invited members have correct permissions

**See:** `tests/rls/tasks.test.ts` for examples.

### Manual Testing Checklist

Before pushing to production:

- [ ] Test signup flow (new user account creation)
- [ ] Test login with correct/incorrect credentials
- [ ] Test workspace creation (auto-created on signup)
- [ ] Test task creation, editing, deletion
- [ ] Test CRM operations across all 3 pipelines
- [ ] Test marketing campaign creation with dates
- [ ] Test financial log creation and chart rendering
- [ ] Test AI chat with all 6 assistants
- [ ] Test team member invitation
- [ ] Test subscription upgrade/downgrade
- [ ] Test mobile responsiveness
- [ ] Check browser console for errors
- [ ] Test in Chrome, Firefox, Safari (if possible)

---

## Deployment Process

### Netlify (Production)

**Automatic Deployments:**
- Push to `main` → Deploys to production
- Every PR → Creates preview deploy
- Build command: `npm run build`
- Publish directory: `dist`

**Environment Variables** (Netlify Dashboard):
```
VITE_SUPABASE_URL=https://jffnzpdcmdalxqhkfymx.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=<your-publishable-key>
VITE_APP_URL=https://founderhq.netlify.app
VITE_SENTRY_DSN=<your-sentry-dsn>

# Groq API key is server-side (set via Supabase secrets)
# npx supabase secrets set GROQ_API_KEY=<your-groq-key>

# Build-time only (for source maps)
SENTRY_AUTH_TOKEN=<your-sentry-token>
SENTRY_ORG=setique
SENTRY_PROJECT=founderhq
```

**Build Validation:**
- Environment validation runs on build (`scripts/validate-env.js`)
- TypeScript compilation must pass
- ESLint errors block build
- Sentry source maps uploaded automatically

### Supabase (Database)

**Production database:**
- Project: `jffnzpdcmdalxqhkfymx`
- Region: US East
- Plan: Free (upgrade when needed)

**Making Database Changes:**
1. Test migration locally
2. Run in production SQL Editor
3. Monitor for errors in Supabase logs
4. Verify data integrity

**Backups:**
- Automated daily backups via GitHub Actions (2 AM UTC)
- Supabase built-in backups (7 days retention)
- Manual backup before major changes

**See:** `docs/SUPABASE_AUDIT_LOGGING.md` for backup procedures.

### Monitoring

**Sentry** (Error Tracking):
- Real-time error notifications
- Source-mapped stack traces
- Performance monitoring (10% sample rate)
- Session replay on errors

**Supabase** (Database):
- Query performance in dashboard
- Connection pool usage
- Storage usage
- Auth activity logs

**Netlify** (Frontend):
- Build logs
- Deploy previews
- Function logs (if using)
- Bandwidth usage

---

## Common Tasks

### Adding a New Feature Module

**Example: Adding a "Goals" feature**

1. **Create component**
   ```bash
   # Create src/components/Goals.tsx
   ```

2. **Add database table**
   ```sql
   -- supabase/migrations/20251108120000_add_goals.sql
   CREATE TABLE goals (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     workspace_id UUID REFERENCES workspaces NOT NULL,
     title TEXT NOT NULL,
     target_value NUMERIC,
     current_value NUMERIC DEFAULT 0,
     deadline DATE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Add RLS policies
   CREATE POLICY "workspace_members_can_view_goals"
   ON goals FOR SELECT TO authenticated
   USING (is_workspace_member(workspace_id));
   -- ... (INSERT, UPDATE, DELETE policies)
   ```

3. **Create custom hook**
   ```typescript
   // src/lib/hooks/useGoals.ts
   export function useGoals() {
     const { workspace } = useWorkspace();
     
     const { data: goals, isLoading } = useQuery({
       queryKey: ['goals', workspace?.id],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('goals')
           .select('*')
           .eq('workspace_id', workspace.id)
           .order('created_at', { ascending: false });
         if (error) throw error;
         return data;
       },
     });

     return { goals, isLoading };
   }
   ```

4. **Add to navigation**
   ```typescript
   // src/App.tsx
   import Goals from './components/Goals';
   
   // Add route
   <Route path="/goals" element={<Goals />} />
   ```

5. **Test and deploy**
   - Test locally
   - Write unit tests
   - Create PR
   - Deploy to production

### Updating Subscription Plans

**Example: Adding a new plan tier**

1. **Create Stripe product and price**
   - Stripe Dashboard → Products → Add Product
   - Note the price ID (e.g., `price_xyz123`)

2. **Update constants**
   ```typescript
   // src/lib/utils/subscriptionConstants.ts
   export const STRIPE_PRICE_IDS = {
     'power-individual': import.meta.env.VITE_STRIPE_PRICE_POWER_INDIVIDUAL,
     'team-pro-base': import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_BASE,
     'team-pro-seat': import.meta.env.VITE_STRIPE_PRICE_TEAM_PRO_SEAT,
     'enterprise': import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE,  // New
   };

   export const PLAN_LIMITS = {
     free: { users: 1, crm_items: 3, tasks: 10, marketing_items: 5 },
     'power-individual': { users: 1, crm_items: -1, tasks: -1, marketing_items: -1 },
     'team-pro': { users: -1, crm_items: -1, tasks: -1, marketing_items: -1 },
     enterprise: { users: -1, crm_items: -1, tasks: -1, marketing_items: -1, custom: true },
   };
   ```

3. **Add environment variable**
   ```bash
   # .env.local
   VITE_STRIPE_PRICE_ENTERPRISE=price_xyz123

   # Netlify environment variables
   # Add VITE_STRIPE_PRICE_ENTERPRISE
   ```

4. **Update UI**
   - Add new plan card in `Billing.tsx`
   - Update pricing page
   - Add feature comparison

5. **Test checkout flow**
   - Test in Stripe test mode
   - Verify subscription creation in Supabase
   - Test limit enforcement

### Debugging RLS Issues

**Symptoms:**
- "new row violates row-level security policy" errors
- Data not appearing in UI
- 403 Forbidden errors

**Diagnosis:**

1. **Check if user is in workspace_members**
   ```sql
   SELECT * FROM workspace_members WHERE user_id = auth.uid();
   ```

2. **Check RLS policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tasks';
   ```

3. **Test policy manually**
   ```sql
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';
   SELECT * FROM tasks WHERE workspace_id = 'workspace-uuid-here';
   ```

4. **Check helper functions**
   ```sql
   SELECT is_workspace_member('workspace-uuid-here');
   ```

**Common Fixes:**
- Run workspace member trigger fix
- Recreate RLS policies
- Check for circular dependencies in policies

**See:** `docs/RLS_ARCHITECTURE.md` for advanced troubleshooting.

---

## Troubleshooting

### Build Errors

**Error: "Missing environment variable"**
- Check `.env.local` file exists
- Verify all REQUIRED variables are set
- Run `npm run validate-env` to check

**Error: "TypeScript compilation failed"**
- Check for type errors in VS Code
- Run `npx tsc --noEmit` to see all errors
- Fix type issues before building

**Error: "Vite build failed"**
- Check for missing imports
- Verify all dependencies are installed (`npm install`)
- Clear Vite cache (`rm -rf node_modules/.vite`)

### Runtime Errors

**Error: "Supabase client not initialized"**
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Verify Supabase project is active
- Check network tab for 4xx/5xx errors

**Error: "AI chat not responding"**
- Verify GROQ_API_KEY is set in Supabase secrets
- Check API quota at console.groq.com
- Check Supabase Edge Function logs: `npx supabase functions logs groq-chat`
- Verify groq-chat function is deployed

**Error: "Stripe checkout failed"**
- Verify Stripe publishable key is correct (test vs. live)
- Check Stripe Dashboard logs
- Ensure webhook endpoints are configured

### Database Issues

**Error: "RLS policy violation"**
- See [Debugging RLS Issues](#debugging-rls-issues)

**Error: "Query timeout"**
- Check for missing indexes
- Review query plan in Supabase
- Consider pagination for large datasets

**Error: "Connection pool exhausted"**
- Check for leaked connections (no `.close()` calls)
- Review concurrent query limits
- Consider upgrading Supabase plan

---

## Resources

### Documentation
- [RLS Architecture Guide](./RLS_ARCHITECTURE.md) - Database security patterns
- [Sentry Setup Guide](./SENTRY_SETUP_GUIDE.md) - Error tracking configuration
- [Supabase Audit Logging](./SUPABASE_AUDIT_LOGGING.md) - Audit trail and backups
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Deployment checklist

### External Resources
- [Supabase Docs](https://supabase.com/docs) - Database, Auth, Storage
- [React Docs](https://react.dev/) - React fundamentals
- [TailwindCSS Docs](https://tailwindcss.com/docs) - Styling utilities
- [Stripe Docs](https://stripe.com/docs) - Payment integration
- [Groq API Docs](https://console.groq.com/docs) - AI integration

### Code Examples
- `src/components/Tasks.tsx` - Full-featured CRUD component
- `src/lib/hooks/useWorkspace.ts` - Workspace management
- `tests/rls/tasks.test.ts` - RLS testing patterns
- `supabase/migrations/` - Database migration examples

### Getting Help
- **Code Questions**: Check existing components for patterns
- **Database Issues**: Review migration history and RLS docs
- **Bug Reports**: Create GitHub issue with reproduction steps
- **Feature Requests**: Discuss in GitHub Discussions

---

## Next Steps

Now that you're up to speed:

1. ✅ **Set up your local environment** (see [Getting Started](#getting-started))
2. ✅ **Explore the codebase** (start with `App.tsx` and key components)
3. ✅ **Read RLS Architecture** (understand multi-tenant security)
4. ✅ **Pick a small task** (fix a bug or add a small feature)
5. ✅ **Write tests** (get familiar with test patterns)
6. ✅ **Submit your first PR** (following the workflow)

**Welcome to the team! 🚀**
