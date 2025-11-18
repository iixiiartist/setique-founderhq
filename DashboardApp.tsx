import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { logger } from './lib/logger'
import { Tab, EMPTY_DASHBOARD_DATA, NAV_ITEMS } from './constants';
import { featureFlags } from './lib/featureFlags';
import { DashboardData, AppActions, Task, TaskCollectionName, CrmCollectionName, NoteableCollectionName, AnyCrmItem, FinancialLog, Note, BaseCrmItem, MarketingItem, SettingsData, Document, Contact, TabType, Priority, CalendarEvent, Meeting, TaskStatus } from './types';
import SideMenu from './components/SideMenu';
import DashboardTab from './components/DashboardTab';
import Toast from './components/shared/Toast';
import { TabLoadingFallback } from './components/shared/TabLoadingFallback';
import { setUser as setSentryUser, setWorkspaceContext, trackAction } from './lib/sentry.tsx';
import { useAnalytics } from './hooks/useAnalytics';
import { notifyTaskReassigned, notifyDeadlineChanged } from './lib/services/taskReminderService';
import { notifyDealWon, notifyDealLost, notifyDealStageChanged, notifyDealReassigned } from './lib/services/dealNotificationService';
import InAppNotificationsPanel from './components/shared/InAppNotificationsPanel';

// Lazy load heavy tab components for code splitting
// This reduces initial bundle size and improves first load performance
const ProductsServicesTab = lazy(() => import('./components/products/ProductsServicesTab'));
const CrmTab = lazy(() => import('./components/CrmTab'));
const AccountsTab = lazy(() => import('./components/AccountsTab')); // NEW: Unified CRM view
const MarketingTab = lazy(() => import('./components/MarketingTab'));
const FinancialsTab = lazy(() => import('./components/FinancialsTab'));
const SettingsTab = lazy(() => import('./components/SettingsTab'));
const FileLibraryTab = lazy(() => import('./components/FileLibraryTab'));
const AdminTab = lazy(() => import('./components/AdminTab'));
const CalendarTab = lazy(() => import('./components/CalendarTab'));
const TasksTab = lazy(() => import('./components/TasksTab'));
const WorkspaceTab = lazy(() => import('./components/workspace/WorkspaceTab'));
import { BusinessProfileSetup } from './components/BusinessProfileSetup';
import { AcceptInviteNotification } from './components/shared/AcceptInviteNotification';
import { NotificationBell } from './components/shared/NotificationBell';
import { FloatingAIAssistant } from './components/assistant/FloatingAIAssistant';
import { useAuth } from './contexts/AuthContext';
import { useWorkspace } from './contexts/WorkspaceContext';
import { LoadingSpinner } from './components/shared/Loading';
import { useQueryDataPersistence } from './hooks/useQueryDataPersistence';
import { DataPersistenceAdapter } from './lib/services/dataPersistenceAdapter';
import { DatabaseService } from './lib/services/database';
import { supabase } from './lib/supabase';
import { SectionBoundary } from './lib/errorBoundaries';

