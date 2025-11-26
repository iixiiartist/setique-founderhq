# Products & Services Enhancement - Complete Implementation Plan

## Executive Summary

Transform the current "Platform Development" tab into a comprehensive "Products & Services" system that adapts to different business models (SaaS, E-commerce, Services, Physical Products, Marketplace) with robust pricing models, inventory tracking, and deep integrations across Financial, Marketing, CRM, Calendar, and Document systems.

---

## Business Problem & Solution

### Current State
- **Platform Tab**: Basic task management for development work
- **Limited Scope**: Only serves software/platform development companies
- **Disconnected**: No pricing data, inventory, or cross-tab automation
- **Missed Opportunities**: Can't track product revenue, service billing, or deal attribution

### Target State
- **Products & Services Hub**: Universal catalog for ANY business type
- **Pricing Flexibility**: Flat rate, hourly, subscription, tiered, custom
- **Inventory Management**: Digital downloads, physical stock, service capacity
- **Revenue Attribution**: Link products/services → deals → marketing → financials
- **Automation**: Auto-create invoices, forecast revenue, track profitability

### Ideal Customer Profiles (ICPs) Supported

1. **B2B SaaS** - Software subscriptions (monthly/annual pricing, seats)
2. **B2C SaaS** - Consumer apps (freemium, tiered plans)
3. **E-commerce** - Physical products (inventory, COGs, resale price)
4. **Digital Products** - Downloads, courses, templates (one-time or subscription)
5. **Service Businesses** - Consulting, agencies (hourly, project-based, retainer)
6. **Hybrid/Marketplace** - Mix of products and services
7. **Manufacturing** - Physical goods with complex pricing
8. **Hospitality** - Bookings, packages, seasonal pricing

---

## Architecture Overview

### Database Schema

#### 1. New Table: `products_services`

```sql
CREATE TABLE products_services (
    -- Core Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT, -- Stock Keeping Unit
    category TEXT NOT NULL, -- 'product' | 'service' | 'bundle'
    type TEXT NOT NULL, -- 'digital' | 'physical' | 'saas' | 'consulting' | 'package'
    status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'discontinued'
    
    -- Pricing Model
    pricing_model TEXT NOT NULL, -- 'flat_rate' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annual' | 'tiered' | 'usage_based' | 'custom'
    base_price NUMERIC(15, 2),
    currency TEXT DEFAULT 'USD',
    
    -- Cost Structure (for profit calculation)
    cost_of_goods NUMERIC(15, 2), -- Direct costs (materials, labor)
    cost_of_service NUMERIC(15, 2), -- Service delivery costs
    overhead_allocation NUMERIC(15, 2), -- Fixed cost allocation
    profit_margin_percent NUMERIC(5, 2), -- Auto-calculated or manual override
    
    -- Pricing Variants (JSONB for flexibility)
    tiered_pricing JSONB, -- [{minQty: 1, maxQty: 10, price: 100}, {minQty: 11, maxQty: 50, price: 90}]
    usage_pricing JSONB, -- [{metric: 'api_calls', unitPrice: 0.01, includedUnits: 1000}]
    subscription_plans JSONB, -- [{name: 'Basic', price: 29, billingCycle: 'monthly', features: [...]}]
    
    -- Inventory (for physical/digital products)
    inventory_tracked BOOLEAN DEFAULT false,
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0, -- Reserved for pending orders
    quantity_available INTEGER GENERATED ALWAYS AS (COALESCE(quantity_on_hand, 0) - COALESCE(quantity_reserved, 0)) STORED,
    reorder_point INTEGER, -- Alert when stock reaches this level
    reorder_quantity INTEGER, -- Suggested reorder amount
    
    -- Service Capacity (for service businesses)
    capacity_tracked BOOLEAN DEFAULT false,
    capacity_unit TEXT, -- 'hours' | 'days' | 'projects' | 'seats'
    capacity_total NUMERIC(10, 2), -- Total capacity per period
    capacity_booked NUMERIC(10, 2) DEFAULT 0, -- Currently booked
    capacity_available NUMERIC(10, 2) GENERATED ALWAYS AS (COALESCE(capacity_total, 0) - COALESCE(capacity_booked, 0)) STORED,
    capacity_period TEXT, -- 'weekly' | 'monthly' | 'quarterly'
    
    -- Tax & Compliance
    tax_code TEXT,
    tariff_code TEXT, -- For international shipping
    is_taxable BOOLEAN DEFAULT true,
    tax_rate NUMERIC(5, 2), -- Override default tax rate
    
    -- Metadata & Linking
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    document_ids UUID[], -- Link to product sheets, contracts, specs
    image_url TEXT,
    external_url TEXT, -- Product page, booking link, etc.
    
    -- Analytics
    total_revenue NUMERIC(15, 2) DEFAULT 0, -- Lifetime revenue
    total_units_sold INTEGER DEFAULT 0,
    average_sale_value NUMERIC(15, 2), -- Average transaction value
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

-- Indexes for performance
CREATE INDEX idx_products_services_workspace ON products_services(workspace_id);
CREATE INDEX idx_products_services_category ON products_services(category);
CREATE INDEX idx_products_services_type ON products_services(type);
CREATE INDEX idx_products_services_pricing_model ON products_services(pricing_model);
CREATE INDEX idx_products_services_status ON products_services(status);
CREATE INDEX idx_products_services_sku ON products_services(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_services_tags ON products_services USING GIN(tags);
CREATE INDEX idx_products_services_search ON products_services USING GIN(search_vector);

-- Trigger for updated_at
CREATE TRIGGER update_products_services_updated_at
    BEFORE UPDATE ON products_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products in their workspace"
    ON products_services FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create products in their workspace"
    ON products_services FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update products in their workspace"
    ON products_services FOR UPDATE
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete products in their workspace"
    ON products_services FOR DELETE
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));
```

