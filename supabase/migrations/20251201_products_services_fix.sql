-- Products Services Fix Migration
-- Adds missing billing_period column and fixes status constraint
-- Date: 2025-12-01

-- ============================================================================
-- 1. ADD MISSING BILLING_PERIOD COLUMN
-- ============================================================================

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS billing_period TEXT 
CHECK (billing_period IN ('one_time', 'weekly', 'monthly', 'quarterly', 'annual', 'custom'));

-- ============================================================================
-- 2. FIX STATUS CONSTRAINT (drop old and add correct one)
-- ============================================================================

-- Drop old constraint if exists
ALTER TABLE products_services DROP CONSTRAINT IF EXISTS products_services_status_check;

-- Add correct constraint with all valid statuses
ALTER TABLE products_services 
ADD CONSTRAINT products_services_status_check 
CHECK (status IN ('draft', 'active', 'inactive', 'discontinued', 'archived', 'out_of_stock'));

-- ============================================================================
-- 3. REFRESH SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';
