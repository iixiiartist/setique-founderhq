import React from 'react';

interface AccountFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filterByStatus: string;
    onFilterByStatusChange: (status: string) => void;
    filterByPriority: string;
    onFilterByPriorityChange: (priority: string) => void;
    filterByTag: string;
    onFilterByTagChange: (tag: string) => void;
    allStatuses: string[];
    allTags: string[];
    // Advanced filters
    showAdvancedFilters: boolean;
    onToggleAdvancedFilters: () => void;
    filterByContactCount: 'any' | 'none' | 'has';
    onFilterByContactCountChange: (filter: 'any' | 'none' | 'has') => void;
    filterByNoteCount: 'any' | 'none' | 'has';
    onFilterByNoteCountChange: (filter: 'any' | 'none' | 'has') => void;
    filterOverdue: boolean;
    onFilterOverdueChange: (overdue: boolean) => void;
    onClearAdvancedFilters: () => void;
    hasActiveAdvancedFilters: boolean;
}

export function AccountFilters({
    searchQuery,
    onSearchChange,
    filterByStatus,
    onFilterByStatusChange,
    filterByPriority,
    onFilterByPriorityChange,
    filterByTag,
    onFilterByTagChange,
    allStatuses,
    allTags,
    showAdvancedFilters,
    onToggleAdvancedFilters,
    filterByContactCount,
    onFilterByContactCountChange,
    filterByNoteCount,
    onFilterByNoteCountChange,
    filterOverdue,
    onFilterOverdueChange,
    onClearAdvancedFilters,
    hasActiveAdvancedFilters
}: AccountFiltersProps) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="account-search" className="sr-only">Search accounts</label>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            id="account-search"
                            name="account-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search accounts..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                    </div>
                </div>
                <label htmlFor="account-filter-status" className="sr-only">Filter by status</label>
                <select
                    id="account-filter-status"
                    name="account-filter-status"
                    value={filterByStatus}
                    onChange={(e) => onFilterByStatusChange(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                    <option value="">All Statuses</option>
                    {allStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <label htmlFor="account-filter-priority" className="sr-only">Filter by priority</label>
                <select
                    id="account-filter-priority"
                    name="account-filter-priority"
                    value={filterByPriority}
                    onChange={(e) => onFilterByPriorityChange(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                </select>
                {allTags.length > 0 && (
                    <>
                        <label htmlFor="account-filter-tag" className="sr-only">Filter by tag</label>
                        <select
                            id="account-filter-tag"
                            name="account-filter-tag"
                            value={filterByTag}
                            onChange={(e) => onFilterByTagChange(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                            <option value="">All Tags</option>
                            {allTags.map(tag => (
                                <option key={tag} value={tag}>
                                    🏷️ {tag}
                                </option>
                            ))}
                        </select>
                    </>
                )}
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onToggleAdvancedFilters}
                    className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
                >
                    <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    More filters
                </button>
                {hasActiveAdvancedFilters && (
                    <button
                        onClick={onClearAdvancedFilters}
                        className="text-sm text-gray-500 hover:text-red-600"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="filter-contact-count" className="block text-sm font-medium text-gray-700 mb-1">
                            Contacts
                        </label>
                        <select
                            id="filter-contact-count"
                            name="filter-contact-count"
                            value={filterByContactCount}
                            onChange={(e) => onFilterByContactCountChange(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                            <option value="any">Any</option>
                            <option value="has">Has Contacts</option>
                            <option value="none">No Contacts</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-note-count" className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <select
                            id="filter-note-count"
                            name="filter-note-count"
                            value={filterByNoteCount}
                            onChange={(e) => onFilterByNoteCountChange(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        >
                            <option value="any">Any</option>
                            <option value="has">Has Notes</option>
                            <option value="none">No Notes</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterOverdue}
                                onChange={(e) => onFilterOverdueChange(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                            />
                            <span className="text-sm text-gray-700">
                                Overdue only
                            </span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AccountFilters;
