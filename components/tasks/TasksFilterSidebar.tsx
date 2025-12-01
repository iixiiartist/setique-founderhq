import React from 'react';
import { Filter, X } from 'lucide-react';
import { TaskCollectionName, Priority, TaskStatus } from '../../types';

type TaskCategory = TaskCollectionName;

const CATEGORY_OPTIONS = [
    { id: 'productsServicesTasks', label: 'Products & Services' },
    { id: 'investorTasks', label: 'Investors' },
    { id: 'customerTasks', label: 'Customers' },
    { id: 'partnerTasks', label: 'Partners' },
    { id: 'marketingTasks', label: 'Marketing' },
    { id: 'financialTasks', label: 'Financials' }
];

const STATUS_OPTIONS = [
    { id: 'Todo', label: 'To Do' },
    { id: 'InProgress', label: 'In Progress' },
    { id: 'Done', label: 'Done' }
];

const PRIORITY_OPTIONS = [
    { id: 'High', label: 'High' },
    { id: 'Medium', label: 'Medium' },
    { id: 'Low', label: 'Low' }
];

interface FilterContentProps {
    selectedCategories: TaskCategory[];
    selectedStatuses: TaskStatus[];
    selectedPriorities: Priority[];
    onlyMyTasks: boolean;
    highPriorityOnly: boolean;
    searchTerm: string;
    onToggleCategory: (category: TaskCategory) => void;
    onToggleStatus: (status: TaskStatus) => void;
    onTogglePriority: (priority: Priority) => void;
    onOnlyMyTasksChange: (checked: boolean) => void;
    onHighPriorityOnlyChange: (checked: boolean) => void;
    onSearchTermChange: (term: string) => void;
    isMobile?: boolean;
}

const FilterContent: React.FC<FilterContentProps> = ({
    selectedCategories,
    selectedStatuses,
    selectedPriorities,
    onlyMyTasks,
    highPriorityOnly,
    searchTerm,
    onToggleCategory,
    onToggleStatus,
    onTogglePriority,
    onOnlyMyTasksChange,
    onHighPriorityOnlyChange,
    onSearchTermChange,
    isMobile = false
}) => {
    const checkboxSize = isMobile ? 'w-5 h-5' : 'w-4 h-4';
    const itemPadding = isMobile ? 'p-2 min-h-[44px]' : 'p-1.5';

    return (
        <>
            {/* Module/Category */}
            <div className="space-y-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase border-b border-gray-200 pb-1">Module</h3>
                <div className="space-y-1">
                    {CATEGORY_OPTIONS.map(category => (
                        <label key={category.id} className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${itemPadding}`}>
                            <input
                                type="checkbox"
                                checked={selectedCategories.includes(category.id as TaskCategory)}
                                onChange={() => onToggleCategory(category.id as TaskCategory)}
                                className={`${checkboxSize} rounded border-gray-300 text-black focus:ring-black`}
                            />
                            {category.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase border-b border-gray-200 pb-1">Status</h3>
                <div className="space-y-1">
                    {STATUS_OPTIONS.map(status => (
                        <label key={status.id} className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${itemPadding}`}>
                            <input
                                type="checkbox"
                                checked={selectedStatuses.includes(status.id as TaskStatus)}
                                onChange={() => onToggleStatus(status.id as TaskStatus)}
                                className={`${checkboxSize} rounded border-gray-300 text-black focus:ring-black`}
                            />
                            {status.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase border-b border-gray-200 pb-1">Priority</h3>
                <div className="space-y-1">
                    {PRIORITY_OPTIONS.map(priority => (
                        <label key={priority.id} className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${itemPadding}`}>
                            <input
                                type="checkbox"
                                checked={selectedPriorities.includes(priority.id as Priority)}
                                onChange={() => onTogglePriority(priority.id as Priority)}
                                className={`${checkboxSize} rounded border-gray-300 text-black focus:ring-black`}
                            />
                            {priority.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
                <label className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${itemPadding}`}>
                    <input
                        type="checkbox"
                        checked={onlyMyTasks}
                        onChange={(e) => onOnlyMyTasksChange(e.target.checked)}
                        className={`${checkboxSize} rounded border-gray-300 text-black focus:ring-black`}
                    />
                    Assigned to me
                </label>
                <label className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${itemPadding}`}>
                    <input
                        type="checkbox"
                        checked={highPriorityOnly}
                        onChange={(e) => onHighPriorityOnlyChange(e.target.checked)}
                        className={`${checkboxSize} rounded border-gray-300 text-black focus:ring-black`}
                    />
                    High priority only
                </label>
            </div>

            {/* Search */}
            <div className="pt-2">
                <input 
                    type="text"
                    placeholder="Search tasks..."
                    className={`w-full text-sm border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white ${isMobile ? 'py-2.5' : 'py-2'}`}
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                />
            </div>
        </>
    );
};

interface TasksFilterSidebarProps extends FilterContentProps {
    onClearAllFilters: () => void;
}

export const TasksFilterSidebar: React.FC<TasksFilterSidebarProps> = ({
    onClearAllFilters,
    ...filterProps
}) => {
    return (
        <aside className="hidden md:flex w-64 border-r border-gray-200 p-4 flex-col gap-6 overflow-y-auto bg-gray-50/50">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-900">Filters</h2>
                <button 
                    onClick={onClearAllFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                    Clear all
                </button>
            </div>
            <FilterContent {...filterProps} isMobile={false} />
        </aside>
    );
};

interface MobileFilterButtonProps {
    onClick: () => void;
}

export const MobileFilterButton: React.FC<MobileFilterButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="md:hidden fixed bottom-4 right-4 z-30 p-3 bg-black text-white rounded-full shadow-lg min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Open filters"
        >
            <Filter size={20} />
        </button>
    );
};

interface MobileFilterOverlayProps extends FilterContentProps {
    isOpen: boolean;
    onClose: () => void;
    onClearAllFilters: () => void;
}

export const MobileFilterOverlay: React.FC<MobileFilterOverlayProps> = ({
    isOpen,
    onClose,
    onClearAllFilters,
    ...filterProps
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <aside className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white shadow-xl flex flex-col animate-slideInLeft overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Filters</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <FilterContent {...filterProps} isMobile={true} />
                </div>
                <div className="p-4 border-t border-gray-200 space-y-2">
                    <button 
                        onClick={() => { onClearAllFilters(); onClose(); }}
                        className="w-full py-2.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
                    >
                        Clear all filters
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-2.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 min-h-[44px]"
                    >
                        Apply filters
                    </button>
                </div>
            </aside>
        </div>
    );
};
