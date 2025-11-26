# Supabase Audit Logging Setup Checklist

Quick setup guide for enabling comprehensive audit logging and backups for FounderHQ.

## ✅ Immediate Actions (Do Today)

### 1. Apply Audit Triggers (5 minutes)

```bash
# Apply the audit logging migration
cd /workspaces/setique-founderhq
supabase db push
```

This creates:
- ✅ `audit.operation_log` table
- ✅ Triggers on critical tables (workspaces, members, subscriptions)
- ✅ RLS policies for audit log access
- ✅ Automatic change tracking

**Verify:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM audit.operation_log ORDER BY created_at DESC LIMIT 10;
```

### 2. Enable Supabase Alerts (2 minutes)

1. Go to Supabase Dashboard → Settings → **Alerts**
2. Enable these alerts:
   - ✅ Database CPU > 80%
   - ✅ Database Memory > 80%
   - ✅ Disk usage > 80%
   - ✅ Connection pool exhausted
3. Add your email for notifications

### 3. Download Manual Backup (2 minutes)

1. Go to Supabase Dashboard → Settings → **Backups**
2. Click **Download** on latest backup
3. Store securely (encrypted drive, 1Password, etc.)
4. Label with date: `founderhq_backup_2025-11-08.sql`

---

## 🔧 Setup Automated Backups (15 minutes)

### Option A: GitHub Actions (Recommended)

The workflow file is already created at `.github/workflows/backup-database.yml`.

**Setup:**

1. **Get Database Password:**
   ```bash
   # In Supabase Dashboard
   # Settings → Database → Connection String → Copy password
   ```

2. **Add GitHub Secrets:**
   - Go to GitHub → Repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add two secrets:
     ```
     Name: SUPABASE_DB_PASSWORD
     Value: <your-db-password>

     Name: SUPABASE_PROJECT_REF
     Value: jffnzpdcmdalxqhkfymx (your project ref from Supabase URL)
     ```

3. **Test the Workflow:**
   - Go to GitHub → Actions → "Daily Database Backup"
   - Click "Run workflow"
   - Verify it completes successfully
   - Download the artifact to verify backup works

**What it does:**
- ✅ Runs daily at 2 AM UTC
- ✅ Creates compressed backup
- ✅ Uploads to GitHub artifacts (30-day retention)
- ✅ Can be triggered manually anytime
- ✅ Notifies on failure

### Option B: Supabase Built-in (Already Active)

Supabase automatically creates daily backups:
- ✅ 7-day retention (Pro plan)
- ✅ Downloadable via Dashboard
- ✅ No setup required

**To access:**
1. Supabase Dashboard → Settings → Backups
2. See list of daily backups
3. Click "Download" when needed

---

## 💰 Consider PITR (Point-in-Time Recovery)

**What is PITR?**
- Restore database to ANY point in time
- Zero data loss (continuous backups)
- Fast recovery (minutes)

**Cost:**
- Pro plan: $75/month extra for 7 days PITR
- Team plan: Included (14 days PITR)

**Enable PITR:**
1. Supabase Dashboard → Settings → Backups
2. Click "Enable Point in Time Recovery"
3. Choose retention (7, 14, or 30 days)
4. Confirm billing

**Recommendation:**
- ✅ Enable for production if budget allows
- ❌ Skip if on tight budget (daily backups sufficient)

---

## 📊 Monthly Maintenance Tasks

### Test Backup Restoration (15 minutes/month)

**Why:** Untested backups are useless! Verify you can restore.

**How:**
1. Download latest backup from Supabase or GitHub Actions
2. Create test Supabase project
3. Restore backup to test project
4. Verify critical tables have data:
   ```sql
   SELECT COUNT(*) FROM workspaces;
   SELECT COUNT(*) FROM workspace_members;
   SELECT COUNT(*) FROM subscriptions;
   ```
5. Delete test project

### Review Audit Logs (10 minutes/month)

**Check for anomalies:**
```sql
-- Recent deletions
SELECT 
  table_name,
  operation,
  user_id,
  old_data->>'name' as deleted_item,
  created_at