const DashboardApp: React.FC<{ subscribePlan?: string | null }> = ({ subscribePlan }) => {
    const { user, signOut } = useAuth();
    const { workspace, businessProfile, showOnboarding, saveBusinessProfile, dismissOnboarding, isLoadingWorkspace, refreshWorkspace, canEditTask, workspaceMembers, isWorkspaceOwner } = useWorkspace();
    const { track } = useAnalytics();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showBusinessProfileModal, setShowBusinessProfileModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Persist active tab in localStorage so it survives page refresh
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const savedTab = localStorage.getItem('activeTab');
        return (savedTab as TabType) || Tab.Dashboard;
    });
    
    // Use React Query for data fetching (improved caching and performance)
    const lazyDataPersistence = useQueryDataPersistence();
    const {
        loadCoreData,
        loadTasks,
        loadCrmItems,
        loadMarketing,
        loadFinancials,
        loadDocuments,
        loadDocumentsMetadata,
        loadDeals,
        loadProductsServices,
        invalidateCache,
        invalidateAllCache,
        isLoading: isDataLoading,
        error: dataError
    } = lazyDataPersistence;
    
    // Create a ref to access lazy data methods in actions
    const useLazyDataPersistenceRef = useRef(lazyDataPersistence);
    useEffect(() => {
        useLazyDataPersistenceRef.current = lazyDataPersistence;
    }, [lazyDataPersistence]);
    
    // State management for lazy-loaded data
    const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
    const [isLoading, setIsLoading] = useState(true);
    const loadedTabsRef = useRef<Set<string>>(new Set()); // Use ref to avoid infinite loop
    const userId = user?.id;
    
    // Create unified crmItems array for AccountsTab
    const dataWithUnifiedCrm = useMemo(() => {
        const crmItems = [
            ...(data.investors || []),
            ...(data.customers || []),
            ...(data.partners || [])
        ];
        
        // Also create unified crmTasks array for AccountsTab
        const crmTasks = [
            ...(data.investorTasks || []),
            ...(data.customerTasks || []),
            ...(data.partnerTasks || [])
        ];
        
        return {
            ...data,
            crmItems,
            crmTasks
        };
    }, [data]);
    
    const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
    const [sentNotifications, setSentNotifications] = useState<Set<string>>(new Set());
    const [lastNotificationCheckDate, setLastNotificationCheckDate] = useState<string | null>(null);
    const [isTaskFocusModalOpen, setIsTaskFocusModalOpen] = useState(false);
    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);

    // Refs for notification permission tracking (prevents duplicate warnings)
    const notificationPermissionRequestRef = useRef(false);
    const notificationSupportWarnedRef = useRef(false);
    const notificationPermissionWarnedRef = useRef(false);
    const notificationErrorWarnedRef = useRef(false);
    
    // Ref for AI assistant toggle function (set by FloatingAIAssistant)
    const toggleAIAssistantRef = useRef<(() => void) | null>(null);

    // Toast handler - defined early so it can be used in notification logic
    const handleToast = useCallback((message: string, type: 'info' | 'success' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
    }, [activeTab]);

    // Set Sentry user context for error tracking
    useEffect(() => {
        if (user) {
            setSentryUser({
                id: user.id,
                email: user.email || 'unknown'
            });
        } else {
            setSentryUser(null);
        }
    }, [user]);

    // Set Sentry workspace context for error tracking
    useEffect(() => {
        if (workspace) {
            setWorkspaceContext({
                id: workspace.id,
                name: workspace.name,
                planType: workspace.planType || 'free'
            });
        } else {
            setWorkspaceContext(null);
        }
    }, [workspace]);

    // Check if current user is admin
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) return;
            
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();
                
                if (!error && data) {
                    setIsAdmin(data.is_admin || false);
                }
            } catch (error) {
                logger.error('Error checking admin status:', error);
            }
        };

        checkAdminStatus();
    }, [user]);

    // Handle pending subscription redirect
    useEffect(() => {
        if (subscribePlan && workspace && !isLoadingWorkspace) {
            // Clear the pending subscription
            sessionStorage.removeItem('pending_subscription');
            
            // Redirect to settings tab to trigger checkout
            setActiveTab(Tab.Settings);
            
            // Store the plan to subscribe to
            sessionStorage.setItem('checkout_plan', subscribePlan);
            
            logger.info('Redirecting to checkout for plan:', subscribePlan);
        }
    }, [subscribePlan, workspace, isLoadingWorkspace]);

    // Initialize app - load only core data (settings)
    useEffect(() => {
        const initializeApp = async () => {
            if (!user || !workspace) {
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
            } catch (error) {
                logger.error('Error initializing app:', error);
                setIsLoading(false);
            }
        };

        initializeApp();
    }, [user?.id, workspace?.id]); // Only re-run when user or workspace ID actually changes

    // Load tab-specific data when tab changes (lazy loading)
    useEffect(() => {
        const loadTabData = async () => {
            logger.info(`[DashboardApp] Lazy load effect triggered for tab: ${activeTab}`, {
                hasUser: !!user,
                hasWorkspace: !!workspace,
                alreadyLoaded: loadedTabsRef.current.has(activeTab),
                loadedTabs: Array.from(loadedTabsRef.current)
            });
            
            if (!user || !workspace || loadedTabsRef.current.has(activeTab)) {
                logger.info('[DashboardApp] Skipping tab data load', {
                    reason: !user ? 'no user' : !workspace ? 'no workspace' : 'already loaded'
                });
                return; // Already loaded this tab
            }

            try {
                setIsLoading(true);
                logger.info(`[DashboardApp] Loading data for tab: ${activeTab}`);
                
                switch (activeTab) {
                    case Tab.Dashboard:
                    case Tab.Calendar:
                        // Load tasks for dashboard and calendar
                        if (!loadedTabsRef.current.has('tasks')) {
                            const tasks = await loadTasks();
                            setData(prev => ({ ...prev, ...tasks }));
                            loadedTabsRef.current.add('tasks');
                        }
                        
                        // Calendar also needs marketing items and CRM items for events
                        if (activeTab === Tab.Calendar) {
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
                        // Load CRM items (loadCrmItems returns both split and unified formats)
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
                            setData(prev => ({ ...prev, documents }));
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
                            setData(prev => ({ ...prev, documents }));
                            loadedTabsRef.current.add('documents');
                        }
                        break;

                    case Tab.Tasks:
                        // Load all tasks for the Tasks tab
                        logger.info('[DashboardApp] Tab.Tasks case hit', {
                            tasksAlreadyLoaded: loadedTabsRef.current.has('tasks')
                        });
                        if (!loadedTabsRef.current.has('tasks')) {
                            logger.info('[DashboardApp] Loading tasks for Tasks tab...');
                            const tasks = await loadTasks();
                            logger.info('[DashboardApp] Tasks loaded', tasks);
                            setData(prev => ({ ...prev, ...tasks }));
                            loadedTabsRef.current.add('tasks');
                        }
                        break;

                    case Tab.Settings:
                        // No additional data needed (uses core data)
                        break;
                }

                loadedTabsRef.current.add(activeTab);
                setIsLoading(false); // Done loading
            } catch (error) {
                logger.error(`Error loading data for tab ${activeTab}:`, error);
                setIsLoading(false); // Stop loading on error
            }
        };

        loadTabData();
    }, [activeTab, user?.id, workspace?.id]); // Only depend on tab and user/workspace changes

    // Handle data loading errors
    useEffect(() => {
        if (dataError) {
            handleToast('Failed to load data from database', 'info');
            logger.error('Data loading error:', dataError);
        }
    }, [dataError, handleToast]);

    // Disable desktop notifications when browser doesn't support or permission denied
    const disableDesktopNotifications = useCallback(async () => {
        let updatedSettings: SettingsData | null = null;

        setData(prev => {
            if (!prev.settings.desktopNotifications) {
                return prev;
            }

            updatedSettings = { ...prev.settings, desktopNotifications: false };

            return {
                ...prev,
                settings: updatedSettings
            };
        });

        if (userId && updatedSettings) {
            try {
                await DataPersistenceAdapter.updateSettings(userId, updatedSettings);
            } catch (error) {
                logger.error('Error persisting desktop notification preference:', error);
            }
        }
    }, [userId]);
    
    // Effect for checking and sending notifications with robust permission handling
    useEffect(() => {
        const canUseNotifications = typeof window !== 'undefined' && 'Notification' in window;

        if (!data.settings.desktopNotifications) {
            return;
        }

        if (!canUseNotifications) {
            if (!notificationSupportWarnedRef.current) {
                notificationSupportWarnedRef.current = true;
                handleToast('Desktop notifications are not supported in this browser. We disabled the setting for you.', 'info');
            }
            void disableDesktopNotifications();
            return;
        }

        let isMounted = true;

        const ensurePermission = async (): Promise<NotificationPermission> => {
            const permission = Notification.permission;

            if (permission === 'granted') {
                return permission;
            }

            if (permission === 'default') {
                if (notificationPermissionRequestRef.current) {
                    return permission;
                }

                notificationPermissionRequestRef.current = true;
                try {
                    const result = await Notification.requestPermission();
                    if (result !== 'granted') {
                        if (!notificationPermissionWarnedRef.current) {
                            notificationPermissionWarnedRef.current = true;
                            handleToast('Desktop notifications were disabled because permission was not granted.', 'info');
                        }
                        await disableDesktopNotifications();
                    }
                    return result;
                } finally {
                    notificationPermissionRequestRef.current = false;
                }
            }

            if (permission === 'denied') {
                if (!notificationPermissionWarnedRef.current) {
                    notificationPermissionWarnedRef.current = true;
                    handleToast('Desktop notifications were disabled because permission was revoked.', 'info');
                }
                await disableDesktopNotifications();
            }

            return permission;
        };

        const checkNotifications = async () => {
            const todayStr = new Date().toISOString().split('T')[0];

            if (todayStr !== lastNotificationCheckDate) {
                setLastNotificationCheckDate(todayStr);
                setSentNotifications(new Set());
            }

            const permission = await ensurePermission();
            if (!isMounted || permission !== 'granted') {
                return;
            }

            const allCrmItems = [...data.investors, ...data.customers, ...data.partners];
            const crmItemsWithActions = allCrmItems.filter(item => item.nextAction && item.nextActionDate);

            crmItemsWithActions.forEach(item => {
                if (!item.nextActionDate) {
                    return;
                }

                const isOverdue = item.nextActionDate < todayStr;
                const notificationId = `notif-${item.id}`;

                if (isOverdue && !sentNotifications.has(notificationId)) {
                    try {
                        new Notification('Setique: Overdue Action', {
                            body: `Your next action with ${item.company} ("${item.nextAction}") was due on ${item.nextActionDate}.`,
                            tag: notificationId
                        });
                        setSentNotifications(prev => {
                            const next = new Set(prev);
                            next.add(notificationId);
                            return next;
                        });
                    } catch (error) {
                        logger.error('Error dispatching desktop notification:', error);
                        if (!notificationErrorWarnedRef.current) {
                            notificationErrorWarnedRef.current = true;
                            handleToast('We could not display desktop notifications. Please review your browser permissions.', 'info');
                        }
                    }
                }
            });
        };

        const intervalId = window.setInterval(() => {
            void checkNotifications();
        }, 60000); // Check every minute

        void checkNotifications(); // Also check on initial load

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [
        data.customers,
        data.investors,
        data.partners,
        data.settings.desktopNotifications,
        disableDesktopNotifications,
        handleToast,
        lastNotificationCheckDate,
        sentNotifications
    ]);

    // Event listener for opening business profile modal from settings
    useEffect(() => {
        const handleOpenBusinessProfile = () => {
            setShowBusinessProfileModal(true);
        };
        
        window.addEventListener('openBusinessProfile', handleOpenBusinessProfile);
        return () => window.removeEventListener('openBusinessProfile', handleOpenBusinessProfile);
    }, []);


    const switchTab = (tab: TabType) => {
        track('tab_switched', { from: activeTab, to: tab });
        setActiveTab(tab);
        setIsMenuOpen(false);
    };

    // Reload function for lazy loading - invalidates cache and reloads current tab data
    const reload = useCallback(async () => {
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
            switch (activeTab) {
                case Tab.Dashboard:
                case Tab.Calendar:
                case Tab.ProductsServices:
                    const tasks = await loadTasks({ force: true });
                    setData(prev => ({ ...prev, ...tasks }));
                    loadedTabsRef.current.add('tasks');
                    
                    // Calendar tab needs marketing data for calendar events
                    if (activeTab === Tab.Calendar) {
                        const marketing = await loadMarketing({ force: true });
                        setData(prev => ({ ...prev, ...marketing }));
                        loadedTabsRef.current.add('marketing');
                        
                        const crm = await loadCrmItems({ force: true });
                        setData(prev => ({ ...prev, ...crm }));
                        loadedTabsRef.current.add('crm');
                    }
                    
                    if (activeTab === Tab.ProductsServices) {
                        const productsData = await loadProductsServices({ force: true });
                        setData(prev => ({ 
                            ...prev, 
                            productsServices: productsData.productsServices,
                            productPriceHistory: productsData.productPriceHistory,
                            productBundles: productsData.productBundles
                        }));
                        loadedTabsRef.current.add('productsServices');
                        
                        const documents = await loadDocuments({ force: true });
                        setData(prev => ({ ...prev, documents }));
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
                    setData(prev => ({ ...prev, documents: docs }));
                    loadedTabsRef.current.add('documents');
                    break;

                case Tab.Settings:
                    // No additional data needed
                    break;
            }
            
            loadedTabsRef.current.add(activeTab);
        } catch (error) {
            logger.error('Error reloading data:', error);
        }
    }, [activeTab, loadCoreData, loadTasks, loadCrmItems, loadMarketing, loadFinancials, loadDocuments, loadProductsServices, invalidateAllCache]);

    const allTasks = useMemo(() => {
        const taskCollections: { tasks: Task[]; tag: string }[] = [
            { tasks: data.productsServicesTasks, tag: 'Products' },
            { tasks: data.investorTasks, tag: 'Investor' },
            { tasks: data.customerTasks, tag: 'Customer' },
            { tasks: data.partnerTasks, tag: 'Partner' },
            { tasks: data.marketingTasks, tag: 'Marketing' },
            { tasks: data.financialTasks, tag: 'Financials' },
        ];

        return taskCollections.flatMap(({ tasks, tag }) => tasks.map(t => ({ ...t, tag })));
    }, [data]);

    const allIncompleteTasks = useMemo(() => {
        return allTasks
            .filter(t => t.status !== 'Done')
            .sort((a, b) => {
                // Sort by priority first (High > Medium > Low), then by creation date
                const priorityOrder: Record<Priority, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
                const priorityA = priorityOrder[a.priority];
                const priorityB = priorityOrder[b.priority];
                if (priorityB !== priorityA) {
                    return priorityB - priorityA;
                }
                return b.createdAt - a.createdAt;
            });
    }, [allTasks]);
    
    
    // --- AI Data Loading Handler ---
    const handleAIDataLoad = useCallback(async (tab: TabType) => {
        console.log(`[DashboardApp] AI requested data load for tab: ${tab}`);
        
        switch (tab) {
            case Tab.Accounts:
            case Tab.Investors:
            case Tab.Customers:
            case Tab.Partners:
                // Load CRM items and deals with force refresh
                await loadCrmItems({ force: true });
                await loadTasks({ force: true });
                if (useLazyDataPersistenceRef.current?.loadDeals) {
                    const deals = await useLazyDataPersistenceRef.current.loadDeals({ force: true });
                    setData(prev => ({ ...prev, deals }));
                }
                break;
            
            case Tab.Marketing:
                // Load marketing items with force refresh
                await loadMarketing({ force: true });
                await loadTasks({ force: true });
                break;
            
            case Tab.Financials:
                // Load financial data with force refresh
                await loadFinancials({ force: true });
                await loadTasks({ force: true });
                break;
            
            case Tab.ProductsServices:
                // Load products & services with force refresh
                await loadTasks({ force: true });
                const productsData = await loadProductsServices({ force: true });
                setData(prev => ({ 
                    ...prev, 
                    productsServices: productsData.productsServices,
                    productPriceHistory: productsData.productPriceHistory,
                    productBundles: productsData.productBundles
                }));
                break;
            
            case Tab.Calendar:
                // Calendar needs multiple data sources
                await loadTasks({ force: true });
                await loadCrmItems({ force: true });
                await loadMarketing({ force: true });
                break;
            
            case Tab.Tasks:
                // Tasks tab needs all task collections
                await loadTasks({ force: true });
                await loadCrmItems({ force: true }); // For linked accounts/contacts
                break;
            
            case Tab.Dashboard:
                // Dashboard needs overview data
                await loadCoreData();
                await loadTasks({ force: true });
                await loadCrmItems({ force: true });
                await loadMarketing({ force: true });
                break;
            
            case Tab.Documents:
            case Tab.Workspace:
                // Load documents
                await loadDocuments({ force: true });
                break;
            
            default:
                // For other tabs, just ensure core data is loaded
                await loadCoreData();
                break;
        }
        
        console.log(`[DashboardApp] Data load complete for tab: ${tab}`);
    }, [loadCrmItems, loadMarketing, loadFinancials, loadTasks, loadCoreData, loadDocuments]);
    
    // --- AI Action Implementations ---
    const allCompanies = useMemo(() => {
        return [...data.investors, ...data.customers, ...data.partners];
    }, [data.investors, data.customers, data.partners]);

    const allContacts = useMemo(() => {
        return allCompanies.flatMap(company => (company.contacts || []).map(contact => ({...contact, companyName: company.company })));
    }, [allCompanies]);

    const actions: AppActions = useMemo(() => ({
        createTask: async (category, text, priority, crmItemId, contactId, dueDate, assignedTo, dueTime, subtasks) => {
            if (!userId || !supabase) {
                handleToast('Database not available', 'info');
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                logger.error('[DashboardApp] Cannot create task: No workspace loaded', { workspace });
                handleToast('No workspace available. Please refresh the page.', 'info');
                return { success: false, message: 'No workspace available' };
            }

            handleToast(`Creating task...`, 'info');

            try {
                logger.info('[DashboardApp] Creating task with workspace:', workspace.id);
                
                // Await the server response instead of optimistic update
                const result = await DataPersistenceAdapter.createTask(
                    userId, 
                    category, 
                    text, 
                    priority, 
                    crmItemId, 
                    contactId, 
                    dueDate, 
                    workspace.id, 
                    assignedTo, 
                    dueTime,
                    subtasks
                );

                if (result.error) {
                    throw new Error(result.error.message || 'Failed to create task');
                }

                if (result.data) {
                    // Map database task to Task type with proper fields
                    const newTask: Task = {
                        id: result.data.id,
                        text: result.data.text,
                        status: result.data.status as 'Todo' | 'InProgress' | 'Done',
                        priority: result.data.priority as Priority,
                        category: result.data.category as TaskCollectionName,
                        createdAt: new Date(result.data.created_at).getTime(),
                        userId: result.data.user_id,
                        dueDate: result.data.due_date || undefined,
                        dueTime: result.data.due_time || undefined,
                        crmItemId: result.data.crm_item_id || undefined,
                        contactId: result.data.contact_id || undefined,
                        assignedTo: result.data.assigned_to || undefined,
                        assignedToName: result.data.assigned_to_profile?.full_name || undefined,
                        notes: [],
                        subtasks: result.data.subtasks || []
                    };
                    
                    logger.info('[DashboardApp] Created task object:', newTask);

                    // Add the server task directly to state
                    logger.info('[DashboardApp] Adding task to state:', { 
                        category, 
                        taskId: newTask.id, 
                        currentCount: (data[category] as Task[])?.length || 0 
                    });
                    
                    setData(prev => {
                        const updatedCategory = [...(prev[category] as Task[]), newTask];
                        logger.info('[DashboardApp] State updated:', { 
                            category, 
                            newCount: updatedCategory.length 
                        });
                        return {
                            ...prev,
                            [category]: updatedCategory
                        };
                    });
                }
                
                // Track action in Sentry and Analytics
                trackAction('task_created', { category, priority, hasDate: !!dueDate });
                track('task_created', { category, priority, has_due_date: !!dueDate, has_assignee: !!assignedTo });
                
                handleToast(`Task "${text}" created.`, 'success');
                return { success: true, message: `Task "${text}" created.` };
            } catch (error) {
                logger.error('Error creating task:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
                handleToast(errorMessage, 'info');
                return { success: false, message: errorMessage };
            }
        },

        updateTask: async (taskId, updates) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            // Skip database update for temporary IDs (optimistic updates)
            if (taskId.startsWith('temp-')) {
                logger.info('[DashboardApp] Skipping update for temporary task ID:', taskId);
                return { success: false, message: 'Cannot update temporary task - waiting for database sync' };
            }

            try {
                // Check if task is being marked as completed
                const wasCompleted = updates.status === 'Done';
                
                // Get the task before update to check its previous status and permissions
                let previousStatus: TaskStatus | undefined;
                let task: Task | undefined;
                let taskCategory: TaskCollectionName | undefined;
                
                const allTasksFlat = [
                    ...data.productsServicesTasks,
                    ...data.investorTasks,
                    ...data.customerTasks,
                    ...data.partnerTasks,
                    ...data.marketingTasks,
                    ...data.financialTasks,
                ];
                task = allTasksFlat.find(t => t.id === taskId);
                
                // Find which category this task belongs to
                if (data.productsServicesTasks.some(t => t.id === taskId)) taskCategory = 'productsServicesTasks';
                else if (data.investorTasks.some(t => t.id === taskId)) taskCategory = 'investorTasks';
                else if (data.customerTasks.some(t => t.id === taskId)) taskCategory = 'customerTasks';
                else if (data.partnerTasks.some(t => t.id === taskId)) taskCategory = 'partnerTasks';
                else if (data.marketingTasks.some(t => t.id === taskId)) taskCategory = 'marketingTasks';
                else if (data.financialTasks.some(t => t.id === taskId)) taskCategory = 'financialTasks';
                
                // Check permissions - user can edit their own tasks, assigned tasks, or if they're the workspace owner
                if (task?.userId && !canEditTask(task.userId, task.assignedTo)) {
                    handleToast('You do not have permission to edit this task', 'info');
                    return { success: false, message: 'Permission denied' };
                }
                
                if (wasCompleted && task) {
                    previousStatus = task.status;
                }

                // Optimistically update the task in the UI
                if (task && taskCategory) {
                    setData(prev => ({
                        ...prev,
                        [taskCategory!]: (prev[taskCategory!] as Task[]).map(t => 
                            t.id === taskId ? { ...t, ...updates } : t
                        )
                    }));
                }

                await DataPersistenceAdapter.updateTask(taskId, updates, user?.id, workspace?.id);
                
                // Track action in Sentry and Analytics
                trackAction('task_updated', { 
                    taskId, 
                    status: updates.status,
                    wasCompleted: wasCompleted && previousStatus !== 'Done'
                });
                track('task_updated', {
                    status: updates.status,
                    was_completed: wasCompleted && previousStatus !== 'Done',
                    category: taskCategory
                });

                // Send notifications for important changes
                if (task && workspace?.id) {
                    // Task reassignment notification
                    if (updates.assignedTo && updates.assignedTo !== task.assignedTo) {
                        await notifyTaskReassigned({
                            taskId: task.id,
                            taskText: task.text,
                            fromUserId: task.assignedTo || task.userId,
                            toUserId: updates.assignedTo,
                            reassignedByName: user?.user_metadata?.full_name || 'A team member',
                            workspaceId: workspace.id,
                        });
                    }

                    // Deadline change notification
                    if (updates.dueDate !== undefined && updates.dueDate !== task.dueDate) {
                        const targetUserId = task.assignedTo || task.userId;
                        if (targetUserId && targetUserId !== userId) {
                            await notifyDeadlineChanged({
                                taskId: task.id,
                                taskText: task.text,
                                userId: targetUserId,
                                oldDate: task.dueDate,
                                newDate: updates.dueDate || undefined,
                                changedByName: user?.user_metadata?.full_name || 'A team member',
                                workspaceId: workspace.id,
                            });
                        }
                    }
                }
                
                // Reload tasks to get fresh data
                invalidateCache('tasks');
                const updatedTasks = await loadTasks({ force: true });
                setData(prev => ({ ...prev, ...updatedTasks }));

                // Award XP if task was just completed (not already done)
                if (wasCompleted && previousStatus !== 'Done') {
                    const allTasksFlat = [
                        ...data.productsServicesTasks,
                        ...data.investorTasks,
                        ...data.customerTasks,
                        ...data.partnerTasks,
                        ...data.marketingTasks,
                        ...data.financialTasks,
                    ];
                    
                    await reload();
                    invalidateCache('tasks');
                }

                return { success: true, message: 'Task updated.' };
            } catch (error) {
                logger.error('Error updating task:', error);
                return { success: false, message: 'Failed to update task' };
            }
        },

        deleteTask: async (taskId) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Find which category this task belongs to
                let taskCategory: TaskCollectionName | undefined;
                const allTasksFlat = [
                    ...data.productsServicesTasks,
                    ...data.investorTasks,
                    ...data.customerTasks,
                    ...data.partnerTasks,
                    ...data.marketingTasks,
                    ...data.financialTasks,
                ];
                const task = allTasksFlat.find(t => t.id === taskId);
                
                if (data.productsServicesTasks.some(t => t.id === taskId)) taskCategory = 'productsServicesTasks';
                else if (data.investorTasks.some(t => t.id === taskId)) taskCategory = 'investorTasks';
                else if (data.customerTasks.some(t => t.id === taskId)) taskCategory = 'customerTasks';
                else if (data.partnerTasks.some(t => t.id === taskId)) taskCategory = 'partnerTasks';
                else if (data.marketingTasks.some(t => t.id === taskId)) taskCategory = 'marketingTasks';
                else if (data.financialTasks.some(t => t.id === taskId)) taskCategory = 'financialTasks';

                if (!taskCategory) {
                    return { success: false, message: 'Task not found' };
                }

                // Check permissions
                if (task?.userId && !canEditTask(task.userId, task.assignedTo)) {
                    handleToast('You do not have permission to delete this task', 'info');
                    return { success: false, message: 'Permission denied' };
                }

                // Track action in Sentry and Analytics
                trackAction('task_deleted', { taskId, category: taskCategory });
                track('task_deleted', { category: taskCategory });
                
                // Use the existing deleteItem method
                return await actions.deleteItem(taskCategory, taskId);
            } catch (error) {
                logger.error('Error deleting task:', error);
                return { success: false, message: 'Failed to delete task' };
            }
        },

        addNote: async (collection, itemId, noteText, crmItemId) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            // Prevent adding notes to temporary items (optimistic updates)
            if (itemId.startsWith('temp-')) {
                handleToast('Please wait for the item to finish creating before adding notes.', 'info');
                return { success: false, message: 'Cannot add note to temporary item' };
            }

            try {
                // Get current user info
                const userId = user?.id;
                const userName = user?.user_metadata?.full_name || user?.email;
                
                // Determine the table based on collection type
                if (collection === 'productsServicesTasks' || collection === 'investorTasks' || 
                    collection === 'customerTasks' || collection === 'partnerTasks' || 
                    collection === 'marketingTasks' || collection === 'financialTasks') {
                    await DataPersistenceAdapter.addTaskNote(itemId, noteText, userId, userName);
                } else if (collection === 'investors' || collection === 'customers' || collection === 'partners') {
                    await DataPersistenceAdapter.addCrmNote(itemId, noteText, userId, userName, workspace?.id);
                } else if (collection === 'contacts') {
                    await DataPersistenceAdapter.addContactNote(itemId, noteText, userId, userName);
                } else if (collection === 'marketing') {
                    await DataPersistenceAdapter.addMarketingNote(itemId, noteText, userId, userName);
                } else if (collection === 'documents') {
                    await DataPersistenceAdapter.addDocumentNote(itemId, noteText, userId, userName);
                }
                
                // Reload data to show the new note
                // The modal will stay open as long as the selected item state is maintained
                await reload();
                handleToast('Note added successfully', 'success');
                return { success: true, message: 'Note added.' };
            } catch (error) {
                logger.error('Error adding note:', error);
                handleToast('Failed to add note', 'info');
                return { success: false, message: 'Failed to add note' };
            }
        },
        
        updateNote: async (collection, itemId, noteTimestamp, newText, crmItemId) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Determine which table to update based on collection
                let tableName: string;
                let actualItemId = itemId;

                if (collection === 'investors' || collection === 'customers' || collection === 'partners') {
                    tableName = 'crm_items';
                    actualItemId = crmItemId || itemId;
                } else if (collection === 'contacts') {
                    tableName = 'contacts';
                    actualItemId = crmItemId ? itemId : itemId;
                } else if (collection === 'investorTasks' || collection === 'customerTasks' || collection === 'partnerTasks' || collection === 'productsServicesTasks') {
                    tableName = 'tasks';
                } else if (collection === 'marketing') {
                    tableName = 'marketing_items';
                } else if (collection === 'documents') {
                    tableName = 'documents';
                } else {
                    return { success: false, message: 'Invalid collection' };
                }

                // Fetch current item
                const { data: currentItem, error: fetchError } = await supabase
                    .from(tableName as any)
                    .select('notes')
                    .eq('id', actualItemId)
                    .single();

                if (fetchError) throw fetchError;

                // Update the note with matching timestamp
                const currentNotes = (currentItem?.notes as any[]) || [];
                const updatedNotes = currentNotes.map((note: any) => 
                    note.timestamp === noteTimestamp 
                        ? { ...note, text: newText }
                        : note
                );

                // Update the item with modified notes
                const { error: updateError } = await supabase
                    .from(tableName as any)
                    .update({ notes: updatedNotes })
                    .eq('id', actualItemId);

                if (updateError) throw updateError;

                // Reload data to show the updated note
                await reload();
                handleToast('Note updated', 'success');
                return { success: true, message: 'Note updated successfully' };
            } catch (error) {
                logger.error('Error updating note:', error);
                handleToast('Failed to update note', 'info');
                return { success: false, message: 'Failed to update note' };
            }
        },

        deleteNote: async (collection, itemId, noteTimestamp, crmItemId) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Determine which table to update based on collection
                let tableName: string;
                let actualItemId = itemId;

                if (collection === 'investors' || collection === 'customers' || collection === 'partners') {
                    tableName = 'crm_items';
                    actualItemId = crmItemId || itemId;
                } else if (collection === 'contacts') {
                    tableName = 'contacts';
                    actualItemId = crmItemId ? itemId : itemId; // If crmItemId provided, itemId is the contact
                } else if (collection === 'investorTasks' || collection === 'customerTasks' || collection === 'partnerTasks' || collection === 'productsServicesTasks') {
                    tableName = 'tasks';
                } else if (collection === 'marketing') {
                    tableName = 'marketing_items';
                } else if (collection === 'documents') {
                    tableName = 'documents';
                } else {
                    return { success: false, message: 'Invalid collection' };
                }

                // Fetch current item
                const { data: currentItem, error: fetchError } = await supabase
                    .from(tableName as any)
                    .select('notes')
                    .eq('id', actualItemId)
                    .single();

                if (fetchError) throw fetchError;

                // Filter out the note with matching timestamp
                const currentNotes = (currentItem?.notes as any[]) || [];
                const updatedNotes = currentNotes.filter((note: any) => note.timestamp !== noteTimestamp);

                // Update the item with filtered notes
                const { error: updateError } = await supabase
                    .from(tableName as any)
                    .update({ notes: updatedNotes })
                    .eq('id', actualItemId);

                if (updateError) throw updateError;

                // Reload data to show the deletion
                await reload();
                handleToast('Note deleted', 'success');
                return { success: true, message: 'Note deleted successfully' };
            } catch (error) {
                logger.error('Error deleting note:', error);
                handleToast('Failed to delete note', 'info');
                return { success: false, message: 'Failed to delete note' };
            }
        },

        createCrmItem: async (collection, itemData) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                const newCompanyName = itemData.company || 'New Item';
                handleToast(`Creating ${collection.slice(0, -1)}...`, 'info');
                
                const { data: createdItem, error: createError } = await DataPersistenceAdapter.createCrmItem(userId, workspace.id, collection, itemData as any);
                
                if (createError || !createdItem) {
                    throw new Error('Failed to create CRM item');
                }
                
                // Track action in Sentry
                trackAction('crm_item_created', { collection });
                
                invalidateCache('crm');
                
                // Show success notification
                const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
                handleToast(`${titleCase(collection.slice(0, -1))} "${newCompanyName}" created successfully.`, 'success');
                
                // Reload CRM data immediately to update UI
                const crm = await loadCrmItems({ force: true });
                setData(prev => ({ ...prev, ...crm }));
                loadedTabsRef.current.add('crm');

                return { success: true, message: `${collection} item created.`, itemId: createdItem.id };
            } catch (error) {
                logger.error('Error creating CRM item:', error);
                handleToast('Failed to create CRM item', 'info');
                return { success: false, message: 'Failed to create CRM item' };
            }
        },

        updateCrmItem: async (collection, itemId, updates) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                await DataPersistenceAdapter.updateCrmItem(itemId, updates);
                
                // Track action in Sentry
                trackAction('crm_item_updated', { itemId, collection });
                
                invalidateCache('crm');
                
                // Reload CRM data immediately to update UI (works on any tab, including Calendar)
                const crm = await loadCrmItems({ force: true });
                setData(prev => ({ ...prev, ...crm }));
                loadedTabsRef.current.add('crm');
                
                return { success: true, message: 'CRM item updated.' };
            } catch (error) {
                logger.error('Error updating CRM item:', error);
                return { success: false, message: 'Failed to update CRM item' };
            }
        },

        createContact: async (collection, crmItemId, contactData) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                const { data: createdContact, error: createError } = await DataPersistenceAdapter.createContact(userId, workspace.id, crmItemId, contactData);
                
                if (createError || !createdContact) {
                    throw new Error('Failed to create contact');
                }
                
                handleToast(`Contact "${contactData.name}" created.`, 'success');
                
                // Reload CRM data immediately to update UI
                const crm = await loadCrmItems({ force: true });
                setData(prev => ({ ...prev, ...crm }));
                loadedTabsRef.current.add('crm');
                
                return { success: true, message: 'Contact created.', contactId: createdContact.id };
            } catch (error) {
                logger.error('Error creating contact:', error);
                return { success: false, message: 'Failed to create contact' };
            }
        },
        
        updateContact: async (collection, crmItemId, contactId, updates) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                await DataPersistenceAdapter.updateContact(contactId, updates);
                await reload();
                return { success: true, message: 'Contact updated.' };
            } catch (error) {
                logger.error('Error updating contact:', error);
                return { success: false, message: 'Failed to update contact' };
            }
        },

        deleteContact: async (collection, crmItemId, contactId) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Find contact name before deletion
                const company = data[collection].find(c => c.id === crmItemId);
                const contactName = company?.contacts.find(c => c.id === contactId)?.name || 'Unknown';
                
                await DataPersistenceAdapter.deleteContact(contactId);
                await reload();
                handleToast(`Contact "${contactName}" deleted.`, 'info');
                return { success: true, message: 'Contact deleted.' };
            } catch (error) {
                logger.error('Error deleting contact:', error);
                return { success: false, message: 'Failed to delete contact' };
            }
        },
        
        createMeeting: async (collection, crmItemId, contactId, meetingData) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                await DataPersistenceAdapter.createMeeting(userId, workspace.id, contactId, meetingData);
                
                // Reload CRM data immediately to update UI (works on any tab, including Calendar)
                const crm = await loadCrmItems({ force: true });
                setData(prev => ({ ...prev, ...crm }));
                loadedTabsRef.current.add('crm');
                
                handleToast(`Meeting "${meetingData.title}" logged.`, 'success');
                
                await reload();
                return { success: true, message: 'Meeting created.' };
            } catch (error) {
                logger.error('Error creating meeting:', error);
                return { success: false, message: 'Failed to create meeting' };
            }
        },

        updateMeeting: async (collection, crmItemId, contactId, meetingId, updates) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                await DataPersistenceAdapter.updateMeeting(meetingId, updates);
                await reload();
                return { success: true, message: 'Meeting updated.' };
            } catch (error) {
                logger.error('Error updating meeting:', error);
                return { success: false, message: 'Failed to update meeting' };
            }
        },
        
        deleteMeeting: async (collection, crmItemId, contactId, meetingId) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                await DataPersistenceAdapter.deleteMeeting(meetingId);
                await reload();
                handleToast('Meeting deleted.', 'info');
                return { success: true, message: 'Meeting deleted.' };
            } catch (error) {
                logger.error('Error deleting meeting:', error);
                return { success: false, message: 'Failed to delete meeting' };
            }
        },

        logFinancials: async (logData) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                await DataPersistenceAdapter.logFinancials(userId, workspace.id, logData);
                
                // Track action in Sentry
                trackAction('financial_logged', { date: logData.date });
                
                // Clear cache first, then reload
                invalidateCache('financials');
                
                // Reload financial data immediately (this will fetch fresh data since cache is invalidated)
                const freshFinancials = await loadFinancials({ force: true });
                setData(prev => ({ 
                    ...prev, 
                    financials: freshFinancials.financials,
                    expenses: freshFinancials.expenses 
                }));
                
                // Mark as loaded
                loadedTabsRef.current.add('financials');
                
                handleToast(`Financials logged for ${logData.date}.`, 'success');
                
                await reload();
                return { success: true, message: `Financials logged for date ${logData.date}.` };
            } catch (error) {
                logger.error('Error logging financials:', error);
                return { success: false, message: 'Failed to log financials' };
            }
        },

        createExpense: async (expenseData) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                await DataPersistenceAdapter.createExpense(userId, workspace.id, expenseData);
                handleToast(`Expense logged: ${expenseData.description}`, 'success');
                
                // Invalidate cache and reload
                invalidateCache('financials');
                const freshFinancials = await loadFinancials({ force: true });
                setData(prev => ({ 
                    ...prev, 
                    financials: freshFinancials.financials,
                    expenses: freshFinancials.expenses 
                }));
                loadedTabsRef.current.add('financials');
                
                return { success: true, message: `Expense created: ${expenseData.description}` };
            } catch (error) {
                logger.error('Error creating expense:', error);
                return { success: false, message: 'Failed to create expense' };
            }
        },

        updateExpense: async (expenseId, updates) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                await DataPersistenceAdapter.updateExpense(expenseId, updates);
                handleToast('Expense updated', 'success');
                
                // Invalidate cache and reload
                invalidateCache('financials');
                const freshFinancials = await loadFinancials({ force: true });
                setData(prev => ({ 
                    ...prev, 
                    financials: freshFinancials.financials,
                    expenses: freshFinancials.expenses 
                }));
                loadedTabsRef.current.add('financials');
                
                return { success: true, message: 'Expense updated successfully' };
            } catch (error) {
                logger.error('Error updating expense:', error);
                return { success: false, message: 'Failed to update expense' };
            }
        },

        deleteItem: async (collection, itemId) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Optimistic UI update - remove item immediately
                if (['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
                    setData(prev => ({
                        ...prev,
                        [collection]: (prev[collection as TaskCollectionName] as Task[]).filter(t => t.id !== itemId)
                    }));
                    handleToast('Deleting task...', 'info');
                } else if (collection === 'marketing') {
                    setData(prev => ({
                        ...prev,
                        marketing: prev.marketing.filter(m => m.id !== itemId)
                    }));
                    handleToast('Deleting marketing item...', 'info');
                } else if (collection === 'financials') {
                    setData(prev => ({
                        ...prev,
                        financials: prev.financials.filter(f => f.id !== itemId)
                    }));
                    handleToast('Deleting financial log...', 'info');
                } else if (collection === 'expenses') {
                    setData(prev => ({
                        ...prev,
                        expenses: prev.expenses.filter(e => e.id !== itemId)
                    }));
                    handleToast('Deleting expense...', 'info');
                } else {
                    handleToast(`Deleting ${collection}...`, 'info');
                }

                // Determine which delete method to use based on collection
                if (collection === 'financials') {
                    await DataPersistenceAdapter.deleteFinancialLog(itemId);
                } else if (collection === 'expenses') {
                    await DataPersistenceAdapter.deleteExpense(itemId);
                } else if (collection === 'marketing') {
                    await DataPersistenceAdapter.deleteMarketingItem(itemId);
                } else if (['investors', 'customers', 'partners'].includes(collection)) {
                    await DataPersistenceAdapter.deleteCrmItem(itemId);
                } else if (['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
                    await DataPersistenceAdapter.deleteTask(itemId);
                } else if (collection === 'contacts') {
                    await DataPersistenceAdapter.deleteContact(itemId);
                } else if (collection === 'documents') {
                    await DataPersistenceAdapter.deleteDocument(itemId);
                }
                
                // Just invalidate cache - don't reload (optimistic update already removed from UI)
                if (collection === 'financials' || collection === 'expenses') {
                    invalidateCache('financials');
                } else if (collection === 'marketing') {
                    invalidateCache('marketing');
                } else if (['investors', 'customers', 'partners'].includes(collection) || collection === 'contacts') {
                    invalidateCache('crm');
                } else if (['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
                    invalidateCache('tasks');
                } else if (collection === 'documents') {
                    invalidateCache('documents');
                }
                
                handleToast(`Item deleted successfully.`, 'success');
                return { success: true, message: `Item deleted from ${collection}.` };
            } catch (error) {
                logger.error('Error deleting item:', error);
                
                // Rollback on error - reload the data
                if (collection === 'financials' || collection === 'expenses') {
                    const freshFinancials = await loadFinancials({ force: true });
                    setData(prev => ({ ...prev, ...freshFinancials }));
                } else if (collection === 'marketing') {
                    const freshMarketing = await loadMarketing({ force: true });
                    setData(prev => ({ ...prev, marketing: freshMarketing }));
                } else if (['investors', 'customers', 'partners'].includes(collection) || collection === 'contacts') {
                    const freshCrm = await loadCrmItems({ force: true });
                    setData(prev => ({ ...prev, ...freshCrm }));
                } else if (['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
                    const freshTasks = await loadTasks({ force: true });
                    setData(prev => ({ ...prev, ...freshTasks }));
                } else if (collection === 'documents') {
                    const freshDocuments = await loadDocuments({ force: true });
                    setData(prev => ({ ...prev, documents: freshDocuments }));
                }
                
                handleToast('Failed to delete item', 'info');
                return { success: false, message: 'Failed to delete item' };
            }
        },

        createMarketingItem: async (itemData) => {
            if (!userId || !supabase) {
                handleToast('Database not connected', 'info');
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                handleToast('No workspace found', 'info');
                return { success: false, message: 'No workspace found' };
            }

            try {
                logger.info('[createMarketingItem] Creating with complete data:', itemData);
                const result = await DataPersistenceAdapter.createMarketingItem(userId, workspace.id, itemData);
                
                if (result.error) {
                    throw new Error(result.error.message || 'Failed to create marketing item');
                }
                
                // Track action in Sentry
                trackAction('marketing_item_created', { 
                    type: itemData.type, 
                    status: itemData.status,
                    hasBudget: !!itemData.campaignBudget,
                    hasProducts: !!(itemData.productServiceIds && itemData.productServiceIds.length > 0),
                    channelCount: itemData.channels?.length || 0
                });
                
                // Reload marketing data immediately
                invalidateCache('marketing');
                const freshMarketing = await loadMarketing({ force: true });
                setData(prev => ({ ...prev, ...freshMarketing }));
                loadedTabsRef.current.add('marketing');
                
                logger.info('[createMarketingItem] Created successfully, reloaded data');
                handleToast(`Campaign "${itemData.title}" created successfully.`, 'success');
                return { success: true, message: `Campaign "${itemData.title}" created.` };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to create marketing item';
                logger.error('[createMarketingItem] Error:', error);
                handleToast(errorMessage, 'info');
                return { success: false, message: errorMessage };
            }
        },

        updateMarketingItem: async (itemId, updates) => {
            if (!userId || !supabase) {
                handleToast('Database not connected', 'info');
                return { success: false, message: 'Database not connected' };
            }

            try {
                logger.info('[updateMarketingItem] Starting update with complete data:', { itemId, updates });
                
                // Check if marketing item was just published
                const wasPublished = updates.status === 'Published';
                
                // Get the item before update to check its previous status
                let previousStatus: string | undefined;
                if (wasPublished) {
                    const item = data.marketing.find(m => m.id === itemId);
                    previousStatus = item?.status;
                }

                // Use centralized transformer for complete field mapping
                const result = await DataPersistenceAdapter.updateMarketingItem(itemId, updates);
                
                if (result.error) {
                    throw new Error(result.error.message || 'Failed to update marketing item');
                }
                
                logger.info('[updateMarketingItem] Database result:', result);

                // Track action in Sentry
                trackAction('marketing_item_updated', { 
                    itemId, 
                    status: updates.status,
                    wasPublished: wasPublished && previousStatus !== 'Published',
                    hasBudget: updates.campaignBudget !== undefined,
                    hasProducts: updates.productServiceIds !== undefined
                });
                
                // Reload marketing data (important for calendar sync)
                logger.info('[updateMarketingItem] Reloading marketing data...');
                const marketingData = await loadMarketing({ force: true });
                setData(prev => ({ ...prev, ...marketingData }));
                invalidateCache('marketing');
                logger.info('[updateMarketingItem] Update complete');

                handleToast('Campaign updated successfully', 'success');
                return { success: true, message: 'Campaign updated.' };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to update marketing item';
                logger.error('[updateMarketingItem] Error:', error);
                handleToast(errorMessage, 'info');
                return { success: false, message: errorMessage };
            }
        },

        deleteMarketingItem: async (itemId) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Use the existing deleteItem method
                return await actions.deleteItem('marketing', itemId);
            } catch (error) {
                logger.error('Error deleting marketing item:', error);
                return { success: false, message: 'Failed to delete marketing item' };
            }
        },
        
        updateSettings: async (updates) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                const newSettings = { ...data.settings, ...updates };
                await DataPersistenceAdapter.updateSettings(userId, newSettings);
                await reload();
                handleToast("Settings updated successfully!", 'success');
                return { success: true, message: 'Settings updated.' };
            } catch (error) {
                logger.error('Error updating settings:', error);
                return { success: false, message: 'Failed to update settings' };
            }
        },

        uploadDocument: async (name, mimeType, content, module, companyId, contactId) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                handleToast(`Uploading "${name}"...`, 'info');
                
                // Calculate file size (content is base64)
                const fileSizeBytes = content ? Math.ceil((content.length * 3) / 4) : 0;

                // Check storage limit before uploading
                const { data: limitCheck } = await DatabaseService.checkStorageLimit(workspace.id, fileSizeBytes);
                if (limitCheck === false) {
                    handleToast('Storage limit exceeded. Please upgrade your plan.', 'info');
                    return { success: false, message: 'Storage limit exceeded. Please upgrade your plan or delete some files.' };
                }

                await DataPersistenceAdapter.uploadDocument(userId, workspace.id, {
                    name,
                    mimeType,
                    content,
                    module,
                    companyId,
                    contactId
                });

                // Increment file count and storage usage
                await DatabaseService.incrementFileCount(workspace.id, fileSizeBytes);

                await reload();
                invalidateCache('documents');
                invalidateCache('documentsMetadata'); // Refresh metadata for AI context
                handleToast(`"${name}" uploaded successfully.`, 'success');

                return { success: true, message: `Document "${name}" uploaded to the library.` };
            } catch (error) {
                logger.error('Error uploading document:', error);
                handleToast('Failed to upload document', 'info');
                return { success: false, message: 'Failed to upload document' };
            }
        },

        updateDocument: async (docId, name, mimeType, content) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                await DataPersistenceAdapter.updateDocument(docId, { name, mimeType, content });
                await reload();
                invalidateCache('documents');
                handleToast(`Document "${name}" updated successfully.`, 'success');
                return { success: true, message: `Document ${docId} updated.` };
            } catch (error) {
                logger.error('Error updating document:', error);
                return { success: false, message: 'Failed to update document' };
            }
        },

        deleteDocument: async (docId) => {
            if (!supabase) {
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                // Get document info before deleting
                const doc = data.documents.find(d => d.id === docId);
                const docName = doc?.name || 'Document';
                
                // Optimistically remove from UI
                setData(prev => ({
                    ...prev,
                    documents: prev.documents.filter(d => d.id !== docId)
                }));
                
                handleToast(`Deleting "${docName}"...`, 'info');
                
                // Calculate file size
                const fileSizeBytes = doc?.content ? Math.ceil((doc.content.length * 3) / 4) : 0;

                await DataPersistenceAdapter.deleteDocument(docId);

                // Decrement file count and storage usage
                if (fileSizeBytes > 0) {
                    await DatabaseService.decrementFileCount(workspace.id, fileSizeBytes);
                }

                // Reload to ensure consistency
                await reload();
                invalidateCache('documents');
                handleToast(`"${docName}" deleted successfully.`, 'success');
                return { success: true, message: 'Document deleted.' };
            } catch (error) {
                logger.error('Error deleting document:', error);
                
                // Rollback on error
                await reload();
                invalidateCache('documents');
                
                handleToast('Failed to delete document', 'info');
                return { success: false, message: 'Failed to delete document' };
            }
        },

        getFileContent: async (fileId: string) => {
            const doc = data.documents.find(d => d.id === fileId);
            if (doc) {
                return { success: true, message: `Content for ${doc.name} retrieved.`, content: doc.content };
            }
            return { success: false, message: `File with ID ${fileId} not found.` };
        },

        // Deal/Opportunity Management
        createDeal: async (dealData) => {
            if (!workspace?.id || !userId) {
                return { success: false, message: 'User or workspace not available' };
            }

            try {
                const dbData = {
                    workspace_id: workspace.id,
                    title: dealData.title,
                    crm_item_id: dealData.crmItemId || null,
                    contact_id: dealData.contactId || null,
                    value: dealData.value,
                    currency: dealData.currency,
                    stage: dealData.stage,
                    probability: dealData.probability,
                    expected_close_date: dealData.expectedCloseDate || null,
                    actual_close_date: dealData.actualCloseDate || null,
                    source: dealData.source || null,
                    category: dealData.category,
                    priority: dealData.priority.toLowerCase(),
                    assigned_to: dealData.assignedTo || null,
                    assigned_to_name: dealData.assignedToName || null,
                };

                const result = await DatabaseService.createDeal(dbData as any);
                if (result.error) {
                    throw new Error('Failed to create deal');
                }

                // Reload deals
                invalidateCache('deals');
                if (useLazyDataPersistenceRef.current?.loadDeals) {
                    const deals = await useLazyDataPersistenceRef.current.loadDeals({ force: true });
                    setData(prev => ({ ...prev, deals }));
                }

                handleToast(`Deal "${dealData.title}" created successfully`, 'success');
                return { success: true, message: 'Deal created successfully', dealId: result.data?.id };
            } catch (error) {
                logger.error('Error creating deal:', error);
                handleToast('Failed to create deal', 'info');
                return { success: false, message: 'Failed to create deal' };
            }
        },

        updateDeal: async (dealId, updates) => {
            try {
                // Task 29: Fetch current deal state if stage is being updated (for inventory management)
                let previousDeal: any = null;
                if (updates.stage !== undefined) {
                    const { data: currentDeal } = await DatabaseService.getDeal(dealId);
                    previousDeal = currentDeal;
                }
                
                const dbUpdates: any = {};
                if (updates.title !== undefined) dbUpdates.title = updates.title;
                if (updates.crmItemId !== undefined) dbUpdates.crm_item_id = updates.crmItemId;
                if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId;
                if (updates.value !== undefined) dbUpdates.value = updates.value;
                if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
                if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
                if (updates.probability !== undefined) dbUpdates.probability = updates.probability;
                if (updates.expectedCloseDate !== undefined) dbUpdates.expected_close_date = updates.expectedCloseDate;
                if (updates.actualCloseDate !== undefined) dbUpdates.actual_close_date = updates.actualCloseDate;
                if (updates.source !== undefined) dbUpdates.source = updates.source;
                if (updates.category !== undefined) dbUpdates.category = updates.category;
                if (updates.priority !== undefined) dbUpdates.priority = updates.priority.toLowerCase();
                if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
                if (updates.assignedToName !== undefined) dbUpdates.assigned_to_name = updates.assignedToName;
                if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
                if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
                if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;
                
                // Product/Service fields
                if (updates.productServiceId !== undefined) dbUpdates.product_service_id = updates.productServiceId;
                if (updates.productServiceName !== undefined) dbUpdates.product_service_name = updates.productServiceName;
                if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
                if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
                if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
                if (updates.discountAmount !== undefined) dbUpdates.discount_amount = updates.discountAmount;
                if (updates.totalValue !== undefined) dbUpdates.total_value = updates.totalValue;

                const result = await DatabaseService.updateDeal(dealId, dbUpdates);
                if (result.error) {
                    throw new Error('Failed to update deal');
                }

                // Task 29: Inventory Reservation Workflow - manage inventory based on stage changes
                if (updates.stage !== undefined && result.data && result.data.product_service_id) {
                    const deal = result.data;
                    const previousStage = previousDeal?.stage;
                    const newStage = updates.stage;
                    const quantity = deal.quantity || 1;
                    
                    try {
                        // Fetch product to check if inventory is tracked
                        const { data: product } = await DatabaseService.getProductService(deal.product_service_id);
                        
                        if (product?.inventoryTracked) {
                            logger.info(`Inventory stage change: ${previousStage} → ${newStage} for product ${product.name}`);
                            
                            // Reserve inventory when moving to proposal stage
                            if (newStage === 'proposal' && previousStage !== 'proposal') {
                                const { error: reserveError } = await DatabaseService.reserveInventory(
                                    deal.product_service_id,
                                    quantity
                                );
                                if (reserveError) {
                                    logger.warn('Failed to reserve inventory:', reserveError);
                                    handleToast('Deal updated, but inventory reservation failed', 'info');
                                } else {
                                    logger.info(`Reserved ${quantity} units of ${product.name}`);
                                }
                            }
                            
                            // Release reserved inventory when deal is lost
                            if (newStage === 'closed_lost' && previousStage === 'proposal') {
                                const { error: releaseError } = await DatabaseService.releaseInventory(
                                    deal.product_service_id,
                                    quantity
                                );
                                if (releaseError) {
                                    logger.warn('Failed to release inventory:', releaseError);
                                } else {
                                    logger.info(`Released ${quantity} units of ${product.name}`);
                                }
                            }
                            
                            // Note: Inventory deduction on closed_won is handled in convertDealToRevenue (Task 28)
                        }
                    } catch (error) {
                        logger.error('Error in inventory reservation workflow:', error);
                        // Don't fail the deal update if inventory management fails
                    }
                }

                // Send deal notifications for stage changes and reassignment
                const currentDeal = deals.find(d => d.id === dealId);
                
                // Deal reassignment notification
                if (updates.assignedTo !== undefined && updates.assignedTo !== currentDeal?.assignedTo) {
                    await notifyDealReassigned({
                        dealId: dealId,
                        dealName: updates.title || currentDeal?.title || 'Deal',
                        fromUserId: currentDeal?.assignedTo || currentDeal?.userId || '',
                        toUserId: updates.assignedTo,
                        reassignedByName: user?.user_metadata?.full_name || 'A team member',
                        workspaceId: workspace!.id,
                    });
                }
                
                // Deal stage change notifications
                if (updates.stage !== undefined && updates.stage !== currentDeal?.stage) {
                    const dealName = updates.title || currentDeal?.title || 'Deal';
                    const dealValue = updates.value || currentDeal?.value;
                    const targetUserId = updates.assignedTo || currentDeal?.assignedTo || currentDeal?.userId || user!.id;
                    
                    if (updates.stage === 'closed_won') {
                        // Notify deal won - optionally team-wide for celebration
                        await notifyDealWon({
                            dealId: dealId,
                            dealName: dealName,
                            dealValue: dealValue,
                            userId: targetUserId,
                            workspaceId: workspace!.id,
                            teamMembers: [], // Could fetch team members for team-wide celebration
                        });
                    } else if (updates.stage === 'closed_lost') {
                        // Notify deal lost
                        await notifyDealLost({
                            dealId: dealId,
                            dealName: dealName,
                            userId: targetUserId,
                            workspaceId: workspace!.id,
                            reason: updates.notes || undefined,
                        });
                    } else {
                        // Notify general stage change
                        await notifyDealStageChanged({
                            dealId: dealId,
                            dealName: dealName,
                            oldStage: currentDeal?.stage || 'unknown',
                            newStage: updates.stage,
                            userId: targetUserId,
                            workspaceId: workspace!.id,
                            changedByName: user?.user_metadata?.full_name || 'A team member',
                        });
                    }
                }

                // Trigger automation engine for deal stage changes
                if (result.data) {
                    try {
                        const { automationEngine } = await import('./lib/services/automationService');
                        
                        const automationResult = await automationEngine.trigger('deal_stage_change', {
                            workspaceId: workspace!.id,
                            userId: user!.id,
                            entityType: 'deal',
                            entityId: dealId,
                            data: result.data,
                            previousData: { stage: deals.find(d => d.id === dealId)?.stage }
                        });

                        if (automationResult.executedRules > 0) {
                            logger.info(`Executed ${automationResult.executedRules} automation rules for deal stage change`);
                            
                            // Reload affected data
                            if (updates.stage === 'closed_won') {
                                invalidateCache('revenueTransactions');
                                if (useLazyDataPersistenceRef.current?.loadRevenueTransactions) {
                                    const revenueTransactions = await useLazyDataPersistenceRef.current.loadRevenueTransactions({ force: true });
                                    setData(prev => ({ ...prev, revenueTransactions }));
                                }
                                
                                if (useLazyDataPersistenceRef.current?.loadProductsServices) {
                                    const { productsServices } = await useLazyDataPersistenceRef.current.loadProductsServices({ force: true });
                                    setData(prev => ({ ...prev, productsServices }));
                                }
                                
                                handleToast('Deal closed and automations executed successfully', 'success');
                            } else {
                                handleToast('Deal updated successfully', 'success');
                            }
                        } else {
                            handleToast(updates.stage === 'closed_won' ? 'Deal closed successfully' : 'Deal updated successfully', 'success');
                        }

                        if (automationResult.errors.length > 0) {
                            logger.warn('Some automations failed:', automationResult.errors);
                        }
                    } catch (error) {
                        logger.error('Failed to trigger automation engine:', error);
                        handleToast('Deal updated, but automation execution encountered an error', 'info');
                    }
                } else {
                    handleToast('Deal updated successfully', 'success');
                }

                // Reload deals
                invalidateCache('deals');
                if (useLazyDataPersistenceRef.current?.loadDeals) {
                    const deals = await useLazyDataPersistenceRef.current.loadDeals({ force: true });
                    setData(prev => ({ ...prev, deals }));
                }

                return { success: true, message: 'Deal updated successfully' };
            } catch (error) {
                logger.error('Error updating deal:', error);
                handleToast('Failed to update deal', 'info');
                return { success: false, message: 'Failed to update deal' };
            }
        },

        deleteDeal: async (dealId) => {
            try {
                const result = await DatabaseService.deleteDeal(dealId);
                if (result.error) {
                    throw new Error('Failed to delete deal');
                }

                // Reload deals
                invalidateCache('deals');
                if (useLazyDataPersistenceRef.current?.loadDeals) {
                    const deals = await useLazyDataPersistenceRef.current.loadDeals({ force: true });
                    setData(prev => ({ ...prev, deals }));
                }

                handleToast('Deal deleted successfully', 'success');
                return { success: true, message: 'Deal deleted successfully' };
            } catch (error) {
                logger.error('Error deleting deal:', error);
                handleToast('Failed to delete deal', 'info');
                return { success: false, message: 'Failed to delete deal' };
            }
        },

        createProductService: async (productData) => {
            if (!userId || !supabase) {
                handleToast('Database not available', 'info');
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                handleToast('No workspace available', 'info');
                return { success: false, message: 'No workspace available' };
            }

            try {
                handleToast('Creating product/service...', 'info');

                // Transform frontend data to database format
                const dbData = {
                    workspace_id: workspace.id,
                    name: productData.name,
                    sku: productData.sku,
                    description: productData.description || null,
                    category: productData.category,
                    type: productData.type,
                    status: productData.status,
                    base_price: productData.basePrice,
                    currency: productData.currency || 'USD',
                    pricing_model: productData.pricingModel,
                    cost_of_goods: productData.costOfGoods || null,
                    cost_of_service: productData.costOfService || null,
                    is_taxable: productData.isTaxable || false,
                    tax_rate: productData.taxRate || null,
                    inventory_tracked: productData.inventoryTracking || false,
                    quantity_on_hand: productData.quantityOnHand || null,
                    reorder_point: productData.reorderPoint || null,
                    reorder_quantity: productData.reorderQuantity || null,
                    capacity_tracked: productData.capacityTracking || false,
                    capacity_total: productData.capacityTotal || null,
                    capacity_unit: productData.capacityUnit || null,
                    capacity_period: productData.capacityPeriod || null,
                    image_url: productData.imageUrl || null,
                    tags: productData.tags || [],
                };

                const result = await DatabaseService.createProductService(dbData as any);
                
                if (result.error) {
                    throw new Error(result.error.message || 'Failed to create product/service');
                }

                // Optimistically add to state
                if (result.data) {
                    const newProduct = {
                        ...productData,
                        id: result.data.id,
                        createdAt: result.data.created_at,
                        updatedAt: result.data.updated_at,
                        workspaceId: workspace.id,
                    };
                    
                    setData(prev => ({
                        ...prev,
                        productsServices: [...prev.productsServices, newProduct]
                    }));
                }

                trackAction('product_service_created', { 
                    category: productData.category, 
                    type: productData.type,
                    pricingModel: productData.pricingModel 
                });

                handleToast(`${productData.category === 'product' ? 'Product' : 'Service'} "${productData.name}" created successfully`, 'success');
                return { success: true, message: 'Created successfully', id: result.data?.id };
            } catch (error) {
                logger.error('Error creating product/service:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to create';
                handleToast(errorMessage, 'info');
                return { success: false, message: errorMessage };
            }
        },

        updateProductService: async (productId, updates) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Transform updates to database format
                const dbUpdates: any = {};
                if (updates.name !== undefined) dbUpdates.name = updates.name;
                if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
                if (updates.description !== undefined) dbUpdates.description = updates.description;
                if (updates.category !== undefined) dbUpdates.category = updates.category;
                if (updates.type !== undefined) dbUpdates.type = updates.type;
                if (updates.status !== undefined) dbUpdates.status = updates.status;
                if (updates.basePrice !== undefined) dbUpdates.base_price = updates.basePrice;
                if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
                if (updates.pricingModel !== undefined) dbUpdates.pricing_model = updates.pricingModel;
                if (updates.costOfGoods !== undefined) dbUpdates.cost_of_goods = updates.costOfGoods;
                if (updates.costOfService !== undefined) dbUpdates.cost_of_service = updates.costOfService;
                if (updates.isTaxable !== undefined) dbUpdates.is_taxable = updates.isTaxable;
                if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;
                if (updates.inventoryTracking !== undefined) dbUpdates.inventory_tracked = updates.inventoryTracking;
                if (updates.quantityOnHand !== undefined) dbUpdates.quantity_on_hand = updates.quantityOnHand;
                if (updates.quantityReserved !== undefined) dbUpdates.quantity_reserved = updates.quantityReserved;
                if (updates.quantityAvailable !== undefined) dbUpdates.quantity_available = updates.quantityAvailable;
                if (updates.reorderPoint !== undefined) dbUpdates.reorder_point = updates.reorderPoint;
                if (updates.reorderQuantity !== undefined) dbUpdates.reorder_quantity = updates.reorderQuantity;
                if (updates.capacityTracking !== undefined) dbUpdates.capacity_tracked = updates.capacityTracking;
                if (updates.capacityTotal !== undefined) dbUpdates.capacity_total = updates.capacityTotal;
                if (updates.capacityBooked !== undefined) dbUpdates.capacity_booked = updates.capacityBooked;
                if (updates.capacityAvailable !== undefined) dbUpdates.capacity_available = updates.capacityAvailable;
                if (updates.capacityUnit !== undefined) dbUpdates.capacity_unit = updates.capacityUnit;
                if (updates.capacityPeriod !== undefined) dbUpdates.capacity_period = updates.capacityPeriod;
                if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
                if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
                if (updates.tieredPricing !== undefined) dbUpdates.tiered_pricing = updates.tieredPricing;
                if (updates.usagePricing !== undefined) dbUpdates.usage_pricing = updates.usagePricing;
                if (updates.subscriptionPlans !== undefined) dbUpdates.subscription_plans = updates.subscriptionPlans;

                // Optimistically update UI
                setData(prev => ({
                    ...prev,
                    productsServices: prev.productsServices.map(p =>
                        p.id === productId ? { ...p, ...updates } : p
                    )
                }));

                const result = await DatabaseService.updateProductService(productId, dbUpdates);
                
                if (result.error) {
                    throw new Error(result.error.message || 'Failed to update product/service');
                }

                // Check if base price changed to reload price history
                if (updates.basePrice !== undefined) {
                    // Reload to get updated price history from trigger
                    await reload();
                }

                trackAction('product_service_updated', { productId });

                handleToast('Product/service updated successfully', 'success');
                return { success: true, message: 'Updated successfully' };
            } catch (error) {
                logger.error('Error updating product/service:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to update';
                handleToast(errorMessage, 'info');
                
                // Revert optimistic update on error
                await reload();
                return { success: false, message: errorMessage };
            }
        },

        deleteProductService: async (productId) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Optimistically remove from UI
                const productToDelete = data.productsServices.find(p => p.id === productId);
                setData(prev => ({
                    ...prev,
                    productsServices: prev.productsServices.filter(p => p.id !== productId)
                }));

                const result = await DatabaseService.deleteProductService(productId);
                
                if (result.error) {
                    throw new Error(result.error.message || 'Failed to delete product/service');
                }

                trackAction('product_service_deleted', { productId });

                handleToast(`${productToDelete?.name || 'Product/service'} deleted successfully`, 'success');
                return { success: true, message: 'Deleted successfully' };
            } catch (error) {
                logger.error('Error deleting product/service:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
                handleToast(errorMessage, 'info');
                
                // Revert optimistic delete on error
                await reload();
                return { success: false, message: errorMessage };
            }
        },
    }), [userId, supabase, data, reload, handleToast, workspace, invalidateCache, useLazyDataPersistenceRef]);
    
    const renderTabContent = () => {
        // Generate all meetings from CRM items with proper company type
        const allMeetings = [
            ...(data.investors || []).flatMap(company => 
                (company.contacts || []).flatMap(contact => 
                    (contact.meetings || []).map(meeting => ({
                        ...meeting,
                        type: 'meeting' as const,
                        tag: 'Investor',
                        dueDate: new Date(meeting.timestamp).toISOString().split('T')[0],
                        companyName: company.company,
                        contactName: contact.name,
                        crmItemId: company.id, // Use company.id instead of contact.crmItemId
                        contactId: contact.id,
                    }))
                )
            ),
            ...(data.customers || []).flatMap(company => 
                (company.contacts || []).flatMap(contact => 
                    (contact.meetings || []).map(meeting => ({
                        ...meeting,
                        type: 'meeting' as const,
                        tag: 'Customer',
                        dueDate: new Date(meeting.timestamp).toISOString().split('T')[0],
                        companyName: company.company,
                        contactName: contact.name,
                        crmItemId: company.id, // Use company.id instead of contact.crmItemId
                        contactId: contact.id,
                    }))
                )
            ),
            ...(data.partners || []).flatMap(company => 
                (company.contacts || []).flatMap(contact => 
                    (contact.meetings || []).map(meeting => ({
                        ...meeting,
                        type: 'meeting' as const,
                        tag: 'Partner',
                        dueDate: new Date(meeting.timestamp).toISOString().split('T')[0],
                        companyName: company.company,
                        contactName: contact.name,
                        crmItemId: company.id, // Use company.id instead of contact.crmItemId
                        contactId: contact.id,
                    }))
                )
            ),
        ];

        // Generate CRM next actions for calendar
        const crmNextActions = [
            ...(data.investors || [])
                .filter(item => item.nextActionDate && item.nextAction)
                .map(item => ({
                    ...item,
                    type: 'crm-action' as const,
                    tag: 'Investor',
                    dueDate: item.nextActionDate!,
                    title: item.nextAction!,
                    companyName: item.company,
                })),
            ...(data.customers || [])
                .filter(item => item.nextActionDate && item.nextAction)
                .map(item => ({
                    ...item,
                    type: 'crm-action' as const,
                    tag: 'Customer',
                    dueDate: item.nextActionDate!,
                    title: item.nextAction!,
                    companyName: item.company,
                })),
            ...(data.partners || [])
                .filter(item => item.nextActionDate && item.nextAction)
                .map(item => ({
                    ...item,
                    type: 'crm-action' as const,
                    tag: 'Partner',
                    dueDate: item.nextActionDate!,
                    title: item.nextAction!,
                    companyName: item.company,
                })),
        ];

        logger.info('[DashboardApp] All tasks for calendar:', allTasks.map(t => ({ id: t.id, text: t.text, dueDate: t.dueDate, dueTime: t.dueTime })));
        logger.info('[DashboardApp] Marketing items:', data.marketing.length, 'total');
        logger.info('[DashboardApp] Marketing with dates:', data.marketing.filter(m => m.dueDate).map(m => ({ id: m.id, title: m.title, dueDate: m.dueDate, dueTime: m.dueTime })));
        
        const marketingEvents = data.marketing
            .filter(m => m.dueDate)
            .map(({ type: marketingCategory, ...marketing }) => ({
                ...marketing,
                type: 'marketing' as const,
                tag: 'Marketing',
                contentType: marketingCategory,
            }));
        
        logger.info('[DashboardApp] Marketing events for calendar:', marketingEvents.length, 'events', marketingEvents);
        
        const calendarEvents: CalendarEvent[] = [
            ...allTasks
                .filter(t => t.dueDate)
                .map(t => ({ ...t, type: 'task' as const, title: t.text })),
            ...marketingEvents,
            ...allMeetings,
            ...crmNextActions,
        ];
        
        logger.info('[DashboardApp] Calendar events after filter:', calendarEvents.length, 'events');
        logger.info('[DashboardApp] Calendar event types:', calendarEvents.map(e => ({ type: e.type, title: e.title || (e.type === 'task' ? (e as any).text : 'Untitled') })));

        switch (activeTab) {
            case Tab.Dashboard:
                return (
                    <SectionBoundary sectionName="Dashboard">
                        <DashboardTab 
                            data={data} 
                            actions={actions} 
                            businessProfile={businessProfile} 
                            settings={data.settings}
                            onViewAllActivity={() => setIsNotificationsPanelOpen(true)}
                        />
                    </SectionBoundary>
                );
            case Tab.Calendar:
                return (
                    <SectionBoundary sectionName="Calendar">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <CalendarTab 
                            events={calendarEvents} 
                            actions={actions}
                            workspace={workspace}
                            workspaceMembers={workspaceMembers}
                            crmItems={{
                                investors: data.investors || [],
                                customers: data.customers || [],
                                partners: data.partners || []
                            }}
                        />
                        </Suspense>
                    </SectionBoundary>
                );
            case Tab.Tasks:
                if (featureFlags.isEnabled('ui.unified-tasks')) {
                    return (
                        <SectionBoundary sectionName="Tasks">
                            <Suspense fallback={<TabLoadingFallback />}>
                                <TasksTab 
                                    data={data}
                                    actions={actions}
                                    workspaceMembers={workspaceMembers}
                                    userId={user?.id || ''}
                                    workspaceId={workspace?.id || ''}
                                    onNavigateToTab={setActiveTab}
                                />
                            </Suspense>
                        </SectionBoundary>
                    );
                }
                return null;
            case Tab.ProductsServices:
                return (
                    <SectionBoundary sectionName="ProductsServices">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <ProductsServicesTab 
                            workspaceId={workspace?.id || ''}
                            tasks={data.productsServicesTasks}
                            productsServices={data.productsServices}
                            productPriceHistory={data.productPriceHistory}
                            actions={actions}
                            revenueTransactions={data.revenueTransactions}
                            deals={data.deals}
                        />
                        </Suspense>
                    </SectionBoundary>
                );
            case Tab.Accounts:
                return (
                    <SectionBoundary sectionName="Accounts">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <AccountsTab 
                                crmItems={dataWithUnifiedCrm.crmItems || []}
                                crmTasks={dataWithUnifiedCrm.crmTasks || []}
                                actions={actions}
                                documents={data.documents}
                                businessProfile={businessProfile}
                                workspaceId={workspace?.id}
                                onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                                productsServices={data.productsServices}
                                workspaceMembers={workspaceMembers}
                                userId={user?.id}
                                deals={data.deals}
                            />
                        </Suspense>
                    </SectionBoundary>
                );
            case Tab.Investors:
                return (
                    <SectionBoundary sectionName="Investors">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <CrmTab 
                            title="Investor" 
                            crmItems={data.investors} 
                            tasks={data.investorTasks} 
                            actions={actions} 
                            documents={data.documents} 
                            businessProfile={businessProfile}
                            workspaceId={workspace?.id}
                            onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                            workspaceMembers={workspaceMembers}
                            userId={user?.id}
                            deals={data.deals}
                            productsServices={data.productsServices}
                        />
                        </Suspense>
                    </SectionBoundary>
                );
            case Tab.Customers:
                return (
                    <SectionBoundary sectionName="Customers">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <CrmTab 
                            title="Customer" 
                            crmItems={data.customers} 
                            tasks={data.customerTasks} 
                            actions={actions} 
                            documents={data.documents} 
                            businessProfile={businessProfile}
                            workspaceId={workspace?.id}
                            onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                            productsServices={data.productsServices}
                            workspaceMembers={workspaceMembers}
                            userId={user?.id}
                            deals={data.deals}
                        />
                        </Suspense>
                    </SectionBoundary>
                );
            case Tab.Partners:
                return (
                    <SectionBoundary sectionName="Partners">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <CrmTab 
                            title="Partner" 
                            crmItems={data.partners} 
                            tasks={data.partnerTasks} 
                            actions={actions} 
                            documents={data.documents} 
                            businessProfile={businessProfile}
                            workspaceId={workspace?.id}
                            onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                            productsServices={data.productsServices}
                            workspaceMembers={workspaceMembers}
                            userId={user?.id}
                            deals={data.deals}
                        />
                        </Suspense>
                    </SectionBoundary>
                );
            case Tab.Marketing:
                return (
                    <SectionBoundary sectionName="Marketing">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <MarketingTab 
                            items={data.marketing} 
                            tasks={data.marketingTasks} 
                            actions={actions} 
                            documents={data.documents} 
                            businessProfile={businessProfile}
                            workspaceId={workspace?.id}
                            workspaceMembers={workspaceMembers}
                            onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                            data={data}
                            productsServices={data.productsServices}
                        />
                    </Suspense>
                    </SectionBoundary>
                );
            case Tab.Financials:
                return (
                    <SectionBoundary sectionName="Financials">
                        <Suspense fallback={<TabLoadingFallback />}>
                            <FinancialsTab 
                            items={data.financials} 
                            expenses={data.expenses} 
                            tasks={data.financialTasks} 
                            actions={actions} 
                            documents={data.documents} 
                            businessProfile={businessProfile}
                            workspaceId={workspace?.id}
                            workspaceMembers={workspaceMembers}
                            onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                            data={data}
                            productsServices={data.productsServices}
                        />
                    </Suspense>
                    </SectionBoundary>
                );
            case Tab.Workspace:
                // GTM Docs - available for all paid plans
                if (workspace?.planType === 'free') {
                    return (
                        <div className="p-8 text-center">
                            <div className="max-w-md mx-auto">
                                <div className="mb-6 text-6xl">📋</div>
                                <h2 className="text-2xl font-bold mb-4">GTM Docs - Premium Feature</h2>
                                <p className="text-gray-600 mb-6">
                                    Create and collaborate on GTM briefs, campaign plans, battlecards, and more with rich text editing and AI integration. Available on Power and Team Pro plans.
                                </p>
                                <button
                                    onClick={() => setActiveTab(Tab.Settings)}
                                    className="px-6 py-3 bg-yellow-400 text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                                    aria-label="Upgrade to Power or Team Pro plan to access GTM Docs"
                                >
                                    Upgrade to Access GTM Docs
                                </button>
                            </div>
                        </div>
                    );
                }
                return (
                    <Suspense fallback={<TabLoadingFallback />}>
                        <WorkspaceTab 
                            workspaceId={workspace?.id || ''} 
                            userId={user?.id || ''} 
                            actions={actions}
                            data={data}
                            onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                        />
                    </Suspense>
                );
            case Tab.Documents:
                // Hide file library for free users
                if (workspace?.planType === 'free') {
                    return (
                        <div className="p-8 text-center">
                            <div className="max-w-md mx-auto">
                                <div className="mb-6 text-6xl">📁</div>
                                <h2 className="text-2xl font-bold mb-4">File Library - Premium Feature</h2>
                                <p className="text-gray-600 mb-6">
                                    Upload and organize your documents, pitch decks, and important files. Available on Power and Team Pro plans.
                                </p>
                                <button
                                    onClick={() => setActiveTab(Tab.Settings)}
                                    className="px-6 py-3 bg-yellow-400 text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                                    aria-label="Upgrade to Power or Team Pro plan to access File Library"
                                >
                                    Upgrade to Access File Library
                                </button>
                            </div>
                        </div>
                    );
                }
                return (
                    <Suspense fallback={<TabLoadingFallback />}>
                        <FileLibraryTab documents={data.documents} actions={actions} companies={allCompanies} contacts={allContacts} />
                    </Suspense>
                );
            case Tab.Settings:
                return (
                    <SectionBoundary sectionName="Settings">
                    <Suspense fallback={<TabLoadingFallback />}>
                        <SettingsTab settings={data.settings} onUpdateSettings={actions.updateSettings} actions={actions} workspaceId={workspace?.id} />
                    </Suspense>
                    </SectionBoundary>
                );
            case Tab.Admin:
                return isAdmin ? (
                    <Suspense fallback={<TabLoadingFallback />}>
                        <AdminTab />
                    </Suspense>
                ) : (
                    <div className="p-8 text-center text-red-600 font-mono">Access Denied: Admin Only</div>
                );
            default:
                return <DashboardTab data={data} actions={actions} businessProfile={businessProfile} />;
        }
    };

    return (
        <>
            {/* Show workspace creation screen if no workspace */}
            {!isLoadingWorkspace && !workspace && (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-4">Welcome to Setique! 🎉</h2>
                        <p className="text-gray-600 mb-6">
                            Let's set up your workspace to get started with your founder dashboard.
                        </p>
                        <button
                            onClick={async () => {
                                try {
                                    // First, ensure profile exists
                                    logger.info('[DashboardApp] Creating profile first...');
                                    await DatabaseService.createProfile({
                                        id: user!.id,
                                        email: user!.email || '',
                                        created_at: new Date().toISOString()
                                    });
                                    
                                    // Then create workspace
                                    logger.info('[DashboardApp] Creating workspace...');
                                    await DatabaseService.createWorkspace(user!.id, {
                                        name: 'My Workspace',
                                        plan_type: 'free'
                                    });
                                    
                                    await refreshWorkspace();
                                } catch (error) {
                                    logger.error('Failed to create workspace:', error);
                                    alert('Failed to create workspace. Please refresh and try again.');
                                }
                            }}
                            className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                            aria-label="Create your first workspace to get started"
                        >
                            Create My Workspace
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="w-full mt-4 text-gray-600 hover:text-gray-800 transition-colors"
                            aria-label="Sign out and return to login"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Show loading state */}
            {(isLoadingWorkspace || isLoading) && (
                <div className="min-h-screen flex items-center justify-center">
                    <LoadingSpinner size="lg" message="Loading workspace..." />
                </div>
            )}

            {/* Show "No Workspace Found" screen */}
            {!isLoadingWorkspace && !workspace && (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white p-8 border-2 border-black shadow-neo m-4">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4">🔒</div>
                            <h2 className="text-2xl font-bold text-black mb-2">No Workspace Found</h2>
                        </div>
                        
                        <div className="space-y-4 text-gray-700 mb-6">
                            <p>
                                You don't currently have access to any workspace. This usually means:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                                <li>You were removed from a team workspace</li>
                                <li>Your workspace access was revoked</li>
                                <li>Your workspace is still being set up</li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 border-2 border-blue-200 p-4 mb-6">
                            <p className="text-sm text-blue-900">
                                <strong>Want to use the app independently?</strong><br />
                                Sign up with a different email address to create your own workspace.
                            </p>
                        </div>
                        
                        <button
                            onClick={signOut}
                            className="w-full bg-blue-600 text-white py-3 px-4 border-2 border-black font-bold shadow-neo hover:bg-blue-700 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Show dashboard only when workspace exists */}
            {!isLoadingWorkspace && workspace && (
                <>
            {/* Skip to content link for accessibility */}
            <a href="#main-content" className="skip-to-content">
                Skip to main content
            </a>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <SideMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                activeTab={activeTab}
                onSwitchTab={switchTab}
                workspacePlan={workspace?.planType}
                isAdmin={isAdmin}
                workspaceId={workspace?.id}
                userId={user?.id}
            />
            <div className="min-h-screen p-3 sm:p-4 md:p-8">
                <header role="banner" className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <button onClick={() => setIsMenuOpen(true)} aria-label="Open navigation menu" aria-expanded={isMenuOpen} className="shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">
                            FounderHQ <span className="text-gray-600 hidden sm:inline" style={{ fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>A Setique Tool</span>
                        </h1>
                        
                        {/* Workspace name display (no switching in single-workspace model) */}
                        {workspace && (
                            <div className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-black bg-gray-50 truncate max-w-[100px] sm:max-w-none" role="status" aria-label={`Current workspace: ${workspace.name}`}>
                                {workspace.name}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Notification Bell */}
                        {user && workspace && (
                            <>
                                <NotificationBell 
                                    userId={user.id}
                                    workspaceId={workspace.id}
                                />
                                <InAppNotificationsPanel
                                    isOpen={isNotificationsPanelOpen}
                                    onClose={() => setIsNotificationsPanelOpen(false)}
                                />
                            </>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-gray-600 hidden md:inline truncate max-w-[150px]">{user?.email}</span>
                            <button
                                onClick={() => signOut()}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-black bg-white hover:bg-gray-100 transition-colors whitespace-nowrap"
                                aria-label="Sign out of your account"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                {isLoading ? (
                     <div className="flex justify-center items-center h-64" role="status" aria-live="polite" aria-label="Loading dashboard">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="ml-3 text-gray-500">Connecting to dashboard...</span>
                    </div>
                ) : (
                    <main id="main-content" role="main" aria-label={`${activeTab} tab`}>
                       {renderTabContent()}
                    </main>
                )}
            </div>

            {/* Business Profile Modal - Show on first-time onboarding OR when manually opened */}
            {(showOnboarding || showBusinessProfileModal) && (() => {
                // Convert snake_case from DB to camelCase for the component
                const convertedProfile = businessProfile ? {
                    companyName: (businessProfile as any).company_name,
                    industry: (businessProfile as any).industry,
                    companySize: (businessProfile as any).company_size,
                    foundedYear: (businessProfile as any).founded_year,
                    website: (businessProfile as any).website,
                    businessModel: (businessProfile as any).business_model,
                    description: (businessProfile as any).description,
                    targetMarket: (businessProfile as any).target_market,
                    valueProposition: (businessProfile as any).value_proposition,
                    primaryGoal: (businessProfile as any).primary_goal,
                    keyChallenges: (businessProfile as any).key_challenges,
                    growthStage: (businessProfile as any).growth_stage,
                    currentMrr: (businessProfile as any).current_mrr,
                    targetMrr: (businessProfile as any).target_mrr,
                    currentArr: (businessProfile as any).current_arr,
                    customerCount: (businessProfile as any).customer_count,
                    teamSize: (businessProfile as any).team_size,
                    remotePolicy: (businessProfile as any).remote_policy,
                    companyValues: (businessProfile as any).company_values,
                    techStack: (businessProfile as any).tech_stack,
                    competitors: (businessProfile as any).competitors,
                    uniqueDifferentiators: (businessProfile as any).unique_differentiators,
                    isComplete: (businessProfile as any).is_complete,
                } : undefined;
                
                logger.info('[DashboardApp] Business profile data:', { 
                    raw: businessProfile, 
                    converted: convertedProfile 
                });
                
                return (
                    <BusinessProfileSetup
                        onComplete={async (profile) => {
                            await saveBusinessProfile(profile);
                            handleToast('Business profile saved! AI assistant is now personalized to your business.', 'success');
                            setShowBusinessProfileModal(false);
                        }}
                        onSkip={() => {
                            if (showOnboarding) {
                                dismissOnboarding();
                            } else {
                                setShowBusinessProfileModal(false);
                            }
                        }}
                        initialData={convertedProfile}
                    />
                );
            })()}

            {/* Workspace Invitation Notifications */}
            <AcceptInviteNotification onAccepted={refreshWorkspace} />
                </>
            )}

            {/* Floating AI Assistant - Available across all tabs when workspace exists */}
            {/* Temporarily disabled plan check for local development */}
            {workspace && (() => {
                // Build business context from profile
                const profile = businessProfile as any;
                const companyName = profile?.company_name || profile?.companyName || 'your company';
                const industry = profile?.industry || 'Not specified';
                const businessModel = profile?.business_model || profile?.businessModel || 'Not specified';
                const primaryGoal = profile?.primary_goal || profile?.primaryGoal || 'Not specified';
                
                const businessContextStr = businessProfile ? `
**Business Context: ${companyName}**
- **Company:** ${companyName}
- **Industry:** ${industry}
- **Business Model:** ${businessModel}
- **Primary Goal:** ${primaryGoal}
` : `**Business Context:** Not yet configured.`;
                
                const teamContextStr = workspaceMembers.length > 0 ? `
**Team Members (${workspaceMembers.length}):**
${workspaceMembers.map(member => `- ${member.fullName || member.email || 'Unknown Member'} (${member.email || 'no email'}) - Role: ${member.role}`).join('\n')}
` : `**Team:** Working solo (no additional team members in workspace).`;
                
                // Build current user context for personalized AI responses
                const currentMember = workspaceMembers.find(m => m.userId === user?.id);
                const isOwner = isWorkspaceOwner();
                const userContextStr = user && currentMember ? `
**Current User:**
- You are assisting: ${currentMember.fullName || user.email || 'User'}${currentMember.email ? ` (${currentMember.email})` : ''}
- Role: ${isOwner ? 'Workspace Owner' : 'Team Member'}
- Permissions: ${isOwner ? 'Full access to all workspace data and settings' : 'Can edit own tasks and tasks assigned to you'}
` : '';
                
                return (
                    <FloatingAIAssistant
                        currentTab={activeTab}
                        actions={actions}
                        data={data}
                        workspaceId={workspace?.id}
                        onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                        companyName={companyName}
                        businessContext={businessContextStr}
                        userContext={userContextStr}
                        teamContext={teamContextStr}
                        planType={workspace?.planType || 'free'}
                        onDataLoadNeeded={handleAIDataLoad}
                        onToggleRef={(toggle) => {
                            toggleAIAssistantRef.current = toggle;
                        }}
                    />
                );
            })()}
        </>
    );
};

export default DashboardApp;
