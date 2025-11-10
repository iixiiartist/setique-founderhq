import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { logger } from './lib/logger'
import { Tab, EMPTY_DASHBOARD_DATA, NAV_ITEMS, ACHIEVEMENTS } from './constants';
import { DashboardData, AppActions, Task, TaskCollectionName, CrmCollectionName, NoteableCollectionName, AnyCrmItem, FinancialLog, Note, BaseCrmItem, MarketingItem, SettingsData, Document, Contact, TabType, GamificationData, AchievementId, Priority, CalendarEvent, Meeting, TaskStatus } from './types';
import SideMenu from './components/SideMenu';
import DashboardTab from './components/DashboardTab';
import Toast from './components/shared/Toast';
import TaskFocusModal from './components/shared/TaskFocusModal';
import { TabLoadingFallback } from './components/shared/TabLoadingFallback';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './components/shared/KeyboardShortcutsHelp';
import { setUser as setSentryUser, setWorkspaceContext, trackAction } from './lib/sentry.tsx';

// Lazy load heavy tab components for code splitting
// This reduces initial bundle size and improves first load performance
const PlatformTab = lazy(() => import('./components/PlatformTab'));
const CrmTab = lazy(() => import('./components/CrmTab'));
const MarketingTab = lazy(() => import('./components/MarketingTab'));
const FinancialsTab = lazy(() => import('./components/FinancialsTab'));
const SettingsTab = lazy(() => import('./components/SettingsTab'));
const FileLibraryTab = lazy(() => import('./components/FileLibraryTab'));
const AdminTab = lazy(() => import('./components/AdminTab'));
const AchievementsTab = lazy(() => import('./components/AchievementsTab'));
const CalendarTab = lazy(() => import('./components/CalendarTab'));
import { BusinessProfileSetup } from './components/BusinessProfileSetup';
import { AcceptInviteNotification } from './components/shared/AcceptInviteNotification';
import { NotificationBell } from './components/shared/NotificationBell';
import { FloatingAIAssistant } from './components/assistant/FloatingAIAssistant';
import { useAuth } from './contexts/AuthContext';
import { useWorkspace } from './contexts/WorkspaceContext';
import { LoadingSpinner } from './components/shared/Loading';
import { useLazyDataPersistence } from './hooks/useLazyDataPersistence';
import { DataPersistenceAdapter } from './lib/services/dataPersistenceAdapter';
import { DatabaseService } from './lib/services/database';
import { GamificationService, TeamAchievementService } from './lib/services/gamificationService';
import { supabase } from './lib/supabase';

