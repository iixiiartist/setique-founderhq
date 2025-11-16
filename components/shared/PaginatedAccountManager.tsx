/**
 * Paginated Account Manager
 * 
 * Server-side paginated version of AccountManager using React Query.
 * Replaces client-side filtering with backend queries for scalability.
 */

import React, { useState, useMemo } from 'react';
import { CrmType, AppActions, CrmCollectionName, AnyCrmItem } from '../../types';
import { useCrmItems, useCrmStats, usePrefetchNextPage } from '../../lib/services/crmQueryService';
import { VirtualizedAccountList } from '../crm/VirtualizedAccountList';
import { PaginationControls } from './PaginationControls';
import { CsvExportButton } from '../crm/CsvExportButton';
import { logger } from '../../lib/logger';

interface PaginatedAccountManagerProps {
    workspaceId: string;
    typeFilter: CrmType | 'all';
    actions: AppActions;
    crmCollection: CrmCollectionName;
    crmType: 'investors' | 'customers' | 'partners' | 'accounts';
    onViewAccount?: (item: AnyCrmItem) => void;
}

export function PaginatedAccountManager({
    workspaceId,
    typeFilter,
    actions,
    crmCollection,
    crmType,
    onViewAccount
}: PaginatedAccountManagerProps) {
    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterByStatus, setFilterByStatus] = useState<string>('');
    const [filterByPriority, setFilterByPriority] = useState<string>('');
    const [sortBy, setSortBy] = useState<'company' | 'status' | 'priority' | 'created_at' | 'updated_at'>('company');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Bulk selection
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    // Fetch paginated data
    const {
        data,
        isLoading,
        error,
        isPlaceholderData // true when showing cached data while fetching
    } = useCrmItems(
        workspaceId,
        {
            type: typeFilter === 'all' ? undefined : typeFilter,
            status: filterByStatus || undefined,
            priority: filterByPriority || undefined,
            search: searchQuery || undefined,
            sortBy,
            sortOrder,
            page,
            pageSize,
            includeContacts: true,
            includeStats: false
        }
    );

    // Fetch aggregated stats for dashboard
    const { data: stats } = useCrmStats(workspaceId, typeFilter);

    // Prefetch next page
    const prefetchNext = usePrefetchNextPage(workspaceId, {
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: filterByStatus || undefined,
        priority: filterByPriority || undefined,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        page: page + 1,
        pageSize,
        includeContacts: true
    });

    // Get unique statuses from stats
    const allStatuses = useMemo(() => {
        if (!stats?.byStatus) return ['Active', 'Lead', 'Qualified', 'Won', 'Lost'];
        return Object.keys(stats.byStatus).sort();
    }, [stats]);

    // Handle search with debounce
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(1); // Reset to first page on new search
    };

    // Handle filter changes
    const handleFilterChange = (filterType: 'status' | 'priority', value: string) => {
        if (filterType === 'status') {
            setFilterByStatus(value);
        } else {
            setFilterByPriority(value);
        }
        setPage(1); // Reset to first page
    };

    // Handle sort changes
    const handleSortChange = (field: typeof sortBy) => {
        if (sortBy === field) {
            // Toggle order if same field
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    // Bulk selection handlers
    const toggleBulkSelect = () => {
        setBulkSelectMode(!bulkSelectMode);
        setSelectedItemIds(new Set());
    };

    const toggleItemSelection = (itemId: string) => {
        const newSelection = new Set(selectedItemIds);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItemIds(newSelection);
    };

    const selectAllFiltered = () => {
        if (!data?.items) return;
        const newSelection = new Set(data.items.map(item => item.id));
        setSelectedItemIds(newSelection);
    };

    const deselectAll = () => {
        setSelectedItemIds(new Set());
    };

    // Get type label
    const getCrmTypeLabel = () => {
        switch (crmType) {
            case 'investors': return 'Investor';
            case 'customers': return 'Customer';
            case 'partners': return 'Partner';
            case 'accounts': return 'Account';
            default: return 'Account';
        }
    };

    // Error state
    if (error) {
        logger.error('[PaginatedAccountManager] Error loading CRM items', error);
        return (
            <div className="p-8 text-center">
                <div className="text-red-600 font-mono mb-4">
                    ⚠️ Failed to load accounts
                </div>
                <div className="text-sm text-gray-600">
                    {error.message || 'An unknown error occurred'}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 font-mono bg-blue-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-blue-600"
                >
                    Reload Page
                </button>
            </div>
        );
    }

    const items = data?.items || [];
    const pagination = data?.pagination || {
        page: 1,
        pageSize,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
    };

    return (
        <div className="space-y-4">
            {/* Header with Stats */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-mono font-bold text-lg">
                    📊 {getCrmTypeLabel()} Management ({pagination.totalItems.toLocaleString()})
                </h3>
                <div className="flex gap-2 flex-wrap">
                    {/* CSV Export Button */}
                    <CsvExportButton
                        workspaceId={workspaceId}
                        options={{
                            type: typeFilter === 'all' ? undefined : typeFilter,
                            status: filterByStatus || undefined,
                            priority: filterByPriority || undefined,
                            search: searchQuery || undefined,
                            includeContacts: true
                        }}
                        className="font-mono"
                    />
                    <button
                        onClick={toggleBulkSelect}
                        className={`font-mono border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn transition-all ${
                            bulkSelectMode
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                    >
                        {bulkSelectMode ? '✕ Exit Bulk Select' : '☑️ Bulk Select'}
                    </button>
                </div>
            </div>

            {/* Analytics Dashboard */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 p-3 text-center">
                        <div className="text-2xl font-bold font-mono text-blue-800">
                            {pagination.totalItems}
                        </div>
                        <div className="text-xs font-mono text-blue-600">Total {getCrmTypeLabel()}s</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400 p-3 text-center">
                        <div className="text-2xl font-bold font-mono text-red-800">
                            {stats.byPriority?.High || 0}
                        </div>
                        <div className="text-xs font-mono text-red-600">High Priority</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-400 p-3 text-center">
                        <div className="text-2xl font-bold font-mono text-orange-800">
                            {stats.overdueCount || 0}
                        </div>
                        <div className="text-xs font-mono text-orange-600">Overdue</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 p-3 text-center">
                        <div className="text-xl font-bold font-mono text-green-800">
                            ${((stats.totalValue || 0) / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs font-mono text-green-600">Total Value</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 p-3 text-center">
                        <div className="text-2xl font-bold font-mono text-purple-800">
                            {stats.withContacts || 0}
                        </div>
                        <div className="text-xs font-mono text-purple-600">With Contacts</div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-400 p-3 text-center">
                        <div className="text-2xl font-bold font-mono text-indigo-800">
                            {pagination.totalItems > 0 
                                ? ((stats.withContacts || 0) / pagination.totalItems * 100).toFixed(0)
                                : 0}%
                        </div>
                        <div className="text-xs font-mono text-indigo-600">Contact Rate</div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {bulkSelectMode && (
                <div className="bg-orange-50 border-2 border-orange-400 p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">
                                {selectedItemIds.size} selected
                            </span>
                            <button
                                onClick={selectAllFiltered}
                                className="text-xs font-mono text-blue-600 hover:underline"
                            >
                                Select All ({items.length})
                            </button>
                            {selectedItemIds.size > 0 && (
                                <button
                                    onClick={deselectAll}
                                    className="text-xs font-mono text-gray-600 hover:underline"
                                >
                                    Deselect All
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search accounts..."
                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 font-mono"
                />
                <select
                    value={filterByStatus}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 font-mono"
                >
                    <option value="">All Statuses</option>
                    {allStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <select
                    value={filterByPriority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 font-mono"
                >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                </select>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-gray-700">Sort:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                        className="flex-1 bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 font-mono text-sm"
                    >
                        <option value="company">Company</option>
                        <option value="priority">Priority</option>
                        <option value="status">Status</option>
                        <option value="created_at">Created</option>
                        <option value="updated_at">Updated</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1.5 bg-gray-200 border-2 border-black text-black text-sm font-mono hover:bg-gray-300 transition-all"
                        title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && !isPlaceholderData && (
                <div className="text-center py-8">
                    <div className="text-lg font-mono text-gray-600">Loading accounts...</div>
                </div>
            )}

            {/* Account List - Virtualized */}
            <div className="relative" style={{ height: '500px' }}>
                {isPlaceholderData && (
                    <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-xs font-mono px-2 py-1 rounded">
                        Updating...
                    </div>
                )}
                <VirtualizedAccountList
                    items={items}
                    onSelectItem={(item) => onViewAccount?.(item as AnyCrmItem)}
                    bulkSelectMode={bulkSelectMode}
                    selectedItemIds={selectedItemIds}
                    onToggleSelection={toggleItemSelection}
                />
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <PaginationControls
                    pagination={pagination}
                    onPageChange={setPage}
                    isLoading={isLoading && !isPlaceholderData}
                    onPrefetchNext={prefetchNext}
                />
            )}
        </div>
    );
}

export default PaginatedAccountManager;