#### 2. Enhanced Table: `deals`

```sql
-- Add product/service linking to existing deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_service_id UUID REFERENCES products_services(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_service_name TEXT; -- Denormalized for performance
ALTER TABLE deals ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 1;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_value NUMERIC(15, 2); -- Calculated: (unit_price * quantity) - discount + tax

CREATE INDEX idx_deals_product_service ON deals(product_service_id) WHERE product_service_id IS NOT NULL;
```

#### 3. Enhanced Table: `revenue_transactions`

```sql
-- Link revenue to products/services
ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS product_service_id UUID REFERENCES products_services(id) ON DELETE SET NULL;
ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 1;
ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2);

CREATE INDEX idx_revenue_transactions_product_service ON revenue_transactions(product_service_id) WHERE product_service_id IS NOT NULL;
```

#### 4. Enhanced Table: `marketing_items`

```sql
-- Link campaigns to products/services
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS product_service_ids UUID[]; -- Can promote multiple products
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS target_revenue NUMERIC(15, 2); -- Revenue goal for campaign

CREATE INDEX idx_marketing_items_product_services ON marketing_items USING GIN(product_service_ids) WHERE product_service_ids IS NOT NULL;
```

#### 5. New Table: `product_price_history`

```sql
CREATE TABLE product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_service_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by UUID REFERENCES profiles(id),
    old_price NUMERIC(15, 2),
    new_price NUMERIC(15, 2),
    reason TEXT, -- 'promotion' | 'cost_increase' | 'market_adjustment' | 'seasonal'
    effective_from DATE,
    effective_to DATE,
    
    CONSTRAINT price_history_workspace_check 
        FOREIGN KEY (product_service_id) 
        REFERENCES products_services(id)
);

CREATE INDEX idx_price_history_product ON product_price_history(product_service_id);
CREATE INDEX idx_price_history_changed_at ON product_price_history(changed_at DESC);
```

#### 6. New Table: `product_service_bundles`

```sql
-- For creating product/service bundles
CREATE TABLE product_service_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) DEFAULT 1,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    is_optional BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    UNIQUE(bundle_id, component_id)
);

CREATE INDEX idx_bundles_bundle_id ON product_service_bundles(bundle_id);
CREATE INDEX idx_bundles_component_id ON product_service_bundles(component_id);
```

---

## TypeScript Types

```typescript
// types.ts additions

export type ProductServiceCategory = 'product' | 'service' | 'bundle';

export type ProductServiceType = 
    | 'digital'      // Downloads, software, digital content
    | 'physical'     // Physical goods requiring shipping
    | 'saas'         // Software as a Service
    | 'consulting'   // Professional services
    | 'package'      // Service packages (bundles)
    | 'subscription' // Recurring service/product
    | 'booking';     // Appointments, reservations

export type PricingModel = 
    | 'flat_rate'    // One-time fixed price
    | 'hourly'       // $/hour
    | 'daily'        // $/day
    | 'weekly'       // $/week
    | 'monthly'      // $/month (subscription)
    | 'annual'       // $/year (subscription)
    | 'tiered'       // Volume-based pricing
    | 'usage_based'  // Pay per use (API calls, etc.)
    | 'custom';      // Negotiated/custom pricing

export interface TieredPrice {
    minQuantity: number;
    maxQuantity?: number; // null = unlimited
    price: number;
    label?: string; // e.g., "1-10 users", "Enterprise"
}

export interface UsagePricing {
    metric: string; // e.g., 'api_calls', 'storage_gb', 'users'
    unitPrice: number;
    includedUnits?: number; // Free tier
    overage_price?: number; // Price after free tier
}

export interface SubscriptionPlan {
    name: string; // 'Basic', 'Pro', 'Enterprise'
    price: number;
    billingCycle: 'monthly' | 'annual';
    features: string[];
    limits?: Record<string, number>; // { users: 10, storage_gb: 100 }
    isPopular?: boolean;
}

export interface ProductService {
    // Core
    id: string;
    workspaceId: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    
    // Basic Info
    name: string;
    description?: string;
    sku?: string;
    category: ProductServiceCategory;
    type: ProductServiceType;
    status: 'active' | 'inactive' | 'discontinued';
    
    // Pricing
    pricingModel: PricingModel;
    basePrice?: number;
    currency: string;
    
    // Cost Structure
    costOfGoods?: number;
    costOfService?: number;
    overheadAllocation?: number;
    profitMarginPercent?: number;
    
    // Pricing Variants
    tieredPricing?: TieredPrice[];
    usagePricing?: UsagePricing[];
    subscriptionPlans?: SubscriptionPlan[];
    
    // Inventory
    inventoryTracked: boolean;
    quantityOnHand?: number;
    quantityReserved?: number;
    quantityAvailable?: number; // Computed
    reorderPoint?: number;
    reorderQuantity?: number;
    
    // Service Capacity
    capacityTracked: boolean;
    capacityUnit?: 'hours' | 'days' | 'projects' | 'seats';
    capacityTotal?: number;
    capacityBooked?: number;
    capacityAvailable?: number; // Computed
    capacityPeriod?: 'weekly' | 'monthly' | 'quarterly';
    
    // Tax & Compliance
    taxCode?: string;
    tariffCode?: string;
    isTaxable: boolean;
    taxRate?: number;
    
    // Metadata
    tags: string[];
    documentIds?: string[];
    imageUrl?: string;
    externalUrl?: string;
    
    // Analytics
    totalRevenue?: number;
    totalUnitsSold?: number;
    averageSaleValue?: number;
    lastSoldDate?: string;
    
    // Custom
    customFields?: Record<string, any>;
}

export interface ProductPriceHistory {
    id: string;
    productServiceId: string;
    changedAt: string;
    changedBy?: string;
    oldPrice: number;
    newPrice: number;
    reason?: 'promotion' | 'cost_increase' | 'market_adjustment' | 'seasonal' | 'other';
    effectiveFrom?: string;
    effectiveTo?: string;
}

export interface ProductServiceBundle {
    id: string;
    bundleId: string;
    componentId: string;
    quantity: number;
    discountPercent?: number;
    isOptional: boolean;
    displayOrder: number;
}

// Enhanced Deal type
export interface Deal {
    // ... existing fields ...
    
    // NEW: Product/Service linking
    productServiceId?: string;
    productServiceName?: string;
    quantity?: number;
    unitPrice?: number;
    discountPercent?: number;
    discountAmount?: number;
    taxAmount?: number;
    totalValue?: number; // Calculated
}

// Enhanced RevenueTransaction type
export interface RevenueTransaction {
    // ... existing fields ...
    
    // NEW: Product/Service linking
    productServiceId?: string;
    quantity?: number;
    unitPrice?: number;
}

// Enhanced MarketingItem type  
export interface MarketingItem {
    // ... existing fields ...
    
    // NEW: Product/Service linking
    productServiceIds?: string[]; // Can promote multiple
    targetRevenue?: number;
}

// Add to DashboardData
export interface DashboardData {
    // ... existing fields ...
    
    // NEW: Products & Services
    productsServices: ProductService[];
    productPriceHistory: ProductPriceHistory[];
    productBundles: ProductServiceBundle[];
}

// Add to AppActions
export interface AppActions {
    // ... existing actions ...
    
    // NEW: Product/Service actions
    createProductService: (data: Omit<ProductService, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; message: string; id?: string; }>;
    updateProductService: (id: string, updates: Partial<ProductService>) => Promise<{ success: boolean; message: string; }>;
    deleteProductService: (id: string) => Promise<{ success: boolean; message: string; }>;
    updateProductInventory: (id: string, quantityChange: number, reason?: string) => Promise<{ success: boolean; message: string; }>;
    reserveProductInventory: (id: string, quantity: number) => Promise<{ success: boolean; message: string; }>;
    releaseProductInventory: (id: string, quantity: number) => Promise<{ success: boolean; message: string; }>;
    updateServiceCapacity: (id: string, capacityChange: number, period: string) => Promise<{ success: boolean; message: string; }>;
    calculateProductProfitability: (id: string) => Promise<{ marginPercent: number; marginAmount: number; }>;
}
```

