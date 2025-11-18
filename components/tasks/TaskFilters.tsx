/**
 * Task Filters Component
 * Rebuilt sidebar with modern UX patterns and bulletproof state handling.
 */

import React, { useMemo } from 'react';
import { TaskCollectionName, Priority, TaskStatus, WorkspaceMember } from '../../types';

const MODULE_OPTIONS: Array<{ value: TaskCollectionName; label: string; icon: string }> = [
    { value: 'productsServicesTasks', label: 'Products & Services', icon: '📦' },
    { value: 'investorTasks', label: 'Investors', icon: '💰' },
    { value: 'customerTasks', label: 'Customers', icon: '🎯' },
    { value: 'partnerTasks', label: 'Partners', icon: '🤝' },
    { value: 'marketingTasks', label: 'Marketing', icon: '📢' },
    { value: 'financialTasks', label: 'Financials', icon: '💵' },
];

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string; color: string; statKey: keyof TaskFiltersProps['stats'] }> = [
    { value: 'Todo', label: 'To Do', color: 'text-blue-600', statKey: 'todo' },
    { value: 'InProgress', label: 'In Progress', color: 'text-yellow-600', statKey: 'inProgress' },
    { value: 'Done', label: 'Done', color: 'text-green-600', statKey: 'done' },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
];

const ALL_CATEGORY_VALUES = MODULE_OPTIONS.map(option => option.value);
const ALL_STATUS_VALUES = STATUS_OPTIONS.map(option => option.value);
const ALL_PRIORITY_VALUES = PRIORITY_OPTIONS.map(option => option.value);

export interface TaskFiltersState {
    categories: TaskCollectionName[];
    statuses: TaskStatus[];
    priorities: Priority[];
    assignedTo: 'all' | 'me' | 'team' | 'unassigned' | string;
    dateFilter: 'all' | 'today' | 'week' | 'overdue' | 'no-date';
    search: string;
    sortBy: 'dueDate' | 'priority' | 'createdAt' | 'status' | 'assignee';
    sortOrder: 'asc' | 'desc';
}

interface TaskFiltersProps {
    filters: TaskFiltersState;
    onFilterChange: (filters: Partial<TaskFiltersState>) => void;
    workspaceMembers: WorkspaceMember[];
    userId: string;
    stats: {
        total: number;
        todo: number;
        inProgress: number;
        done: number;
        overdue: number;
        myTasks: number;
        high: number;
    };
}

interface FilterChipProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

interface ActiveFilterChipProps {
    label: string;
    onRemove: () => void;
}

