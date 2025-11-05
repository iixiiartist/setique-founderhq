# AI Features Update - Collaboration & Cost Monitoring

## Overview
Updated all AI features to support workspace collaboration and added admin-only cost monitoring for API usage tracking.

## Changes Made

### 1. Collaboration Context in AI System Prompts ✅

Updated all tabs with ModuleAssistant to include team member context:

#### Files Updated:
- **FinancialsTab.tsx**
  - Added `WorkspaceMember` import and prop
  - Added team context to system prompt showing all workspace members
  - AI now knows who can be assigned tasks and can reference team members

- **MarketingTab.tsx**
  - Added `WorkspaceMember` import and prop
  - Added team collaboration notes for content ownership and campaign management
  - AI can suggest content review assignments

- **PlatformTab.tsx**
  - Added `WorkspaceMember` import and prop
  - Added team context for sprint planning and code ownership
  - AI considers team capacity when suggesting assignments

- **CrmTab.tsx**
  - Already had `WorkspaceMember` support
  - Updated system prompt with collaboration notes for deal ownership
  - AI can help with relationship management across team

#### DashboardApp.tsx Updates:
```typescript
// Now passes workspaceMembers to all tabs
<PlatformTab ... workspaceMembers={workspaceMembers} />
<MarketingTab ... workspaceMembers={workspaceMembers} />
<FinancialsTab ... workspaceMembers={workspaceMembers} />
// CrmTab already had it
```

#### System Prompt Addition (Example):
```
**Team Members (3):**
- John Doe (john@company.com) - Role: owner
- Jane Smith (jane@company.com) - Role: admin
- Bob Johnson (bob@company.com) - Role: member

**Collaboration Notes:**
- When creating tasks, you can assign them to specific team members by their email address
- Data is shared across the workspace for team collaboration
- Use team member names when discussing ownership and assignments
```

### 2. Task Assignment via AI ✅

#### services/gemini/tools.ts:
- Updated `createTaskDeclaration` to include `assignedTo` parameter
- Description: "Optional. Email address of the team member to assign this task to."
- AI can now intelligently assign tasks based on:
  - User's explicit request ("assign this to Jane")
  - Team member expertise (from context)
  - Workload considerations (from prompt context)

#### components/shared/ModuleAssistant.tsx:
- Updated `executeAction` for createTask to pass `args.assignedTo`
- AI assignments now flow through to the database correctly

### 3. AI Usage Tracking with User Attribution ✅

#### services/geminiService.ts:
```typescript
// Before
await DatabaseService.incrementAIUsage(workspaceId);

// After
await DatabaseService.incrementAIUsage(workspaceId, session.user.id);
```

#### lib/services/database.ts:
**Updated `incrementAIUsage` function:**
- Now accepts optional `userId` parameter
- Logs AI usage to `ai_usage_logs` table for analytics
- Maintains backward compatibility (doesn't fail if logging fails)

**New Admin-Only Functions:**
```typescript
// Get detailed AI usage logs for analytics
static async getAIUsageStats(days: number = 30)

// Get aggregated summary by workspace and user
static async getAIUsageSummaryByWorkspace(workspaceId?: string)
```

### 4. Database Schema - AI Usage Logs (Admin-Only) ✅

#### Migration: `20241105000003_ai_usage_logs.sql`

**Table Structure:**
```sql
CREATE TABLE public.ai_usage_logs (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes for Performance:**
- `idx_ai_usage_logs_workspace` - Query by workspace
- `idx_ai_usage_logs_user` - Query by user
- `idx_ai_usage_logs_timestamp` - Time-based queries

**Row Level Security (RLS):**
```sql
-- CRITICAL: Only admins can view
CREATE POLICY "Admins can view AI usage logs"
    ON ai_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- System can insert (for logging)
CREATE POLICY "System can insert AI usage logs"
    ON ai_usage_logs FOR INSERT
    WITH CHECK (true);
```

**Security:**
- ✅ **Admin-only access** - Non-admin users CANNOT query this table
- ✅ **Proprietary data** - API usage and costs remain private
- ✅ **RLS enforced** - Database-level security, not just UI

## Cost Estimation (for Admin View)

Based on Gemini API pricing:
- **Gemini 1.5 Flash:** ~$0.00015 per request (average)
- **Estimated costs:** Can be calculated from `ai_usage_logs` count

**Example Admin Query:**
```typescript
const { data: logs } = await DatabaseService.getAIUsageStats(30);
const totalRequests = logs?.length || 0;
const estimatedCost = totalRequests * 0.00015;
```

## Benefits

### For Teams:
1. **AI knows team members** - Can reference people by name and role
2. **Smart task assignment** - AI can assign based on expertise
3. **Collaborative context** - AI understands multi-user workflows
4. **Better suggestions** - Considers team capacity and roles

### For Admins:
1. **Cost visibility** - Track AI API usage per workspace
2. **User attribution** - See which users make most AI requests
3. **Trend analysis** - Monitor usage patterns over time
4. **Budget planning** - Forecast costs based on actual usage

### Security:
1. **Privacy maintained** - Only admins see cost data
2. **RLS enforced** - Database-level security
3. **Graceful degradation** - Logging failures don't break AI

## Testing Checklist

- [ ] Run migration: `npx supabase db push`
- [ ] Test AI in FinancialsTab with team members
- [ ] Test AI in MarketingTab with team members
- [ ] Test AI in PlatformTab with team members
- [ ] Test AI in CrmTab with team members
- [ ] Ask AI to assign task to specific team member
- [ ] Verify AI references team members by name
- [ ] Verify ai_usage_logs table populates (admin check)
- [ ] Verify non-admin cannot query ai_usage_logs
- [ ] Test AI still works without workspaceMembers (solo mode)

## Future Enhancements

### Potential Admin Dashboard Features:
1. **Cost trends chart** - Daily/weekly AI usage visualization
2. **Top users** - Who makes most AI requests
3. **Per-workspace breakdown** - Cost attribution by workspace
4. **Budget alerts** - Notify when approaching limits
5. **Token counting** - More accurate cost calculation (requires API change)

### Potential AI Features:
1. **@mention syntax** - "@jane can you review this?"
2. **Smart routing** - AI automatically suggests best assignee
3. **Workload balancing** - AI considers current task counts
4. **Expertise matching** - AI learns from past assignments

## Notes

- All changes are **backward compatible** - works with or without team members
- AI system prompts now ~200 tokens longer (minimal cost impact)
- Logging is best-effort - doesn't fail AI requests if log insert fails
- Cost monitoring is **admin-only proprietary feature** per requirements
- No UI changes required - all backend/prompt updates

## Files Modified

### Frontend:
- `components/FinancialsTab.tsx` - Added team context
- `components/MarketingTab.tsx` - Added team context  
- `components/PlatformTab.tsx` - Added team context
- `components/CrmTab.tsx` - Added team context
- `DashboardApp.tsx` - Pass workspaceMembers to tabs
- `components/shared/ModuleAssistant.tsx` - Support assignedTo parameter

### Backend:
- `services/geminiService.ts` - Pass userId to incrementAIUsage
- `services/gemini/tools.ts` - Add assignedTo to createTask tool
- `lib/services/database.ts` - Enhanced usage tracking + admin functions
- `supabase/migrations/20241105000003_ai_usage_logs.sql` - New table

## Conclusion

✅ AI is now **team-aware** and can intelligently work with workspace collaboration
✅ Admin can track **API costs** and usage patterns (proprietary feature)
✅ All changes maintain **backward compatibility** and **security**
✅ Ready for production after migration and testing
