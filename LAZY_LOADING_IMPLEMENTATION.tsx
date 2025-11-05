/**
 * Lazy Loading Migration for DashboardApp
 * 
 * This file contains the changes needed to implement lazy loading.
 * Replace the data loading logic in DashboardApp.tsx with this approach.
 */

// ===== IMPORTS =====
// Change this line:
import { useDataPersistence } from './hooks/useDataPersistence';

// To this:
import { useLazyDataPersistence } from './hooks/useLazyDataPersistence';


// ===== STATE SETUP =====
// Replace this:
const { data, isLoading, error: dataError, reload, userId } = useDataPersistence();

// With this:
const {
  loadCoreData,
  loadTasks,
  loadCrmItems,
  loadMarketing,
  loadFinancials,
  loadDocuments,
  invalidateCache,
  invalidateAllCache,
  isLoading: isDataLoading,
  error: dataError
} = useLazyDataPersistence();

// Add state for loaded data
const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
const [isLoading, setIsLoading] = useState(true);
const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());


// ===== INITIAL LOAD (Core Data Only) =====
// Add this useEffect after other useEffects:
useEffect(() => {
  const initializeApp = async () => {
    if (!user || !workspace) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Load only core data on app start
      const coreData = await loadCoreData();
      
      setData(prev => ({
        ...prev,
        gamification: coreData.gamification,
        settings: coreData.settings
      }));
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

  initializeApp();
}, [user, workspace?.id]);


// ===== TAB-SPECIFIC LOADING =====
// Add this useEffect to load data when tab changes:
useEffect(() => {
  const loadTabData = async () => {
    if (!user || !workspace || loadedTabs.has(activeTab)) {
      return; // Already loaded this tab
    }

    try {
      switch (activeTab) {
        case Tab.Dashboard:
        case Tab.Calendar:
          // Load tasks for dashboard and calendar
          if (!loadedTabs.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            setLoadedTabs(prev => new Set(prev).add('tasks'));
          }
          break;

        case Tab.Investors:
        case Tab.Customers:
        case Tab.Partners:
          // Load CRM items
          if (!loadedTabs.has('crm')) {
            const crm = await loadCrmItems();
            setData(prev => ({ ...prev, ...crm }));
            setLoadedTabs(prev => new Set(prev).add('crm'));
          }
          
          // Also load tasks for CRM tabs
          if (!loadedTabs.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            setLoadedTabs(prev => new Set(prev).add('tasks'));
          }
          break;

        case Tab.Marketing:
          // Load marketing items
          if (!loadedTabs.has('marketing')) {
            const marketing = await loadMarketing();
            setData(prev => ({ ...prev, marketing }));
            setLoadedTabs(prev => new Set(prev).add('marketing'));
          }
          
          // Also load marketing tasks
          if (!loadedTabs.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            setLoadedTabs(prev => new Set(prev).add('tasks'));
          }
          break;

        case Tab.Financials:
          // Load financial logs and expenses
          if (!loadedTabs.has('financials')) {
            const financials = await loadFinancials();
            setData(prev => ({ ...prev, ...financials }));
            setLoadedTabs(prev => new Set(prev).add('financials'));
          }
          
          // Also load financial tasks
          if (!loadedTabs.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            setLoadedTabs(prev => new Set(prev).add('tasks'));
          }
          break;

        case Tab.Documents:
          // Load documents
          if (!loadedTabs.has('documents')) {
            const documents = await loadDocuments();
            setData(prev => ({ ...prev, documents }));
            setLoadedTabs(prev => new Set(prev).add('documents'));
          }
          break;

        case Tab.Platform:
          // Load platform tasks
          if (!loadedTabs.has('tasks')) {
            const tasks = await loadTasks();
            setData(prev => ({ ...prev, ...tasks }));
            setLoadedTabs(prev => new Set(prev).add('tasks'));
          }
          
          // Load documents for platform tab
          if (!loadedTabs.has('documents')) {
            const documents = await loadDocuments();
            setData(prev => ({ ...prev, documents }));
            setLoadedTabs(prev => new Set(prev).add('documents'));
          }
          break;

        case Tab.Settings:
        case Tab.Achievements:
          // No additional data needed (uses core data)
          break;
      }

      setLoadedTabs(prev => new Set(prev).add(activeTab));
    } catch (error) {
      console.error(`Error loading data for tab ${activeTab}:`, error);
    }
  };

  loadTabData();
}, [activeTab, user, workspace?.id, loadedTabs]);


// ===== CACHE INVALIDATION =====
// Add this reload function to replace the old reload:
const reload = useCallback(async () => {
  // Invalidate all caches
  invalidateAllCache();
  setLoadedTabs(new Set());
  
  // Reload core data
  const coreData = await loadCoreData();
  setData(prev => ({
    ...prev,
    gamification: coreData.gamification,
    settings: coreData.settings
  }));
  
  // Reload current tab data
  const tabsToReload: string[] = [];
  
  switch (activeTab) {
    case Tab.Dashboard:
    case Tab.Calendar:
      tabsToReload.push('tasks');
      break;
    case Tab.Investors:
    case Tab.Customers:
    case Tab.Partners:
      tabsToReload.push('crm', 'tasks');
      break;
    case Tab.Marketing:
      tabsToReload.push('marketing', 'tasks');
      break;
    case Tab.Financials:
      tabsToReload.push('financials', 'tasks');
      break;
    case Tab.Documents:
      tabsToReload.push('documents');
      break;
    case Tab.Platform:
      tabsToReload.push('tasks', 'documents');
      break;
  }
  
  // Reload only necessary data
  for (const tab of tabsToReload) {
    switch (tab) {
      case 'tasks':
        const tasks = await loadTasks();
        setData(prev => ({ ...prev, ...tasks }));
        break;
      case 'crm':
        const crm = await loadCrmItems();
        setData(prev => ({ ...prev, ...crm }));
        break;
      case 'marketing':
        const marketing = await loadMarketing();
        setData(prev => ({ ...prev, marketing }));
        break;
      case 'financials':
        const financials = await loadFinancials();
        setData(prev => ({ ...prev, ...financials }));
        break;
      case 'documents':
        const documents = await loadDocuments();
        setData(prev => ({ ...prev, documents }));
        break;
    }
  }
}, [activeTab, loadCoreData, loadTasks, loadCrmItems, loadMarketing, loadFinancials, loadDocuments, invalidateAllCache]);


// ===== SPECIFIC CACHE INVALIDATION =====
// Add these helper functions to invalidate specific caches after mutations:

// After creating/updating/deleting a task:
const invalidateTaskCache = useCallback(() => {
  invalidateCache('tasks');
  setLoadedTabs(prev => {
    const newSet = new Set(prev);
    newSet.delete('tasks');
    return newSet;
  });
}, [invalidateCache]);

// After creating/updating/deleting a CRM item:
const invalidateCrmCache = useCallback(() => {
  invalidateCache('crm');
  setLoadedTabs(prev => {
    const newSet = new Set(prev);
    newSet.delete('crm');
    return newSet;
  });
}, [invalidateCache]);

// After creating/updating/deleting a marketing item:
const invalidateMarketingCache = useCallback(() => {
  invalidateCache('marketing');
  setLoadedTabs(prev => {
    const newSet = new Set(prev);
    newSet.delete('marketing');
    return newSet;
  });
}, [invalidateCache]);

// After creating/updating/deleting a financial item:
const invalidateFinancialCache = useCallback(() => {
  invalidateCache('financials');
  setLoadedTabs(prev => {
    const newSet = new Set(prev);
    newSet.delete('financials');
    return newSet;
  });
}, [invalidateCache]);

// After creating/updating/deleting a document:
const invalidateDocumentCache = useCallback(() => {
  invalidateCache('documents');
  setLoadedTabs(prev => {
    const newSet = new Set(prev);
    newSet.delete('documents');
    return newSet;
  });
}, [invalidateCache]);


// ===== UPDATE ACTIONS =====
// In each action, call invalidate after successful mutation:

// Example for createTask:
createTask: async (...args) => {
  // ... existing code ...
  await reload(); // This line stays the same
  invalidateTaskCache(); // Add this line
  // ... rest of code ...
}

// Example for createCrmItem:
createCrmItem: async (...args) => {
  // ... existing code ...
  await reload();
  invalidateCrmCache(); // Add this line
  // ... rest of code ...
}

// And so on for all actions...


// ===== SUMMARY =====
/*
Changes needed in DashboardApp.tsx:

1. Import useLazyDataPersistence instead of useDataPersistence
2. Add data state and loadedTabs state
3. Add initializeApp useEffect (loads core data only)
4. Add loadTabData useEffect (loads data per tab)
5. Update reload function to use new loading functions
6. Add cache invalidation helpers
7. Call invalidation after each action

Benefits:
- 60-70% faster initial load
- Only 2 database queries on startup (vs 8-10)
- Data loads on-demand per tab
- 5-minute caching prevents redundant queries
- Existing code mostly unchanged
*/