---

## UI/UX Design

### Products & Services Tab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Products & Services                                     [+ New]│
├─────────────────────────────────────────────────────────────────┤
│  [All] [Products] [Services] [Bundles]   🔍 Search...   Filter ▼│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📦 Physical Products (12)                                       │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │ Widget Pro       │ Premium Service  │ Consulting Pkg   │    │
│  │ $299.00         │ $2,500/mo       │ $10,000         │    │
│  │ SKU: WID-001    │ Hourly: $250    │ Project-based   │    │
│  │ 📊 45 in stock   │ ⏰ 120h/mo avail │ 🎯 3 active     │    │
│  │ 💰 $12,450 rev   │ 💰 $48,000 rev   │ 💰 $89,000 rev   │    │
│  └──────────────────┴──────────────────┴──────────────────┘    │
│                                                                  │
│  💻 Digital Products (8)                                         │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │ SaaS Platform    │ Online Course    │ Template Pack   │    │
│  │ Tiered: $29-$299│ $499 one-time   │ $79 one-time    │    │
│  │ 🔄 47 subscribers│ 📚 234 sold      │ 📥 1,456 downloads│   │
│  │ 💰 $18,932/mo    │ 💰 $116,766 total│ 💰 $115,024 total│   │
│  └──────────────────┴──────────────────┴──────────────────┘    │
│                                                                  │
│  ⚙️ Professional Services (5)                                    │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │ Strategy Consult │ Implementation   │ Monthly Retainer │    │
│  │ $350/hour       │ Custom pricing  │ $5,000/month    │    │
│  │ ⏰ 15h booked    │ 🎯 Per project   │ 🔄 8 clients     │    │
│  │ 💰 $28,500 YTD   │ 💰 $145,000 YTD  │ 💰 $40,000/mo    │    │
│  └──────────────────┴──────────────────┴──────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Product/Service Detail Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Widget Pro                                            [Edit] [X]│
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [Overview] [Pricing] [Inventory] [Analytics] [History]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OVERVIEW                                                        │
│  Type: Physical Product • SKU: WID-001 • Active                │
│  Category: Hardware • Tags: [Premium] [B2B]                    │
│                                                                  │
│  Description:                                                    │
│  High-performance widget for enterprise customers. Includes     │
│  24/7 support and 2-year warranty.                             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  PRICING & COSTS                                                │
│  Base Price: $299.00 USD (Flat Rate)                          │
│  Cost of Goods: $125.00 • Profit Margin: 58.2%                │
│                                                                  │
│  Tiered Pricing:                                                │
│  • 1-10 units: $299.00 each                                    │
│  • 11-50 units: $279.00 each (7% off)                          │
│  • 51+ units: $249.00 each (17% off)                           │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  INVENTORY                                                       │
│  On Hand: 45 units                                              │
│  Reserved: 8 units (3 deals in progress)                       │
│  Available: 37 units                                            │
│  Reorder Point: 20 units ⚠️ Alert when reached                 │
│  Reorder Qty: 50 units                                          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  PERFORMANCE                                                     │
│  Total Revenue: $12,450 (42 units sold)                        │
│  Avg Sale: $296.43 per unit                                    │
│  Last Sale: 3 days ago                                          │
│  Top Customer: Acme Corp (12 units, $3,348)                    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  LINKED ITEMS                                                    │
│  📊 3 Active Deals ($4,785 potential revenue)                   │
│  📈 2 Marketing Campaigns (Q4 Launch, Trade Show)              │
│  📄 4 Documents (Spec Sheet, Brochure, Warranty, Manual)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2) ⚡ HIGH PRIORITY

