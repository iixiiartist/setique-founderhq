# Notification System Production Deployment Guide

This guide covers deploying the production-ready notification system with agent job notifications and desktop notifications.

## Summary of Changes

### 1. New Notification Types (Agent/Sync)
- `agent_job_completed` - When a research agent finishes successfully
- `agent_job_failed` - When a research agent encounters an error
- `market_brief_ready` - When a market brief is generated
- `sync_completed` - When data sync completes
- `sync_failed` - When data sync fails

### 2. Desktop Notifications
- Browser Notification API integration via `desktopNotificationService.ts`
- Settings toggle in Notification Settings UI
- Permission handling and preference sync

### 3. Production-Scale Features
- Server-side fan-out via `create_workspace_notification` RPC
- Cursor-based pagination via `get_paginated_notifications` RPC
- Rate limiting with `notification_rate_limits` table
- Retention/archival with `archive_old_notifications` function
- Stricter RLS policies for multi-tenant security

---

## Deployment Steps

### Step 1: Run Production Migration

Run the following migration in your Supabase SQL Editor:

```bash
# File: supabase/migrations/20251204_notifications_production_scale.sql
```

Go to Supabase Dashboard → SQL Editor → New Query → Paste the contents of the migration file → Run

### Step 2: Deploy Edge Functions

Deploy the notification Edge Functions:

```powershell
# Navigate to project root
cd c:\Users\iixii\OneDrive\Desktop\setique-founder-dashboard\setique-founderhq

# Deploy batch-notifications function
npx supabase functions deploy batch-notifications

# Deploy notification-maintenance function  
npx supabase functions deploy notification-maintenance
```

### Step 3: Set Up Environment Variables

Add these secrets to your Supabase Edge Functions:

```powershell
# Set cron secret for maintenance function (generate a secure random string)
npx supabase secrets set NOTIFICATION_CRON_SECRET=your-secure-random-string-here
```

### Step 4: Set Up Cron Jobs

In your Supabase Dashboard → Database → Extensions, enable `pg_cron` if not already enabled.

Then run these SQL commands to set up scheduled maintenance:

```sql
-- Retry failed notifications every 5 minutes
SELECT cron.schedule(
  'process-notification-retries',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT process_notification_retries(100);$$
);

-- Archive old notifications daily at 2 AM
SELECT cron.schedule(
  'archive-old-notifications',
  '0 2 * * *', -- Daily at 2 AM
  $$SELECT archive_old_notifications(30);$$
);

-- Cleanup expired notifications daily at 3 AM
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 3 * * *', -- Daily at 3 AM
  $$SELECT cleanup_expired_notifications();$$
);

-- Cleanup old rate limit records hourly
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *', -- Every hour
  $$SELECT cleanup_old_rate_limits();$$
);
```

---

## New Client-Side API

### Paginated Notifications

```typescript
import { getPaginatedNotifications } from '@/lib/services/notificationService';

const { notifications, nextCursor, hasMore, error } = await getPaginatedNotifications({
  workspaceId: 'workspace-uuid',
  pageSize: 20,
  cursor: undefined, // Pass nextCursor for subsequent pages
  includeRead: true,
  categoryFilter: ['agent_job_completed', 'agent_job_failed'],
});
```

### Workspace-Wide Notifications

```typescript
import { createWorkspaceNotification } from '@/lib/services/notificationService';

await createWorkspaceNotification({
  workspaceId: 'workspace-uuid',
  type: 'market_brief_ready',
  title: 'Weekly Market Brief Ready',
  message: 'Your latest market analysis is available.',
  entityType: 'document',
  entityId: 'brief-uuid',
  priority: 'normal',
  excludeUserIds: ['sender-user-id'], // Don't notify the sender
});
```

### Desktop Notifications

```typescript
import { desktopNotificationService } from '@/lib/services/desktopNotificationService';

// Request permission
const granted = await desktopNotificationService.requestPermission();

// Show agent job notification
desktopNotificationService.showAgentJobComplete('Company Research', 'report-id');

// Show sync notification
desktopNotificationService.showSyncComplete('CRM Data', 150);
```

---

## Testing Checklist

- [ ] Run production migration successfully
- [ ] Deploy Edge Functions without errors
- [ ] Create a test notification using `createNotification()`
- [ ] Verify notification appears in NotificationCenter
- [ ] Toggle desktop notifications in settings
- [ ] Grant browser notification permission
- [ ] Trigger a background agent job and verify notification
- [ ] Check rate limiting works (create 100+ notifications quickly)
- [ ] Verify archived notifications don't appear in feed
- [ ] Test pagination by creating 50+ notifications

---

## Troubleshooting

### "Function not found" errors
If you see errors about missing RPC functions, the production migration hasn't been run. Run `20251204_notifications_production_scale.sql` in Supabase SQL Editor.

### Desktop notifications not showing
1. Check browser permissions (Settings → Privacy → Notifications)
2. Verify `desktopNotificationService.isAvailable()` returns `true`
3. Check user preferences in `user_workspace_settings` table

### Rate limiting too aggressive
Adjust the rate limits in the migration:
```sql
-- In check_notification_rate_limit function, change thresholds:
-- Current: 10/minute per type, 100/hour total
```

### Notifications not appearing in realtime
1. Check that the notification table is in Supabase realtime publication
2. Verify RLS policies allow the user to read notifications
3. Check the browser console for websocket errors

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20251204_add_agent_notification_preferences.sql` | Agent preference columns |
| `supabase/migrations/20251204_notifications_production_scale.sql` | Production-ready features |
| `supabase/functions/batch-notifications/index.ts` | Server-side batch create |
| `supabase/functions/notification-maintenance/index.ts` | Scheduled maintenance |
| `lib/services/notificationService.ts` | Core notification service |
| `lib/services/desktopNotificationService.ts` | Browser notifications |
| `hooks/useNotifications.ts` | React notification hook |
| `components/notifications/NotificationSettings.tsx` | Settings UI |
| `components/notifications/NotificationCenter.tsx` | Notification list UI |
