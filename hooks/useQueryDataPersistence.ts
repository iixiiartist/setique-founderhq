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
   * Load core data (settings)
   */
  const loadCoreData = useCallback(async () => {
    if (!userId || !workspaceId) {
      return { settings: EMPTY_DASHBOARD_DATA.settings };
    }

    try {
      const { data: dashboardData } = await DatabaseService.getAllDashboardData(userId, workspaceId);
      return {
        settings: dashboardData?.settings || EMPTY_DASHBOARD_DATA.settings
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
      return [];
    }

    try {
      const { data } = await DatabaseService.getMarketingItems(workspaceId);
      
      // Transform raw database rows to application models (snake_case → camelCase)
      const { dbToMarketingItem } = await import('../lib/utils/fieldTransformers');
      const transformedMarketing = (data || []).map(dbToMarketingItem);
      
      return transformedMarketing;
    } catch (err) {
      console.error('Error loading marketing:', err);
      return [];
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

      return {
        productsServices: productsResult.data || [],
        productPriceHistory: priceHistoryResult.data || [],
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
