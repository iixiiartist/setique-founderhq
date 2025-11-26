# Supabase Audit Logging & Backup Guide

Complete guide for setting up comprehensive audit logging, automated backups, and monitoring for FounderHQ's Supabase database.

## Table of Contents
1. [Overview](#overview)
2. [Current Audit System](#current-audit-system)
3. [Enable Point-in-Time Recovery](#enable-point-in-time-recovery)
4. [Setup Automated Backups](#setup-automated-backups)
5. [Enable Database Logs](#enable-database-logs)
6. [Critical Table Triggers](#critical-table-triggers)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Backup Restoration](#backup-restoration)

---

## Overview

**What is Audit Logging?**
Audit logging tracks all database changes (INSERT, UPDATE, DELETE) for security, compliance, and debugging purposes.

**Why You Need It:**
- 🔒 **Security** - Track unauthorized access attempts
- 📋 **Compliance** - Meet SOC 2, GDPR, HIPAA requirements
- 🐛 **Debugging** - Understand what changed and when
- ↩️ **Recovery** - Restore data after accidental deletion
- 📊 **Analytics** - Understand user behavior patterns

---

## Current Audit System

### Application-Level Activity Logging ✅

You already have a robust activity logging system in place:

**Tables:**
- `activity_log` - Tracks all user actions

**Covered Actions:**
- ✅ Task operations (create, update, delete, assign, complete)
- ✅ CRM operations (company/contact management, assignments)
- ✅ Marketing campaigns (create, assign, status changes)
- ✅ Financial logs (create, expense submission/approval)
- ✅ Document operations (upload, share, review, comment)
- ✅ Calendar events (create, invite attendees)
- ✅ Comments (add, update, delete)

**Features:**
- User attribution (who did what)
- Timestamp tracking
- Metadata (details about the change)
- RLS protection (immutable audit trail)

**Location:** `lib/services/activityService.ts`

---

## Enable Point-in-Time Recovery

Point-in-Time Recovery (PITR) allows you to restore your database to any point in the last 7-30 days.

### Step 1: Check Your Plan

**PITR Requirements:**
- ❌ **Free Tier**: Not available
- ❌ **Pro ($25/month)**: Not included by default
- ✅ **Pro with PITR Add-on ($100/month total)**: 7 days of PITR
- ✅ **Team ($599/month)**: 14 days of PITR
- ✅ **Enterprise**: 30+ days custom

**Current Recommendation:**
If you're on Pro plan, enable the PITR add-on ($75/month extra) for production databases.

### Step 2: Enable PITR

1. Go to Supabase Dashboard → Your Project
2. Click **Settings** → **Backups**
3. Under **Point in Time Recovery**
4. Click **Enable PITR**
5. Choose retention period (7, 14, or 30 days)
6. Confirm billing

**What You Get:**
- Continuous backups every minute
- Restore to any second within retention period
- Zero data loss potential (RPO = 0)
- Fast restoration (RTO = minutes)

---

## Setup Automated Backups

Even with PITR, you should have daily full backups for long-term retention.

### Option 1: Supabase Built-in Backups (Easiest)

**Included in All Plans:**
- ✅ Daily automatic backups
- ✅ 7-day retention on Pro plan
- ✅ 14-day retention on Team plan
- ✅ Downloadable via Dashboard

**How to Download:**
1. Go to Supabase Dashboard → Settings → **Backups**
2. See list of daily backups
3. Click **Download** to save locally
4. Store in secure location (S3, Google Drive, etc.)

### Option 2: Custom Backup Script (Advanced)

Create automated backups to your own storage:

```bash
#!/bin/bash
# File: scripts/backup-database.sh

# Configuration
PROJECT_REF="your-project-ref"
DB_PASSWORD="your-db-password"
BACKUP_DIR="/backups/founderhq"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="founderhq_backup_${DATE}.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run pg_dump
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h db.${PROJECT_REF}.supabase.co \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-acl \
  -F c \
  -f "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to S3 (optional)
# aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}.gz" s3://your-bucket/backups/

# Clean up old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

**Setup Cron Job:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1
```

### Option 3: GitHub Actions Backup (Recommended for Existing Setup)

Create `.github/workflows/backup-database.yml`:

```yaml
name: Daily Database Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Install PostgreSQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
      
      - name: Create backup
        env:
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
        run: |
          DATE=$(date +%Y-%m-%d_%H-%M-%S)
          BACKUP_FILE="founderhq_backup_${DATE}.sql"
          
          PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
            -h db.${SUPABASE_PROJECT_REF}.supabase.co \
            -U postgres \
            -d postgres \
            --no-owner \
            --no-acl \
            -F c \
            -f "$BACKUP_FILE"
          
          gzip "$BACKUP_FILE"
          echo "BACKUP_FILE=${BACKUP_FILE}.gz" >> $GITHUB_ENV
      
      - name: Upload to artifact
        uses: actions/upload-artifact@v4
        with:
          name: database-backup-${{ github.run_number }}
          path: founderhq_backup_*.sql.gz
          retention-days: 30
      
      # Optional: Upload to S3
      # - name: Upload to S3
      #   uses: aws-actions/configure-aws-credentials@v4
      #   with:
      #     aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      #     aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      #     aws-region: us-east-1
      #
      # - name: Copy to S3
      #   run: aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
```

**Setup GitHub Secrets:**
1. Go to GitHub repo → Settings → Secrets
2. Add `SUPABASE_DB_PASSWORD`
3. Add `SUPABASE_PROJECT_REF`

---

## Enable Database Logs

### Access PostgreSQL Logs

Supabase provides PostgreSQL logs for monitoring and debugging:

**View Logs:**
1. Go to Supabase Dashboard → **Logs**
2. Select **Database** logs
3. Filter by severity: ERROR, WARNING, INFO

**What's Logged:**
- Long-running queries
- Failed authentication attempts
- Constraint violations
- Connection errors
- RLS policy violations

**Log Retention:**
- Free: 1 day
- Pro: 7 days
- Team: 14 days
- Enterprise: 90+ days

### Enable Query Performance Insights

**Enable pg_stat_statements:**

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Critical Table Triggers

Add database-level triggers for critical tables that need immutable audit trails.

### Create Audit Schema

```sql
-- File: supabase/migrations/audit_triggers.sql

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Audit log table for critical operations
CREATE TABLE IF NOT EXISTS audit.operation_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_audit_table_name ON audit.operation_log(table_name);
CREATE INDEX idx_audit_user_id ON audit.operation_log(user_id);
CREATE INDEX idx_audit_created_at ON audit.operation_log(created_at DESC);

-- Enable RLS (only admins can read audit logs)
ALTER TABLE audit.operation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON audit.operation_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
  );

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit.log_operation()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
BEGIN
  -- Calculate changed fields for UPDATEs
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
  END IF;

  -- Insert audit record
  INSERT INTO audit.operation_log (
    table_name,
    operation,
    user_id,
    old_data,
    new_data,
    changed_fields,
    ip_address
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
    changed_fields,
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to critical tables
CREATE TRIGGER audit_workspaces
  AFTER INSERT OR UPDATE OR DELETE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

CREATE TRIGGER audit_workspace_members
  AFTER INSERT OR UPDATE OR DELETE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

CREATE TRIGGER audit_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

CREATE TRIGGER audit_business_profile
  AFTER INSERT OR UPDATE OR DELETE ON business_profile
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

CREATE TRIGGER audit_workspace_invitations
  AFTER INSERT OR UPDATE OR DELETE ON workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

-- Add comment
COMMENT ON TABLE audit.operation_log IS 'Immutable audit log for critical database operations';
```

**Deploy Migration:**
```bash
# Create migration file
supabase migration new audit_triggers

# Copy SQL above into the migration file
# Then apply
supabase db push
```

---

## Monitoring & Alerts

### Setup Supabase Alerts

**Available Alerts:**
1. Database CPU > 80%
2. Database Memory > 80%
3. Disk usage > 80%
4. API errors > 100/minute
5. Connection pool exhausted

**Configure:**
1. Go to Supabase Dashboard → Settings → **Alerts**
2. Enable alerts you want
3. Add email/Slack webhook
4. Set thresholds

### Custom Monitoring Queries

**Monitor Critical Operations:**

```sql
-- Recent workspace deletions
SELECT 
  user_id,
  old_data->>'name' as workspace_name,
  created_at
FROM audit.operation_log
WHERE table_name = 'workspaces'
  AND operation = 'DELETE'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Failed authentication attempts
SELECT 
  COUNT(*),
  ip_address
FROM audit.operation_log
WHERE table_name = 'auth.users'
  AND operation = 'FAILED_LOGIN'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5;

-- Subscription changes
SELECT 
  user_id,
  old_data->>'plan_type' as old_plan,
  new_data->>'plan_type' as new_plan,
  created_at
FROM audit.operation_log
WHERE table_name = 'subscriptions'
  AND operation = 'UPDATE'
  AND changed_fields @> ARRAY['plan_type']
ORDER BY created_at DESC
LIMIT 20;
```

---

## Backup Restoration

### Restore from Supabase Backup

**Full Database Restore:**

1. Go to Supabase Dashboard → Settings → **Backups**
2. Find the backup point you want to restore
3. Click **Restore**
4. Confirm (this will replace current database!)
5. Wait for restoration to complete (5-15 minutes)

**Point-in-Time Restore:**

1. Go to Settings → **Backups** → **Point in Time Recovery**
2. Select date and time
3. Click **Restore**
4. New project will be created with restored data
5. Update connection strings in Netlify

### Restore from Downloaded Backup

**Using pg_restore:**

```bash
# Decompress backup
gunzip founderhq_backup_2025-11-08.sql.gz

# Restore to Supabase
pg_restore \
  -h db.your-project-ref.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  founderhq_backup_2025-11-08.sql

# Enter password when prompted
```

**Restore Specific Table:**

```bash
# List tables in backup
pg_restore -l founderhq_backup_2025-11-08.sql

# Restore only workspaces table
pg_restore \
  -h db.your-project-ref.supabase.co \
  -U postgres \
  -d postgres \
  --table=workspaces \
  founderhq_backup_2025-11-08.sql
```

### Testing Restores

**Best Practice:** Test your backups monthly!

```bash
# Create test project
supabase projects create test-restore

# Restore backup to test project
pg_restore \
  -h db.test-project-ref.supabase.co \
  -U postgres \
  -d postgres \
  founderhq_backup_latest.sql

# Verify data integrity
psql -h db.test-project-ref.supabase.co \
  -U postgres \
  -d postgres \
  -c "SELECT COUNT(*) FROM workspaces;"

# Delete test project after verification
supabase projects delete test-restore
```

---

## Compliance & Retention

### Data Retention Policy

**Recommended Retention:**
- Activity logs: 1 year
- Audit logs: 7 years (compliance)
- Database backups: 90 days
- PITR: 7-30 days

**Cleanup Query:**

```sql
-- Delete old activity logs (keep 1 year)
DELETE FROM activity_log
WHERE created_at < NOW() - INTERVAL '1 year';

-- Archive old audit logs (never delete)
-- Instead, move to cold storage
INSERT INTO audit.operation_log_archive
SELECT * FROM audit.operation_log
WHERE created_at < NOW() - INTERVAL '2 years';
```

### Compliance Requirements

**SOC 2:**
- ✅ Audit all data access
- ✅ Track all changes to sensitive data
- ✅ 90-day backup retention minimum
- ✅ Regular backup testing
- ✅ Encryption at rest and in transit

**GDPR:**
- ✅ Log all personal data access
- ✅ Support for data export
- ✅ Support for data deletion
- ✅ Audit trail of consent changes

**HIPAA** (if handling health data):
- ✅ BAA with Supabase (Enterprise plan)
- ✅ Encrypted backups
- ✅ Access logs for all PHI
- ✅ Automatic session timeout

---

## Quick Reference

### Essential Commands

```bash
# Download latest backup
supabase db dump --db-url "$DATABASE_URL" > backup.sql

# List all tables
psql -h db.REF.supabase.co -U postgres -d postgres -c "\dt"

# View database size
psql -h db.REF.supabase.co -U postgres -d postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# View table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Key Contacts

- **Supabase Support**: support@supabase.com
- **Emergency Database Issues**: support.supabase.com
- **Community**: discord.gg/supabase

---

## Checklist

### Initial Setup
- [ ] Enable PITR (if on Pro+ plan)
- [ ] Setup automated daily backups
- [ ] Configure backup retention policy
- [ ] Create audit triggers for critical tables
- [ ] Enable database performance monitoring
- [ ] Setup Supabase alerts (CPU, memory, disk)
- [ ] Document restoration procedures

### Monthly Tasks
- [ ] Test backup restoration
- [ ] Review audit logs for anomalies
- [ ] Check disk usage trends
- [ ] Review slow query logs
- [ ] Verify backup file integrity
- [ ] Clean up old logs per retention policy

### Quarterly Tasks
- [ ] Review and update retention policies
- [ ] Audit access controls
- [ ] Review compliance requirements
- [ ] Update documentation
- [ ] Disaster recovery drill

---

**Last Updated:** November 8, 2025
**Next Review:** February 8, 2026
