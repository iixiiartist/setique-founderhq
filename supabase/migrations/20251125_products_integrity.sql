-- Products/Services Schema Integrity
-- Migration: 20251125_products_integrity.sql
-- Purpose: Add workspace-scoped uniqueness and cross-table integrity checks

-- ============================================================================
-- 1. ADD UNIQUE CONSTRAINTS PER WORKSPACE
-- ============================================================================

-- SKU must be unique per workspace (if provided)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_sku_per_workspace'
    ) THEN
        ALTER TABLE products_services
        ADD CONSTRAINT unique_sku_per_workspace 
        UNIQUE (workspace_id, sku);
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Duplicate SKUs exist - cleaning up before constraint';
        -- Handle duplicates by appending suffix
        UPDATE products_services ps
        SET sku = ps.sku || '-' || ps.id::text
        WHERE EXISTS (
            SELECT 1 FROM products_services ps2 
            WHERE ps2.workspace_id = ps.workspace_id 
            AND ps2.sku = ps.sku 
            AND ps2.id != ps.id
        );
        ALTER TABLE products_services
        ADD CONSTRAINT unique_sku_per_workspace 
        UNIQUE (workspace_id, sku);
END $$;

-- ============================================================================
-- 2. CREATE WORKSPACE INTEGRITY CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_product_workspace_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if product_id references a product from the same workspace
    IF NEW.product_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM products_services 
            WHERE id = NEW.product_id 
            AND workspace_id = NEW.workspace_id
        ) THEN
            RAISE EXCEPTION 'Product (%) must belong to the same workspace (%)', 
                NEW.product_id, NEW.workspace_id;
        END IF;
    END IF;
    
    -- Check if product_service_id references a product from the same workspace
    IF NEW.product_service_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM products_services 
            WHERE id = NEW.product_service_id 
            AND workspace_id = NEW.workspace_id
        ) THEN
            RAISE EXCEPTION 'Product/Service (%) must belong to the same workspace (%)', 
                NEW.product_service_id, NEW.workspace_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. APPLY TRIGGER TO DEALS TABLE (if it has product references)
-- ============================================================================

DO $$
BEGIN
    -- Check if deals table has product_id or product_service_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' 
        AND column_name IN ('product_id', 'product_service_id')
    ) THEN
        DROP TRIGGER IF EXISTS check_deal_product_workspace ON deals;
        CREATE TRIGGER check_deal_product_workspace
            BEFORE INSERT OR UPDATE ON deals
            FOR EACH ROW
            EXECUTE FUNCTION check_product_workspace_integrity();
    END IF;
END $$;

-- ============================================================================
-- 4. APPLY TRIGGER TO REVENUE TRANSACTIONS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'revenue_transactions'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'revenue_transactions' 
            AND column_name IN ('product_id', 'product_service_id')
        ) THEN
            DROP TRIGGER IF EXISTS check_revenue_product_workspace ON revenue_transactions;
            CREATE TRIGGER check_revenue_product_workspace
                BEFORE INSERT OR UPDATE ON revenue_transactions
                FOR EACH ROW
                EXECUTE FUNCTION check_product_workspace_integrity();
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 5. ADD JSONB VALIDATION CONSTRAINTS
-- ============================================================================

-- Validate tiered_pricing is array with reasonable limit
DO $$
BEGIN
    ALTER TABLE products_services
    ADD CONSTRAINT valid_tiered_pricing CHECK (
        tiered_pricing IS NULL OR (
            jsonb_typeof(tiered_pricing) = 'array' AND
            jsonb_array_length(tiered_pricing) <= 20
        )
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint valid_tiered_pricing already exists';
END $$;

-- Validate subscription_plans is array with reasonable limit
DO $$
BEGIN
    ALTER TABLE products_services
    ADD CONSTRAINT valid_subscription_plans CHECK (
        subscription_plans IS NULL OR (
            jsonb_typeof(subscription_plans) = 'array' AND
            jsonb_array_length(subscription_plans) <= 10
        )
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint valid_subscription_plans already exists';
END $$;

-- Validate usage_pricing is array with reasonable limit
DO $$
BEGIN
    ALTER TABLE products_services
    ADD CONSTRAINT valid_usage_pricing CHECK (
        usage_pricing IS NULL OR (
            jsonb_typeof(usage_pricing) = 'array' AND
            jsonb_array_length(usage_pricing) <= 15
        )
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint valid_usage_pricing already exists';
END $$;

-- ============================================================================
-- 6. HELPER FUNCTION TO VALIDATE PRODUCT WORKSPACE ALIGNMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_product_workspace_alignment()
RETURNS TABLE(
    table_name TEXT,
    record_id UUID,
    workspace_id UUID,
    product_id UUID,
    issue TEXT
) AS $$
BEGIN
    -- Check deals table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'product_service_id') THEN
        RETURN QUERY
        SELECT 
            'deals'::TEXT,
            d.id,
            d.workspace_id,
            d.product_service_id,
            'Product from different workspace'::TEXT
        FROM deals d
        WHERE d.product_service_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM products_services ps 
            WHERE ps.id = d.product_service_id 
            AND ps.workspace_id = d.workspace_id
        );
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