const DashboardApp: React.FC<{ subscribePlan?: string | null }> = ({ subscribePlan }) => {
    const { user, signOut } = useAuth();
    const { workspace, businessProfile, showOnboarding, saveBusinessProfile, dismissOnboarding, isLoadingWorkspace, refreshWorkspace, canEditTask, workspaceMembers } = useWorkspace();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showBusinessProfileModal, setShowBusinessProfileModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showKeyboardShortcutsHelp, setShowKeyboardShortcutsHelp] = useState(false);
    
    // Persist active tab in localStorage so it survives page refresh
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const savedTab = localStorage.getItem('activeTab');
        return (savedTab as TabType) || Tab.Dashboard;
    });
    
    // Use lazy loading for better performance
    const {
        loadCoreData,
        loadTasks,
        loadCrmItems,
        loadMarketing,
        loadFinancials,
        loadDocuments,
        loadDocumentsMetadata,
        invalidateCache,
        invalidateAllCache,
        isLoading: isDataLoading,
        error: dataError
    } = useLazyDataPersistence();
    
    // State management for lazy-loaded data
    const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
    const [isLoading, setIsLoading] = useState(true);
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
    const userId = user?.id;
    
    const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
    const [sentNotifications, setSentNotifications] = useState<Set<string>>(new Set());
    const [lastNotificationCheckDate, setLastNotificationCheckDate] = useState<string | null>(null);
    const [isTaskFocusModalOpen, setIsTaskFocusModalOpen] = useState(false);

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

    // Keyboard shortcuts for accessibility and power users
    useKeyboardShortcuts({
        enabled: !!workspace && !isLoading && !isLoadingWorkspace,
        onNewTask: () => {
            // Context-aware new task based on current tab
            const taskCategory = activeTab === Tab.Platform ? 'platformTasks' :
                                activeTab === Tab.Investors ? 'investorTasks' :
                                activeTab === Tab.Customers ? 'customerTasks' :
                                activeTab === Tab.Partners ? 'partnerTasks' :
                                activeTab === Tab.Marketing ? 'marketingTasks' :
                                activeTab === Tab.Financials ? 'financialTasks' : 'platformTasks';
            
            // For now, just focus on "Add Task" button (proper modal integration would go here)
            handleToast('New task shortcut (Ctrl+N or N) pressed', 'info');
        },
        onSearch: () => {
            // Focus search input if it exists (placeholder for now)
            handleToast('Search shortcut (Ctrl+K or /) pressed', 'info');
        },
        onHelp: () => {
            setShowKeyboardShortcutsHelp(true);
        },
        onTabChange: (tab) => {
            setActiveTab(tab);
            setIsMenuOpen(false);
        },
        onEscape: () => {
            if (isMenuOpen) setIsMenuOpen(false);
            if (showKeyboardShortcutsHelp) setShowKeyboardShortcutsHelp(false);
        },
        onToggleAI: () => {
            if (toggleAIAssistantRef.current) {
                toggleAIAssistantRef.current();
            }
        }
    });

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

    // Initialize app - load only core data (gamification & settings)
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
                    gamification: coreData.gamification,
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
    }, [user, workspace?.id, loadCoreData, loadDocumentsMetadata]);

    // Load tab-specific data when tab changes (lazy loading)
    useEffect(() => {
        const loadTabData = async () => {
            if (!user || !workspace || loadedTabs.has(activeTab) || isLoading) {
                return; // Already loaded this tab or still loading
            }

            try {
                setIsLoading(true);
                
                switch (activeTab) {
                    case Tab.Dashboard:
                    case Tab.Calendar:
                        // Load tasks for dashboard and calendar
                        if (!loadedTabs.has('tasks')) {
                            const tasks = await loadTasks();
                            setData(prev => ({ ...prev, ...tasks }));
                            setLoadedTabs(prev => new Set(prev).add('tasks'));
                        }
                        
                        // Calendar also needs marketing items and CRM items for events
                        if (activeTab === Tab.Calendar) {
                            if (!loadedTabs.has('marketing')) {
                                const marketing = await loadMarketing();
                                setData(prev => ({ ...prev, marketing }));
                                setLoadedTabs(prev => new Set(prev).add('marketing'));
                            }
                            
                            if (!loadedTabs.has('crm')) {
                                const crm = await loadCrmItems();
                                setData(prev => ({ ...prev, ...crm }));
                                setLoadedTabs(prev => new Set(prev).add('crm'));
                            }
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
                setIsLoading(false); // Done loading
            } catch (error) {
                logger.error(`Error loading data for tab ${activeTab}:`, error);
                setIsLoading(false); // Stop loading on error
            }
        };

        loadTabData();
    }, [activeTab, user, workspace?.id, loadedTabs, loadTasks, loadCrmItems, loadMarketing, loadFinancials, loadDocuments, isLoading]);

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
        setActiveTab(tab);
        setIsMenuOpen(false);
    };

    // Reload function for lazy loading - invalidates cache and reloads current tab data
    const reload = useCallback(async () => {
        // Invalidate all caches
        invalidateAllCache();
        setLoadedTabs(new Set());
        
        // Reload core data
        try {
            const coreData = await loadCoreData();
            setData(prev => ({
                ...prev,
                gamification: coreData.gamification,
                settings: coreData.settings
            }));
            
            // Reload current tab data
            switch (activeTab) {
                case Tab.Dashboard:
                case Tab.Calendar:
                case Tab.Platform:
                    const tasks = await loadTasks({ force: true });
                    setData(prev => ({ ...prev, ...tasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    
                    if (activeTab === Tab.Platform) {
                        const documents = await loadDocuments({ force: true });
                        setData(prev => ({ ...prev, documents }));
                        setLoadedTabs(prev => new Set(prev).add('documents'));
                    }
                    break;

                case Tab.Investors:
                case Tab.Customers:
                case Tab.Partners:
                    const crm = await loadCrmItems({ force: true });
                    setData(prev => ({ ...prev, ...crm }));
                    setLoadedTabs(prev => new Set(prev).add('crm'));
                    
                    const crmTasks = await loadTasks({ force: true });
                    setData(prev => ({ ...prev, ...crmTasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    break;

                case Tab.Marketing:
                    const marketing = await loadMarketing({ force: true });
                    setData(prev => ({ ...prev, marketing }));
                    setLoadedTabs(prev => new Set(prev).add('marketing'));
                    
                    const marketingTasks = await loadTasks({ force: true });
                    setData(prev => ({ ...prev, ...marketingTasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    break;

                case Tab.Financials:
                    const financials = await loadFinancials({ force: true });
                    setData(prev => ({ ...prev, ...financials }));
                    setLoadedTabs(prev => new Set(prev).add('financials'));
                    
                    const financialTasks = await loadTasks({ force: true });
                    setData(prev => ({ ...prev, ...financialTasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    break;

                case Tab.Documents:
                    const docs = await loadDocuments({ force: true });
                    setData(prev => ({ ...prev, documents: docs }));
                    setLoadedTabs(prev => new Set(prev).add('documents'));
                    break;

                case Tab.Settings:
                case Tab.Achievements:
                    // No additional data needed
                    break;
            }
            
            setLoadedTabs(prev => new Set(prev).add(activeTab));
        } catch (error) {
            logger.error('Error reloading data:', error);
        }
    }, [activeTab, loadCoreData, loadTasks, loadCrmItems, loadMarketing, loadFinancials, loadDocuments, invalidateAllCache]);

    const allTasks = useMemo(() => {
        const taskCollections: { tasks: Task[]; tag: string }[] = [
            { tasks: data.platformTasks, tag: 'Platform' },
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
    
    
    // --- AI Action Implementations ---
    const allCompanies = useMemo(() => {
        return [...data.investors, ...data.customers, ...data.partners];
    }, [data.investors, data.customers, data.partners]);

    const allContacts = useMemo(() => {
        return allCompanies.flatMap(company => (company.contacts || []).map(contact => ({...contact, companyName: company.company })));
    }, [allCompanies]);

    const actions: AppActions = useMemo(() => ({
        createTask: async (category, text, priority, crmItemId, contactId, dueDate, assignedTo, dueTime) => {
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
                    dueTime
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
                        notes: []
                    };

                    // Add the server task directly to state (no cache invalidation)
                    setData(prev => ({
                        ...prev,
                        [category]: [...(prev[category] as Task[]), newTask]
                    }));
                }
                
                // Track action in Sentry
                trackAction('task_created', { category, priority, hasDate: !!dueDate });
                
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
                    ...data.platformTasks,
                    ...data.investorTasks,
                    ...data.customerTasks,
                    ...data.partnerTasks,
                    ...data.marketingTasks,
                    ...data.financialTasks,
                ];
                task = allTasksFlat.find(t => t.id === taskId);
                
                // Find which category this task belongs to
                if (data.platformTasks.some(t => t.id === taskId)) taskCategory = 'platformTasks';
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
                
                // Track action in Sentry
                trackAction('task_updated', { 
                    taskId, 
                    status: updates.status,
                    wasCompleted: wasCompleted && previousStatus !== 'Done'
                });
                
                // Reload tasks to get fresh data
                invalidateCache('tasks');
                const updatedTasks = await loadTasks({ force: true });
                setData(prev => ({ ...prev, ...updatedTasks }));

                // Award XP if task was just completed (not already done)
                if (wasCompleted && previousStatus !== 'Done') {
                    const allTasksFlat = [
                        ...data.platformTasks,
                        ...data.investorTasks,
                        ...data.customerTasks,
                        ...data.partnerTasks,
                        ...data.marketingTasks,
                        ...data.financialTasks,
                    ];
                    const task = allTasksFlat.find(t => t.id === taskId);
                    const xpAmount = GamificationService.REWARDS.TASK_COMPLETE + 
                        (task?.priority === 'High' ? GamificationService.REWARDS.HIGH_PRIORITY_TASK : 0);
                    
                    const result = await GamificationService.awardXP(
                        userId,
                        data.gamification,
                        xpAmount,
                        data,
                        `Completed task: ${task?.text || 'Unknown'}`
                    );

                    // Show level-up or achievement notifications
                    if (result.leveledUp) {
                        handleToast(`🎉 Level Up! You're now Level ${result.newLevel}!`, 'success');
                    } else if (result.newAchievements.length > 0) {
                        const achievement = ACHIEVEMENTS[result.newAchievements[0]];
                        handleToast(`🏆 Achievement Unlocked: ${achievement.title}`, 'success');
                    }

                    // Check team achievements if workspace exists
                    if (workspace?.id && userId) {
                        const allTasks = [
                            ...data.platformTasks,
                            ...data.investorTasks,
                            ...data.customerTasks,
                            ...data.partnerTasks,
                            ...data.marketingTasks,
                            ...data.financialTasks,
                        ];
                        const completedTasksCount = allTasks.filter(t => t.status === 'Done').length;
                        
                        const teamResult = await TeamAchievementService.onTaskCompleted(
                            workspace.id,
                            userId,
                            completedTasksCount,
                            completedTasksCount // For now, treat all completed tasks as shared
                        );

                        // Show team achievement notifications (teamResult can be void if skipped)
                        if (teamResult?.newAchievements?.length > 0) {
                            const firstAchievement = teamResult.newAchievements![0];
                            handleToast(
                                `🏆 Team Achievement Unlocked: ${firstAchievement.achievementName} (+${firstAchievement.xpReward} Team XP)`,
                                'success'
                            );
                        }
                    }
                    
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
                    ...data.platformTasks,
                    ...data.investorTasks,
                    ...data.customerTasks,
                    ...data.partnerTasks,
                    ...data.marketingTasks,
                    ...data.financialTasks,
                ];
                const task = allTasksFlat.find(t => t.id === taskId);
                
                if (data.platformTasks.some(t => t.id === taskId)) taskCategory = 'platformTasks';
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

                // Track action in Sentry
                trackAction('task_deleted', { taskId, category: taskCategory });
                
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
                if (collection === 'platformTasks' || collection === 'investorTasks' || 
                    collection === 'customerTasks' || collection === 'partnerTasks' || 
                    collection === 'marketingTasks' || collection === 'financialTasks') {
                    await DataPersistenceAdapter.addTaskNote(itemId, noteText, userId, userName);
                } else if (collection === 'investors' || collection === 'customers' || collection === 'partners') {
                    await DataPersistenceAdapter.addCrmNote(itemId, noteText, userId, userName);
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
                } else if (collection === 'investorTasks' || collection === 'customerTasks' || collection === 'partnerTasks' || collection === 'platformTasks') {
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
                } else if (collection === 'investorTasks' || collection === 'customerTasks' || collection === 'partnerTasks' || collection === 'platformTasks') {
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
                
                await DataPersistenceAdapter.createCrmItem(userId, workspace.id, collection, itemData as any);
                
                // Track action in Sentry
                trackAction('crm_item_created', { collection });
                
                invalidateCache('crm');
                
                // Award XP for creating CRM item
                const result = await GamificationService.awardXP(
                    userId,
                    data.gamification,
                    GamificationService.REWARDS.CRM_ITEM_CREATED,
                    data,
                    `Created ${collection.slice(0, -1)}: ${newCompanyName}`
                );

                // Show notifications
                const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
                if (result.leveledUp) {
                    handleToast(`🎉 Level Up! You're now Level ${result.newLevel}!`, 'success');
                } else if (result.newAchievements.length > 0) {
                    const achievement = ACHIEVEMENTS[result.newAchievements[0]];
                    handleToast(`🏆 ${achievement.title}: ${achievement.description}`, 'success');
                } else {
                    handleToast(`${titleCase(collection.slice(0, -1))} "${newCompanyName}" created successfully.`, 'success');
                }
                
                // Reload data once after all operations
                await reload();

                // Check team achievements
                if (workspace?.id && userId) {
                    const totalContacts = [...data.investors, ...data.customers, ...data.partners].length + 1;
                    const teamResult = await TeamAchievementService.onCRMContactAdded(
                        workspace.id,
                        userId,
                        totalContacts
                    );

                    if (teamResult?.newAchievements?.length > 0) {
                        const firstAchievement = teamResult.newAchievements[0];
                        handleToast(
                            `🏆 Team Achievement: ${firstAchievement.achievementName} (+${firstAchievement.xpReward} Team XP)`,
                            'success'
                        );
                    }
                }

                return { success: true, message: `${collection} item created.` };
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
                
                await reload();
                invalidateCache('crm');
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
                await DataPersistenceAdapter.createContact(userId, workspace.id, crmItemId, contactData);
                await reload();
                
                // Award XP for adding contact
                const result = await GamificationService.awardXP(
                    userId,
                    data.gamification,
                    GamificationService.REWARDS.CONTACT_ADDED,
                    data,
                    `Added contact: ${contactData.name}`
                );

                if (result.leveledUp) {
                    handleToast(`🎉 Level Up! You're now Level ${result.newLevel}!`, 'success');
                } else if (result.newAchievements.length > 0) {
                    const achievement = ACHIEVEMENTS[result.newAchievements[0]];
                    handleToast(`🏆 ${achievement.title}`, 'success');
                } else {
                    handleToast(`Contact "${contactData.name}" created.`, 'success');
                }
                
                await reload();
                return { success: true, message: 'Contact created.' };
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
                await reload();
                
                // Award XP for logging meeting
                const result = await GamificationService.awardXP(
                    userId,
                    data.gamification,
                    GamificationService.REWARDS.MEETING_LOGGED,
                    data,
                    `Logged meeting: ${meetingData.title}`
                );

                if (result.leveledUp) {
                    handleToast(`🎉 Level Up! You're now Level ${result.newLevel}!`, 'success');
                } else if (result.newAchievements.length > 0) {
                    const achievement = ACHIEVEMENTS[result.newAchievements[0]];
                    handleToast(`🏆 ${achievement.title}`, 'success');
                } else {
                    handleToast(`Meeting "${meetingData.title}" logged.`, 'success');
                }

                // Check team achievements
                if (workspace?.id && userId) {
                    // Count all meetings across all CRM contacts
                    const allCrmItems = [...data.investors, ...data.customers, ...data.partners];
                    const totalMeetings = allCrmItems.reduce((count, item) => {
                        const contacts = item.contacts || [];
                        return count + contacts.reduce((meetingCount, contact) => {
                            return meetingCount + (contact.meetings?.length || 0);
                        }, 0);
                    }, 0) + 1; // +1 for the meeting we just created

                    const teamResult = await TeamAchievementService.onMeetingLogged(
                        workspace.id,
                        userId,
                        totalMeetings
                    );

                    if (teamResult?.newAchievements?.length > 0) {
                        const firstAchievement = teamResult.newAchievements[0];
                        handleToast(
                            `🏆 Team Achievement: ${firstAchievement.achievementName} (+${firstAchievement.xpReward} Team XP)`,
                            'success'
                        );
                    }
                }
                
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
                setLoadedTabs(prev => new Set(prev).add('financials'));
                
                // Award XP for logging financials
                const result = await GamificationService.awardXP(
                    userId,
                    data.gamification,
                    GamificationService.REWARDS.FINANCIAL_LOGGED,
                    data,
                    `Logged financials for ${logData.date}`
                );

                if (result.leveledUp) {
                    handleToast(`🎉 Level Up! You're now Level ${result.newLevel}!`, 'success');
                } else if (result.newAchievements.length > 0) {
                    const achievement = ACHIEVEMENTS[result.newAchievements[0]];
                    handleToast(`🏆 ${achievement.title}`, 'success');
                } else {
                    handleToast(`Financials logged for ${logData.date}.`, 'success');
                }

                // Check team achievements for financial milestones
                if (workspace?.id && userId) {
                    // Calculate total GMV and MRR
                    const totalGMV = freshFinancials.financials.reduce((sum, log) => sum + (log.gmv || 0), 0);
                    const totalMRR = freshFinancials.financials.reduce((sum, log) => sum + (log.mrr || 0), 0);

                    const teamResult = await TeamAchievementService.onFinancialUpdate(
                        workspace.id,
                        userId,
                        totalGMV,
                        totalMRR
                    );

                    if (teamResult?.newAchievements?.length > 0) {
                        const firstAchievement = teamResult.newAchievements[0];
                        handleToast(
                            `🏆 Team Achievement: ${firstAchievement.achievementName} (+${firstAchievement.xpReward} Team XP)`,
                            'success'
                        );
                    }
                }
                
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
                setLoadedTabs(prev => new Set(prev).add('financials'));

                // Check team achievements
                if (workspace?.id && userId) {
                    const totalExpenses = freshFinancials.expenses.length;
                    const teamResult = await TeamAchievementService.onExpenseTracked(
                        workspace.id,
                        userId,
                        totalExpenses
                    );

                    if (teamResult?.newAchievements?.length > 0) {
                        const firstAchievement = teamResult.newAchievements[0];
                        handleToast(
                            `🏆 Team Achievement: ${firstAchievement.achievementName} (+${firstAchievement.xpReward} Team XP)`,
                            'success'
                        );
                    }
                }
                
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
                setLoadedTabs(prev => new Set(prev).add('financials'));
                
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
                if (['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
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
                } else if (['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
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
                } else if (['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
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
                } else if (['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
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
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                return { success: false, message: 'No workspace found' };
            }

            try {
                logger.info('[createMarketingItem] Creating:', itemData);
                await DataPersistenceAdapter.createMarketingItem(userId, workspace.id, itemData);
                
                // Track action in Sentry
                trackAction('marketing_item_created', { type: itemData.type, status: itemData.status });
                
                // Reload marketing data immediately
                invalidateCache('marketing');
                const freshMarketing = await loadMarketing({ force: true });
                setData(prev => ({ ...prev, marketing: freshMarketing }));
                setLoadedTabs(prev => new Set(prev).add('marketing'));
                
                logger.info('[createMarketingItem] Created successfully, reloaded data');
                handleToast(`Marketing item "${itemData.title}" created.`, 'success');
                return { success: true, message: `Marketing item "${itemData.title}" created.` };
            } catch (error) {
                logger.error('Error creating marketing item:', error);
                return { success: false, message: 'Failed to create marketing item' };
            }
        },

        updateMarketingItem: async (itemId, updates) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                logger.info('[updateMarketingItem] Starting update:', { itemId, updates });
                
                // Check if marketing item was just published
                const wasPublished = updates.status === 'Published';
                
                // Get the item before update to check its previous status
                let previousStatus: string | undefined;
                if (wasPublished) {
                    const item = data.marketing.find(m => m.id === itemId);
                    previousStatus = item?.status;
                }

                // Transform camelCase to snake_case for database
                const dbUpdates: any = {};
                if (updates.title !== undefined) dbUpdates.title = updates.title;
                if (updates.type !== undefined) dbUpdates.item_type = updates.type;
                if (updates.status !== undefined) dbUpdates.status = updates.status;
                if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
                if (updates.dueTime !== undefined) dbUpdates.due_time = updates.dueTime;

                logger.info('[updateMarketingItem] Transformed updates:', dbUpdates);

                const result = await DataPersistenceAdapter.updateMarketingItem(itemId, dbUpdates);
                logger.info('[updateMarketingItem] Database result:', result);

                // Track action in Sentry
                trackAction('marketing_item_updated', { 
                    itemId, 
                    status: updates.status,
                    wasPublished: wasPublished && previousStatus !== 'Published'
                });

                // Award XP if marketing item was just published (not already published)
                if (wasPublished && previousStatus !== 'Published') {
                    const item = data.marketing.find(m => m.id === itemId);
                    const result = await GamificationService.awardXP(
                        userId,
                        data.gamification,
                        GamificationService.REWARDS.MARKETING_PUBLISHED,
                        data,
                        `Published marketing: ${item?.title || 'Unknown'}`
                    );

                    if (result.leveledUp) {
                        handleToast(`🎉 Level Up! You're now Level ${result.newLevel}!`, 'success');
                    } else if (result.newAchievements.length > 0) {
                        const achievement = ACHIEVEMENTS[result.newAchievements[0]];
                        handleToast(`🏆 ${achievement.title}`, 'success');
                    }

                    // Check team achievements for marketing campaign launch
                    if (workspace?.id && userId) {
                        const publishedCount = data.marketing.filter(m => m.status === 'Published').length + 1;
                        const teamResult = await TeamAchievementService.onMarketingCampaignLaunched(
                            workspace.id,
                            userId,
                            publishedCount
                        );

                        if (teamResult?.newAchievements?.length > 0) {
                            const firstAchievement = teamResult.newAchievements[0];
                            handleToast(
                                `🏆 Team Achievement: ${firstAchievement.achievementName} (+${firstAchievement.xpReward} Team XP)`,
                                'success'
                            );
                        }
                    }
                }
                
                // Single reload and cache invalidation after all updates
                logger.info('[updateMarketingItem] Reloading data...');
                await reload();
                invalidateCache('marketing');
                logger.info('[updateMarketingItem] Update complete');

                handleToast('Marketing item updated successfully', 'success');
                return { success: true, message: 'Marketing item updated.' };
            } catch (error) {
                logger.error('[updateMarketingItem] Error:', error);
                handleToast('Failed to update marketing item', 'info');
                return { success: false, message: 'Failed to update marketing item' };
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

        resetGamification: async () => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                await GamificationService.resetProgress(userId);
                await reload();
                handleToast("Gamification progress reset!", 'success');
                return { success: true, message: 'Progress reset successfully.' };
            } catch (error) {
                logger.error('Error resetting gamification:', error);
                return { success: false, message: 'Failed to reset progress' };
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

                // Check team achievements
                if (workspace?.id && userId) {
                    const totalDocuments = data.documents.length + 1;
                    const teamResult = await TeamAchievementService.onDocumentUploaded(
                        workspace.id,
                        userId,
                        totalDocuments
                    );

                    if (teamResult?.newAchievements?.length > 0) {
                        const firstAchievement = teamResult.newAchievements[0];
                        handleToast(
                            `🏆 Team Achievement: ${firstAchievement.achievementName} (+${firstAchievement.xpReward} Team XP)`,
                            'success'
                        );
                    }
                }

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
    }), [userId, supabase, data, reload, handleToast]);
    
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
        
        const calendarEvents: CalendarEvent[] = [
            ...allTasks
                .filter(t => t.dueDate)
                .map(t => ({ ...t, type: 'task' as const, title: t.text })),
            ...data.marketing
                .filter(m => m.dueDate)
                .map(({ type: marketingCategory, ...marketing }) => ({
                    ...marketing,
                    type: 'marketing' as const,
                    tag: 'Marketing',
                    contentType: marketingCategory,
                })),
            ...allMeetings,
            ...crmNextActions,
        ];
        
        logger.info('[DashboardApp] Calendar events after filter:', calendarEvents.length, 'events');

        switch (activeTab) {
            case Tab.Dashboard:
                return <DashboardTab data={data} actions={actions} businessProfile={businessProfile} settings={data.settings} />;
            case Tab.Calendar:
                return (
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
                );
            case Tab.Platform:
                return (
                    <Suspense fallback={<TabLoadingFallback />}>
                        <PlatformTab 
                            tasks={data.platformTasks} 
                            actions={actions} 
                            documents={data.documents} 
                            businessProfile={businessProfile} 
                            workspaceId={workspace?.id}
                            workspaceMembers={workspaceMembers}
                            onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                        />
                    </Suspense>
                );
            case Tab.Investors:
                return (
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
                        />
                    </Suspense>
                );
            case Tab.Customers:
                return (
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
                            workspaceMembers={workspaceMembers}
                            userId={user?.id}
                        />
                    </Suspense>
                );
            case Tab.Partners:
                return (
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
                            workspaceMembers={workspaceMembers}
                            userId={user?.id}
                        />
                    </Suspense>
                );
            case Tab.Marketing:
                return (
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
                        />
                    </Suspense>
                );
            case Tab.Financials:
                return (
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
            case Tab.Achievements:
                return (
                    <Suspense fallback={<TabLoadingFallback />}>
                        <AchievementsTab 
                            gamification={data.gamification} 
                            workspaceId={workspace?.id}
                            currentPlan={workspace?.planType || 'free'}
                            onUpgrade={() => setActiveTab(Tab.Settings)}
                        />
                    </Suspense>
                );
            case Tab.Settings:
                return (
                    <Suspense fallback={<TabLoadingFallback />}>
                        <SettingsTab settings={data.settings} onUpdateSettings={actions.updateSettings} actions={actions} workspaceId={workspace?.id} />
                    </Suspense>
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
                                    const { DatabaseService } = await import('./lib/services/database');
                                    
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
            
            {/* Keyboard Shortcuts Help Modal */}
            <KeyboardShortcutsHelp 
                isOpen={showKeyboardShortcutsHelp}
                onClose={() => setShowKeyboardShortcutsHelp(false)}
            />
            
            <TaskFocusModal
                isOpen={isTaskFocusModalOpen}
                onClose={() => setIsTaskFocusModalOpen(false)}
                tasks={allIncompleteTasks}
                actions={{ updateTask: actions.updateTask }}
            />
            <SideMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                activeTab={activeTab}
                onSwitchTab={switchTab}
                gamification={data.gamification}
                onProgressBarClick={() => setIsTaskFocusModalOpen(true)}
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
                        <div className="flex items-center gap-1 sm:gap-2 font-mono font-semibold" role="status" aria-label={`Daily Streak: ${data.gamification.streak} days`} title={`Daily Streak: ${data.gamification.streak} days`}>
                            <span className="text-xl sm:text-2xl" aria-hidden="true">{data.gamification.streak > 0 ? '🔥' : '🧊'}</span>
                            <span className="text-lg sm:text-xl">{data.gamification.streak}</span>
                        </div>
                        {/* Notification Bell */}
                        {user && workspace && (
                            <NotificationBell 
                                userId={user.id}
                                workspaceId={workspace.id}
                            />
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
                            <button
                                onClick={() => setShowKeyboardShortcutsHelp(true)}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-black bg-white hover:bg-gray-100 transition-colors"
                                aria-label="Show keyboard shortcuts (press ? anywhere)"
                                title="Keyboard shortcuts (press ?)"
                            >
                                ?
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
            
            {/* Floating AI Assistant - Available on all tabs (except free plan) */}
            {(() => {
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
                
                return (
                    <FloatingAIAssistant
                        currentTab={activeTab}
                        actions={actions}
                        workspaceId={workspace?.id}
                        onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                        companyName={companyName}
                        businessContext={businessContextStr}
                        teamContext={teamContextStr}
                        planType={workspace?.planType}
                        onToggleRef={(toggle) => {
                            toggleAIAssistantRef.current = toggle;
                        }}
                    />
                );
            })()}
                </>
            )}
        </>
    );
};

export default DashboardApp;
