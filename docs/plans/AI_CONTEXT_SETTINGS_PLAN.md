# AI Context + Customization Plan

## Why combine business profile + AI settings?

- Today the "Business Profile" form captures company metadata but AI prompts only consume a subset of it.
- Research Copilot, command palette, and task agents all need the same structured signals (industry, GTM stage, tone, approval guardrails, etc.).
- Moving the profile into a dedicated **AI Context** section makes it obvious that filling it out directly tunes Copilot answers and enables future agent personalization.

## Proposed UX

1. **Settings → AI & Copilots** (new tab)
   - **Context** panel: canonical business profile fields plus AI-specific knobs (voice, focus metrics, banned topics).
   - **Data connections** panel: toggles for which workspace entities the AI can read (CRM, Financials, Notes, Comments, Products & Services, Calendar, Accounts, Users).
   - **Response style** panel: sliders + chips for tone, depth, citation requirements, preferred frameworks.
2. Inline status surface
   - Research Copilot header shows "Context synced · Updated 3 days ago" with quick link back to settings.
   - Command palette surfaces missing fields (“Add ICP details to sharpen recommendations”).

## Data model + syncing

| Table | Purpose | Key fields |
| --- | --- | --- |
| `ai_context_profiles` | Workspace-wide context object | `workspace_id`, `vision`, `mission`, `icp`, `tone`, `compliance_notes`, `ai_goals`, `updated_at` |
| `ai_context_sources` | Track which modules can be sampled | `workspace_id`, `module` (`crm`, `financials`, etc.), `enabled`, `last_ingested_at` |
| `ai_agent_presets` | Future user- or role-specific overrides | `workspace_id`, `agent_key`, `instructions`, `capabilities`, `owner_id` |

Sync flow each time we build a prompt:

1. Fetch `ai_context_profiles` (cached client-side w/ react-query; stale-while-revalidate 5 minutes).
2. Resolve enabled modules from `ai_context_sources`.
3. Server function (`supabase/functions/ai-context`) composes:
   - Latest saved context fields.
   - Live snippets from enabled modules (e.g., top 3 deals, most recent financial highlight, unread comments).
   - Sanitized metadata (workspace name, plan, timezone, feature flags).
4. Copilot prompt template receives `context`, `metrics`, `recentSignals`, and `workspaceSnapshot` sections so every feature shares the same structure.

## Execution steps

1. **Backend**
   - Create tables + Supabase Row Level Security tied to `workspace_id`.
   - Build RPC or edge function to hydrate the context bundle with workspace data (respect module toggles).
2. **Frontend settings UI**
   - New route `settings/ai-context` driven by React Hook Form + Zod; autosave with optimistic updates.
   - Provide preset chips (“Investor ready”, “Founder-to-team voice”) that pre-fill tone fields.
3. **Copilot consumers**
   - Update `useResearchContext` hook to fetch the bundle and expose loading state + `refreshContext()`.
   - Research Copilot, Doc editor AI actions, Workspace automations, and future agents all import from the hook instead of crafting their own prompts.
4. **Future agent customization**
   - Reuse `ai_agent_presets` table to store persona-specific instructions (e.g., "Finance analyst", "Customer success writer").
   - Settings UI lists agent cards with hooks to enable/disable, change voice, and map to teams.
   - Execution layer chooses preset based on action (e.g., CRM follow-up uses `agent_key='account_update'`).

## Allowing deeper tuning

- **Forms**: multi-step wizard that guides users through Company snapshot → Customers → Voice → Guardrails → Data toggles.
- **Data binding**: each form section writes to the same JSONB row so prompt builders always receive normalized keys.
- **Workspace data ingestion**: schedule background jobs (or on-demand fetches) that summarize CRM/Financials/etc. into short bullet caches referenced in prompts to avoid over-querying during every AI call.
- **Auditability**: log every generated response with the context hash + selected modules so admins can trace why the AI responded a certain way.

## Rollout plan

1. Ship the UI + tables with mock data to verify flow.
2. Gate the new prompt builder behind a feature flag for internal workspaces.
3. Migrate existing Business Profile data into `ai_context_profiles` via one-time script.
4. Announce to customers: “Complete your AI Context once and every Copilot understands your business.”
5. Phase 2: expose agent cards + advanced automations (per-role presets, per-document overrides, etc.).
