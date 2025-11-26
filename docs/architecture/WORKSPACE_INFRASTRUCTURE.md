# Workspace & Team Infrastructure

## Overview
The workspace system enables multi-user team collaboration in Setique Founder Dashboard. Each user gets a default personal workspace, and can create or join team workspaces.

## Database Schema

### Tables Created

#### `workspaces`
Represents a workspace (personal or team).

**Fields:**
- `id` - UUID primary key
- `name` - Workspace name (e.g., "Acme Corp's Workspace")
- `plan_type` - Subscription plan: 'free', 'pro-individual', 'power-individual', 'team-starter', 'team-pro'
- `owner_id` - References profiles(id), the workspace creator
- `seat_count` - Number of seats for team plans
- `ai_usage_count` - AI API calls this billing period
- `ai_usage_reset_date` - When AI usage counter resets (monthly)
- `storage_bytes_used` - Total storage used in bytes
- `file_count` - Number of files in workspace
- `created_at`, `updated_at` - Timestamps

**RLS Policies:**
- Users can view workspaces they own OR are members of
- Users can create workspaces (become owner)
- Only owners can update/delete their workspaces

#### `workspace_members`
Many-to-many relationship between workspaces and users.

**Fields:**
- `id` - UUID primary key
- `workspace_id` - References workspaces(id)
- `user_id` - References profiles(id)
- `role` - 'owner' or 'member' (workspace_role enum)
- `joined_at` - Timestamp when user joined
- `invited_by` - References profiles(id), who invited this user

**Constraints:**
- Unique(workspace_id, user_id) - User can only be in workspace once

**RLS Policies:**
- Users can view members of workspaces they belong to
- Only owners can add/remove members
- Members can leave workspaces (remove themselves)

### Workspace Columns Added to Existing Tables

All data tables now have a `workspace_id` column (nullable for backward compatibility):

- ✅ `tasks.workspace_id`
- ✅ `crm_items.workspace_id`
- ✅ `contacts.workspace_id`
- ✅ `meetings.workspace_id`
- ✅ `marketing_items.workspace_id`
- ✅ `financial_logs.workspace_id`
- ✅ `documents.workspace_id`
- ✅ `expenses.workspace_id` (already added in expense migration)

**Indexes created for performance:**
- Each table has `idx_{table}_workspace_id` index

## TypeScript Types

### Core Types (`types.ts`)

```typescript
export type WorkspaceRole = 'owner' | 'member';

export type PlanType = 
    | 'free' 
    | 'pro-individual' 
    | 'power-individual' 
    | 'team-starter' 
    | 'team-pro';

export interface Workspace {
    id: string;
    name: string;
    planType: PlanType;
    ownerId: string;
    createdAt: number;
    seatCount: number;
    aiUsageCount: number;
    aiUsageResetDate: number;
    storageBytesUsed: number;
    fileCount: number;
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    joinedAt: number;
    invitedBy?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
}
```

### Database Types (`lib/types/database.ts`)

Added `workspaces` and `workspace_members` tables with Row, Insert, and Update types.

## Database Service Methods

### Workspace Operations (`lib/services/database.ts`)

#### `getWorkspaces(userId: string)`
Fetches all workspaces a user owns or is a member of.

#### `getWorkspaceById(workspaceId: string)`
Fetches a single workspace by ID.

#### `createWorkspace(userId, workspaceData)`
Creates a new workspace with the user as owner.

#### `updateWorkspace(workspaceId, updates)`
Updates workspace properties (owner only via RLS).

#### `deleteWorkspace(workspaceId)`
Deletes a workspace (owner only via RLS).

### Workspace Member Operations

#### `getWorkspaceMembers(workspaceId: string)`
Fetches all members of a workspace with their profile data (email, name, avatar).

#### `addWorkspaceMember(workspaceId, userId, role, invitedBy?)`
Adds a user to a workspace with specified role.

#### `removeWorkspaceMember(workspaceId, userId)`
Removes a user from a workspace.

#### `updateWorkspaceMemberRole(workspaceId, userId, role)`
Changes a member's role (owner/member).

## Automatic Workspace Creation

When a new user signs up, a trigger automatically creates a default personal workspace:

```sql
CREATE TRIGGER create_workspace_on_signup
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_workspace_for_user();
```

The workspace name is set to: `"{User's Name}'s Workspace"` or `"My Workspace"` if no name provided.

## Data Isolation & Sharing

### Current State (Phase 1 Complete)
- All data tables have `workspace_id` column
- Data is still scoped to `user_id` (personal use)
- `workspace_id` is nullable (backward compatible)

### Future State (Phase 2+ - To Be Implemented)
When workspace selection UI is added:
1. User selects active workspace
2. All new data gets `workspace_id` set
3. RLS policies will be updated to allow workspace members to view shared data
4. Queries will filter by `workspace_id` instead of `user_id`

## Usage Tracking for Subscriptions

The `workspaces` table tracks usage for subscription limits:

- **AI Usage:** `ai_usage_count` increments on each AI call, resets monthly
- **Storage:** `storage_bytes_used` and `file_count` updated on file uploads
- **Seats:** `seat_count` tracks number of team members (for billing)

These fields enable the subscription system to enforce limits:
- Free: 20 AI calls/month, 25 files, 100MB
- Pro: 500 AI calls/month, 250 files, 1GB
- Power: Unlimited AI (2000/month fair use), 5GB
- Team Starter: 500 AI calls/user/month, 3GB shared
- Team Pro: Unlimited AI/user, 10GB shared

## Migration Instructions

To apply this schema to your Supabase database:

1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `supabase/migrations/002_add_workspace_team_schema.sql`
4. Run the query

The migration is **safe and idempotent**:
- Uses `IF NOT EXISTS` for all CREATE statements
- Uses `DO $$ BEGIN ... EXCEPTION` blocks for enums
- Uses `DROP ... IF EXISTS` for policies and triggers
- Won't fail if objects already exist

## Next Steps

1. ✅ Schema created (Task #5 complete)
2. 🔜 Add team achievements schema (Task #6)
3. 🔜 Add business profile schema (Task #7)
4. 🔜 Build workspace selector UI
5. 🔜 Build team member management UI (Task #16)
6. 🔜 Update RLS policies for team data sharing (Task #18)
7. 🔜 Implement subscription system with Stripe (Tasks #9-11)
8. 🔜 Add AI and storage usage tracking
9. 🔜 Build team achievements UI (Task #12)

## Architecture Notes

### Why workspace_id is nullable?
Backward compatibility. Existing users have data without workspace_id. When they first use the new system, their data can be migrated to their default workspace.

### Why separate workspace_members table?
- Enables many-to-many relationships (user can be in multiple workspaces)
- Stores metadata per membership (role, invited_by, joined_at)
- Owner has direct access via `workspaces.owner_id` (doesn't need membership record)
- Simplifies permission checks (owner vs member)

### Why track usage in workspaces table?
- Centralized usage tracking per workspace
- Easy to query for subscription enforcement
- Scales better than aggregating from data tables
- Can reset counters without touching user data

### Security Considerations
- RLS policies ensure users can only access their workspaces
- Members can't see other members' workspaces
- Only owners can modify workspace settings
- Invite system will use secure tokens (to be implemented)
- API keys for AI should move server-side before production
