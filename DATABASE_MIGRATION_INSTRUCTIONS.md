# Database Migration Instructions

## Marketing Assignments Migration

The application is now fully updated to support marketing campaign assignments, but the database schema needs to be updated manually.

### Why Manual Migration?

Automated `npx supabase db push` failed due to an older migration error:
```
ERROR: column "seat_count" of relation "workspaces" does not exist (SQLSTATE 42703)
```

This is unrelated to our new changes, so we need to apply the migration manually.

### Steps to Apply Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `setique-founder-dashboard`

2. **Navigate to SQL Editor**
   - In the left sidebar, click **SQL Editor**
   - Click **New Query**

3. **Copy and Run This SQL**

```sql
-- Add marketing assignment columns
ALTER TABLE marketing_items 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_marketing_assigned ON marketing_items(assigned_to);

-- Add helpful comments
COMMENT ON COLUMN marketing_items.assigned_to IS 'User ID of the team member assigned to this marketing campaign';
COMMENT ON COLUMN marketing_items.assigned_to_name IS 'Display name of the assigned user (denormalized for performance)';
```

4. **Verify Migration**

Run this query to confirm columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'marketing_items' 
AND column_name IN ('assigned_to', 'assigned_to_name');
```

Expected output:
```
column_name       | data_type
------------------|-----------
assigned_to       | uuid
assigned_to_name  | text
```

5. **Test with Sample Data** (Optional)

```sql
-- View current marketing items
SELECT id, title, assigned_to, assigned_to_name 
FROM marketing_items 
LIMIT 5;

-- Should return rows with NULL values for assigned_to and assigned_to_name
```

### Financial Data Columns

**Note:** Financial data (financial_logs and expenses) already have user tracking columns in the database. If you encounter any issues, verify with:

```sql
-- Check financial_logs columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_logs';

-- Check expenses columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses';
```

If `user_id` and `user_name` columns are missing, add them:

```sql
-- Financial logs user tracking
ALTER TABLE financial_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Expenses user tracking
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS user_name TEXT;
```

### What Happens After Migration

Once the migration is applied:

1. **Marketing Tab**
   - AssignmentDropdown will work properly
   - Campaign assignments will persist to database
   - Filter dropdown (All/My/Unassigned) will function correctly
   - Assignee names will display on campaign cards

2. **Financials Tab**
   - New financial logs will save with creator's userId and userName
   - New expenses will save with creator's userId and userName
   - Owner will see all financial data
   - Members will only see their own financial data

### Troubleshooting

**Issue:** "relation 'profiles' does not exist"
- **Solution:** Ensure your database has the profiles table. Check with: `SELECT * FROM profiles LIMIT 1;`

**Issue:** "column already exists"
- **Solution:** This is fine! The `IF NOT EXISTS` clause prevents errors if columns are already present.

**Issue:** "permission denied"
- **Solution:** Make sure you're logged in as the database owner or have admin privileges.

### Next Steps After Migration

1. ✅ Test marketing assignments (see TESTING_GUIDE.md)
2. ✅ Test financial data filtering (see TESTING_GUIDE.md)
3. ✅ Update COLLABORATION_FEATURES_COMPLETE.md with final status
4. ✅ Verify activity log captures assignment changes

---

**Migration File Reference:** `supabase/migrations/20251104221451_add_marketing_assignments.sql`

**Code Status:** 
- ✅ Types updated
- ✅ UI components updated
- ✅ Service layer updated
- ⏳ Database schema (pending this manual migration)
