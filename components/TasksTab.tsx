/**
 * Tasks Tab - Clean & Simple
 *
 * Single source of truth with dumb UI and smart filter logic.
 * Empty arrays mean "show all" - no auto-rechecking madness.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List, type RowComponentProps } from 'react-window';
import { Tab, type TabType } from '../constants';
import { Task, AppActions, TaskCollectionName, Priority, TaskStatus, AnyCrmItem, WorkspaceMember, CrmType } from '../types';
import { logger } from '../lib/logger';
import { TaskItem } from './tasks/TaskItem';
import { TaskCreationModal } from './tasks/TaskCreationModal';
import { TaskDetailPanel } from './tasks/TaskDetailPanel';

// Ensure these match your DB values exactly
type TaskCategory = TaskCollectionName;

const VIRTUALIZATION_THRESHOLD = 80;
const TASK_ROW_HEIGHT = 240;

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

const STATUS_COLUMNS: Array<{
    id: TaskStatus;
    title: string;
    description: string;
    accent: string;
    emptyMessage: string;
}> = [
    {
        id: 'Todo',
        title: 'Backlog',
        description: 'Ready to be picked up next',
        accent: 'bg-sky-100',
        emptyMessage: 'Nothing waiting – add a task or adjust filters.'
    },
    {
        id: 'InProgress',
        title: 'In Progress',
        description: 'Actively being worked right now',
        accent: 'bg-amber-100',
        emptyMessage: 'No active work. Reassign or pull from backlog.'
    },
    {
        id: 'Done',
        title: 'Completed',
        description: 'Recently delivered wins',
        accent: 'bg-emerald-100',
        emptyMessage: 'No recent completions yet.'
    }
];

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
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // 4. HANDLERS: FILTER TOGGLING - Pure toggle, no magic
    const toggleCategory = useCallback((category: TaskCategory) => {
        setSelectedCategories(prev => 
            prev.includes(category)
                ? prev.filter(c => c !== category) 
                : [...prev, category]
        );
    }, []);

    const toggleStatus = useCallback((status: TaskStatus) => {
        setSelectedStatuses(prev => 
            prev.includes(status) 
                ? prev.filter(s => s !== status) 
                : [...prev, status]
        );
    }, []);

    const togglePriority = useCallback((priority: Priority) => {
        setSelectedPriorities(prev => 
            prev.includes(priority) 
                ? prev.filter(p => p !== priority) 
                : [...prev, priority]
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

    // 5. THE PIPELINE: DERIVE FILTERED TASKS - "Empty = All" logic lives HERE
    const filteredTasks = useMemo(() => {
        let result = allTasks;

        // A. Category Filter - ONLY filter if user selected something
        if (selectedCategories.length > 0) {
            result = result.filter(task => selectedCategories.includes(task.category as TaskCategory));
        }

        // B. Status Filter - ONLY filter if user selected something
        if (selectedStatuses.length > 0) {
            result = result.filter(task => selectedStatuses.includes(task.status));
        }

        // C. Priority Filter
        if (selectedPriorities.length > 0) {
            result = result.filter(task => selectedPriorities.includes(task.priority));
        }

        // D. Other Toggles
        if (onlyMyTasks) {
            result = result.filter(task => task.assignedTo === userId);
        }
        if (highPriorityOnly) {
            result = result.filter(task => task.priority === 'High');
        }

        // E. Search
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
            if (!acc[task.status]) {
                acc[task.status] = [] as Task[];
            }
            acc[task.status].push(task);
            return acc;
        }, { Todo: [] as Task[], InProgress: [] as Task[], Done: [] as Task[] });
    }, [filteredTasks]);

    // 6. HANDLERS: TASK INTERACTION
    const handleTaskSelect = useCallback((taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    }, []);

    const handleTaskClick = useCallback((task: Task) => {
        logger.info('[TasksTab] Task clicked', { taskId: task.id, status: task.status });
        setActiveTask(task);
    }, [setActiveTask]);

    const handleCloseDetail = useCallback(() => {
        setActiveTask(null);
    }, [setActiveTask]);

    const handleOpenTaskModule = useCallback((task: Task) => {
        if (!onNavigateToTab) return;
        const targetTab = CATEGORY_TAB_TARGET[task.category as TaskCategory] || Tab.Accounts;
        onNavigateToTab(targetTab);
    }, [onNavigateToTab]);

    const handleLinkedEntityNavigate = useCallback((task: Task) => {
        if (!onNavigateToTab || !task.crmType) return;
        const targetTab = CRM_TAB_TARGET[task.crmType] || Tab.Accounts;
        onNavigateToTab(targetTab);
        setActiveTask(null);
    }, [onNavigateToTab]);

    const handleNavigateToEntity = useCallback((entityType: string) => {
        if (!onNavigateToTab) return;
        const targetTab = ENTITY_TAB_TARGET[entityType] || Tab.Accounts;
        onNavigateToTab(targetTab);
        setActiveTask(null);
    }, [onNavigateToTab]);

    const toggleBulkSelect = useCallback(() => {
        setBulkSelectMode(prev => {
            if (prev) {
                setSelectedTaskIds(new Set());
            }
            return !prev;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedTaskIds(new Set());
    }, []);

    const getLinkedEntityName = useCallback((task: Task): string | null => {
        if (task.crmItemId && data.crmItems) {
            const account = data.crmItems.find(item => item.id === task.crmItemId);
            return account?.company || null;
        }
        return null;
    }, [data.crmItems]);

    // Stats (based on ALL tasks, not filtered)
    const totalCount = allTasks.length;
    const todoCount = allTasks.filter(t => t.status === 'Todo').length;
    const inProgressCount = allTasks.filter(t => t.status === 'InProgress').length;
    const doneCount = allTasks.filter(t => t.status === 'Done').length;
    const selectionCount = selectedTaskIds.size;
    const hasResults = filteredTasks.length > 0;

    // 7. RENDER
    return (
        <>
        <div className="flex h-full bg-white">
            {/* SIDEBAR */}
            <aside className="w-64 border-r border-gray-200 p-4 flex flex-col gap-6 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="font-mono text-sm font-bold uppercase text-gray-500">Filters</h2>
                    <button 
                        onClick={clearAllFilters}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Clear all
                    </button>
                </div>

                {/* Module/Category */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-900">Module</h3>
                    <div className="space-y-1">
                        {[
                            { id: 'productsServicesTasks', label: 'Products & Services' },
                            { id: 'investorTasks', label: 'Investors' },
                            { id: 'customerTasks', label: 'Customers' },
                            { id: 'partnerTasks', label: 'Partners' },
                            { id: 'marketingTasks', label: 'Marketing' },
                            { id: 'financialTasks', label: 'Financials' }
                        ].map(category => (
                            <label key={category.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(category.id as TaskCategory)}
                                    onChange={() => toggleCategory(category.id as TaskCategory)}
                                />
                                {category.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-900">Status</h3>
                    <div className="space-y-1">
                        {[
                            { id: 'Todo', label: 'To Do' },
                            { id: 'InProgress', label: 'In Progress' },
                            { id: 'Done', label: 'Done' }
                        ].map(status => (
                            <label key={status.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(status.id as TaskStatus)}
                                    onChange={() => toggleStatus(status.id as TaskStatus)}
                                />
                                {status.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-900">Priority</h3>
                    <div className="space-y-1">
                        {[
                            { id: 'High', label: 'High' },
                            { id: 'Medium', label: 'Medium' },
                            { id: 'Low', label: 'Low' }
                        ].map(priority => (
                            <label key={priority.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPriorities.includes(priority.id as Priority)}
                                    onChange={() => togglePriority(priority.id as Priority)}
                                />
                                {priority.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={onlyMyTasks}
                            onChange={(e) => setOnlyMyTasks(e.target.checked)}
                        />
                        Assigned to me
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={highPriorityOnly}
                            onChange={(e) => setHighPriorityOnly(e.target.checked)}
                        />
                        High priority only
                    </label>
                </div>

                {/* Search */}
                <div className="pt-2">
                    <input 
                        type="text"
                        placeholder="Search tasks..."
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-gray-200 bg-gray-50/50">
                    <StatCard label="Total Tasks" value={totalCount} />
                    <StatCard label="Showing" value={filteredTasks.length} />
                    <StatCard label="To Do" value={todoCount} />
                    <StatCard label="Done" value={doneCount} />
                </div>

                <div className="border-b border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Working set</p>
                        <p className="text-xs text-gray-500">Filtered view out of {totalCount} total workspace tasks</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="text-xs font-semibold border px-3 py-1 rounded bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                        >
                            New task
                        </button>
                        <button
                            onClick={toggleBulkSelect}
                            className={`text-xs font-semibold border px-3 py-1 rounded ${bulkSelectMode ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-700 hover:border-gray-500'}`}
                        >
                            {bulkSelectMode ? 'Bulk select enabled' : 'Enable bulk select'}
                        </button>
                        <button
                            onClick={clearSelection}
                            disabled={selectionCount === 0}
                            className={`text-xs font-semibold border px-3 py-1 rounded ${selectionCount === 0 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:border-gray-500'}`}
                        >
                            Clear selection ({selectionCount})
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {hasResults ? (
                        <div className="h-full overflow-y-auto bg-gray-50">
                            <div className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3 auto-rows-min" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
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
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyState clearAllFilters={clearAllFilters} totalCount={totalCount} />
                    )}
                </div>
            </div>
        </div>

        {activeTask && (
            <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
                <div className="h-full w-full max-w-2xl bg-white shadow-2xl">
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
        </>
    );
}

export default TasksTab;

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col">
            <span className="text-xs font-mono uppercase text-gray-500">{label}</span>
            <span className="text-xl font-semibold text-gray-900">{value}</span>
        </div>
    );
}

interface TaskColumnProps {
    column: typeof STATUS_COLUMNS[number];
    tasks: Task[];
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
    onLinkedEntityNavigate: (task: Task) => void;
    onCategoryNavigate: (task: Task) => void;
}

function TaskColumn({
    column,
    tasks,
    selectedTaskIds,
    bulkSelectMode,
    onTaskSelect,
    onTaskClick,
    actions,
    getLinkedEntityName,
    onLinkedEntityNavigate,
    onCategoryNavigate
}: TaskColumnProps) {
    const hasTasks = tasks.length > 0;

    return (
        <section className="flex flex-col h-full border-2 border-black shadow-neo bg-white">
            <div className={`px-4 py-3 border-b-2 border-black ${column.accent}`}>
                <p className="text-xs font-mono uppercase text-gray-600 font-bold">{column.title}</p>
                <p className="text-sm text-black font-bold">{tasks.length} task{tasks.length === 1 ? '' : 's'}</p>
                <p className="text-xs text-gray-600">{column.description}</p>
            </div>
            <div className="flex-1 min-h-[200px]">
                {hasTasks ? (
                    <TaskColumnList
                        tasks={tasks}
                        selectedTaskIds={selectedTaskIds}
                        bulkSelectMode={bulkSelectMode}
                        onTaskSelect={onTaskSelect}
                        onTaskClick={onTaskClick}
                        actions={actions}
                        getLinkedEntityName={getLinkedEntityName}
                        onLinkedEntityNavigate={onLinkedEntityNavigate}
                        onCategoryNavigate={onCategoryNavigate}
                    />
                ) : (
                    <p className="text-xs text-gray-500 italic p-4">{column.emptyMessage}</p>
                )}
            </div>
        </section>
    );
}

interface TaskColumnListProps {
    tasks: Task[];
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
    onLinkedEntityNavigate: (task: Task) => void;
    onCategoryNavigate: (task: Task) => void;
}

function TaskColumnList(props: TaskColumnListProps) {
    if (props.tasks.length <= VIRTUALIZATION_THRESHOLD) {
        return <StaticTaskList {...props} />;
    }
    return <TaskColumnVirtualizedList {...props} />;
}

const StaticTaskList = ({
    tasks,
    selectedTaskIds,
    bulkSelectMode,
    onTaskSelect,
    onTaskClick,
    actions,
    getLinkedEntityName,
    onLinkedEntityNavigate,
    onCategoryNavigate
}: TaskColumnListProps) => (
    <div className="h-full overflow-y-auto p-4 space-y-3">
        {tasks.map(task => (
            <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskIds.has(task.id)}
                bulkSelectMode={bulkSelectMode}
                onSelect={() => onTaskSelect(task.id)}
                onClick={() => onTaskClick(task)}
                actions={actions}
                linkedEntityName={getLinkedEntityName(task)}
                onLinkedEntityNavigate={onLinkedEntityNavigate}
                onCategoryNavigate={onCategoryNavigate}
            />
        ))}
    </div>
);

type VirtualizedRowData = TaskColumnListProps;

function VirtualizedTaskRow({
    ariaAttributes,
    index,
    style,
    tasks,
    selectedTaskIds,
    bulkSelectMode,
    onTaskSelect,
    onTaskClick,
    actions,
    getLinkedEntityName,
    onLinkedEntityNavigate,
    onCategoryNavigate
}: RowComponentProps<VirtualizedRowData>) {
    const task = tasks[index];
    if (!task) {
        return null;
    }

    return (
        <div {...ariaAttributes} style={style}>
            <div className="px-4 py-2">
                <TaskItem
                    task={task}
                    isSelected={selectedTaskIds.has(task.id)}
                    bulkSelectMode={bulkSelectMode}
                    onSelect={() => onTaskSelect(task.id)}
                    onClick={() => onTaskClick(task)}
                    actions={actions}
                    linkedEntityName={getLinkedEntityName(task)}
                    onLinkedEntityNavigate={onLinkedEntityNavigate}
                    onCategoryNavigate={onCategoryNavigate}
                />
            </div>
        </div>
    );
}

function TaskColumnVirtualizedList(props: TaskColumnListProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const rowProps = useMemo<VirtualizedRowData>(() => ({
        tasks: props.tasks,
        selectedTaskIds: props.selectedTaskIds,
        bulkSelectMode: props.bulkSelectMode,
        onTaskSelect: props.onTaskSelect,
        onTaskClick: props.onTaskClick,
        actions: props.actions,
        getLinkedEntityName: props.getLinkedEntityName,
        onLinkedEntityNavigate: props.onLinkedEntityNavigate,
        onCategoryNavigate: props.onCategoryNavigate
    }), [
        props.tasks,
        props.selectedTaskIds,
        props.bulkSelectMode,
        props.onTaskSelect,
        props.onTaskClick,
        props.actions,
        props.getLinkedEntityName,
        props.onLinkedEntityNavigate,
        props.onCategoryNavigate
    ]);

    if (!isClient) {
        return <StaticTaskList {...props} />;
    }

    return (
        <div className="h-full">
            <AutoSizer>
                {({ height, width }) => {
                    if (!height || !width) {
                        logger.warn('[TasksTab] Virtualized column missing dimensions', { height, width });
                        return <StaticTaskList {...props} />;
                    }

                    return (
                        <List
                            style={{ height, width }}
                            rowCount={props.tasks.length}
                            rowHeight={TASK_ROW_HEIGHT}
                            rowComponent={VirtualizedTaskRow}
                            rowProps={rowProps}
                            overscanCount={10}
                        />
                    );
                }}
            </AutoSizer>
        </div>
    );
}

function EmptyState({ clearAllFilters, totalCount }: { clearAllFilters: () => void; totalCount: number }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-8 bg-white">
            <div>
                <p className="text-lg font-semibold text-gray-900">No tasks match the current filters</p>
                <p className="text-sm text-gray-500">
                    {totalCount === 0
                        ? 'This workspace does not have tasks yet. Create one to get started.'
                        : 'Try clearing filters or searching for a different keyword.'}
                </p>
            </div>
            <button
                onClick={clearAllFilters}
                className="px-4 py-2 rounded border border-gray-900 bg-black text-white text-sm font-semibold"
            >
                Reset filters
            </button>
        </div>
    );
}