#### 1.1 Database Migration
- [ ] Create `products_services` table with all fields
- [ ] Create `product_price_history` table
- [ ] Create `product_service_bundles` table
- [ ] Add columns to `deals`, `revenue_transactions`, `marketing_items`
- [ ] Create indexes for performance
- [ ] Set up RLS policies
- [ ] Test migration with rollback script

**Files:**
- `supabase/migrations/20251115_products_services_core.sql`

#### 1.2 TypeScript Types
- [ ] Add `ProductService` interface
- [ ] Add `ProductPriceHistory` interface
- [ ] Add `ProductServiceBundle` interface
- [ ] Add pricing model types
- [ ] Update `Deal`, `RevenueTransaction`, `MarketingItem` types
- [ ] Update `DashboardData` and `AppActions` interfaces
- [ ] Add validation schemas with Zod

**Files:**
- `types.ts` (update)
- `lib/validation/productServiceSchemas.ts` (new)

#### 1.3 Database Service Layer
- [ ] `DatabaseService.getProductsServices()` with filters
- [ ] `DatabaseService.createProductService()`
- [ ] `DatabaseService.updateProductService()`
- [ ] `DatabaseService.deleteProductService()`
- [ ] `DatabaseService.getProductPriceHistory()`
- [ ] `DatabaseService.updateInventory()`
- [ ] `DatabaseService.reserveInventory()`
- [ ] `DatabaseService.updateServiceCapacity()`
- [ ] Update `DatabaseService.updateDeal()` for product linking
- [ ] Update `DatabaseService.createRevenueTransaction()` for product linking

**Files:**
- `lib/services/database.ts` (update)
- `lib/services/productService.ts` (new - business logic layer)

**Deliverables:**
- ✅ Database schema deployed
- ✅ Types defined
- ✅ CRUD operations functional
- ✅ Tests passing

---

### Phase 2: Business Logic & Calculations (Week 2-3) 🔥 HIGH PRIORITY

#### 2.1 ProductService Utility Class

```typescript
// lib/services/productService.ts

export class ProductServiceCalculator {
    /**
     * Calculate profit margin
     */
    static calculateProfitMargin(basePrice: number, totalCosts: number): {
        marginPercent: number;
        marginAmount: number;
    } {
        const marginAmount = basePrice - totalCosts;
        const marginPercent = (marginAmount / basePrice) * 100;
        return { marginPercent, marginAmount };
    }
    
    /**
     * Calculate tiered price based on quantity
     */
    static getTieredPrice(quantity: number, tieredPricing: TieredPrice[]): number {
        const tier = tieredPricing.find(t => 
            quantity >= t.minQuantity && 
            (t.maxQuantity === null || quantity <= t.maxQuantity)
        );
        return tier?.price || tieredPricing[tieredPricing.length - 1].price;
    }
    
    /**
     * Calculate usage-based price
     */
    static calculateUsagePrice(usage: number, pricing: UsagePricing): number {
        const includedUnits = pricing.includedUnits || 0;
        if (usage <= includedUnits) return 0;
        
        const overage = usage - includedUnits;
        const overagePrice = pricing.overage_price || pricing.unitPrice;
        return overage * overagePrice;
    }
    
    /**
     * Get price for deal (considering quantity, discounts)
     */
    static calculateDealPrice(
        product: ProductService,
        quantity: number,
        discountPercent: number = 0,
        discountAmount: number = 0
    ): {
        unitPrice: number;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
    } {
        // Determine unit price based on pricing model
        let unitPrice = product.basePrice || 0;
        
        if (product.pricingModel === 'tiered' && product.tieredPricing) {
            unitPrice = this.getTieredPrice(quantity, product.tieredPricing);
        }
        
        const subtotal = unitPrice * quantity;
        
        // Apply discounts
        const percentDiscount = subtotal * (discountPercent / 100);
        const totalDiscount = percentDiscount + discountAmount;
        
        // Calculate tax
        const taxableAmount = subtotal - totalDiscount;
        const taxRate = product.isTaxable ? (product.taxRate || 0) : 0;
        const tax = taxableAmount * (taxRate / 100);
        
        const total = taxableAmount + tax;
        
        return {
            unitPrice,
            subtotal,
            discount: totalDiscount,
            tax,
            total
        };
    }
    
    /**
     * Check inventory availability
     */
    static isInventoryAvailable(product: ProductService, requestedQty: number): {
        available: boolean;
        shortfall: number;
        message?: string;
    } {
        if (!product.inventoryTracked) {
            return { available: true, shortfall: 0 };
        }
        
        const available = product.quantityAvailable || 0;
        if (available >= requestedQty) {
            return { available: true, shortfall: 0 };
        }
        
        return {
            available: false,
            shortfall: requestedQty - available,
            message: `Only ${available} units available. Need ${requestedQty - available} more.`
        };
    }
    
    /**
     * Check service capacity availability
     */
    static isCapacityAvailable(product: ProductService, requestedCapacity: number): {
        available: boolean;
        shortfall: number;
        message?: string;
    } {
        if (!product.capacityTracked) {
            return { available: true, shortfall: 0 };
        }
        
        const available = product.capacityAvailable || 0;
        if (available >= requestedCapacity) {
            return { available: true, shortfall: 0 };
        }
        
        return {
            available: false,
            shortfall: requestedCapacity - available,
            message: `Only ${available} ${product.capacityUnit} available this ${product.capacityPeriod}.`
        };
    }
    
    /**
     * Generate revenue forecast based on product performance
     */
    static forecastRevenue(
        product: ProductService,
        months: number = 12
    ): number[] {
        // Simple linear forecast based on historical avg
        const monthlyAvg = (product.totalRevenue || 0) / 12; // Assuming YTD data
        return Array(months).fill(monthlyAvg);
    }
    
    /**
     * Calculate bundle price
     */
    static calculateBundlePrice(
        bundle: ProductService,
        components: { product: ProductService; quantity: number; discountPercent: number }[]
    ): number {
        let total = 0;
        
        for (const comp of components) {
            const basePrice = (comp.product.basePrice || 0) * comp.quantity;
            const discount = basePrice * (comp.discountPercent / 100);
            total += basePrice - discount;
        }
        
        return total;
    }
}
```

