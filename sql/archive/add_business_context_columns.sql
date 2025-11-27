-- Business Profile Enhancement Migration
-- Phase 2.1: Add business context, monetization, and product fields
-- Run this migration in Supabase SQL Editor

-- Business Context Fields
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS target_customer_profile TEXT;
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS competitive_advantages TEXT[];
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS key_differentiators TEXT[];
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS market_positioning TEXT;

-- Deal/Product Monetization
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS monetization_model TEXT; 
-- Options: 'subscription', 'one-time', 'usage-based', 'freemium', 'enterprise', 'marketplace', 'advertising', 'hybrid'

ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb;
-- Structure: [{ name: string, price: number, features: string[], billingCycle: string }]

ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS deal_types TEXT[] DEFAULT ARRAY['new_business', 'expansion', 'renewal'];
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS average_deal_size NUMERIC;
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS sales_cycle_days INTEGER;

-- Product/Service Information
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS core_products JSONB DEFAULT '[]'::jsonb;
-- Structure: [{ name: string, description: string, type: string, status: string }]

ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS service_offerings JSONB DEFAULT '[]'::jsonb;
-- Structure: [{ name: string, description: string, pricing: string }]

ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS tech_stack TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN business_profile.target_customer_profile IS 'Detailed description of ideal customer persona';
COMMENT ON COLUMN business_profile.competitive_advantages IS 'List of competitive advantages';
COMMENT ON COLUMN business_profile.key_differentiators IS 'Key features/aspects that differentiate from competitors';
COMMENT ON COLUMN business_profile.market_positioning IS 'How the business positions itself in the market';
COMMENT ON COLUMN business_profile.monetization_model IS 'Primary revenue model: subscription, one-time, usage-based, etc.';
COMMENT ON COLUMN business_profile.pricing_tiers IS 'JSON array of pricing tier objects';
COMMENT ON COLUMN business_profile.deal_types IS 'Types of deals typically pursued';
COMMENT ON COLUMN business_profile.average_deal_size IS 'Average value of a deal/sale in currency';
COMMENT ON COLUMN business_profile.sales_cycle_days IS 'Average number of days from first contact to close';
COMMENT ON COLUMN business_profile.core_products IS 'JSON array of core product/service offerings';
COMMENT ON COLUMN business_profile.service_offerings IS 'JSON array of service offerings with details';
COMMENT ON COLUMN business_profile.tech_stack IS 'Technologies and tools used';

-- Verification query
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'business_profile' 
-- ORDER BY ordinal_position;
