#!/bin/bash
# Script to apply notification indexes migration and verify results
# Usage: ./scripts/apply-notification-indexes.sh

set -e  # Exit on error

echo "=========================================="
echo "Notification Indexes Migration Script"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ ERROR: Supabase CLI is not installed"
    echo ""
    echo "Install with:"
    echo "  npm install -g supabase"
    echo "  or"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if we're linked to a project
if ! supabase status &> /dev/null; then
    echo "⚠️  Not linked to a Supabase project"
    echo ""
    echo "To link to your project:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Or apply migration manually in Supabase Dashboard:"
    echo "  1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
    echo "  2. Copy contents of: supabase/migrations/20251115_notification_indexes.sql"
    echo "  3. Paste and run the SQL"
    exit 1
fi

echo "📋 Checking current migration status..."
supabase db diff --schema public
echo ""

echo "🚀 Applying migration: 20251115_notification_indexes.sql"
supabase db push
echo ""

echo "✅ Migration applied successfully!"
echo ""

echo "🔍 Verifying indexes were created..."
echo ""

# Query to check indexes
VERIFY_SQL="
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'notifications'
    AND indexname LIKE 'idx_notifications_%'
ORDER BY indexname;
"

echo "Indexes on notifications table:"
echo "$VERIFY_SQL" | supabase db execute

echo ""
echo "📊 Checking index sizes..."
INDEX_SIZE_SQL="
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'notifications'
    AND indexname LIKE 'idx_notifications_%'
ORDER BY pg_relation_size(indexrelid) DESC;
"

echo "$INDEX_SIZE_SQL" | supabase db execute

echo ""
echo "=========================================="
echo "✅ Migration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Test notification performance in your app"
echo "  2. Monitor query times in Supabase Dashboard"
echo "  3. Check docs/notification-testing-guide.md for testing procedures"
echo ""