#### 2.2 Integration Services

```typescript
// lib/services/productIntegrationService.ts

export class ProductIntegrationService {
    /**
     * Link product to deal and auto-calculate pricing
     */
    static async linkProductToDeal(
        dealId: string,
        productId: string,
        quantity: number,
        discountPercent?: number
    ): Promise<{ success: boolean; updatedDeal?: Deal }> {
        // Fetch product
        const product = await DatabaseService.getProductService(productId);
        if (!product) {
            return { success: false };
        }
        
        // Check availability
        const availability = ProductServiceCalculator.isInventoryAvailable(product, quantity);
        if (!availability.available) {
            throw new Error(availability.message);
        }
        
        // Calculate pricing
        const pricing = ProductServiceCalculator.calculateDealPrice(
            product,
            quantity,
            discountPercent || 0
        );
        
        // Reserve inventory
        if (product.inventoryTracked) {
            await DatabaseService.reserveInventory(productId, quantity);
        }
        
        // Update deal
        const updatedDeal = await DatabaseService.updateDeal(dealId, {
            productServiceId: productId,
            productServiceName: product.name,
            quantity,
            unitPrice: pricing.unitPrice,
            discountPercent,
            taxAmount: pricing.tax,
            totalValue: pricing.total
        });
        
        return { success: true, updatedDeal };
    }
    
    /**
     * When deal closes, create revenue transaction
     */
    static async convertDealToRevenue(
        deal: Deal,
        paymentDate?: string
    ): Promise<RevenueTransaction> {
        if (!deal.productServiceId) {
            throw new Error('Deal must have linked product/service');
        }
        
        // Create revenue transaction
        const transaction = await DatabaseService.createRevenueTransaction({
            workspaceId: deal.workspaceId,
            transactionDate: paymentDate || new Date().toISOString().split('T')[0],
            amount: deal.totalValue || deal.value,
            transactionType: 'payment',
            status: 'paid',
            crmItemId: deal.crmItemId,
            contactId: deal.contactId,
            productServiceId: deal.productServiceId,
            quantity: deal.quantity || 1,
            unitPrice: deal.unitPrice,
            dealStage: 'closed_won'
        });
        
        // Update product analytics
        await this.updateProductAnalytics(deal.productServiceId, {
            revenueAdded: deal.totalValue || deal.value,
            unitsSold: deal.quantity || 1
        });
        
        // Release reserved inventory and reduce stock
        const product = await DatabaseService.getProductService(deal.productServiceId);
        if (product?.inventoryTracked) {
            await DatabaseService.releaseInventory(deal.productServiceId, deal.quantity || 1);
            await DatabaseService.updateInventory(deal.productServiceId, -(deal.quantity || 1), 'sale');
        }
        
        return transaction;
    }
    
    /**
     * Update product analytics
     */
    static async updateProductAnalytics(
        productId: string,
        update: { revenueAdded?: number; unitsSold?: number }
    ): Promise<void> {
        const product = await DatabaseService.getProductService(productId);
        if (!product) return;
        
        await DatabaseService.updateProductService(productId, {
            totalRevenue: (product.totalRevenue || 0) + (update.revenueAdded || 0),
            totalUnitsSold: (product.totalUnitsSold || 0) + (update.unitsSold || 0),
            averageSaleValue: ((product.totalRevenue || 0) + (update.revenueAdded || 0)) / 
                             ((product.totalUnitsSold || 0) + (update.unitsSold || 0)),
            lastSoldDate: new Date().toISOString().split('T')[0]
        });
    }
    
    /**
     * Link marketing campaign to products
     */
    static async linkCampaignToProducts(
        campaignId: string,
        productIds: string[],
        targetRevenue?: number
    ): Promise<void> {
        await DatabaseService.updateMarketingItem(campaignId, {
            productServiceIds: productIds,
            targetRevenue
        });
    }
    
    /**
     * Calculate campaign attribution (revenue from campaign-linked products)
     */
    static async calculateCampaignAttribution(
        campaignId: string,
        startDate: string,
        endDate: string
    ): Promise<{ revenue: number; units: number; deals: number }> {
        // Get campaign
        const campaign = await DatabaseService.getMarketingItem(campaignId);
        if (!campaign?.productServiceIds) {
            return { revenue: 0, units: 0, deals: 0 };
        }
        
        // Get revenue transactions for these products in date range
        const transactions = await DatabaseService.getRevenueTransactions({
            productServiceIds: campaign.productServiceIds,
            startDate,
            endDate
        });
        
        const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);
        const units = transactions.reduce((sum, t) => sum + (t.quantity || 1), 0);
        
        return {
            revenue,
            units,
            deals: transactions.length
        };
    }
}
```

