/**
 * Tasks Tab - Clean & Simple
 * 
 * Single source of truth with dumb UI and smart filter logic.
 * Empty arrays mean "show all" - no auto-rechecking madness.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Task, AppActions, TaskCollectionName, Priority, TaskStatus, AnyCrmItem, WorkspaceMember } from '../types';
import { VirtualizedTaskList } from './tasks/VirtualizedTaskList';
import { logger } from '../lib/logger';

// Ensure these match your DB values exactly
type TaskCategory = TaskCollectionName;

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
    workspaceId: string;
    onNavigateToTab: (tab: string) => void;
}

export function TasksTab({
    data,
    actions,
    workspaceMembers,
    userId,
}: TasksTabProps) {

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
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [bulkSelectMode, setBulkSelectMode] = useState(false);

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
            result = result.filter(task => 
                (task.text || '').toLowerCase().includes(q) || 
                (task.description || '').toLowerCase().includes(q)
            );
        }

        logger.info('[TasksTab] Filtered tasks', { 
            total: allTasks.length, 
            filtered: result.length,
            categories: selectedCategories,
            statuses: selectedStatuses
        });

        return result;
    }, [allTasks, selectedCategories, selectedStatuses, selectedPriorities, onlyMyTasks, highPriorityOnly, searchTerm, userId]);

    // 6. HANDLERS: TASK INTERACTION
    const handleTaskSelect = useCallback((taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    }, []);

    const handleTaskClick = useCallback((task: Task) => {
        actions.tasks.openTaskDetails(task);
    }, [actions]);

    // Get linked entity name
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

    // 7. RENDER
    return (
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
                            { id: 'financialTasks', label: 'Financials' },
                        ].map(option => (
                            <label key={option.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                    checked={selectedCategories.includes(option.id as TaskCategory)}
                                    onChange={() => toggleCategory(option.id as TaskCategory)}
                                />
                                {option.label}
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
                            { id: 'Done', label: 'Done' },
                        ].map(option => (
                            <label key={option.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                    checked={selectedStatuses.includes(option.id as TaskStatus)}
                                    onChange={() => toggleStatus(option.id as TaskStatus)}
                                />
                                {option.label}
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
                            { id: 'Low', label: 'Low' },
                        ].map(option => (
                            <label key={option.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-black focus:ring-black"
                                    checked={selectedPriorities.includes(option.id as Priority)}
                                    onChange={() => togglePriority(option.id as Priority)}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Toggles */}
                <div className="space-y-1 pt-2 border-t">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={onlyMyTasks}
                            onChange={(e) => setOnlyMyTasks(e.target.checked)}
                        />
                        My tasks only
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
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 bg-gray-50/50">
                   <StatCard label="Total Tasks" value={totalCount} />
                   <StatCard label="Showing" value={filteredTasks.length} />
                   <StatCard label="To Do" value={todoCount} />
                   <StatCard label="Done" value={doneCount} />
                </div>

                {/* Virtualized List */}
                <div className="flex-1 min-h-0 relative" style={{ minHeight: '400px' }}>
                    <VirtualizedTaskList
                        tasks={filteredTasks}
                        selectedTaskIds={selectedTaskIds}
                        bulkSelectMode={bulkSelectMode}
                        onTaskSelect={handleTaskSelect}
                        onTaskClick={handleTaskClick}
                        actions={actions}
                        getLinkedEntityName={getLinkedEntityName}
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex flex-col">
            <span className="text-xs font-mono uppercase text-gray-500">{label}</span>
            <span className="text-xl font-semibold text-gray-900">{value}</span>
        </div>
    );
}

export default TasksTab;
