# Notification System Overhaul

## Overview

The notification system has been overhauled to be production-ready with support for:
- **Real-time in-app notifications** with WebSocket subscriptions
- **Email notifications** with instant, daily digest, and weekly digest options
- **Notification preferences** per user with granular control
- **Activity feed** for recent workspace activity
- **Comment management** with @mentions and notifications

## New Components

### 1. NotificationCenter (`components/notifications/NotificationCenter.tsx`)

A full-featured notification panel with:
- Category tabs: All, Mentions, Tasks, Deals, Documents, Team, Achievements
- Mark as read/unread functionality
- Delete individual or all read notifications
- Real-time updates via Supabase subscriptions
- Click-to-navigate to related entities
- Unread badges per category

### 2. NotificationSettings (`components/notifications/NotificationSettings.tsx`)

Comprehensive settings modal for:
- In-app notification toggle
- Email notification toggle with frequency options:
  - Instant (as they happen)
  - Daily digest
  - Weekly digest
  - Never
- Quiet hours configuration
- Per-category notification toggles:
  - Mentions & Comments
  - Task assignments, updates, due reminders
  - Deal updates, won/lost notifications
  - Document shares
  - Team updates
  - Achievements

### 3. ActivityFeed (`components/notifications/ActivityFeed.tsx`)

A recent activity feed component showing:
- Who did what and when
- Filter by entity type (tasks, deals, contacts, documents, comments)
- User avatars and action icons
- Clickable items to navigate to entities
- Real-time updates for new activities

## Database Schema

### notification_preferences table
```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    
    -- Channels
    in_app_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'instant',
    email_digest_time TIME DEFAULT '09:00:00',
    email_digest_day INTEGER DEFAULT 1,
    
    -- Category toggles
    notify_mentions BOOLEAN DEFAULT true,
    notify_comments BOOLEAN DEFAULT true,
    notify_task_assignments BOOLEAN DEFAULT true,
    notify_task_updates BOOLEAN DEFAULT true,
    notify_task_due_soon BOOLEAN DEFAULT true,
    notify_task_overdue BOOLEAN DEFAULT true,
    notify_deal_updates BOOLEAN DEFAULT true,
    notify_deal_won BOOLEAN DEFAULT true,
    notify_deal_lost BOOLEAN DEFAULT true,
    notify_document_shares BOOLEAN DEFAULT true,
    notify_team_updates BOOLEAN DEFAULT true,
    notify_achievements BOOLEAN DEFAULT true,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### email_notification_queue table
```sql
CREATE TABLE email_notification_queue (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    notification_id UUID REFERENCES notifications(id),
    
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    
    digest_type VARCHAR(20),
    scheduled_for TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enhanced notifications table columns
- `priority` - Notification priority (normal, high)
- `action_url` - URL to navigate to when clicked
- `email_sent` - Whether email was sent
- `email_sent_at` - When email was sent
- `metadata` - Additional JSONB context
- `expires_at` - Auto-expiry timestamp

### activity_log table
```sql
CREATE TABLE activity_log (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    user_id UUID REFERENCES profiles(id),
    
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255),
    
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Services

### notificationPreferencesService.ts

```typescript
// Get or create preferences
getNotificationPreferences(userId, workspaceId?)

// Update preferences
updateNotificationPreferences(userId, updates, workspaceId?)

// Check if user should receive notification
shouldNotifyUser(userId, workspaceId, notificationType, channel)

// Quick toggles
toggleEmailNotifications(userId, enabled, workspaceId?)
toggleInAppNotifications(userId, enabled, workspaceId?)
setQuietHours(userId, enabled, startTime?, endTime?, workspaceId?)
```

## Edge Functions

### email-notifications

Handles email notification delivery with actions:

1. **send_immediate** - Send instant email notification
   - Checks user preferences
   - Queues email in database
   - Sends via Resend API if configured

2. **send_digest** - Send daily/weekly digest emails
   - Finds users with digest preferences
   - Collects unread notifications
   - Generates digest email HTML/text
   - Sends via Resend API

3. **process_queue** - Process pending email queue
   - Retries failed emails (up to 3 attempts)
   - Updates status and sent timestamps

## Integration

### DashboardApp Integration

```tsx
// Import components
import { NotificationCenter, NotificationSettings } from './components/notifications';

// State
const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);

// Usage
<NotificationBell 
    userId={user.id}
    workspaceId={workspace.id}
    onNotificationClick={() => setIsNotificationsPanelOpen(true)}
/>
<NotificationCenter
    isOpen={isNotificationsPanelOpen}
    onClose={() => setIsNotificationsPanelOpen(false)}
    onOpenSettings={() => {
        setIsNotificationsPanelOpen(false);
        setIsNotificationSettingsOpen(true);
    }}
    onNavigate={(entityType, entityId) => {
        // Navigate to entity
    }}
/>
<NotificationSettings
    isOpen={isNotificationSettingsOpen}
    onClose={() => setIsNotificationSettingsOpen(false)}
/>
```

## Notification Types

The system supports 26 notification types:
- `mention` - @mention in comment
- `assignment` - Item assigned
- `task_completed` - Task marked done
- `comment_reply` - Reply to comment
- `task_updated` - Task details changed
- `task_reassigned` - Task reassigned
- `task_deadline_changed` - Due date changed
- `task_due_soon` - Due within 24 hours
- `task_overdue` - Past due date
- `team_invitation` - Workspace invite
- `deal_won` - Deal closed won
- `deal_lost` - Deal closed lost
- `deal_stage_changed` - Pipeline stage change
- `crm_contact_added` - New contact
- `document_shared` - Document shared
- `document_comment` - Comment on document
- `workspace_role_changed` - Role updated
- `achievement_unlocked` - Badge earned
- `task_assigned` - Task assigned (alias)
- `comment_added` - New comment
- `subtask_completed` - Subtask done

## Migration

Apply the migration to set up the database:

```bash
# Via Supabase CLI
supabase db push

# Or manually run
supabase/migrations/20251201_notification_system_overhaul.sql
```

## Environment Variables

For email notifications via Resend:
```
RESEND_API_KEY=your_resend_api_key
SITE_URL=https://app.founderhq.com
```

## Future Enhancements

1. **Push notifications** - Web push and mobile
2. **Slack integration** - Notify via Slack webhook
3. **SMS notifications** - Critical alerts via SMS
4. **Smart batching** - Group related notifications
5. **AI summarization** - Daily AI summary of activity
6. **Custom rules** - User-defined notification rules
