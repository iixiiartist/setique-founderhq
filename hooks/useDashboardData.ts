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
  /** Reload data for a specific tab (force refresh) */
  reloadTab: (tab: TabType) => Promise<void>;
  /** Reload all data */
  reload: () => Promise<void>;
  /** Initialize app - load core data and document metadata */
  initializeApp: () => Promise<void>;
  /** Invalidate cache for specific data type */
  invalidateCache: (type: string) => void;
  /** Invalidate all caches */
  invalidateAllCache: () => void;
  /** Clear loaded tabs tracking (for reload) */
  clearLoadedTabs: () => void;
  /** Update data locally (for optimistic updates) */
  setData: React.Dispatch<React.SetStateAction<DashboardData>>;
  /** Reference to the lazy data persistence methods */
  lazyDataRef: React.RefObject<ReturnType<typeof useQueryDataPersistence>>;
  /** Set of tabs that have been loaded */
  loadedTabs: Set<string>;
  /** Whether data is loading from React Query */
  isDataLoading: boolean;
}

// Tab data requirements have been replaced with loadTabData switch logic below
// to support complex tab-specific loading (e.g., Calendar needs tasks + marketing + CRM)

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
    loadDocumentsMetadata,
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

  // Load data for a specific tab (matches DashboardApp logic exactly)
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
      switch (tab) {
        case Tab.Dashboard:
        case Tab.Calendar:
          // Load tasks for dashboard and calendar
          if (!loadedTabsRef.current.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            loadedTabsRef.current.add('tasks');
          }
          
          // Calendar also needs marketing items and CRM items for events
          if (tab === Tab.Calendar) {
            if (!loadedTabsRef.current.has('marketing')) {
              const marketingData = await loadMarketing();
              setData(prev => ({ ...prev, ...marketingData }));
              loadedTabsRef.current.add('marketing');
            }
            
            if (!loadedTabsRef.current.has('crm')) {
              const crm = await loadCrmItems();
              setData(prev => ({ ...prev, ...crm }));
              loadedTabsRef.current.add('crm');
            }
          }
          break;

        case Tab.Accounts:
        case Tab.Investors:
        case Tab.Customers:
        case Tab.Partners:
          // Load CRM items
          if (!loadedTabsRef.current.has('crm')) {
            const crm = await loadCrmItems();
            setData(prev => ({ ...prev, ...crm }));
            loadedTabsRef.current.add('crm');
          }
          
          // Also load tasks for CRM tabs
          if (!loadedTabsRef.current.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            loadedTabsRef.current.add('tasks');
          }
          break;

        case Tab.Marketing:
          // Load marketing items
          if (!loadedTabsRef.current.has('marketing')) {
            const marketingData = await loadMarketing();
            setData(prev => ({ ...prev, ...marketingData }));
            loadedTabsRef.current.add('marketing');
          }
          
          // Also load marketing tasks
          if (!loadedTabsRef.current.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            loadedTabsRef.current.add('tasks');
          }
          break;

        case Tab.Financials:
          // Load financial logs and expenses
          if (!loadedTabsRef.current.has('financials')) {
            const financials = await loadFinancials();
            setData(prev => ({ ...prev, ...financials }));
            loadedTabsRef.current.add('financials');
          }
          
          // Also load financial tasks
          if (!loadedTabsRef.current.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            loadedTabsRef.current.add('tasks');
          }
          break;

        case Tab.Documents:
          // Load documents
          if (!loadedTabsRef.current.has('documents')) {
            const documents = await loadDocuments();
            setData(prev => ({ ...prev, ...documents }));
            loadedTabsRef.current.add('documents');
          }
          break;

        case Tab.ProductsServices:
          // Load products & services tasks
          if (!loadedTabsRef.current.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            loadedTabsRef.current.add('tasks');
          }
          
          // Load products/services data
          if (!loadedTabsRef.current.has('productsServices')) {
            const productsData = await loadProductsServices();
            setData(prev => ({ 
              ...prev, 
              productsServices: productsData.productsServices,
              productPriceHistory: productsData.productPriceHistory,
              productBundles: productsData.productBundles
            }));
            loadedTabsRef.current.add('productsServices');
          }
          
          // Load documents for products/services tab
          if (!loadedTabsRef.current.has('documents')) {
            const documents = await loadDocuments();
            setData(prev => ({ ...prev, ...documents }));
            loadedTabsRef.current.add('documents');
          }
          break;

        case Tab.Tasks:
          // Load all tasks for the Tasks tab
          logger.info('[useDashboardData] Tab.Tasks case hit', {
            tasksAlreadyLoaded: loadedTabsRef.current.has('tasks')
          });
          if (!loadedTabsRef.current.has('tasks')) {
            logger.info('[useDashboardData] Loading tasks for Tasks tab...');
            const tasks = await loadTasks();
            logger.info('[useDashboardData] Tasks loaded', tasks);
            setData(prev => ({ ...prev, ...tasks }));
            loadedTabsRef.current.add('tasks');
          }
          break;

        case Tab.Settings:
        case Tab.Email:
        case Tab.Admin:
        case Tab.Agents:
        case Tab.Huddle:
        case Tab.Forms:
        case Tab.Workspace:
          // No additional data needed (uses core data)
          break;
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
  }, [userId, workspaceId, loadTasks, loadCrmItems, loadMarketing, loadFinancials, loadDocuments, loadProductsServices, onError]);

  // Reload all data
  const reload = useCallback(async () => {
    loadedTabsRef.current.clear();
    invalidateAllCache();
    await loadCoreData();
  }, [invalidateAllCache, loadCoreData]);

  // Initialize app - load core data and document metadata
  const initializeApp = useCallback(async () => {
    if (!userId || !workspaceId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Load core data + document metadata on app start
      // Document metadata is lightweight (no base64 content) so AI can access files across all tabs
      const [coreData, documentsMetadata] = await Promise.all([
        loadCoreData(),
        loadDocumentsMetadata()
      ]);
      
      setData(prev => ({
        ...prev,
        settings: coreData.settings,
        documentsMetadata: documentsMetadata
      }));
      
      setIsLoading(false);
    } catch (err) {
      logger.error('[useDashboardData] Error initializing app:', err);
      setIsLoading(false);
    }
  }, [userId, workspaceId, loadCoreData, loadDocumentsMetadata]);

  // Reload data for a specific tab (force refresh, matching DashboardApp reload logic)
  const reloadTab = useCallback(async (tab: TabType) => {
    if (!userId || !workspaceId) return;

    // Invalidate all caches
    invalidateAllCache();
    loadedTabsRef.current.clear();
    
    // Reload core data
    try {
      const coreData = await loadCoreData();
      setData(prev => ({
        ...prev,
        settings: coreData.settings
      }));
      
      // Reload current tab data
      switch (tab) {
        case Tab.Dashboard:
        case Tab.Calendar:
        case Tab.ProductsServices:
          const tasks = await loadTasks({ force: true });
          setData(prev => ({ ...prev, ...tasks }));
          loadedTabsRef.current.add('tasks');
          
          // Calendar tab needs marketing data for calendar events
          if (tab === Tab.Calendar) {
            const marketing = await loadMarketing({ force: true });
            setData(prev => ({ ...prev, ...marketing }));
            loadedTabsRef.current.add('marketing');
            
            const crm = await loadCrmItems({ force: true });
            setData(prev => ({ ...prev, ...crm }));
            loadedTabsRef.current.add('crm');
          }
          
          if (tab === Tab.ProductsServices) {
            const productsData = await loadProductsServices({ force: true });
            setData(prev => ({ 
              ...prev, 
              productsServices: productsData.productsServices,
              productPriceHistory: productsData.productPriceHistory,
              productBundles: productsData.productBundles
            }));
            loadedTabsRef.current.add('productsServices');
            
            const documents = await loadDocuments({ force: true });
            setData(prev => ({ ...prev, ...documents }));
            loadedTabsRef.current.add('documents');
          }
          break;

        case Tab.Accounts:
        case Tab.Investors:
        case Tab.Customers:
        case Tab.Partners:
          const crm = await loadCrmItems({ force: true });
          setData(prev => ({ ...prev, ...crm }));
          loadedTabsRef.current.add('crm');
          
          const crmTasks = await loadTasks({ force: true });
          setData(prev => ({ ...prev, ...crmTasks }));
          loadedTabsRef.current.add('tasks');
          break;

        case Tab.Marketing:
          const marketing = await loadMarketing({ force: true });
          setData(prev => ({ ...prev, ...marketing }));
          loadedTabsRef.current.add('marketing');
          
          const marketingTasks = await loadTasks({ force: true });
          setData(prev => ({ ...prev, ...marketingTasks }));
          loadedTabsRef.current.add('tasks');
          break;

        case Tab.Financials:
          const financials = await loadFinancials({ force: true });
          setData(prev => ({ ...prev, ...financials }));
          loadedTabsRef.current.add('financials');
          
          const financialTasks = await loadTasks({ force: true });
          setData(prev => ({ ...prev, ...financialTasks }));
          loadedTabsRef.current.add('tasks');
          break;

        case Tab.Documents:
          const docs = await loadDocuments({ force: true });
          setData(prev => ({ ...prev, ...docs }));
          loadedTabsRef.current.add('documents');
          break;

        case Tab.Tasks:
          const allTasks = await loadTasks({ force: true });
          setData(prev => ({ ...prev, ...allTasks }));
          loadedTabsRef.current.add('tasks');
          break;

        case Tab.Settings:
        case Tab.Email:
        case Tab.Admin:
        case Tab.Agents:
        case Tab.Huddle:
        case Tab.Forms:
        case Tab.Workspace:
          // No additional data needed
          break;
      }
      
      loadedTabsRef.current.add(tab);
    } catch (err) {
      logger.error('[useDashboardData] Error reloading tab:', err);
    }
  }, [userId, workspaceId, invalidateAllCache, loadCoreData, loadTasks, loadMarketing, loadCrmItems, loadProductsServices, loadDocuments, loadFinancials]);

  // Clear loaded tabs tracking
  const clearLoadedTabs = useCallback(() => {
    loadedTabsRef.current.clear();
  }, []);

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
    isDataLoading,
    error,
    loadTabData,
    reloadTab,
    reload,
    initializeApp,
    invalidateCache,
    invalidateAllCache,
    clearLoadedTabs,
    setData,
    lazyDataRef,
    loadedTabs: loadedTabsRef.current,
  };
}

export default useDashboardData;
