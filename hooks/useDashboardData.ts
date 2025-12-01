/**
 * useDashboardData Hook
 * 
 * Centralizes dashboard data loading logic, extracted from DashboardApp.tsx.
 * This hook wraps useQueryDataPersistence and provides a cleaner interface
 * for loading and managing dashboard data across tabs.
 * 
 * Benefits:
 * - Reduces DashboardApp.tsx complexity
 * - Makes data loading reusable in tests, Electron shell, etc.
 * - Isolates data concerns from UI/routing concerns
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryDataPersistence } from './useQueryDataPersistence';
import { DashboardData, TabType } from '../types';
import { EMPTY_DASHBOARD_DATA, Tab } from '../constants';
import { logger } from '../lib/utils/logger';

export interface UseDashboardDataOptions {
  userId?: string;
  workspaceId?: string;
  onError?: (error: Error) => void;
}

export interface UseDashboardDataReturn {
  /** Current dashboard data */
  data: DashboardData;
  /** Combined CRM items from all types */
  crmItems: Array<DashboardData['investors'][number] | DashboardData['customers'][number] | DashboardData['partners'][number]>;
  /** Combined CRM tasks from all types */
  crmTasks: Array<DashboardData['investorTasks'][number] | DashboardData['customerTasks'][number] | DashboardData['partnerTasks'][number]>;
  /** Whether any data is currently loading */
  isLoading: boolean;
  /** Any data loading error */
  error: Error | null;
  /** Load data for a specific tab */
  loadTabData: (tab: TabType) => Promise<void>;
  /** Reload all data */
  reload: () => Promise<void>;
  /** Invalidate cache for specific data type */
  invalidateCache: (type: string) => void;
  /** Update data locally (for optimistic updates) */
  setData: React.Dispatch<React.SetStateAction<DashboardData>>;
  /** Reference to the lazy data persistence methods */
  lazyDataRef: React.RefObject<ReturnType<typeof useQueryDataPersistence>>;
  /** Set of tabs that have been loaded */
  loadedTabs: Set<string>;
}

// Map tabs to their required data loaders
const TAB_DATA_REQUIREMENTS: Partial<Record<TabType, string[]>> = {
  [Tab.Dashboard]: ['core'],
  [Tab.Investors]: ['crm'],
  [Tab.Customers]: ['crm'],
  [Tab.Partners]: ['crm'],
  [Tab.Accounts]: ['crm'],
  [Tab.Marketing]: ['marketing'],
  [Tab.Financials]: ['financials'],
  [Tab.Tasks]: ['tasks'],
  [Tab.Workspace]: ['documents'],
  [Tab.Documents]: ['documents'],
  [Tab.Calendar]: ['core'],
  [Tab.ProductsServices]: ['products'],
  [Tab.Settings]: ['core'],
  [Tab.Email]: ['core'],
  [Tab.Admin]: ['core'],
  [Tab.Agents]: ['core'],
  [Tab.Huddle]: ['core'],
  [Tab.Forms]: ['core'],
};

export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataReturn {
  const { userId, workspaceId, onError } = options;

  // Use React Query for data fetching
  const lazyDataPersistence = useQueryDataPersistence();
  const {
    loadCoreData,
    loadTasks,
    loadCrmItems,
    loadMarketing,
    loadFinancials,
    loadDocuments,
    loadProductsServices,
    invalidateCache,
    invalidateAllCache,
    isLoading: isDataLoading,
    error: dataError
  } = lazyDataPersistence;

  // Create a ref to access lazy data methods in actions
  const lazyDataRef = useRef(lazyDataPersistence);
  useEffect(() => {
    lazyDataRef.current = lazyDataPersistence;
  }, [lazyDataPersistence]);

  // State management
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const loadedTabsRef = useRef<Set<string>>(new Set());
  const [error, setError] = useState<Error | null>(null);

  // Create unified CRM arrays
  const crmItems = useMemo(() => {
    return [
      ...(data.investors || []),
      ...(data.customers || []),
      ...(data.partners || [])
    ];
  }, [data.investors, data.customers, data.partners]);

  const crmTasks = useMemo(() => {
    return [
      ...(data.investorTasks || []),
      ...(data.customerTasks || []),
      ...(data.partnerTasks || [])
    ];
  }, [data.investorTasks, data.customerTasks, data.partnerTasks]);

  // Load data for a specific tab
  const loadTabData = useCallback(async (tab: TabType) => {
    if (!userId || !workspaceId) {
      logger.warn('[useDashboardData] Cannot load data: missing userId or workspaceId');
      return;
    }

    // Check if already loaded
    if (loadedTabsRef.current.has(tab)) {
      logger.debug(`[useDashboardData] Tab ${tab} already loaded, skipping`);
      return;
    }

    logger.info(`[useDashboardData] Loading data for tab: ${tab}`);
    setIsLoading(true);
    setError(null);

    try {
      const requirements = TAB_DATA_REQUIREMENTS[tab] || ['core'];

      for (const requirement of requirements) {
        switch (requirement) {
          case 'core':
            await loadCoreData();
            break;

          case 'crm':
            await loadCoreData();
            const crmData = await loadCrmItems({ force: true });
            setData(prev => ({ ...prev, ...crmData }));
            break;

          case 'marketing':
            await loadCoreData();
            const marketingData = await loadMarketing({ force: true });
            setData(prev => ({ ...prev, ...marketingData }));
            break;

          case 'financials':
            await loadCoreData();
            const financialsData = await loadFinancials({ force: true });
            setData(prev => ({ ...prev, ...financialsData }));
            break;

          case 'tasks':
            await loadCoreData();
            const tasksData = await loadTasks({ force: true });
            setData(prev => ({ ...prev, ...tasksData }));
            break;

          case 'documents':
            await loadDocuments({ force: true });
            break;

          case 'products':
            await loadCoreData();
            const productsData = await loadProductsServices({ force: true });
            setData(prev => ({ ...prev, ...productsData }));
            break;
        }
      }

      loadedTabsRef.current.add(tab);
      logger.info(`[useDashboardData] Data load complete for tab: ${tab}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data');
      logger.error('[useDashboardData] Error loading data:', error);
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, workspaceId, loadCoreData, loadCrmItems, loadMarketing, loadFinancials, loadTasks, loadDocuments, loadProductsServices, onError]);

  // Reload all data
  const reload = useCallback(async () => {
    loadedTabsRef.current.clear();
    invalidateAllCache();
    await loadCoreData();
  }, [invalidateAllCache, loadCoreData]);

  // Handle data error from React Query
  useEffect(() => {
    if (dataError) {
      setError(dataError instanceof Error ? dataError : new Error(String(dataError)));
    }
  }, [dataError]);

  return {
    data,
    crmItems,
    crmTasks,
    isLoading: isLoading || isDataLoading,
    error,
    loadTabData,
    reload,
    invalidateCache,
    setData,
    lazyDataRef,
    loadedTabs: loadedTabsRef.current,
  };
}

export default useDashboardData;
