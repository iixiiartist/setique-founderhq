/**
 * React Query-powered data persistence hook
 * Drop-in replacement for useLazyDataPersistence with improved caching
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useWorkspaceTasks, taskKeys } from './useTaskQueries';
import { useWorkspaceCrm, crmKeys } from './useCrmQueries';
import { DatabaseService } from '../lib/services/database';
import { EMPTY_DASHBOARD_DATA } from '../constants';

type LoadOptions = {
  force?: boolean;
};

/**
 * Enhanced lazy loading hook using React Query
 * Maintains same interface as original but with better caching
 */
export const useQueryDataPersistence = () => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const workspaceId = workspace?.id;
  const userId = user?.id;

  // Use React Query hooks for tasks and CRM
  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useWorkspaceTasks(userId, workspaceId);

  const {
    data: crmData,
    isLoading: crmLoading,
    refetch: refetchCrm,
  } = useWorkspaceCrm(workspaceId);

  /**
   * Load core data (settings) - uses targeted query to avoid duplicate heavy loads
   */
  const loadCoreData = useCallback(async () => {
    if (!userId || !workspaceId) {
      return { settings: EMPTY_DASHBOARD_DATA.settings };
    }

    try {
      // Use targeted settings query instead of getAllDashboardData
      const { data: settings } = await DatabaseService.getUserSettings(userId);
      return {
        settings: settings || EMPTY_DASHBOARD_DATA.settings
      };
    } catch (err) {
      console.error('Error loading core data:', err);
      return { settings: EMPTY_DASHBOARD_DATA.settings };
    }
  }, [userId, workspaceId]);

  /**
   * Load tasks - now powered by React Query
   */
  const loadTasks = useCallback(
    async (options: LoadOptions = {}) => {
      // If we don't have data yet OR force refetch is requested, wait for fetch to complete
      if (!tasksData || options.force) {
        const result = await refetchTasks();
        return result.data || {
          productsServicesTasks: [],
          investorTasks: [],
          customerTasks: [],
          partnerTasks: [],
          marketingTasks: [],
          financialTasks: []
        };
      }

      // Return cached data if available
      return tasksData;
    },
    [tasksData, refetchTasks]
  );

  /**
   * Load CRM items - now powered by React Query
   */
  const loadCrmItems = useCallback(
    async (options: LoadOptions = {}) => {
      // If we don't have data yet OR force refetch is requested, wait for fetch to complete
      if (!crmData || options.force) {
        const result = await refetchCrm();
        return result.data || {
          investors: [],
          customers: [],
          partners: []
        };
      }

      // Return cached data if available
      return crmData;
    },
    [crmData, refetchCrm]
  );

  /**
   * Load marketing data
   */
  const loadMarketing = useCallback(async (options: LoadOptions = {}) => {
    if (!userId || !workspaceId) {
      return { marketing: [] };
    }

    try {
      const { data } = await DatabaseService.getMarketingItems(workspaceId);
      
      // Transform raw database rows to application models (snake_case → camelCase)
      const { dbToMarketingItem } = await import('../lib/utils/fieldTransformers');
      const transformedMarketing = (data || []).map(dbToMarketingItem);
      
      // Return as object structure expected by DashboardData
      return { marketing: transformedMarketing };
    } catch (err) {
      console.error('Error loading marketing:', err);
      return { marketing: [] };
    }
  }, [userId, workspaceId]);

  /**
   * Load financial data
   */
  const loadFinancials = useCallback(async (options: LoadOptions = {}) => {
    if (!userId || !workspaceId) {
      return {
        revenueTransactions: [],
        expenses: [],
        financials: []
      };
    }

    try {
      const [revenueResult, expensesResult, logsResult] = await Promise.all([
        DatabaseService.getRevenueTransactions(workspaceId),
        DatabaseService.getExpenses(workspaceId),
        DatabaseService.getFinancialLogs(workspaceId)
      ]);

      return {
        revenueTransactions: revenueResult.data || [],
        expenses: expensesResult.data || [],
        financials: logsResult.data || []
      };
    } catch (err) {
      console.error('Error loading financials:', err);
      return {
        revenueTransactions: [],
        expenses: [],
        financials: []
      };
    }
  }, [userId, workspaceId]);

  /**
   * Load documents
   */
  const loadDocuments = useCallback(async (options: LoadOptions = {}) => {
    if (!userId || !workspaceId) {
      return { documents: [] };
    }

    try {
      const { data } = await DatabaseService.getDocuments(workspaceId);
      return { documents: data || [] };
    } catch (err) {
      console.error('Error loading documents:', err);
      return { documents: [] };
    }
  }, [userId, workspaceId]);

  /**
   * Load documents metadata (same as documents for now)
   */
  const loadDocumentsMetadata = useCallback(async (options: LoadOptions = {}) => {
    if (!userId || !workspaceId) {
      return [];
    }

    try {
      const { data } = await DatabaseService.getDocuments(workspaceId);
      return data || [];
    } catch (err) {
      console.error('Error loading documents metadata:', err);
      return [];
    }
  }, [userId, workspaceId]);

  /**
   * Load deals
   */
  const loadDeals = useCallback(async (options: LoadOptions = {}) => {
    if (!userId || !workspaceId) {
      return [];
    }

    try {
      const { data } = await DatabaseService.getDeals(workspaceId);
      return data || [];
    } catch (err) {
      console.error('Error loading deals:', err);
      return [];
    }
  }, [userId, workspaceId]);

  /**
   * Load revenue transactions
   */
  const loadRevenueTransactions = useCallback(async (options: LoadOptions = {}) => {
    if (!userId || !workspaceId) {
      return [];
    }

    try {
      const { data } = await DatabaseService.getRevenueTransactions(workspaceId);
      return data || [];
    } catch (err) {
      console.error('Error loading revenue transactions:', err);
      return [];
    }
  }, [userId, workspaceId]);

  /**
   * Load products and services
   */
  const loadProductsServices = useCallback(async (options: LoadOptions = {}) => {
    if (!userId || !workspaceId) {
      return {
        productsServices: [],
        productPriceHistory: [],
        productBundles: []
      };
    }

    try {
      const [productsResult, priceHistoryResult, bundlesResult] = await Promise.all([
        DatabaseService.getProductsServices(workspaceId),
        DatabaseService.getProductPriceHistory(workspaceId),
        DatabaseService.getProductBundles(workspaceId)
      ]);

      const products = productsResult.data || [];
      const priceHistory = priceHistoryResult.data || [];
      
      // Transform database format (snake_case) to frontend format (camelCase)
      const transformedProducts = products.map((p: any) => ({
        id: p.id,
        workspaceId: p.workspace_id,
        createdBy: p.created_by,
        name: p.name,
        sku: p.sku,
        description: p.description || undefined,
        category: p.category,
        type: p.type,
        status: p.status,
        basePrice: p.base_price != null ? parseFloat(p.base_price.toString()) : 0,
        currency: p.currency || 'USD',
        pricingModel: p.pricing_model,
        billingPeriod: p.billing_period || undefined,
        costOfGoods: p.cost_of_goods != null ? parseFloat(p.cost_of_goods.toString()) : undefined,
        costOfService: p.cost_of_service != null ? parseFloat(p.cost_of_service.toString()) : undefined,
        isTaxable: p.is_taxable ?? false,
        taxCode: p.tax_code || undefined,
        taxRate: p.tax_rate != null ? parseFloat(p.tax_rate.toString()) : undefined,
        inventoryTracked: p.inventory_tracked ?? false,
        quantityOnHand: p.quantity_on_hand ?? 0,
        quantityReserved: p.quantity_reserved ?? 0,
        quantityAvailable: p.quantity_available ?? 0,
        reorderPoint: p.reorder_point ?? undefined,
        reorderQuantity: p.reorder_quantity ?? undefined,
        capacityTracked: p.capacity_tracked ?? false,
        capacityTotal: p.capacity_total != null ? parseFloat(p.capacity_total.toString()) : undefined,
        capacityBooked: p.capacity_booked != null ? parseFloat(p.capacity_booked.toString()) : undefined,
        capacityAvailable: p.capacity_available != null ? parseFloat(p.capacity_available.toString()) : undefined,
        capacityUnit: p.capacity_unit || undefined,
        capacityPeriod: p.capacity_period || undefined,
        imageUrl: p.image_url || undefined,
        tags: p.tags || [],
        tieredPricing: p.tiered_pricing || undefined,
        usagePricing: p.usage_pricing || undefined,
        subscriptionPlans: p.subscription_plans || undefined,
        totalRevenue: p.total_revenue != null ? parseFloat(p.total_revenue.toString()) : 0,
        totalUnitsSold: p.total_units_sold ?? 0,
        averageSaleValue: p.average_sale_value != null ? parseFloat(p.average_sale_value.toString()) : undefined,
        lastSoldDate: p.last_sold_date || undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      const transformedPriceHistory = priceHistory.map((ph: any) => ({
        id: ph.id,
        productServiceId: ph.product_service_id,
        oldPrice: ph.old_price != null ? parseFloat(ph.old_price.toString()) : 0,
        newPrice: ph.new_price != null ? parseFloat(ph.new_price.toString()) : 0,
        changedBy: ph.changed_by,
        changedAt: ph.changed_at,
        reason: ph.reason || undefined,
        effectiveFrom: ph.effective_from || undefined,
        effectiveTo: ph.effective_to || undefined,
      }));

      console.log('[useQueryDataPersistence] Loaded products:', transformedProducts.length, 'items');
      if (transformedProducts.length > 0) {
        console.log('[useQueryDataPersistence] First product sample:', {
          name: transformedProducts[0].name,
          basePrice: transformedProducts[0].basePrice,
          createdAt: transformedProducts[0].createdAt,
          inventoryTracked: transformedProducts[0].inventoryTracked,
        });
      }

      return {
        productsServices: transformedProducts,
        productPriceHistory: transformedPriceHistory,
        productBundles: bundlesResult.data || []
      };
    } catch (err) {
      console.error('Error loading products/services:', err);
      return {
        productsServices: [],
        productPriceHistory: [],
        productBundles: []
      };
    }
  }, [userId, workspaceId]);

  /**
   * Invalidate specific cache
   */
  const invalidateCache = useCallback((cacheKey: string) => {
    if (cacheKey === 'tasks' && workspaceId) {
      queryClient.invalidateQueries({ queryKey: taskKeys.workspace(workspaceId) });
    } else if (cacheKey === 'crm' && workspaceId) {
      queryClient.invalidateQueries({ queryKey: crmKeys.workspace(workspaceId) });
    }
  }, [queryClient, workspaceId]);

  /**
   * Invalidate all caches
   */
  const invalidateAllCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: crmKeys.all });
  }, [queryClient]);

  return {
    loadCoreData,
    loadTasks,
    loadCrmItems,
    loadMarketing,
    loadFinancials,
    loadDocuments,
    loadDocumentsMetadata,
    loadDeals,
    loadRevenueTransactions,
    loadProductsServices,
    invalidateCache,
    invalidateAllCache,
    isLoading: tasksLoading || crmLoading,
    error: null
  };
};