FROM audit.operation_log
WHERE operation = 'DELETE'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Subscription changes
SELECT 
  user_id,
  old_data->>'plan_type' as old_plan,
  new_data->>'plan_type' as new_plan,
  created_at
FROM audit.operation_log
WHERE table_name = 'subscriptions'
  AND operation = 'UPDATE'
ORDER BY created_at DESC
LIMIT 20;

-- Member role changes
SELECT 
  user_id,
  old_data->>'role' as old_role,
  new_data->>'role' as new_role,
  created_at
FROM audit.operation_log
WHERE table_name = 'workspace_members'
  AND 'role' = ANY(changed_fields)
ORDER BY created_at DESC;
```

### Clean Old Logs (5 minutes/quarter)

```sql
-- Delete activity logs older than 1 year (per retention policy)
DELETE FROM activity_log
WHERE created_at < NOW() - INTERVAL '1 year';

-- Audit logs: Never delete, but can archive old ones
-- (Keep 7 years for compliance)
```

---

## 🚨 Disaster Recovery Process

### If Database is Corrupted/Lost

**Using PITR (if enabled):**
1. Supabase Dashboard → Settings → Backups → PITR
2. Select date/time before corruption
3. Click "Restore"
4. New project created with restored data
5. Update Netlify env vars with new connection string
6. Test thoroughly before switching production traffic

**Using Daily Backup:**
1. Create new Supabase project (or restore to existing)
2. Get latest backup (GitHub Actions artifact or Supabase download)
3. Restore:
   ```bash
   gunzip founderhq_backup_latest.sql.gz
   
   pg_restore \
     -h db.your-new-ref.supabase.co \
     -U postgres \
     -d postgres \
     --clean \
     --if-exists \
     founderhq_backup_latest.sql
   ```
4. Verify data integrity
5. Update Netlify environment variables
6. Deploy and test

**Recovery Time Objectives (RTO):**
- With PITR: 15-30 minutes
- With daily backup: 1-2 hours
- With no backup: Days/weeks (rebuild from scratch)

**Recovery Point Objectives (RPO):**
- With PITR: 0 seconds (no data loss)
- With daily backup: Up to 24 hours data loss
- With no backup: Complete data loss ❌

---

## ✅ Verification Checklist

After completing setup, verify everything works:

- [ ] Audit triggers are active
  ```sql
  SELECT COUNT(*) FROM audit.operation_log;
  -- Should return > 0 after making any change
  ```

- [ ] Supabase alerts enabled and email configured

- [ ] Downloaded at least one manual backup

- [ ] GitHub Actions workflow tested and passing

- [ ] Can view audit logs in Supabase SQL Editor

- [ ] Documented backup restoration process

- [ ] Calendar reminder set for monthly backup test

- [ ] Team knows where backups are stored

---

## 📚 Documentation

**Full Guide:** `docs/SUPABASE_AUDIT_LOGGING.md`

**Key Files:**
- `supabase/migrations/20251108000000_audit_logging.sql` - Audit triggers
- `.github/workflows/backup-database.yml` - Automated backups
- `docs/SUPABASE_AUDIT_LOGGING.md` - Complete documentation

**Useful Queries:**
```sql
-- View recent audit events
SELECT * FROM audit.operation_log 
ORDER BY created_at DESC LIMIT 100;

-- Check backup file sizes
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as database_size;

-- View table sizes
SELECT 
  schemaname || '.' || tablename as table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

---

## 🎯 Success Criteria

You have proper audit logging when:
- ✅ All critical table changes are logged automatically
- ✅ Daily backups run without failures
- ✅ Can restore from backup successfully
- ✅ Alerts notify you of database issues
- ✅ Audit logs show who changed what and when
- ✅ Backups are stored in multiple locations

---

**Estimated Setup Time:** 30 minutes
**Monthly Maintenance:** 30 minutes
**Peace of Mind:** Priceless 😌

**Questions?** Check `docs/SUPABASE_AUDIT_LOGGING.md` or Supabase support.
