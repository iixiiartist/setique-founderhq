# Background Agent Jobs Implementation

This document describes the background job system for AI agents, allowing users to continue working while long-running research tasks complete in the background.

## Overview

Users can now run AI agent tasks (Research Briefing, Why Now, Deal Strategist) in the background. When a job completes:
1. The report is automatically saved to the agent reports table
2. The user receives a notification
3. They can view the report from the notification or the Background Jobs panel

## Database Setup

Run the SQL migration to create the `background_agent_jobs` table:

```sql
-- Run this in Supabase SQL Editor
-- File: sql/create_background_agent_jobs_table.sql
```

## Files Created/Modified

### New Files

1. **`sql/create_background_agent_jobs_table.sql`**
   - Database table for tracking background jobs
   - Includes RLS policies for security
   - Real-time enabled for live updates

2. **`lib/services/backgroundAgentJobService.ts`**
   - Service class for managing background jobs
   - Methods: createJob, updateJob, completeJob, failJob, cancelJob
   - Automatically saves reports and sends notifications

3. **`hooks/useBackgroundAgentJobs.ts`**
   - React hook for managing background jobs
   - Real-time subscription for job status updates
   - Handles job execution in the browser

4. **`components/agents/BackgroundJobsPanel.tsx`**
   - UI component showing active and recent jobs
   - Progress indicators, status icons
   - Actions: cancel, delete, view report

### Modified Files

1. **`components/agents/AgentsTab.tsx`**
   - Added Background Jobs section
   - Integrated background job hook
   - Passes background job handler to modals

2. **`components/agents/ResearchAgentModal.tsx`**
   - Added "Run in Background" button
   - Closes modal immediately when background job starts

3. **`components/agents/WhyNowAgentModal.tsx`**
   - Added support for background jobs (prop interface)

4. **`components/agents/DealStrategistModal.tsx`**
   - Added support for background jobs (prop interface)

5. **`hooks/index.ts`**
   - Exported useBackgroundAgentJobs hook

## User Experience

### Starting a Background Job

1. User opens an agent modal (e.g., Research Briefing)
2. Fills in the target, goal, and optional notes/URLs
3. Clicks "Run in Background" instead of "Run Briefing"
4. Modal closes immediately
5. Toast notification confirms job started

### Monitoring Progress

- Background Jobs panel appears in Agents tab (when jobs exist)
- Shows job status: Pending, Running, Completed, Failed, Cancelled
- Running jobs show progress bar (approximate %)
- Real-time updates via Supabase subscriptions

### Job Completion

1. Job completes → Report auto-saved to `agent_reports`
2. Notification sent: "✅ Research Report Ready"
3. User can click notification to view report
4. Or view from Background Jobs panel → click external link icon

### Error Handling

- Failed jobs show error message
- User notified: "❌ Research Failed"
- Can retry by starting a new job

## Technical Details

### Job Status Flow

```
pending → running → completed
                  ↘ failed
          ↗ cancelled
```

### Real-time Updates

Jobs table uses Supabase Realtime for live updates:
- INSERT: New job added to list
- UPDATE: Status/progress changes
- DELETE: Job removed from list

### Notifications

Uses existing notification system:
- Type: `task_completed` for success
- Type: `task_updated` for failure
- Includes action URL to navigate to report

## Future Enhancements

1. **Server-side execution** - Move job execution from browser to Supabase Edge Function for reliability
2. **Job queue** - Limit concurrent jobs per user
3. **Retry failed jobs** - Allow re-running failed jobs
4. **Email notifications** - Option to notify via email when complete
5. **Background job duration estimates** - Show estimated time remaining
