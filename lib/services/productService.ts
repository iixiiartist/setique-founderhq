import { ProductService, TieredPrice, UsagePricing, ProductServiceBundle } from '../../types';
import { DatabaseService } from './database';

/**
 * ProductServiceCalculator
 * Utility class for calculating pricing, margins, and availability for products and services
 */
export class ProductServiceCalculator {
    /**
     * Calculate profit margin percentage and amount
     */
    static calculateProfitMargin(basePrice: number, totalCosts: number): {
        marginPercent: number;
        marginAmount: number;
    } {
        if (basePrice <= 0) {
            return { marginPercent: 0, marginAmount: 0 };
        }
        
        const marginAmount = basePrice - totalCosts;
        const marginPercent = (marginAmount / basePrice) * 100;
        
        return { 
            marginPercent: Math.round(marginPercent * 100) / 100, 
            marginAmount: Math.round(marginAmount * 100) / 100 
        };
    }
    
    /**
     * Get tiered price based on quantity
     */
    static getTieredPrice(quantity: number, tieredPricing: TieredPrice[]): number {
        if (!tieredPricing || tieredPricing.length === 0) {
            return 0;
        }
        
        // Sort tiers by minQuantity to ensure correct tier selection
        const sortedTiers = [...tieredPricing].sort((a, b) => a.minQuantity - b.minQuantity);
        
        // Find the appropriate tier
        for (let i = sortedTiers.length - 1; i >= 0; i--) {
            const tier = sortedTiers[i];
            if (quantity >= tier.minQuantity) {
                if (!tier.maxQuantity || quantity <= tier.maxQuantity) {
                    return tier.price;
                }
            }
        }
        
        // Default to first tier if no match
        return sortedTiers[0].price;
    }
    
    /**
     * Calculate usage-based price
     */
    static calculateUsagePrice(usage: number, pricing: UsagePricing): number {
        const includedUnits = pricing.includedUnits || 0;
        
        // If usage is within included units, price is 0
        if (usage <= includedUnits) {
            return 0;
        }
        
        // Calculate overage
        const overage = usage - includedUnits;
        const overagePrice = pricing.overagePrice || pricing.unitPrice;
        
        return Math.round(overage * overagePrice * 100) / 100;
    }
    
    /**
     * Calculate total price for a deal including quantity, discounts, and tax
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
            unitPrice: Math.round(unitPrice * 100) / 100,
            subtotal: Math.round(subtotal * 100) / 100,
            discount: Math.round(totalDiscount * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            total: Math.round(total * 100) / 100
        };
    }
    
    /**
     * Check if inventory is available for a product
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
     * Check if service capacity is available
     */
    static isCapacityAvailable(service: ProductService, requestedCapacity: number): {
        available: boolean;
        shortfall: number;
        message?: string;
    } {
        if (!service.capacityTracked) {
            return { available: true, shortfall: 0 };
        }
        
        const available = service.capacityAvailable || 0;
        
        if (available >= requestedCapacity) {
            return { available: true, shortfall: 0 };
        }
        
        return {
            available: false,
            shortfall: requestedCapacity - available,
            message: `Only ${available} ${service.capacityUnit} available this ${service.capacityPeriod}. Need ${requestedCapacity - available} more.`
        };
    }
    
    /**
     * Generate revenue forecast based on product performance
     */
    static forecastRevenue(
        product: ProductService,
        months: number = 12
    ): number[] {
        // Simple linear forecast based on historical average
        // Assumes totalRevenue is Year-to-Date data
        const monthlyAvg = (product.totalRevenue || 0) / 12;
        return Array(months).fill(Math.round(monthlyAvg * 100) / 100);
    }
    
    /**
     * Calculate bundle price from components
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
        
        return Math.round(total * 100) / 100;
    }
    
    /**
     * Calculate MRR (Monthly Recurring Revenue) for subscription products
     */
    static calculateMRR(product: ProductService, activeSubscriptions: number): number {
        if (product.pricingModel === 'monthly' && product.basePrice) {
            return Math.round(product.basePrice * activeSubscriptions * 100) / 100;
        }
        
        if (product.pricingModel === 'annual' && product.basePrice) {
            const monthlyPrice = product.basePrice / 12;
            return Math.round(monthlyPrice * activeSubscriptions * 100) / 100;
        }
        
        return 0;
    }
    
