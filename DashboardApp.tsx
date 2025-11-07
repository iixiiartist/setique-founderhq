import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tab, EMPTY_DASHBOARD_DATA, NAV_ITEMS, ACHIEVEMENTS } from './constants';
import { DashboardData, AppActions, Task, TaskCollectionName, CrmCollectionName, NoteableCollectionName, AnyCrmItem, FinancialLog, Note, BaseCrmItem, MarketingItem, SettingsData, Document, Contact, TabType, GamificationData, AchievementId, Priority, CalendarEvent, Meeting, TaskStatus } from './types';
import SideMenu from './components/SideMenu';
import DashboardTab from './components/DashboardTab';
import PlatformTab from './components/PlatformTab';
import CrmTab from './components/CrmTab';
import MarketingTab from './components/MarketingTab';
import FinancialsTab from './components/FinancialsTab';
import SettingsTab from './components/SettingsTab';
import Toast from './components/shared/Toast';
import FileLibraryTab from './components/FileLibraryTab';
import AdminTab from './components/AdminTab';
import AchievementsTab from './components/AchievementsTab';
import TaskFocusModal from './components/shared/TaskFocusModal';
import CalendarTab from './components/CalendarTab';
import { BusinessProfileSetup } from './components/BusinessProfileSetup';
import { AcceptInviteNotification } from './components/shared/AcceptInviteNotification';
import { NotificationBell } from './components/shared/NotificationBell';
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

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
    }, [activeTab]);

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
                console.error('Error checking admin status:', error);
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
            
            console.log('Redirecting to checkout for plan:', subscribePlan);
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
                
                // Load only core data on app start (2 queries instead of 8-10)
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
    }, [user, workspace?.id, loadCoreData]);

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
                console.error(`Error loading data for tab ${activeTab}:`, error);
                setIsLoading(false); // Stop loading on error
            }
        };

        loadTabData();
    }, [activeTab, user, workspace?.id, loadedTabs, loadTasks, loadCrmItems, loadMarketing, loadFinancials, loadDocuments, isLoading]);

    // Handle data loading errors
    useEffect(() => {
        if (dataError) {
            handleToast('Failed to load data from database', 'info');
            console.error('Data loading error:', dataError);
        }
    }, [dataError]);
    
    // Effect for checking and sending notifications
    useEffect(() => {
        const checkNotifications = () => {
            const todayStr = new Date().toISOString().split('T')[0];

            if (todayStr !== lastNotificationCheckDate) {
                setLastNotificationCheckDate(todayStr);
                setSentNotifications(new Set());
            }
            
            const settings = data.settings;
            if (!settings.desktopNotifications) {
                return;
            }

            const allCrmItems = [...data.investors, ...data.customers, ...data.partners];
            const crmItemsWithActions = allCrmItems.filter(item => item.nextAction && item.nextActionDate);

            crmItemsWithActions.forEach(item => {
                const isOverdue = item.nextActionDate! < todayStr;
                
                const notificationId = `notif-${item.id}`;

                if (settings.desktopNotifications && isOverdue && !sentNotifications.has(notificationId)) {
                    new Notification('Setique: Overdue Action', {
                        body: `Your next action with ${item.company} ("${item.nextAction}") was due on ${item.nextActionDate}.`,
                        tag: notificationId
                    });
                    setSentNotifications(prev => new Set(prev).add(notificationId));
                }
            });
        };
        
        const intervalId = setInterval(checkNotifications, 60000); // Check every minute
        checkNotifications(); // Also check on initial load

        return () => clearInterval(intervalId);
    }, [data, lastNotificationCheckDate, sentNotifications]);

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

    const handleToast = useCallback((message: string, type: 'info' | 'success' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

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
                    const tasks = await loadTasks();
                    setData(prev => ({ ...prev, ...tasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    
                    if (activeTab === Tab.Platform) {
                        const documents = await loadDocuments();
                        setData(prev => ({ ...prev, documents }));
                        setLoadedTabs(prev => new Set(prev).add('documents'));
                    }
                    break;

                case Tab.Investors:
                case Tab.Customers:
                case Tab.Partners:
                    const crm = await loadCrmItems();
                    setData(prev => ({ ...prev, ...crm }));
                    setLoadedTabs(prev => new Set(prev).add('crm'));
                    
                    const crmTasks = await loadTasks();
                    setData(prev => ({ ...prev, ...crmTasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    break;

                case Tab.Marketing:
                    const marketing = await loadMarketing();
                    setData(prev => ({ ...prev, marketing }));
                    setLoadedTabs(prev => new Set(prev).add('marketing'));
                    
                    const marketingTasks = await loadTasks();
                    setData(prev => ({ ...prev, ...marketingTasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    break;

                case Tab.Financials:
                    const financials = await loadFinancials();
                    setData(prev => ({ ...prev, ...financials }));
                    setLoadedTabs(prev => new Set(prev).add('financials'));
                    
                    const financialTasks = await loadTasks();
                    setData(prev => ({ ...prev, ...financialTasks }));
                    setLoadedTabs(prev => new Set(prev).add('tasks'));
                    break;

                case Tab.Documents:
                    const docs = await loadDocuments();
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
            console.error('Error reloading data:', error);
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
        createTask: async (category, text, priority, crmItemId, contactId, dueDate, assignedTo) => {
            if (!userId || !supabase) {
                handleToast('Database not available', 'info');
                return { success: false, message: 'Database not connected' };
            }

            if (!workspace?.id) {
                console.error('[DashboardApp] Cannot create task: No workspace loaded', { workspace });
                handleToast('No workspace available. Please refresh the page.', 'info');
                return { success: false, message: 'No workspace available' };
            }

            // Create optimistic task with temporary ID
            const optimisticTask: Task = {
                id: `temp-${Date.now()}`,
                text,
                status: 'Todo',
                priority,
                createdAt: Date.now(),
                userId,
                dueDate: dueDate || undefined,
                crmItemId: crmItemId || undefined,
                contactId: contactId || undefined,
                assignedTo: assignedTo || undefined,
                assignedToName: assignedTo ? workspaceMembers.find(m => m.userId === assignedTo)?.fullName : undefined,
                notes: []
            };

            // Optimistically update UI
            setData(prev => ({
                ...prev,
                [category]: [...(prev[category] as Task[]), optimisticTask]
            }));

            handleToast(`Creating task...`, 'info');

            try {
                console.log('[DashboardApp] Creating task with workspace:', workspace.id);
                await DataPersistenceAdapter.createTask(userId, category, text, priority, crmItemId, contactId, dueDate, workspace.id, assignedTo);
                
                // Invalidate cache so next load gets fresh data
                // Don't reload immediately - keep optimistic update
                invalidateCache('tasks');
                
                handleToast(`Task "${text}" created.`, 'success');
                return { success: true, message: `Task "${text}" created.` };
            } catch (error) {
                console.error('Error creating task:', error);
                
                // Rollback optimistic update on error
                setData(prev => ({
                    ...prev,
                    [category]: (prev[category] as Task[]).filter(t => t.id !== optimisticTask.id)
                }));
                
                handleToast('Failed to create task', 'info');
                return { success: false, message: 'Failed to create task' };
            }
        },

        updateTask: async (taskId, updates) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
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
                
                // Reload tasks to get fresh data
                invalidateCache('tasks');
                const updatedTasks = await loadTasks();
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

                        // Show team achievement notifications
                        if (teamResult.newAchievements.length > 0) {
                            const firstAchievement = teamResult.newAchievements[0];
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
                console.error('Error updating task:', error);
                return { success: false, message: 'Failed to update task' };
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
                
                await reload();
                return { success: true, message: 'Note added.' };
            } catch (error) {
                console.error('Error adding note:', error);
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

                await reload();
                handleToast('Note updated', 'success');
                return { success: true, message: 'Note updated successfully' };
            } catch (error) {
                console.error('Error updating note:', error);
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

                await reload();
                handleToast('Note deleted', 'success');
                return { success: true, message: 'Note deleted successfully' };
            } catch (error) {
                console.error('Error deleting note:', error);
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
                return { success: true, message: `${collection} item created.` };
            } catch (error) {
                console.error('Error creating CRM item:', error);
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
                await reload();
                invalidateCache('crm');
                return { success: true, message: 'CRM item updated.' };
            } catch (error) {
                console.error('Error updating CRM item:', error);
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
                console.error('Error creating contact:', error);
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
                console.error('Error updating contact:', error);
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
                console.error('Error deleting contact:', error);
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
                
                await reload();
                return { success: true, message: 'Meeting created.' };
            } catch (error) {
                console.error('Error creating meeting:', error);
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
                console.error('Error updating meeting:', error);
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
                console.error('Error deleting meeting:', error);
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
                
                // Clear cache first, then reload
                invalidateCache('financials');
                
                // Reload financial data immediately (this will fetch fresh data since cache is invalidated)
                const freshFinancials = await loadFinancials();
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
                
                await reload();
                return { success: true, message: `Financials logged for date ${logData.date}.` };
            } catch (error) {
                console.error('Error logging financials:', error);
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
                const freshFinancials = await loadFinancials();
                setData(prev => ({ 
                    ...prev, 
                    financials: freshFinancials.financials,
                    expenses: freshFinancials.expenses 
                }));
                setLoadedTabs(prev => new Set(prev).add('financials'));
                
                return { success: true, message: `Expense created: ${expenseData.description}` };
            } catch (error) {
                console.error('Error creating expense:', error);
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
                const freshFinancials = await loadFinancials();
                setData(prev => ({ 
                    ...prev, 
                    financials: freshFinancials.financials,
                    expenses: freshFinancials.expenses 
                }));
                setLoadedTabs(prev => new Set(prev).add('financials'));
                
                return { success: true, message: 'Expense updated successfully' };
            } catch (error) {
                console.error('Error updating expense:', error);
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
                console.error('Error deleting item:', error);
                
                // Rollback on error - reload the data
                if (collection === 'financials' || collection === 'expenses') {
                    const freshFinancials = await loadFinancials();
                    setData(prev => ({ ...prev, ...freshFinancials }));
                } else if (collection === 'marketing') {
                    const freshMarketing = await loadMarketing();
                    setData(prev => ({ ...prev, marketing: freshMarketing }));
                } else if (['investors', 'customers', 'partners'].includes(collection) || collection === 'contacts') {
                    const freshCrm = await loadCrmItems();
                    setData(prev => ({ ...prev, ...freshCrm }));
                } else if (['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'].includes(collection)) {
                    const freshTasks = await loadTasks();
                    setData(prev => ({ ...prev, ...freshTasks }));
                } else if (collection === 'documents') {
                    const freshDocuments = await loadDocuments();
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
                await DataPersistenceAdapter.createMarketingItem(userId, workspace.id, itemData);
                await reload();
                invalidateCache('marketing');
                handleToast(`Marketing item "${itemData.title}" created.`, 'success');
                return { success: true, message: `Marketing item "${itemData.title}" created.` };
            } catch (error) {
                console.error('Error creating marketing item:', error);
                return { success: false, message: 'Failed to create marketing item' };
            }
        },

        updateMarketingItem: async (itemId, updates) => {
            if (!userId || !supabase) {
                return { success: false, message: 'Database not connected' };
            }

            try {
                // Check if marketing item was just published
                const wasPublished = updates.status === 'Published';
                
                // Get the item before update to check its previous status
                let previousStatus: string | undefined;
                if (wasPublished) {
                    const item = data.marketing.find(m => m.id === itemId);
                    previousStatus = item?.status;
                }

                await DataPersistenceAdapter.updateMarketingItem(itemId, updates);
                await reload();
                invalidateCache('marketing');

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
                    
                    await reload();
                    invalidateCache('marketing');
                }

                return { success: true, message: 'Marketing item updated.' };
            } catch (error) {
                console.error('Error updating marketing item:', error);
                return { success: false, message: 'Failed to update marketing item' };
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
                console.error('Error updating settings:', error);
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
                console.error('Error resetting gamification:', error);
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
                handleToast(`"${name}" uploaded successfully.`, 'success');
                return { success: true, message: `Document "${name}" uploaded to the library.` };
            } catch (error) {
                console.error('Error uploading document:', error);
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
                console.error('Error updating document:', error);
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
                console.error('Error deleting document:', error);
                
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
                        crmItemId: contact.crmItemId,
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
                        crmItemId: contact.crmItemId,
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
                        crmItemId: contact.crmItemId,
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

        const calendarEvents: CalendarEvent[] = [
            ...allTasks.filter(t => t.dueDate).map(t => ({...t, type: 'task' as const, title: t.text})),
            ...data.marketing.filter(m => m.dueDate).map(m => ({...m, type: 'marketing' as const, tag: 'Marketing' })),
            ...allMeetings,
            ...crmNextActions,
        ];

        switch (activeTab) {
            case Tab.Dashboard:
                return <DashboardTab data={data} actions={actions} businessProfile={businessProfile} settings={data.settings} />;
            case Tab.Calendar:
                return <CalendarTab events={calendarEvents} actions={actions} />;
            case Tab.Platform:
                return <PlatformTab 
                    tasks={data.platformTasks} 
                    actions={actions} 
                    documents={data.documents} 
                    businessProfile={businessProfile} 
                    workspaceId={workspace?.id}
                    workspaceMembers={workspaceMembers}
                    onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                />;
            case Tab.Investors:
                return <CrmTab 
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
                />;
            case Tab.Customers:
                return <CrmTab 
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
                />;
            case Tab.Partners:
                return <CrmTab 
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
                />;
            case Tab.Marketing:
                return <MarketingTab 
                    items={data.marketing} 
                    tasks={data.marketingTasks} 
                    actions={actions} 
                    documents={data.documents} 
                    businessProfile={businessProfile}
                    workspaceId={workspace?.id}
                    workspaceMembers={workspaceMembers}
                    onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                />;
            case Tab.Financials:
                return <FinancialsTab 
                    items={data.financials} 
                    expenses={data.expenses} 
                    tasks={data.financialTasks} 
                    actions={actions} 
                    documents={data.documents} 
                    businessProfile={businessProfile}
                    workspaceId={workspace?.id}
                    workspaceMembers={workspaceMembers}
                    onUpgradeNeeded={() => setActiveTab(Tab.Settings)}
                />;
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
                                >
                                    Upgrade to Access File Library
                                </button>
                            </div>
                        </div>
                    );
                }
                return <FileLibraryTab documents={data.documents} actions={actions} companies={allCompanies} contacts={allContacts} />;
            case Tab.Achievements:
                return <AchievementsTab 
                    gamification={data.gamification} 
                    workspaceId={workspace?.id}
                    currentPlan={workspace?.planType || 'free'}
                    onUpgrade={() => setActiveTab(Tab.Settings)}
                />;
            case Tab.Settings:
                return <SettingsTab settings={data.settings} onUpdateSettings={actions.updateSettings} actions={actions} workspaceId={workspace?.id} />;
            case Tab.Admin:
                return isAdmin ? <AdminTab /> : <div className="p-8 text-center text-red-600 font-mono">Access Denied: Admin Only</div>;
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
                                    console.log('[DashboardApp] Creating profile first...');
                                    await DatabaseService.createProfile({
                                        id: user!.id,
                                        email: user!.email || '',
                                        created_at: new Date().toISOString()
                                    });
                                    
                                    // Then create workspace
                                    console.log('[DashboardApp] Creating workspace...');
                                    await DatabaseService.createWorkspace(user!.id, {
                                        name: 'My Workspace',
                                        plan_type: 'free'
                                    });
                                    
                                    await refreshWorkspace();
                                } catch (error) {
                                    console.error('Failed to create workspace:', error);
                                    alert('Failed to create workspace. Please refresh and try again.');
                                }
                            }}
                            className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                        >
                            Create My Workspace
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="w-full mt-4 text-gray-600 hover:text-gray-800 transition-colors"
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

            {/* Show dashboard only when workspace exists */}
            {!isLoadingWorkspace && workspace && (
                <>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
            />
            <div className="min-h-screen p-3 sm:p-4 md:p-8">
                <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">
                            FounderHQ <span className="text-gray-600 hidden sm:inline" style={{ fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>A Setique Tool</span>
                        </h1>
                        
                        {/* Workspace name display (no switching in single-workspace model) */}
                        {workspace && (
                            <div className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-black bg-gray-50 truncate max-w-[100px] sm:max-w-none">
                                {workspace.name}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-1 sm:gap-2 font-mono font-semibold" title={`Daily Streak: ${data.gamification.streak} days`}>
                            <span className="text-xl sm:text-2xl">{data.gamification.streak > 0 ? '🔥' : '🧊'}</span>
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
                                title="Sign out"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                {isLoading ? (
                     <div className="flex justify-center items-center h-64">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="ml-3 text-gray-500">Connecting to dashboard...</span>
                    </div>
                ) : (
                    <main>
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
                
                console.log('[DashboardApp] Business profile data:', { 
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
        </>
    );
};

export default DashboardApp;
