-- Check which columns exist in products_services table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'products_services'
ORDER BY ordinal_position;

-- Check if capacity_tracking column exists specifically
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products_services' 
      AND column_name = 'capacity_tracked'
) AS has_capacity_tracked_column;

-- List all expected columns from migration
-- Expected: name, description, sku, category, type, status, pricing_model, 
-- base_price, currency, cost_of_goods, cost_of_service, overhead_allocation,
-- profit_margin_percent, tiered_pricing, usage_pricing, subscription_plans,
-- inventory_tracked, quantity_on_hand, quantity_reserved, quantity_available,
-- reorder_point, reorder_quantity, capacity_tracked, capacity_unit, 
-- capacity_total, capacity_booked, capacity_available, capacity_period,
-- tax_code, tariff_code, is_taxable, tax_rate, tags, document_ids,
-- image_url, external_url, total_revenue, total_units_sold, 
-- average_sale_value, last_sold_date, custom_fields, search_vector