const FilterChip = ({ label, isActive, onClick }: FilterChipProps) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1 text-xs font-semibold border-2 border-black font-mono transition-colors ${
            isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
        }`}
    >
        {label}
    </button>
);

const ActiveFilterChip = ({ label, onRemove }: ActiveFilterChipProps) => (
    <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1 px-2 py-1 text-xs font-semibold border border-black font-mono text-black hover:bg-gray-100"
    >
        {label}
        <span aria-hidden="true">✕</span>
    </button>
);

export function TaskFilters({ filters, onFilterChange, workspaceMembers, userId, stats }: TaskFiltersProps) {
    const toggleCategory = (category: TaskCollectionName) => {
        const categories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        onFilterChange({ categories });
    };

    const toggleStatus = (status: TaskStatus) => {
        const statuses = filters.statuses.includes(status)
            ? filters.statuses.filter(s => s !== status)
            : [...filters.statuses, status];
        onFilterChange({ statuses });
    };

    const togglePriority = (priority: Priority) => {
        const priorities = filters.priorities.includes(priority)
            ? filters.priorities.filter(p => p !== priority)
            : [...filters.priorities, priority];
        onFilterChange({ priorities });
    };

    const activeFilters = useMemo(() => {
        const chips: ActiveFilterChipProps[] = [];

        if (filters.categories.length > 0 && filters.categories.length < ALL_CATEGORY_VALUES.length) {
            filters.categories.forEach(category => {
                const label = MODULE_OPTIONS.find(option => option.value === category)?.label || category;
                chips.push({
                    label,
                    onRemove: () => onFilterChange({ categories: filters.categories.filter(c => c !== category) })
                });
            });
        }

        if (filters.statuses.length > 0 && filters.statuses.length < ALL_STATUS_VALUES.length) {
            filters.statuses.forEach(status => {
                const label = STATUS_OPTIONS.find(option => option.value === status)?.label || status;
                chips.push({
                    label,
                    onRemove: () => onFilterChange({ statuses: filters.statuses.filter(s => s !== status) })
                });
            });
        }

        filters.priorities.forEach(priority => {
            const label = PRIORITY_OPTIONS.find(option => option.value === priority)?.label || priority;
            chips.push({
                label: `Priority: ${label}`,
                onRemove: () => onFilterChange({ priorities: filters.priorities.filter(p => p !== priority) })
            });
        });

        if (filters.assignedTo !== 'all') {
            const assignmentLabel =
                filters.assignedTo === 'me'
                    ? 'Assigned: Me'
                    : filters.assignedTo === 'team'
                        ? 'Assigned: Team'
                        : filters.assignedTo === 'unassigned'
                            ? 'Assigned: Unassigned'
                            : 'Assigned: Specific user';
            chips.push({
                label: assignmentLabel,
                onRemove: () => onFilterChange({ assignedTo: 'all' })
            });
        }

        if (filters.dateFilter !== 'all') {
            const dateLabelMap: Record<TaskFiltersState['dateFilter'], string> = {
                all: 'All dates',
                today: 'Due Today',
                week: 'This Week',
                overdue: 'Overdue',
                'no-date': 'No Due Date'
            };
            chips.push({
                label: dateLabelMap[filters.dateFilter],
                onRemove: () => onFilterChange({ dateFilter: 'all' })
            });
        }

        if (filters.search.trim()) {
            chips.push({
                label: `Search: “${filters.search.trim()}”`,
                onRemove: () => onFilterChange({ search: '' })
            });
        }

        return chips;
    }, [filters, onFilterChange]);

    const handleClearAll = () => {
        onFilterChange({
            categories: ALL_CATEGORY_VALUES,
            statuses: ALL_STATUS_VALUES,
            priorities: [],
            assignedTo: 'all',
            dateFilter: 'all',
            search: ''
        });
    };

    return (
        <div className="flex flex-col h-full bg-white border-r-2 border-black">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <label
                        htmlFor="tasks-search-input"
                        className="font-mono font-bold text-xs uppercase tracking-wide text-gray-600 mb-2 block"
                    >
                        Search Tasks
                    </label>
                    <input
                        id="tasks-search-input"
                        name="tasks-search"
                        type="text"
                        placeholder="Title, assignee, linked entity..."
                        value={filters.search}
                        onChange={(e) => onFilterChange({ search: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {activeFilters.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs font-bold text-gray-600 uppercase tracking-wide">
                                Active Filters ({activeFilters.length})
                            </span>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="text-xs font-semibold font-mono underline text-gray-700 hover:text-black"
                            >
                                Clear all
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {activeFilters.map((filter, index) => (
                                <ActiveFilterChip key={`${filter.label}-${index}`} label={filter.label} onRemove={filter.onRemove} />
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-mono font-bold text-sm text-gray-800 flex items-center gap-2">
                            📦 Modules
                            <span className="text-xs text-gray-500">{filters.categories.length}/{ALL_CATEGORY_VALUES.length}</span>
                        </h3>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => onFilterChange({ categories: ALL_CATEGORY_VALUES })}
                                className="text-[11px] font-semibold text-gray-600 hover:text-black"
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                onClick={() => onFilterChange({ categories: [] })}
                                className="text-[11px] font-semibold text-gray-600 hover:text-black"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {MODULE_OPTIONS.map(({ value, label, icon }) => (
                            <label key={value} className="flex items-center justify-between gap-3 cursor-pointer border border-gray-200 px-3 py-2 hover:bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={filters.categories.includes(value)}
                                        onChange={() => toggleCategory(value)}
                                        className="w-4 h-4 accent-blue-500"
                                    />
                                    <span className="font-mono text-sm">{icon} {label}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-mono font-bold text-sm text-gray-800">📊 Status</h3>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => onFilterChange({ statuses: ALL_STATUS_VALUES })}
                                className="text-[11px] font-semibold text-gray-600 hover:text-black"
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                onClick={() => onFilterChange({ statuses: [] })}
                                className="text-[11px] font-semibold text-gray-600 hover:text-black"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(({ value, label, color, statKey }) => (
                            <FilterChip
                                key={value}
                                label={`${label} (${stats[statKey] ?? 0})`}
                                isActive={filters.statuses.includes(value)}
                                onClick={() => toggleStatus(value)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-mono font-bold text-sm text-gray-800">🎯 Priority</h3>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => onFilterChange({ priorities: ALL_PRIORITY_VALUES })}
                                className="text-[11px] font-semibold text-gray-600 hover:text-black"
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                onClick={() => onFilterChange({ priorities: [] })}
                                className="text-[11px] font-semibold text-gray-600 hover:text-black"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PRIORITY_OPTIONS.map(({ value, label }) => (
                            <FilterChip
                                key={value}
                                label={label}
                                isActive={filters.priorities.includes(value)}
                                onClick={() => togglePriority(value)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-mono font-bold text-sm text-gray-800 mb-2">👤 Assignment</h3>
                    <div className="space-y-2">
                        {[
                            { value: 'all', label: 'All Tasks' },
                            { value: 'me', label: `My Tasks (${stats.myTasks})` },
                            { value: 'team', label: 'Team Tasks' },
                            { value: 'unassigned', label: 'Unassigned' },
                        ].map(option => (
                            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    className="w-4 h-4 accent-blue-500"
                                    checked={filters.assignedTo === option.value}
                                    onChange={() => onFilterChange({ assignedTo: option.value as TaskFiltersState['assignedTo'] })}
                                />
                                <span className="font-mono text-sm">{option.label}</span>
                            </label>
                        ))}
                        {workspaceMembers.length > 0 && (
                            <select
                                value={['all', 'me', 'team', 'unassigned'].includes(filters.assignedTo) ? '' : filters.assignedTo}
                                onChange={(e) => onFilterChange({ assignedTo: e.target.value || 'all' })}
                                className="w-full px-3 py-2 border border-gray-300 font-mono text-sm"
                            >
                                <option value="">Specific teammate…</option>
                                {workspaceMembers.map(member => (
                                    <option key={member.userId} value={member.userId}>
                                        {member.fullName || member.email || 'Member'}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="font-mono font-bold text-sm text-gray-800 mb-2">📅 Due Date</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: 'all', label: 'All dates' },
                            { value: 'today', label: 'Due today' },
                            { value: 'week', label: 'This week' },
                            { value: 'overdue', label: `Overdue (${stats.overdue})` },
                            { value: 'no-date', label: 'No due date' }
                        ].map(option => (
                            <FilterChip
                                key={option.value}
                                label={option.label}
                                isActive={filters.dateFilter === option.value}
                                onClick={() => onFilterChange({ dateFilter: option.value as TaskFiltersState['dateFilter'] })}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-mono font-bold text-sm text-gray-800 mb-2">🔧 Sort</h3>
                    <select
                        value={filters.sortBy}
                        onChange={(e) => onFilterChange({ sortBy: e.target.value as TaskFiltersState['sortBy'] })}
                        className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    >
                        <option value="dueDate">Due date</option>
                        <option value="priority">Priority</option>
                        <option value="createdAt">Created date</option>
                        <option value="status">Status</option>
                        <option value="assignee">Assignee</option>
                    </select>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onFilterChange({ sortOrder: 'asc' })}
                            className={`flex-1 px-3 py-1 border-2 border-black font-mono text-xs font-semibold ${
                                filters.sortOrder === 'asc' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                            }`}
                        >
                            ↑ Asc
                        </button>
                        <button
                            type="button"
                            onClick={() => onFilterChange({ sortOrder: 'desc' })}
                            className={`flex-1 px-3 py-1 border-2 border-black font-mono text-xs font-semibold ${
                                filters.sortOrder === 'desc' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                            }`}
                        >
                            ↓ Desc
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t-2 border-black">
                <button
                    type="button"
                    onClick={handleClearAll}
                    className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm font-semibold bg-white text-black hover:bg-gray-100"
                >
                    Reset Filters
                </button>
            </div>
        </div>
    );
}
