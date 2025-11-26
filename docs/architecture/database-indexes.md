# Database Performance Indexes

## Overview

This document describes critical database indexes required for production performance. These indexes should be created after schema deployment to optimize query performance.

## Notifications Table

### Primary Query Pattern

The `getUserNotifications` function executes:

```sql
SELECT * FROM notifications
WHERE user_id = ? 
  AND workspace_id = ?
  AND read = ?
ORDER BY created_at DESC
LIMIT 50;
```

### Required Indexes

```sql
-- Composite index for user notifications list query
-- Optimizes filtering by user_id, workspace_id, read status and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_notifications_user_workspace_read_created 
ON notifications(user_id, workspace_id, read, created_at DESC);

-- Partial index for unread count queries
-- Only indexes unread notifications to reduce index size
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, workspace_id) 
WHERE read = false;

-- Index for real-time subscription filtering
-- Optimizes Supabase postgres_changes filters
CREATE INDEX IF NOT EXISTS idx_notifications_realtime_filter
ON notifications(user_id, workspace_id, created_at DESC);
```

### Performance Impact

**Without indexes:**
- Full table scan on every notification fetch
- Query time grows linearly with total notification count
- 1000 notifications = ~50ms query time
- 100,000 notifications = ~5000ms query time

**With indexes:**
- Index seek + sort on indexed column
- Query time constant regardless of table size
- 100,000 notifications = ~5ms query time (1000x faster)

### Index Maintenance

```sql
-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'notifications'
ORDER BY idx_scan DESC;

-- Check index sizes
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'notifications';
```

## Application Instructions

### 1. Run Migrations

Execute the index creation SQL above in your Supabase SQL editor or via migration:

```bash
# Create migration file
supabase migration new add_notification_indexes

# Add SQL to migration file
# Then apply
supabase db push
```

### 2. Verify Indexes

Check that indexes are created and being used:

```sql
-- List all indexes on notifications table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'notifications';

-- Explain query plan to confirm index usage
EXPLAIN ANALYZE
SELECT * FROM notifications
WHERE user_id = 'some-uuid'
  AND workspace_id = 'some-workspace-uuid'
  AND read = false
ORDER BY created_at DESC
LIMIT 50;
```

Look for "Index Scan using idx_notifications_..." in the output.

### 3. Monitor Performance

Track notification query performance in production:

```typescript
// Example: Add timing logs to notificationService.ts
const start = performance.now();
const { data, error } = await supabase.from('notifications').select(...);
const duration = performance.now() - start;

if (duration > 100) {
  logger.warn('[NotificationService] Slow query detected:', { duration, userId });
}
```

## Related Tables

### Tasks Table

If task queries become slow as data grows, consider:

```sql
-- Index for workspace + status filtering with due date ordering
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_due
ON tasks(workspace_id, status, due_date DESC NULLS LAST);

-- Index for assigned user filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_workspace
ON tasks(assigned_to, workspace_id, status);
```

### Comments Table

For task comment queries:

```sql
-- Index for task comments with ordering
CREATE INDEX IF NOT EXISTS idx_comments_task_created
ON comments(task_id, created_at DESC);
```

## Index Naming Convention

Format: `idx_{table}_{columns}_{condition}`

- `idx_` prefix for all indexes
- Table name
- Column names in order of importance
- Optional condition (e.g., `_unread` for partial indexes)

## Resources

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Supabase Performance Guide](https://supabase.com/docs/guides/platform/performance)
- [Index Maintenance Best Practices](https://wiki.postgresql.org/wiki/Index_Maintenance)