    /**
     * Calculate cost breakdown for a product
     */
    static calculateCostBreakdown(product: ProductService): {
        cogs: number;
        serviceDelivery: number;
        overhead: number;
        totalCost: number;
        profitMargin: number;
        profitMarginPercent: number;
    } {
        const cogs = product.costOfGoods || 0;
        const serviceDelivery = product.costOfService || 0;
        const overhead = product.overheadAllocation || 0;
        const totalCost = cogs + serviceDelivery + overhead;
        
        const { marginAmount, marginPercent } = this.calculateProfitMargin(
            product.basePrice || 0,
            totalCost
        );
        
        return {
            cogs: Math.round(cogs * 100) / 100,
            serviceDelivery: Math.round(serviceDelivery * 100) / 100,
            overhead: Math.round(overhead * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            profitMargin: marginAmount,
            profitMarginPercent: marginPercent
        };
    }
}

/**
 * ProductIntegrationService
 * Handles integration between products/services and other system entities
 */
export class ProductIntegrationService {
    /**
     * Link a product/service to a deal and auto-calculate pricing
     */
    static async linkProductToDeal(
        dealId: string,
        productId: string,
        quantity: number,
        discountPercent?: number
    ): Promise<{ success: boolean; updatedDeal?: any; error?: any }> {
        try {
            // Fetch product
            const { data: product, error: productError } = await DatabaseService.getProductService(productId);
            if (productError || !product) {
                return { success: false, error: productError || new Error('Product not found') };
            }
            
            // Check availability
            const availability = ProductServiceCalculator.isInventoryAvailable(product, quantity);
            if (!availability.available) {
                return { success: false, error: new Error(availability.message) };
            }
            
            // Calculate pricing
            const pricing = ProductServiceCalculator.calculateDealPrice(
                product,
                quantity,
                discountPercent || 0
            );
            
            // Reserve inventory if tracked
            if (product.inventoryTracked) {
                await DatabaseService.reserveInventory(productId, quantity);
            }
            
            // Update deal
            const { data: updatedDeal, error: updateError } = await DatabaseService.updateDeal(dealId, {
                product_service_id: productId,
                product_service_name: product.name,
                quantity,
                unit_price: pricing.unitPrice,
                discount_percent: discountPercent,
                tax_amount: pricing.tax,
                total_value: pricing.total
            });
            
            if (updateError) {
                // Rollback inventory reservation
                if (product.inventoryTracked) {
                    await DatabaseService.releaseInventory(productId, quantity);
                }
                return { success: false, error: updateError };
            }
            
            return { success: true, updatedDeal };
        } catch (error) {
            return { success: false, error };
        }
    }
    
    /**
     * Convert a closed deal to a revenue transaction
     */
    static async convertDealToRevenue(
        deal: any,
        paymentDate?: string
    ): Promise<{ success: boolean; transaction?: any; error?: any }> {
        try {
            if (!deal.product_service_id) {
                return { success: false, error: new Error('Deal must have linked product/service') };
            }
            
            // Create revenue transaction
            const transactionData = {
                workspace_id: deal.workspace_id,
                user_id: deal.assigned_to || deal.created_by,
                transaction_date: paymentDate || new Date().toISOString().split('T')[0],
                amount: deal.total_value || deal.value,
                currency: deal.currency || 'USD',
                transaction_type: 'payment' as const,
                status: 'paid' as const,
                crm_item_id: deal.crm_item_id,
                contact_id: deal.contact_id,
                product_service_id: deal.product_service_id,
                quantity: deal.quantity || 1,
                unit_price: deal.unit_price,
                description: `Revenue from deal: ${deal.title}`,
                deal_stage: 'closed_won'
            };
            
            const { data: transaction, error: transactionError } = 
                await DatabaseService.createRevenueTransaction(transactionData);
            
            if (transactionError) {
                return { success: false, error: transactionError };
            }
            
            // Update product analytics (handled by database trigger)
            // Release reserved inventory and reduce stock
            const { data: product } = await DatabaseService.getProductService(deal.product_service_id);
            if (product?.inventoryTracked) {
                await DatabaseService.releaseInventory(deal.product_service_id, deal.quantity || 1);
                await DatabaseService.updateInventory(deal.product_service_id, -(deal.quantity || 1), 'sale');
            }
            
            return { success: true, transaction };
        } catch (error) {
            return { success: false, error };
        }
    }
    
    /**
     * Link marketing campaign to products
     */
    static async linkCampaignToProducts(
        campaignId: string,
        productIds: string[],
        targetRevenue?: number
    ): Promise<{ success: boolean; error?: any }> {
        try {
            const { error } = await DatabaseService.updateMarketingItem(campaignId, {
                productServiceIds: productIds,
                targetRevenue
            } as any);
            
            if (error) {
                return { success: false, error };
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }
    
    /**
     * Calculate campaign attribution (revenue from campaign-linked products)
     */
    static async calculateCampaignAttribution(
        workspaceId: string,
        campaignId: string,
        startDate: string,
        endDate: string
    ): Promise<{ revenue: number; units: number; deals: number }> {
        try {
            // Get campaign
            const { data: campaign } = await DatabaseService.getMarketingItemById(campaignId);
            if (!campaign?.productServiceIds) {
                return { revenue: 0, units: 0, deals: 0 };
            }
            
            // Get revenue transactions for these products in date range
            const { data: transactions } = await DatabaseService.getRevenueTransactions(workspaceId, {
                productServiceIds: campaign.productServiceIds,
                startDate,
                endDate
            });
            
            if (!transactions) {
                return { revenue: 0, units: 0, deals: 0 };
            }
            
            const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);
            const units = transactions.reduce((sum, t) => sum + (t.quantity || 1), 0);
            
            return {
                revenue: Math.round(revenue * 100) / 100,
                units,
                deals: transactions.length
            };
        } catch (error) {
            console.error('Error calculating campaign attribution:', error);
            return { revenue: 0, units: 0, deals: 0 };
        }
    }
}
