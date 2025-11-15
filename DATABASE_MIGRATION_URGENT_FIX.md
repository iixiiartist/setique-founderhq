# 🚨 URGENT: Database Migration Required

## Issue Summary

The application is encountering errors because **database migrations are incomplete**. Two critical issues:

1. ✅ **Fixed in code**: Function parameter name mismatch (`workspace_uuid` → `p_workspace_id`)
2. ⚠️ **Requires database migration**: `products_services` table exists but missing columns

## Error Messages

```
Could not find the 'capacity_tracking' column of 'products_services' in the schema cache
```

**Analysis**: The table exists (shown in your index list) but is missing the `capacity_tracked` column and potentially others. The migration was partially applied but failed on index creation due to duplicates.

## What Happened

The migration started but failed at the index creation step because some indexes already existed:
- Error: `relation "idx_products_services_workspace" already exists`
- This caused the migration to abort before adding all columns
- Result: Table has basic structure but missing newer columns like `capacity_tracked`

---

## Required Actions

### 1. Run Products & Services Migration

**File**: `supabase/migrations/20251115_products_services_core.sql`

**What it does**:
- Creates `products_services` table (main catalog)
- Creates `product_price_history` table (price tracking)
- Creates `product_service_bundles` table (product bundles)
- Adds columns to `deals` table (`linked_product_ids`, `auto_price_from_products`)
- Adds columns to `revenue_transactions` table (`linked_product_ids`, `product_revenue_breakdown`)
- Adds columns to `marketing_items` table (`linked_product_ids`, `target_product_categories`)
- Creates indexes for performance
- Sets up RLS policies

**How to run**:

#### Option A: Supabase Dashboard (Recommended)

1. Open Supabase Dashboard: <https://app.supabase.com>
2. Select your project: `setique-founderhq`
3. Navigate to **SQL Editor**
4. Open the file: `supabase/migrations/20251115_products_services_core.sql`
5. Copy entire contents (now updated with IF NOT EXISTS)
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Should complete successfully (migration is now idempotent)

#### Option B: Supabase CLI
```bash
# Navigate to project root
cd /workspaces/setique-founderhq

# Run migration
supabase db push

# Or apply specific migration
psql "$DATABASE_URL" -f supabase/migrations/20251115_products_services_core.sql
```

---

### 2. Run Security Hardening (Optional but Recommended)

**File**: `fix_security_warnings.sql`

**What it does**:
- Hardens 18 PostgreSQL functions against search path injection
- Fixes `get_workspace_members_with_profiles` to use correct parameter name

**How to run**:

#### Supabase Dashboard
1. Open **SQL Editor**
2. Copy contents of `fix_security_warnings.sql`
3. Paste and **Run**

---

## Verification Steps

After running migrations, verify in Supabase Dashboard:

### Check Table Exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'products_services';
```

**Expected**: Returns 1 row with `products_services`

### Check Columns Exist
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'products_services'
ORDER BY ordinal_position;
```

**Expected**: Returns ~40+ columns including:
- `id`, `workspace_id`, `name`, `category`, `type`
- `base_price`, `currency`, `pricing_model`
- `inventory_tracked`, `quantity_on_hand`
- `capacity_tracked`, `capacity_unit`, `capacity_total`

### Check Function Parameter
```sql
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_workspace_members_with_profiles';
```

**Expected**: Returns `p_workspace_id uuid` (not `workspace_uuid`)

### Test Products & Services Creation
```sql
-- Insert test product
INSERT INTO products_services (
  workspace_id,
  name,
  category,
  type,
  pricing_model,
  base_price,
  currency,
  status
) VALUES (
  'acc0386c-240e-4f4b-8026-933a7fe00fbd', -- Your workspace ID
  'Test Product',
  'product',
  'physical',
  'flat_rate',
  99.99,
  'USD',
  'active'
) RETURNING *;
```

**Expected**: Returns newly created product record

---

## Post-Migration Actions

1. **Refresh browser**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear cache**: May need to clear browser cache
3. **Test Products & Services tab**:
   - Navigate to Products & Services tab
   - Click "Add Product/Service"
   - Fill in form and save
   - Should succeed without errors

4. **Test Workspace Members**:
   - Navigate to Settings → Team
   - Members list should load without 404 errors

---

## Migration File Locations

```
/workspaces/setique-founderhq/
├── supabase/migrations/
│   └── 20251115_products_services_core.sql  ⚠️ MUST RUN
├── fix_security_warnings.sql                ✅ RECOMMENDED
└── DATABASE_MIGRATION_URGENT_FIX.md         📖 THIS FILE
```

---

## Current Status

- ✅ **Code Fix Applied**: Changed `workspace_uuid` to `p_workspace_id` in `database.ts`
- ⚠️ **Migration Pending**: `20251115_products_services_core.sql` NOT applied
- ⚠️ **Security Fix Pending**: `fix_security_warnings.sql` NOT applied

---

## What Happens After Migration?

✅ Products & Services tab will load and function correctly
✅ Product creation modal will save successfully  
✅ Workspace members will load without errors
✅ All database CRUD operations will work
✅ Security warnings from Supabase advisor will be resolved

---

## Rollback Plan (if needed)

If migration causes issues:

```sql
-- Drop products & services tables
DROP TABLE IF EXISTS product_service_bundles CASCADE;
DROP TABLE IF EXISTS product_price_history CASCADE;
DROP TABLE IF EXISTS products_services CASCADE;

-- Remove columns from existing tables
ALTER TABLE deals 
  DROP COLUMN IF EXISTS linked_product_ids,
  DROP COLUMN IF EXISTS auto_price_from_products;

ALTER TABLE revenue_transactions 
  DROP COLUMN IF EXISTS linked_product_ids,
  DROP COLUMN IF EXISTS product_revenue_breakdown;

ALTER TABLE marketing_items 
  DROP COLUMN IF EXISTS linked_product_ids,
  DROP COLUMN IF EXISTS target_product_categories;
```

---

## Support

If you encounter errors during migration:

1. Copy the full error message
2. Check Supabase logs: Dashboard → Logs → Postgres Logs
3. Verify your database user has CREATE TABLE permissions
4. Ensure no table name conflicts exist

---

## Next Steps After Migration

Once migrations are applied:

1. ✅ Test Products & Services features
2. ✅ Test workspace member loading
3. ✅ Verify no console errors
4. ✅ Test deal-product linking
5. ✅ Test revenue-product attribution
6. 🚀 Deploy to production

---

**Last Updated**: 2025-11-15  
**Migration Version**: 20251115_products_services_core  
**Priority**: 🚨 URGENT - Application partially broken without this migration
