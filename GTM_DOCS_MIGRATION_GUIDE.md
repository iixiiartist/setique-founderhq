# GTM Docs Migration Guide

## Overview
This guide covers the safe deployment of the GTM Docs system - a rich-text document authoring feature for GTM workspaces.

## Database Changes

### New Tables
1. **`gtm_docs`** - Main table for GTM documents with rich text content
2. **`gtm_doc_links`** - Flexible linking table for associating docs with tasks, events, CRM items, etc.

### Key Features
- Rich text storage (Tiptap JSON + plain text for search/AI)
- Document types: brief, campaign, meeting_notes, battlecard, outbound_template, icp_sheet, persona, competitive_snapshot
- Visibility controls: private (owner only) or team (all workspace members)
- Full-text search using PostgreSQL tsvector
- Templates system for GTM workflows
- Flexible entity linking (tasks, calendar events, CRM, contacts, chat)

### Row Level Security (RLS)
- ✅ Team docs visible to all workspace members
- ✅ Private docs only visible to owner
- ✅ Users can only create docs in their own workspace
- ✅ Users can only modify/delete their own docs
- ✅ Workspace isolation enforced

## Migration File
`supabase/migrations/20251110201512_create_gtm_docs_tables.sql`

## Pre-Deployment Checklist

### 1. Review Migration SQL
```bash
cat supabase/migrations/20251110201512_create_gtm_docs_tables.sql
```

Verify:
- [x] Tables use `IF NOT EXISTS` for idempotency
- [x] Foreign keys reference correct tables (workspaces, profiles)
- [x] RLS policies are comprehensive
- [x] Indexes cover common query patterns
- [x] Triggers are properly named

### 2. Backup Database
Before applying to production:
```sql
-- In Supabase Dashboard SQL Editor
-- Take note of current migration version
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;
```

### 3. Test Migration Locally (Optional)
If you have Supabase CLI:
```bash
# Reset and apply all migrations
supabase db reset --local

# Or apply just this migration
supabase migration up --local
```

## Deployment Steps

### Option A: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `supabase/migrations/20251110201512_create_gtm_docs_tables.sql`
4. Run the query
5. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('gtm_docs', 'gtm_doc_links');
   ```
6. Check RLS enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('gtm_docs', 'gtm_doc_links');
   ```

### Option B: Supabase CLI
```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Or apply specific migration
supabase migration up --include 20251110201512
```

## Validation Tests

### 1. Table Structure
```sql
-- Verify columns
\d gtm_docs
\d gtm_doc_links

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('gtm_docs', 'gtm_doc_links');
```

### 2. RLS Policies
```sql
-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('gtm_docs', 'gtm_doc_links');
```

### 3. Triggers
```sql
-- Verify triggers exist
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('gtm_docs', 'gtm_doc_links');
```

### 4. Test Data Insertion
```sql
-- Insert test doc (replace with your user_id and workspace_id)
INSERT INTO gtm_docs (
    workspace_id,
    owner_id,
    title,
    doc_type,
    content_plain,
    visibility
) VALUES (
    'YOUR_WORKSPACE_UUID',
    'YOUR_USER_UUID',
    'Test GTM Brief',
    'brief',
    'This is a test document for the GTM docs system.',
    'team'
);

-- Verify search_vector was auto-populated
SELECT title, search_vector FROM gtm_docs WHERE title = 'Test GTM Brief';

-- Test full-text search
SELECT title FROM gtm_docs 
WHERE search_vector @@ to_tsquery('english', 'test');

-- Clean up test data
DELETE FROM gtm_docs WHERE title = 'Test GTM Brief';
```

### 5. RLS Testing
Test as different users to verify:
- User A can see their own private docs
- User A can see team docs in their workspace
- User A CANNOT see User B's private docs
- User A CANNOT see docs from other workspaces

## Rollback Plan

If issues occur, run this SQL to safely remove the new tables:

```sql
-- Drop tables (CASCADE will remove foreign keys)
DROP TABLE IF EXISTS gtm_doc_links CASCADE;
DROP TABLE IF EXISTS gtm_docs CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS gtm_docs_search_update ON gtm_docs;
DROP TRIGGER IF EXISTS gtm_docs_updated_at_update ON gtm_docs;

-- Drop functions
DROP FUNCTION IF EXISTS gtm_docs_search_trigger();
DROP FUNCTION IF EXISTS gtm_docs_updated_at_trigger();
```

## Post-Deployment

After successful migration:
1. ✅ Mark Task 1 complete in implementation plan
2. → Move to Task 2: Add TypeScript types
3. → Continue with frontend implementation

## Known Considerations

### Performance
- **Search**: Uses GIN index on tsvector, efficient for full-text search
- **Pagination**: Implement LIMIT/OFFSET for large doc lists
- **Content size**: JSONB can handle documents up to 1GB (practical limit ~10MB per doc)

### Future Enhancements
- Version history (separate `gtm_doc_versions` table)
- Real-time collaboration (Supabase Realtime subscriptions)
- Document comments/annotations
- Export to PDF/Markdown
- Shared external links (public docs)

## Support

If migration fails:
1. Check Supabase logs for detailed error messages
2. Verify foreign key references (workspaces.id and profiles.id must exist)
3. Ensure RLS is not blocking the migration user
4. Review error and refer to rollback plan above

## Migration Author
FounderHQ Team
Date: 2025-11-10