**Deliverables:**
- ✅ Profit margin calculations
- ✅ Pricing model calculations (tiered, usage-based)
- ✅ Inventory availability checks
- ✅ Revenue forecasting
- ✅ Integration with deals, revenue, marketing

---

### Phase 3: UI Components (Week 3-4) 🎨 MEDIUM PRIORITY

#### 3.1 Rename Tab
- [ ] Update `constants.ts`: `Platform` → `Products & Services`
- [ ] Update `Tab.Platform` to `Tab.ProductsServices`
- [ ] Update all references in codebase
- [ ] Update navigation labels

#### 3.2 Main Products & Services Tab

```tsx
// components/ProductsServicesTab.tsx

export function ProductsServicesTab({
    productsServices,
    actions,
    workspaceId,
    workspaceMembers
}: {
    productsServices: ProductService[];
    actions: AppActions;
    workspaceId: string;
    workspaceMembers: WorkspaceMember[];
}) {
    const [view, setView] = useState<'all' | 'products' | 'services' | 'bundles'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<ProductService | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Filter logic
    const filteredProducts = productsServices.filter(p => {
        if (view !== 'all') {
            if (view === 'products' && p.category !== 'product') return false;
            if (view === 'services' && p.category !== 'service') return false;
            if (view === 'bundles' && p.category !== 'bundle') return false;
        }
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(query) ||
                   p.sku?.toLowerCase().includes(query) ||
                   p.description?.toLowerCase().includes(query);
        }
        
        return true;
    });
    
    // Group by type for better organization
    const groupedProducts = filteredProducts.reduce((acc, p) => {
        if (!acc[p.type]) acc[p.type] = [];
        acc[p.type].push(p);
        return acc;
    }, {} as Record<string, ProductService[]>);
    
    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Products & Services</h1>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                >
                    + New Product/Service
                </button>
            </div>
            
            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex gap-2">
                    {['all', 'products', 'services', 'bundles'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v as any)}
                            className={`px-4 py-2 rounded ${view === v ? 'bg-black text-white' : 'bg-white border-2 border-black'}`}
                        >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
                
                <input
                    type="search"
                    placeholder="Search products, SKUs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-black"
                />
            </div>
            
            {/* Product Grid */}
            {Object.entries(groupedProducts).map(([type, products]) => (
                <div key={type} className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        {getTypeIcon(type)} {getTypeLabel(type)} ({products.length})
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(product => (
                            <ProductServiceCard
                                key={product.id}
                                product={product}
                                onClick={() => setSelectedProduct(product)}
                            />
                        ))}
                    </div>
                </div>
            ))}
            
            {/* Modals */}
            {showCreateModal && (
                <ProductServiceCreateModal
                    onClose={() => setShowCreateModal(false)}
                    onSave={async (data) => {
                        await actions.createProductService(data);
                        setShowCreateModal(false);
                    }}
                />
            )}
            
            {selectedProduct && (
                <ProductServiceDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    actions={actions}
                />
            )}
        </div>
    );
}
```

#### 3.3 ProductServiceCard Component

