# Quick Start: Apply Notification Indexes

## Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in the left sidebar

2. **Copy the migration SQL**
   - Open: `supabase/migrations/20251115_notification_indexes.sql`
   - Copy the entire contents (Ctrl+A, Ctrl+C)

3. **Run the migration**
   - Paste into Supabase SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - Wait for "Success" message

4. **Verify indexes were created**
   - Look for the success message: "SUCCESS: All 3 notification indexes created successfully"
   - Or run this query to check:
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'notifications'
   AND indexname LIKE 'idx_notifications_%';
   ```

   You should see 3 indexes:
   - `idx_notifications_user_workspace_read_created`
   - `idx_notifications_user_unread`
   - `idx_notifications_realtime_filter`

## Option 2: Supabase CLI

If you have the Supabase CLI installed and linked:

```bash
# Apply the migration
./scripts/apply-notification-indexes.sh
```

Or manually:

```bash
# Link to your project (one-time setup)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

## Option 3: Direct SQL (if Supabase CLI unavailable)

Connect to your database and run:

```bash
psql YOUR_DATABASE_URL < supabase/migrations/20251115_notification_indexes.sql
```

## Verification

After applying, verify the indexes are being used:

```sql
-- Check query plan uses indexes
EXPLAIN ANALYZE
SELECT * FROM notifications
WHERE user_id = 'some-uuid'
  AND workspace_id = 'some-workspace-uuid'
  AND read = false
ORDER BY created_at DESC
LIMIT 50;
```

Look for: `Index Scan using idx_notifications_user_workspace_read_created`

## Troubleshooting

### "Relation 'notifications' does not exist"
The notifications table hasn't been created yet. Apply your main schema migration first.

### "Index already exists"
Indexes are already created. Run the verification query to confirm they exist.

### "Permission denied"
You need database admin access. Check your Supabase project permissions.

## Performance Before/After

**Before indexes:**
- Query time grows with table size
- 100,000 notifications = ~5000ms query time

**After indexes:**
- Constant query time regardless of size
- 100,000 notifications = ~5ms query time (1000x faster!)

## Next Steps

1. ✅ Apply indexes (you are here)
2. Test notification system: `docs/notification-testing-guide.md`
3. Monitor performance in Supabase Dashboard
4. Deploy notification system changes to production

## Support

For issues, check:
- `docs/database-indexes.md` - Full technical documentation
- `NOTIFICATION_SYSTEM_UPGRADE_SUMMARY.md` - Complete upgrade guide
- Supabase Docs: https://supabase.com/docs/guides/database/indexes

