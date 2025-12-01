import React from 'react';

interface StatCardProps {
    label: string;
    value: number;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value }) => {
    return (
        <div className="flex flex-col">
            <span className="text-xs font-mono uppercase text-gray-500">{label}</span>
            <span className="text-xl font-semibold text-gray-900">{value}</span>
        </div>
    );
};

interface TasksStatsBarProps {
    totalCount: number;
    filteredCount: number;
    todoCount: number;
    doneCount: number;
}

export const TasksStatsBar: React.FC<TasksStatsBarProps> = ({
    totalCount,
    filteredCount,
    todoCount,
    doneCount
}) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 border-b border-gray-200 bg-white">
            <StatCard label="Total Tasks" value={totalCount} />
            <StatCard label="Showing" value={filteredCount} />
            <StatCard label="To Do" value={todoCount} />
            <StatCard label="Done" value={doneCount} />
        </div>
    );
};

interface TasksActionBarProps {
    totalCount: number;
    selectionCount: number;
    bulkSelectMode: boolean;
    onCreateTask: () => void;
    onToggleBulkSelect: () => void;
    onClearSelection: () => void;
}

export const TasksActionBar: React.FC<TasksActionBarProps> = ({
    totalCount,
    selectionCount,
    bulkSelectMode,
    onCreateTask,
    onToggleBulkSelect,
    onClearSelection
}) => {
    return (
        <div className="border-b border-gray-200 bg-white px-3 sm:px-4 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">Working set</p>
                <p className="text-xs text-gray-500">Filtered view out of {totalCount} total workspace tasks</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button
                    onClick={onCreateTask}
                    data-testid="open-task-modal-button"
                    className="flex-1 sm:flex-none text-sm font-medium px-3 sm:px-4 py-2 bg-black text-white rounded-md shadow-sm hover:bg-gray-800 transition-colors min-h-[44px]"
                >
                    + New task
                </button>
                <button
                    onClick={onToggleBulkSelect}
                    className={`hidden sm:block text-sm font-medium px-4 py-2 rounded-md border shadow-sm transition-colors min-h-[44px] ${bulkSelectMode ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    {bulkSelectMode ? 'Bulk select enabled' : 'Enable bulk select'}
                </button>
                <button
                    onClick={onClearSelection}
                    disabled={selectionCount === 0}
                    className={`hidden sm:block text-sm font-medium px-4 py-2 rounded-md border shadow-sm transition-colors min-h-[44px] ${selectionCount === 0 ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    Clear selection ({selectionCount})
                </button>
            </div>
        </div>
    );
};
