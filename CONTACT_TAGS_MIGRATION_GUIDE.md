# Contact Tags Migration Guide

## Issue
Contact tags (and phone/title fields) were not being created or populated because the database schema was missing these columns.

## Root Cause
The `contacts` table in the database schema (`supabase/schema.sql`) only had these columns:
- id, user_id, crm_item_id
- created_at, updated_at
- name, email, linkedin
- notes (JSONB)

The TypeScript types defined `tags`, `phone`, and `title` fields, but these columns didn't exist in the actual database, causing all tag operations to fail silently.

## Solution
Run the migration SQL file to add the missing columns:

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `add_contact_tags_column.sql` from this repository
4. Copy and paste the SQL into the editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI
```bash
# From the project root
supabase db execute < add_contact_tags_column.sql
```

### Option 3: Manual Connection
```bash
# Connect to your database
psql <your-database-connection-string>

# Run the migration
\i add_contact_tags_column.sql
```

## Migration Contents
The migration adds:
1. **tags** column (JSONB array, default: `[]`)
2. **phone** column (TEXT, optional)
3. **title** column (TEXT, optional - for job titles)
4. GIN index on tags for better query performance

## Verification
After running the migration, verify with:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'contacts' AND column_name IN ('tags', 'phone', 'title')
ORDER BY column_name;
```

You should see all three columns listed.

## Testing
After applying the migration:
1. Open the Contact Manager in your app
2. Select a contact and click the 🏷️ Tags button
3. Add a new tag and save
4. Verify the tag appears on the contact card
5. Test filtering by tags using the filter dropdown
6. Test editing phone and title fields in Add/Edit Contact forms

## Rollback (if needed)
```sql
ALTER TABLE contacts DROP COLUMN IF EXISTS tags;
ALTER TABLE contacts DROP COLUMN IF EXISTS phone;
ALTER TABLE contacts DROP COLUMN IF EXISTS title;
DROP INDEX IF EXISTS idx_contacts_tags;
```

## Related Files
- Migration: `add_contact_tags_column.sql`
- Component: `components/shared/ContactManager.tsx`
- Types: `types.ts` (Contact interface)
- Database Service: `lib/services/database.ts`
- Schema: `supabase/schema.sql`
