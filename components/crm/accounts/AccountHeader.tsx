import React from 'react';

interface AccountHeaderProps {
    crmTypeLabel: string;
    filteredCount: number;
    totalCount: number;
    onExport: () => void;
    onDetectDuplicates: () => void;
    onToggleBulkSelect: () => void;
    onAddAccount: () => void;
    bulkSelectMode: boolean;
    canExport: boolean;
    canDetectDuplicates: boolean;
}

export function AccountHeader({
    crmTypeLabel,
    filteredCount,
    totalCount,
    onExport,
    onDetectDuplicates,
    onToggleBulkSelect,
    onAddAccount,
    bulkSelectMode,
    canExport,
    canDetectDuplicates
}: AccountHeaderProps) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">
                    {crmTypeLabel}s
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        ({filteredCount}{filteredCount !== totalCount ? ` of ${totalCount}` : ''})
                    </span>
                </h3>
            </div>
            <div className="flex items-center gap-2">
                {/* Secondary actions - more subtle */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onExport}
                        disabled={!canExport}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Export to CSV"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                    <button
                        onClick={onDetectDuplicates}
                        disabled={!canDetectDuplicates}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Find Duplicates"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button
                        onClick={onToggleBulkSelect}
                        className={`p-2 rounded-md transition-colors ${
                            bulkSelectMode
                                ? 'text-black bg-gray-200'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        title={bulkSelectMode ? 'Exit Bulk Select' : 'Bulk Select'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </button>
                </div>
                {/* Primary action */}
                <button
                    onClick={onAddAccount}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add {crmTypeLabel}
                </button>
            </div>
        </div>
    );
}

interface BulkActionsBarProps {
    selectedCount: number;
    filteredCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onBulkExport: () => void;
    onBulkDelete: () => void;
}

export function BulkActionsBar({
    selectedCount,
    filteredCount,
    onSelectAll,
    onDeselectAll,
    onBulkExport,
    onBulkDelete
}: BulkActionsBarProps) {
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                    {selectedCount} selected
                </span>
                <button
                    onClick={onSelectAll}
                    className="text-sm text-gray-600 hover:text-black hover:underline"
                >
                    Select all {filteredCount}
                </button>
                {selectedCount > 0 && (
                    <button
                        onClick={onDeselectAll}
                        className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                    >
                        Clear
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onBulkExport}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Export
                </button>
                <button
                    onClick={onBulkDelete}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

interface AccountAnalyticsProps {
    analytics: {
        total: number;
        highPriority: number;
        overdueCount: number;
        totalValue: number;
        withContacts: number;
        avgContactsPerAccount: number;
    };
}

export function AccountAnalytics({ analytics }: AccountAnalyticsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{analytics.total}</div>
                <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{analytics.highPriority}</div>
                <div className="text-xs text-gray-500 mt-1">High Priority</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{analytics.overdueCount}</div>
                <div className="text-xs text-gray-500 mt-1">Overdue</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                    ${(analytics.totalValue / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs text-gray-500 mt-1">Total Value</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{analytics.withContacts}</div>
                <div className="text-xs text-gray-500 mt-1">With Contacts</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{analytics.avgContactsPerAccount}</div>
                <div className="text-xs text-gray-500 mt-1">Avg Contacts</div>
            </div>
        </div>
    );
}

interface ViewControlsProps {
    sortBy: 'company' | 'priority' | 'status' | 'value' | 'lastContact';
    onSortByChange: (sortBy: 'company' | 'priority' | 'status' | 'value' | 'lastContact') => void;
    sortOrder: 'asc' | 'desc';
    onSortOrderToggle: () => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ViewControls({
    sortBy,
    onSortByChange,
    sortOrder,
    onSortOrderToggle,
    viewMode,
    onViewModeChange
}: ViewControlsProps) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort:</span>
                <select
                    value={sortBy}
                    onChange={(e) => onSortByChange(e.target.value as any)}
                    className="text-sm bg-white border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                    <option value="company">Company</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                    <option value="value">Value</option>
                    <option value="lastContact">Last Contact</option>
                </select>
                <button
                    onClick={onSortOrderToggle}
                    className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-md transition-colors"
                    title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                >
                    {sortOrder === 'asc' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                        </svg>
                    )}
                </button>
            </div>
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <button
                    onClick={() => onViewModeChange('list')}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                        viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                </button>
                <button
                    onClick={() => onViewModeChange('grid')}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                        viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default AccountHeader;
