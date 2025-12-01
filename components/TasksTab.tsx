/**
 * Tasks Tab - Clean & Simple
 *
 * Single source of truth with dumb UI and smart filter logic.
 * Empty arrays mean "show all" - no auto-rechecking madness.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
    DndContext, 
    DragOverlay, 
    closestCorners, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Tab, type TabType } from '../constants';
import { Task, AppActions, TaskCollectionName, Priority, TaskStatus, AnyCrmItem, WorkspaceMember, CrmType } from '../types';
import { logger } from '../lib/logger';
import { useShareToHuddle } from '../hooks/useShareToHuddle';
import { ShareToHuddleModal } from './huddle/ShareToHuddleModal';

// Extracted components
import { 
    TasksFilterSidebar, 
    MobileFilterButton, 
    MobileFilterOverlay,
    TasksStatsBar,
    TasksActionBar,
    TaskColumn,
    STATUS_COLUMNS,
    TasksEmptyState,
    TaskItem,
    TaskDetailPanel,
    TaskCreationModal
} from './tasks';

type TaskCategory = TaskCollectionName;

const CATEGORY_TAB_TARGET: Record<TaskCategory, TabType> = {
    productsServicesTasks: Tab.ProductsServices,
    investorTasks: Tab.Investors,
    customerTasks: Tab.Customers,
    partnerTasks: Tab.Partners,
    marketingTasks: Tab.Marketing,
    financialTasks: Tab.Financials
};

const ENTITY_TAB_TARGET: Record<string, TabType> = {
    account: Tab.Accounts,
    product: Tab.ProductsServices,
    marketing: Tab.Marketing,
    financial: Tab.Financials
};

const CRM_TAB_TARGET: Record<CrmType, TabType> = {
    investor: Tab.Investors,
    customer: Tab.Customers,
    partner: Tab.Partners
};

interface TasksTabProps {
    data: {
        productsServicesTasks: Task[];
        investorTasks: Task[];
        customerTasks: Task[];
        partnerTasks: Task[];
        marketingTasks: Task[];
        financialTasks: Task[];
        crmItems?: AnyCrmItem[];
        productsServices?: any[];
        marketing?: any[];
        deals?: any[];
    };
    actions: AppActions;
    workspaceMembers: WorkspaceMember[];
    userId: string;
    workspaceId?: string;
    onNavigateToTab?: (tab: string) => void;
}

export function TasksTab({ data, actions, workspaceMembers, userId, onNavigateToTab }: TasksTabProps) {
    // Share to Huddle hook
    const { isOpen: isShareHuddleOpen, payload: shareHuddlePayload, shareTask, closeShareModal: closeShareHuddle } = useShareToHuddle();

    // 1. FLATTEN DATA IMMEDIATELY - Single source of truth
    const allTasks: Task[] = useMemo(() => {
        const tasks = [
            ...(data.productsServicesTasks || []),
            ...(data.investorTasks || []),
            ...(data.customerTasks || []),
            ...(data.partnerTasks || []),
            ...(data.marketingTasks || []),
            ...(data.financialTasks || [])
        ];
        logger.info('[TasksTab] Flattened tasks', { 
            count: tasks.length,
            breakdown: {
                productsServices: data.productsServicesTasks?.length || 0,
                investors: data.investorTasks?.length || 0,
                customers: data.customerTasks?.length || 0,
                partners: data.partnerTasks?.length || 0,
                marketing: data.marketingTasks?.length || 0,
                financials: data.financialTasks?.length || 0
            },
            sampleTasks: tasks.slice(0, 3).map(t => ({ id: t.id, text: t.text, category: t.category, status: t.status }))
        });
        return tasks;
    }, [data]);

    // 2. STATE: FILTERS (Simple Arrays) - Empty [] means "Show All"
    const [selectedCategories, setSelectedCategories] = useState<TaskCategory[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
    const [onlyMyTasks, setOnlyMyTasks] = useState(false);
    const [highPriorityOnly, setHighPriorityOnly] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 3. STATE: LIST SELECTION
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    
    // Derive activeTask from allTasks to ensure it stays in sync with updates
    const activeTask = useMemo(() => {
        if (!activeTaskId) return null;
        return allTasks.find(t => t.id === activeTaskId) || null;
    }, [activeTaskId, allTasks]);

    // DnD State
    const [activeId, setActiveId] = useState<string | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeTask = allTasks.find(t => t.id === active.id);
        if (!activeTask) return;

        let newStatus: TaskStatus | undefined;

        if (['Todo', 'InProgress', 'Done'].includes(over.id as string)) {
            newStatus = over.id as TaskStatus;
        } else {
            const overTask = allTasks.find(t => t.id === over.id);
            if (overTask) {
                newStatus = overTask.status;
            }
        }

        if (newStatus && newStatus !== activeTask.status) {
            actions.updateTask(activeTask.id, { status: newStatus });
        }
    }, [allTasks, actions]);

    // 4. HANDLERS: FILTER TOGGLING
    const toggleCategory = useCallback((category: TaskCategory) => {
        setSelectedCategories(prev => 
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    }, []);

    const toggleStatus = useCallback((status: TaskStatus) => {
        setSelectedStatuses(prev => 
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    }, []);

    const togglePriority = useCallback((priority: Priority) => {
        setSelectedPriorities(prev => 
            prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
        );
    }, []);

    const clearAllFilters = useCallback(() => {
        setSelectedCategories([]);
        setSelectedStatuses([]);
        setSelectedPriorities([]);
        setOnlyMyTasks(false);
        setHighPriorityOnly(false);
        setSearchTerm('');
    }, []);

    // 5. THE PIPELINE: DERIVE FILTERED TASKS
    const filteredTasks = useMemo(() => {
        let result = allTasks;

        if (selectedCategories.length > 0) {
            result = result.filter(task => selectedCategories.includes(task.category as TaskCategory));
        }
        if (selectedStatuses.length > 0) {
            result = result.filter(task => selectedStatuses.includes(task.status));
        }
        if (selectedPriorities.length > 0) {
            result = result.filter(task => selectedPriorities.includes(task.priority));
        }
        if (onlyMyTasks) {
            result = result.filter(task => task.assignedTo === userId);
        }
        if (highPriorityOnly) {
            result = result.filter(task => task.priority === 'High');
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(task => {
                const textMatch = (task.text || '').toLowerCase().includes(q);
                const description = ((task as { description?: string }).description || '').toLowerCase();
                return textMatch || description.includes(q);
            });
        }

        logger.info('[TasksTab] Filtered tasks', { 
            total: allTasks.length, 
            filtered: result.length,
            categories: selectedCategories,
            statuses: selectedStatuses
        });

        return result;
    }, [allTasks, selectedCategories, selectedStatuses, selectedPriorities, onlyMyTasks, highPriorityOnly, searchTerm, userId]);

    const groupedTasks = useMemo(() => {
        return filteredTasks.reduce<Record<TaskStatus, Task[]>>((acc, task) => {
            if (!acc[task.status]) acc[task.status] = [];
            acc[task.status].push(task);
            return acc;
        }, { Todo: [], InProgress: [], Done: [] });
    }, [filteredTasks]);

    // 6. HANDLERS: TASK INTERACTION
    const handleTaskSelect = useCallback((taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            next.has(taskId) ? next.delete(taskId) : next.add(taskId);
            return next;
        });
    }, []);

    const handleTaskClick = useCallback((task: Task) => {
        logger.info('[TasksTab] Task clicked', { taskId: task.id, status: task.status });
        setActiveTaskId(task.id);
    }, []);

    const handleCloseDetail = useCallback(() => setActiveTaskId(null), []);

    const handleOpenTaskModule = useCallback((task: Task) => {
        if (!onNavigateToTab) return;
        const targetTab = CATEGORY_TAB_TARGET[task.category as TaskCategory] || Tab.Accounts;
        onNavigateToTab(targetTab);
    }, [onNavigateToTab]);

    const handleLinkedEntityNavigate = useCallback((task: Task) => {
        if (!onNavigateToTab || !task.crmType) return;
        const targetTab = CRM_TAB_TARGET[task.crmType] || Tab.Accounts;
        onNavigateToTab(targetTab);
        setActiveTaskId(null);
    }, [onNavigateToTab]);

    const handleNavigateToEntity = useCallback((entityType: string) => {
        if (!onNavigateToTab) return;
        const targetTab = ENTITY_TAB_TARGET[entityType] || Tab.Accounts;
        onNavigateToTab(targetTab);
        setActiveTaskId(null);
    }, [onNavigateToTab]);

    const toggleBulkSelect = useCallback(() => {
        setBulkSelectMode(prev => {
            if (prev) setSelectedTaskIds(new Set());
            return !prev;
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedTaskIds(new Set()), []);

    const getLinkedEntityName = useCallback((task: Task): string | null => {
        if (task.crmItemId && data.crmItems) {
            const account = data.crmItems.find(item => item.id === task.crmItemId);
            return account?.company || null;
        }
        return null;
    }, [data.crmItems]);

    // Stats
    const totalCount = allTasks.length;
    const todoCount = allTasks.filter(t => t.status === 'Todo').length;
    const doneCount = allTasks.filter(t => t.status === 'Done').length;
    const selectionCount = selectedTaskIds.size;
    const hasResults = filteredTasks.length > 0;

    // Filter props shared between desktop and mobile
    const filterProps = {
        selectedCategories,
        selectedStatuses,
        selectedPriorities,
        onlyMyTasks,
        highPriorityOnly,
        searchTerm,
        onToggleCategory: toggleCategory,
        onToggleStatus: toggleStatus,
        onTogglePriority: togglePriority,
        onOnlyMyTasksChange: setOnlyMyTasks,
        onHighPriorityOnlyChange: setHighPriorityOnly,
        onSearchTermChange: setSearchTerm,
        onClearAllFilters: clearAllFilters
    };

    return (
        <>
        <div className="flex h-full bg-white relative">
            <MobileFilterButton onClick={() => setShowMobileFilters(true)} />
            
            <MobileFilterOverlay
                isOpen={showMobileFilters}
                onClose={() => setShowMobileFilters(false)}
                {...filterProps}
            />

            <TasksFilterSidebar {...filterProps} />

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <TasksStatsBar
                    totalCount={totalCount}
                    filteredCount={filteredTasks.length}
                    todoCount={todoCount}
                    doneCount={doneCount}
                />

                <TasksActionBar
                    totalCount={totalCount}
                    selectionCount={selectionCount}
                    bulkSelectMode={bulkSelectMode}
                    onCreateTask={() => setIsCreateModalOpen(true)}
                    onToggleBulkSelect={toggleBulkSelect}
                    onClearSelection={clearSelection}
                />

                <div className="flex-1 overflow-hidden">
                    {hasResults ? (
                        <DndContext 
                            sensors={sensors} 
                            collisionDetection={closestCorners} 
                            onDragStart={handleDragStart} 
                            onDragEnd={handleDragEnd}
                        >
                            <div className="h-full overflow-y-auto bg-gray-50 pb-20 md:pb-4">
                                <div className="grid gap-3 sm:gap-4 p-3 sm:p-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-min" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
                                    {STATUS_COLUMNS.map(column => (
                                        <TaskColumn
                                            key={column.id}
                                            column={column}
                                            tasks={groupedTasks[column.id] || []}
                                            selectedTaskIds={selectedTaskIds}
                                            bulkSelectMode={bulkSelectMode}
                                            onTaskSelect={handleTaskSelect}
                                            onTaskClick={handleTaskClick}
                                            actions={actions}
                                            getLinkedEntityName={getLinkedEntityName}
                                            onLinkedEntityNavigate={handleLinkedEntityNavigate}
                                            onCategoryNavigate={handleOpenTaskModule}
                                            onShareToHuddle={shareTask}
                                        />
                                    ))}
                                </div>
                            </div>
                            <DragOverlay>
                                {activeId ? (
                                    <div className="opacity-80 rotate-2 scale-105 cursor-grabbing">
                                        <TaskItem
                                            task={allTasks.find(t => t.id === activeId)!}
                                            isSelected={false}
                                            bulkSelectMode={false}
                                            onSelect={() => {}}
                                            onClick={() => {}}
                                            actions={actions}
                                            linkedEntityName={getLinkedEntityName(allTasks.find(t => t.id === activeId)!)}
                                        />
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    ) : (
                        <TasksEmptyState totalCount={totalCount} onClearFilters={clearAllFilters} />
                    )}
                </div>
            </div>
        </div>

        {activeTask && (
            <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
                <div className="h-full w-full md:max-w-2xl bg-white shadow-xl md:shadow-2xl">
                    <TaskDetailPanel
                        task={activeTask}
                        actions={actions}
                        onClose={handleCloseDetail}
                        onNavigateToEntity={handleNavigateToEntity}
                        workspaceMembers={workspaceMembers}
                        linkedEntityName={getLinkedEntityName(activeTask)}
                    />
                </div>
            </div>
        )}

        {isCreateModalOpen && (
            <TaskCreationModal
                onClose={() => setIsCreateModalOpen(false)}
                actions={actions}
                workspaceMembers={workspaceMembers}
                crmItems={data.crmItems || []}
            />
        )}

        <ShareToHuddleModal
            isOpen={isShareHuddleOpen}
            onClose={closeShareHuddle}
            payload={shareHuddlePayload}
        />
        </>
    );
}

export default TasksTab;