```tsx
// components/products/ProductServiceCard.tsx

export function ProductServiceCard({
    product,
    onClick
}: {
    product: ProductService;
    onClick: () => void;
}) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-gray-100 text-gray-800';
            case 'discontinued': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100';
        }
    };
    
    return (
        <div 
            onClick={onClick}
            className="bg-white border-2 border-black shadow-neo p-6 cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    {product.sku && (
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    )}
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(product.status)}`}>
                    {product.status}
                </span>
            </div>
            
            {/* Pricing */}
            <div className="mb-4">
                <p className="text-2xl font-bold">
                    {formatPrice(product.basePrice, product.currency)}
                    {getPricingLabel(product.pricingModel)}
                </p>
                {product.profitMarginPercent && (
                    <p className="text-sm text-green-600">
                        {product.profitMarginPercent.toFixed(1)}% margin
                    </p>
                )}
            </div>
            
            {/* Inventory/Capacity */}
            {product.inventoryTracked && (
                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">📦 {product.quantityAvailable} in stock</span>
                        {(product.quantityAvailable || 0) < (product.reorderPoint || 0) && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                ⚠️ Low stock
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            {product.capacityTracked && (
                <div className="mb-4">
                    <span className="text-sm">
                        ⏰ {product.capacityAvailable} {product.capacityUnit} available
                    </span>
                </div>
            )}
            
            {/* Performance */}
            <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="font-semibold">
                        {formatPrice(product.totalRevenue, product.currency)}
                    </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Units Sold:</span>
                    <span className="font-semibold">{product.totalUnitsSold || 0}</span>
                </div>
            </div>
            
            {/* Tags */}
            {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                    {product.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {tag}
                        </span>
                    ))}
                    {product.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                            +{product.tags.length - 3} more
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
```

#### 3.4 ProductServiceDetailModal

See [UI/UX Design](#uiux-design) section above for full modal design.

**Key Features:**
- Tabbed interface (Overview, Pricing, Inventory, Analytics, History)
- Inline editing
- Real-time profit margin calculation
- Inventory management
- Linked items display (deals, campaigns, documents)
- Price history timeline

**Deliverables:**
- ✅ Main tab component
- ✅ Product card component
- ✅ Detail modal with all tabs
- ✅ Create/edit forms
- ✅ Inventory management UI
- ✅ Analytics dashboard

---

### Phase 4: Cross-Tab Integrations (Week 4-5) 🔗 HIGH PRIORITY

#### 4.1 Deals Integration

**When creating/editing a deal:**
- [ ] Add product/service selector dropdown
- [ ] Auto-populate unit price from product
- [ ] Show quantity selector
- [ ] Display tiered pricing options if applicable
- [ ] Show inventory availability warning
- [ ] Calculate total automatically (quantity × unit_price - discount + tax)
- [ ] Reserve inventory when deal moves to "proposal" stage
- [ ] Release inventory if deal is lost
- [ ] Convert to revenue transaction when deal closes

**Files to Update:**
- `components/crm/DealsModule.tsx`
- `DashboardApp.tsx` (deal actions)

#### 4.2 Financial Integration

**Revenue Transactions:**
- [ ] Add product/service selector to revenue form
- [ ] Link invoice to product
- [ ] Auto-categorize revenue by product type
- [ ] Track product-level revenue metrics

**Financial Forecasting:**
- [ ] Generate revenue forecast based on product pipeline
- [ ] Factor in recurring revenue from subscriptions
- [ ] Show product mix in forecast breakdown

**Files to Update:**
- `components/financials/RevenueModule.tsx`
- `lib/services/financialService.ts`

#### 4.3 Marketing Integration

**Campaign Planning:**
- [ ] Link campaigns to products being promoted
- [ ] Set target revenue by product
- [ ] Track campaign→product→revenue attribution
- [ ] Show product performance by channel

**Attribution Module:**
- [ ] Display product revenue from each campaign
- [ ] Calculate ROI per product
- [ ] Show funnel: impressions → clicks → deals → revenue by product

**Files to Update:**
- `components/marketing/CampaignAnalyticsModule.tsx`
- `components/marketing/AttributionModule.tsx`

#### 4.4 Calendar Integration

**Booking/Appointments (for service businesses):**
- [ ] Link calendar events to service products
- [ ] Block service capacity when event created
- [ ] Release capacity when event completed/cancelled
- [ ] Show capacity utilization calendar view

**Files to Update:**
- `components/CalendarTab.tsx`

#### 4.5 Document Library Integration

**Product Documents:**
- [ ] Link documents to products (spec sheets, manuals, contracts)
- [ ] Auto-tag documents by product
- [ ] Quick access to product docs from detail modal
- [ ] Template contracts for services

**Files to Update:**
- `components/DocumentsTab.tsx`
- `components/products/ProductServiceDetailModal.tsx`

**Deliverables:**
- ✅ All integrations functional
- ✅ Data flows bidirectionally
- ✅ Automations working (inventory reservation, revenue attribution)
- ✅ No breaking changes to existing features

---

### Phase 5: Advanced Features (Week 5-6) ✨ MEDIUM PRIORITY

#### 5.1 Bundles & Packages
- [ ] UI to create bundles from existing products/services
- [ ] Discount configuration per component
- [ ] Optional vs required components
- [ ] Bundle pricing calculator
- [ ] Exploded view of bundle components in deals

#### 5.2 Recurring Revenue Management
- [ ] Subscription tracking dashboard
- [ ] MRR (Monthly Recurring Revenue) by product
- [ ] Churn tracking
- [ ] Expansion revenue tracking
- [ ] Renewal forecast

#### 5.3 Advanced Pricing
- [ ] Seasonal pricing rules
- [ ] Customer-specific pricing (VIP discounts)
- [ ] Promotional pricing with expiration dates
- [ ] Dynamic pricing based on demand/inventory

#### 5.4 Inventory Forecasting
- [ ] Reorder alerts
- [ ] Lead time tracking
- [ ] Economic order quantity (EOQ) calculator
- [ ] Stock aging report
- [ ] Supplier management

#### 5.5 Service Scheduling
- [ ] Resource allocation (assign consultants to projects)
- [ ] Capacity planning dashboard
- [ ] Utilization rates
- [ ] Overbooking warnings

**Deliverables:**
- ✅ Bundle system operational
- ✅ Recurring revenue dashboard
- ✅ Advanced pricing rules engine
- ✅ Inventory forecasting tools
- ✅ Service scheduling system

---

### Phase 6: Analytics & Reporting (Week 6-7) 📊 MEDIUM PRIORITY

#### 6.1 Product Performance Dashboard

**Key Metrics:**
- Revenue by product (time series)
- Units sold trend
- Profit margin analysis
- Top products by revenue/units/margin
- Product mix (% of total revenue)
- Growth rate by product

#### 6.2 Profitability Analysis

**Reports:**
- Gross profit by product
- Contribution margin
- Break-even analysis
- Price elasticity (if price changes)
- Cost variance tracking

#### 6.3 Inventory Reports

**For physical products:**
- Stock value report
- Aging inventory
- Dead stock identification
- Turnover ratio
- Carrying cost analysis

#### 6.4 Service Utilization Reports

**For service businesses:**
- Billable hours vs. available hours
- Utilization rate by consultant/team
- Revenue per hour
- Idle capacity cost

**Deliverables:**
- ✅ Interactive dashboards
- ✅ Export to CSV/PDF
- ✅ Scheduled reports
- ✅ Real-time alerts

---

### Phase 7: AI & Automation (Week 7-8) 🤖 LOW PRIORITY

#### 7.1 AI-Powered Features

- [ ] Product name/description generation
- [ ] Pricing recommendations based on market data
- [ ] Demand forecasting using ML
- [ ] Anomaly detection (unusual sales patterns)
- [ ] Churn prediction for subscriptions
- [ ] Cross-sell/upsell recommendations

#### 7.2 Workflow Automations

- [ ] Auto-create deals when product inquiry comes in
- [ ] Auto-invoice when deal closes
- [ ] Auto-reorder when inventory hits reorder point
- [ ] Auto-send renewal reminders for subscriptions
- [ ] Auto-update marketing attribution when revenue recorded
- [ ] Auto-forecast revenue based on pipeline + product mix

**Deliverables:**
- ✅ AI features integrated
- ✅ Automations configurable
- ✅ User preferences for automation triggers

---

## Testing Strategy

### Unit Tests
- [ ] Product CRUD operations
- [ ] Pricing calculations (all models)
- [ ] Inventory management functions
- [ ] Capacity management functions
- [ ] Profit margin calculations
- [ ] Bundle pricing
- [ ] Integration functions (deal→product→revenue)

### Integration Tests
- [ ] End-to-end deal flow with product
- [ ] Revenue attribution from marketing→product→deal
- [ ] Inventory reservation/release workflow
- [ ] Service capacity booking workflow
- [ ] Bundle creation and pricing

### E2E Tests
- [ ] Create product → link to deal → close deal → verify revenue
- [ ] Create service → book capacity → deliver → invoice
- [ ] Create bundle → sell bundle → verify component stock reduction
- [ ] Create campaign → link product → track attribution

---

## Migration Strategy

### For Existing Users

#### Step 1: Data Audit
- Identify current "Platform Tasks" that are actually products/services
- Review deals without product links
- Analyze revenue transactions for product patterns

#### Step 2: Guided Migration
- Show migration wizard on first login after update
- Suggest converting tasks to products
- Bulk import from CSV option
- Manual review before commit

#### Step 3: Backward Compatibility
- Keep "Platform Tasks" functional during transition
- Allow hybrid mode: some users keep tasks, others migrate
- Provide migration rollback option

---

## Documentation

### User Documentation
- [ ] Products & Services overview guide
- [ ] Pricing models explained
- [ ] Inventory management tutorial
- [ ] Service capacity guide
- [ ] Integration workflows (deals, revenue, marketing)
- [ ] Video tutorials for each ICP type

### Developer Documentation
- [ ] Database schema documentation
- [ ] API reference (if exposing endpoints)
- [ ] TypeScript types reference
- [ ] Integration patterns guide
- [ ] Custom fields extensibility guide

---

## Success Metrics

### Adoption Metrics
- % of workspaces using Products & Services tab
- Avg products per workspace
- Avg product-linked deals per workspace

### Business Impact Metrics
- Revenue visibility increase (% of revenue attributed to products)
- Deal velocity improvement (time to close with product linking)
- Profitability insights (% of users tracking margins)
- Marketing ROI improvement (attribution accuracy)

### User Satisfaction
- NPS score for Products & Services feature
- Support tickets related to pricing/inventory
- Feature requests for additional capabilities

---

## Risk Assessment

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database migration failure | HIGH | LOW | Comprehensive testing, rollback scripts |
| Performance degradation | MEDIUM | MEDIUM | Proper indexing, query optimization |
| Data loss during migration | HIGH | LOW | Backups, phased rollout |
| Integration bugs | MEDIUM | MEDIUM | Extensive integration testing |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User confusion with new tab | MEDIUM | HIGH | Guided tours, clear docs, gradual rollout |
| Resistance to change | LOW | MEDIUM | Optional migration, keep backward compatibility |
| Incomplete feature adoption | LOW | MEDIUM | In-app prompts, success stories, templates |

---

## Next Steps (Immediate Actions)

### Week 1 Tasks (Start Now)
1. **Database Design Review** (2 hours)
   - Review schema with team
   - Finalize JSONB structures for tiered/usage pricing
   - Confirm index strategy

2. **Create Migration Scripts** (4 hours)
   - Write `20251115_products_services_core.sql`
   - Test in development
   - Create rollback script

3. **TypeScript Types** (3 hours)
   - Add all interfaces to `types.ts`
   - Create Zod validation schemas
   - Update `DashboardData` and `AppActions`

4. **Spike: UI Mockups** (2 hours)
   - Create Figma/Sketch mockups for main tab
   - Get team feedback on layout
   - Finalize component hierarchy

5. **Project Setup** (1 hour)
   - Create feature branch
   - Set up task tracking (Jira/Linear/GitHub)
   - Assign owners to each phase

---

## Conclusion

This implementation plan transforms the Platform tab into a comprehensive Products & Services system that:

1. **Serves ALL business types** - Not just SaaS/software companies
2. **Provides pricing flexibility** - 9 different pricing models supported
3. **Tracks inventory & capacity** - For products and services respectively
4. **Integrates deeply** - Links to Deals, Revenue, Marketing, Calendar, Documents
5. **Enables automation** - Auto-invoicing, attribution, forecasting
6. **Scales with growth** - From solopreneur to enterprise team

**Total Timeline:** 7-8 weeks for full implementation  
**Minimum Viable Product (MVP):** 3-4 weeks (Phases 1-3)  
**Team Size:** 2-3 developers + 1 designer

**Est. Development Time:** 280-320 hours

Ready to begin? Let's start with Phase 1! 🚀
