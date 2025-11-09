# Applying Subscription Enforcement Migration

## Overview
This migration enforces workspace seat limits and secures AI usage tracking by:
- Automatically tracking used seats when members are added/removed
- Preventing invitations when seats are exhausted
- Creating a secure RPC function for AI usage increments (bypasses RLS for team members)

## Migration File
`supabase/migrations/20251109000000_enforce_subscription_seats_and_ai.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20251109000000_enforce_subscription_seats_and_ai.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Supabase CLI
```bash
# If you have the Supabase CLI installed
cd /workspaces/setique-founderhq
supabase db push
```

## What This Migration Does

### 1. Seat Tracking Setup
- Sets `used_seats` default to 0
- Backfills `used_seats` with actual member counts
- Creates triggers to automatically update `used_seats` on member INSERT/DELETE

### 2. Seat Limit Enforcement
- `enforce_workspace_seat_limit()` function prevents adding members when seats are full
- Triggers on `workspace_members` table enforce the limit
- Error message: "Workspace has reached its seat limit. Purchase additional seats to add more members."

### 3. Invitation Blocking
- `enforce_workspace_invitation_limit()` function prevents invitations when seats exhausted
- Considers both used seats AND pending invitations
- Error message: "All seats are already allocated. Increase your seat count before inviting new members."

### 4. Secure AI Usage RPC
- `increment_ai_usage(p_workspace_id UUID)` function created with SECURITY DEFINER
- Allows workspace members to increment AI usage without RLS issues
- Verifies caller is workspace owner or member before allowing increment
- Only updates subscriptions with status 'active' or 'trialing'

## Code Changes Applied

### database.ts Updates
1. **getWorkspaceSeatStatus()** - New helper to fetch seat availability
2. **createWorkspaceInvitation()** - Preflight check for available seats
3. **checkAILimit()** - Now reads `ai_requests_limit` from database (NULL = unlimited)
4. **incrementAIUsage()** - Uses RPC instead of direct UPDATE (fixes team member RLS issue)

## Testing After Migration

### Test Seat Limits
```sql
-- Check seat status for your workspace
SELECT 
    w.name,
    s.seat_count,
    s.used_seats,
    (SELECT COUNT(*) FROM workspace_invitations WHERE workspace_id = w.id AND status = 'pending') as pending_invites,
    (s.seat_count - s.used_seats - (SELECT COUNT(*) FROM workspace_invitations WHERE workspace_id = w.id AND status = 'pending')) as available_seats
FROM workspaces w
LEFT JOIN subscriptions s ON s.workspace_id = w.id;
```

### Test AI Usage RPC
```sql
-- Test incrementing AI usage (as authenticated user)
SELECT increment_ai_usage('<your-workspace-id>');

-- Verify it incremented
SELECT workspace_id, ai_requests_used 
FROM subscriptions 
WHERE workspace_id = '<your-workspace-id>';
```

## Rollback (If Needed)
If issues occur, you can rollback by:
```sql
-- Drop the triggers
DROP TRIGGER IF EXISTS enforce_workspace_seat_limit_insert ON workspace_members;
DROP TRIGGER IF EXISTS enforce_workspace_seat_limit_delete ON workspace_members;
DROP TRIGGER IF EXISTS enforce_workspace_invitation_limit_insert ON workspace_invitations;
DROP TRIGGER IF EXISTS enforce_workspace_invitation_limit_update ON workspace_invitations;

-- Drop the functions
DROP FUNCTION IF EXISTS enforce_workspace_seat_limit();
DROP FUNCTION IF EXISTS enforce_workspace_invitation_limit();
DROP FUNCTION IF EXISTS increment_ai_usage(UUID);
```

## Expected Benefits
1. ✅ Team members can now use AI features without RLS errors
2. ✅ Automatic seat tracking prevents over-subscription
3. ✅ Database-level enforcement prevents seat limit bypass
4. ✅ Cleaner AI limit management (database-driven vs hardcoded)
5. ✅ Pending invitations counted toward seat allocation

## Notes
- The migration is idempotent (safe to run multiple times)
- Existing data is preserved and backfilled correctly
- All seat calculations happen at database level (secure)
- RPC function has proper authentication checks
