import React from 'react';

interface TasksEmptyStateProps {
    totalCount: number;
    onClearFilters: () => void;
}

export const TasksEmptyState: React.FC<TasksEmptyStateProps> = ({ 
    totalCount, 
    onClearFilters 
}) => {
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
                onClick={onClearFilters}
                className="px-4 py-2 rounded border border-gray-900 bg-black text-white text-sm font-semibold"
            >
                Reset filters
            </button>
        </div>
    );
};
