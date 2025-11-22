-- Products & Services Core Migration
-- Creates products_services table and related enhancements
-- Date: 2025-11-15

-- ============================================================================
-- 1. CREATE MAIN PRODUCTS_SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS products_services (
    -- Core Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT, -- Stock Keeping Unit
    category TEXT NOT NULL CHECK (category IN ('product', 'service', 'bundle')),
    type TEXT NOT NULL CHECK (type IN ('digital', 'physical', 'saas', 'consulting', 'package', 'subscription', 'booking')),
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',
        'active',
        'inactive',
        'discontinued',
        'archived',
        'out_of_stock'
    )),
    
    -- Pricing Model
    pricing_model TEXT NOT NULL CHECK (pricing_model IN ('flat_rate', 'hourly', 'daily', 'weekly', 'monthly', 'annual', 'tiered', 'usage_based', 'custom')),
    base_price NUMERIC(15, 2),
    currency TEXT DEFAULT 'USD',
    billing_period TEXT CHECK (billing_period IN ('one_time', 'weekly', 'monthly', 'quarterly', 'annual', 'custom')),
    
    -- Cost Structure (for profit calculation)
    cost_of_goods NUMERIC(15, 2),
    cost_of_service NUMERIC(15, 2),
    overhead_allocation NUMERIC(15, 2),
    profit_margin_percent NUMERIC(5, 2),
    
    -- Pricing Variants (JSONB for flexibility)
    tiered_pricing JSONB, -- [{minQuantity: 1, maxQuantity: 10, price: 100}, ...]
    usage_pricing JSONB, -- [{metric: 'api_calls', unitPrice: 0.01, includedUnits: 1000}]
    subscription_plans JSONB, -- [{name: 'Basic', price: 29, billingCycle: 'monthly', features: [...]}]
    
    -- Inventory (for physical/digital products)
    inventory_tracked BOOLEAN DEFAULT false,
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (COALESCE(quantity_on_hand, 0) - COALESCE(quantity_reserved, 0)) STORED,
    reorder_point INTEGER,
    reorder_quantity INTEGER,
    
    -- Service Capacity (for service businesses)
    capacity_tracked BOOLEAN DEFAULT false,
    capacity_unit TEXT CHECK (capacity_unit IN ('hours', 'days', 'projects', 'seats')),
    capacity_total NUMERIC(10, 2),
    capacity_booked NUMERIC(10, 2) DEFAULT 0,
    capacity_available NUMERIC(10, 2) GENERATED ALWAYS AS (COALESCE(capacity_total, 0) - COALESCE(capacity_booked, 0)) STORED,
    capacity_period TEXT CHECK (capacity_period IN ('weekly', 'monthly', 'quarterly')),
    
    -- Tax & Compliance
    tax_code TEXT,
    tariff_code TEXT,
    is_taxable BOOLEAN DEFAULT true,
    tax_rate NUMERIC(5, 2),
    
    -- Metadata & Linking
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    document_ids UUID[],
    image_url TEXT,
    external_url TEXT,
    
    -- Analytics
    total_revenue NUMERIC(15, 2) DEFAULT 0,
    total_units_sold INTEGER DEFAULT 0,
    average_sale_value NUMERIC(15, 2),
    last_sold_date DATE,
    
    -- Custom Fields (flexible for future expansion)
    custom_fields JSONB,
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(sku, '')), 'C')
    ) STORED
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PRODUCTS_SERVICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_services_workspace ON products_services(workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_services_category ON products_services(category);
CREATE INDEX IF NOT EXISTS idx_products_services_type ON products_services(type);
CREATE INDEX IF NOT EXISTS idx_products_services_pricing_model ON products_services(pricing_model);
CREATE INDEX IF NOT EXISTS idx_products_services_status ON products_services(status);
CREATE INDEX IF NOT EXISTS idx_products_services_sku ON products_services(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_services_tags ON products_services USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_services_search ON products_services USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_services_created_at ON products_services(created_at DESC);

-- ============================================================================
-- 3. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_products_services_updated_at ON products_services;
CREATE TRIGGER update_products_services_updated_at
    BEFORE UPDATE ON products_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR PRODUCTS_SERVICES
-- ============================================================================

ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view products in their workspace" ON products_services;
CREATE POLICY "Users can view products in their workspace"
    ON products_services FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can create products in their workspace" ON products_services;
CREATE POLICY "Users can create products in their workspace"
    ON products_services FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update products in their workspace" ON products_services;
CREATE POLICY "Users can update products in their workspace"
    ON products_services FOR UPDATE
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete products in their workspace" ON products_services;
CREATE POLICY "Users can delete products in their workspace"
    ON products_services FOR DELETE
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

-- ============================================================================
-- 5. ALTER DEALS TABLE TO ADD PRODUCT/SERVICE LINKING
-- ============================================================================

ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_service_id UUID REFERENCES products_services(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_service_name TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 1;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_value NUMERIC(15, 2);

CREATE INDEX IF NOT EXISTS idx_deals_product_service ON deals(product_service_id) WHERE product_service_id IS NOT NULL;

-- ============================================================================
-- 6. ALTER REVENUE_TRANSACTIONS TABLE TO ADD PRODUCT/SERVICE LINKING
-- ============================================================================

ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS product_service_id UUID REFERENCES products_services(id) ON DELETE SET NULL;
ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 1;
ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2);

CREATE INDEX IF NOT EXISTS idx_revenue_transactions_product_service ON revenue_transactions(product_service_id) WHERE product_service_id IS NOT NULL;

-- ============================================================================
-- 7. ALTER MARKETING_ITEMS TABLE TO ADD PRODUCT/SERVICE LINKING
-- ============================================================================

ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS product_service_ids UUID[];
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS target_revenue NUMERIC(15, 2);

CREATE INDEX IF NOT EXISTS idx_marketing_items_product_services ON marketing_items USING GIN(product_service_ids) WHERE product_service_ids IS NOT NULL;

-- ============================================================================
-- 8. CREATE PRODUCT_PRICE_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_service_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES profiles(id),
    old_price NUMERIC(15, 2),
    new_price NUMERIC(15, 2),
    reason TEXT CHECK (reason IN ('promotion', 'cost_increase', 'market_adjustment', 'seasonal', 'other')),
    effective_from DATE,
    effective_to DATE
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_service_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON product_price_history(changed_at DESC);

-- RLS for price history
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view price history in their workspace" ON product_price_history;
CREATE POLICY "Users can view price history in their workspace"
    ON product_price_history FOR SELECT
    USING (product_service_id IN (
        SELECT id FROM products_services WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    ));

DROP POLICY IF EXISTS "Users can create price history in their workspace" ON product_price_history;
CREATE POLICY "Users can create price history in their workspace"
    ON product_price_history FOR INSERT
    WITH CHECK (product_service_id IN (
        SELECT id FROM products_services WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    ));

-- ============================================================================
-- 9. CREATE PRODUCT_SERVICE_BUNDLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_service_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) DEFAULT 1,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    is_optional BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    UNIQUE(bundle_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_bundles_bundle_id ON product_service_bundles(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundles_component_id ON product_service_bundles(component_id);

-- RLS for bundles
ALTER TABLE product_service_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bundles in their workspace" ON product_service_bundles;
CREATE POLICY "Users can view bundles in their workspace"
    ON product_service_bundles FOR SELECT
    USING (bundle_id IN (
        SELECT id FROM products_services WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    ));

DROP POLICY IF EXISTS "Users can manage bundles in their workspace" ON product_service_bundles;
CREATE POLICY "Users can manage bundles in their workspace"
    ON product_service_bundles FOR ALL
    USING (bundle_id IN (
        SELECT id FROM products_services WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    ));

-- ============================================================================
-- 10. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to update product analytics when revenue is recorded
CREATE OR REPLACE FUNCTION update_product_analytics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_service_id IS NOT NULL THEN
        UPDATE products_services
        SET 
            total_revenue = COALESCE(total_revenue, 0) + NEW.amount,
            total_units_sold = COALESCE(total_units_sold, 0) + COALESCE(NEW.quantity, 1),
            average_sale_value = (COALESCE(total_revenue, 0) + NEW.amount) / 
                                (COALESCE(total_units_sold, 0) + COALESCE(NEW.quantity, 1)),
            last_sold_date = CURRENT_DATE
        WHERE id = NEW.product_service_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_analytics ON revenue_transactions;
CREATE TRIGGER trigger_update_product_analytics
    AFTER INSERT ON revenue_transactions
    FOR EACH ROW
    WHEN (NEW.product_service_id IS NOT NULL AND NEW.status = 'paid')
    EXECUTE FUNCTION update_product_analytics();

-- Function to log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
        INSERT INTO product_price_history (
            product_service_id,
            changed_by,
            old_price,
            new_price,
            effective_from
        ) VALUES (
            NEW.id,
            auth.uid(),
            OLD.base_price,
            NEW.base_price,
            CURRENT_DATE
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_price_change ON products_services;
CREATE TRIGGER trigger_log_price_change
    AFTER UPDATE ON products_services
    FOR EACH ROW
    WHEN (OLD.base_price IS DISTINCT FROM NEW.base_price)
    EXECUTE FUNCTION log_price_change();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment to track migration
COMMENT ON TABLE products_services IS 'Products & Services catalog - supports physical products, digital products, SaaS, and services with flexible pricing models';
COMMENT ON TABLE product_price_history IS 'Historical price changes for products and services';
COMMENT ON TABLE product_service_bundles IS 'Product/service bundles and packages';
