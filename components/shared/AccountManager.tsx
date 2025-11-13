import React, { useState, useMemo } from 'react';
import { AnyCrmItem, AppActions, CrmCollectionName, Investor, Customer, Partner, Priority } from '../../types';
import Modal from './Modal';

interface AccountManagerProps {
    crmItems: AnyCrmItem[];
    actions: AppActions;
    crmCollection: CrmCollectionName;
    crmType: 'investors' | 'customers' | 'partners';
    workspaceId?: string;
    onViewAccount?: (item: AnyCrmItem) => void;
}

interface AccountFormData {
    company: string;
    priority: Priority;
    status: string;
    nextAction: string;
    nextActionDate: string;
    nextActionTime: string;
    website?: string;
    industry?: string;
    description?: string;
    // Type-specific fields
    checkSize?: number;
    stage?: string; // For investors: Seed, Series A, B, C, etc.
    dealValue?: number;
    dealStage?: string; // For customers: Prospect, Qualified, Proposal, etc.
    opportunity?: string;
    partnerType?: string; // For partners: Technology, Marketing, Distribution, etc.
}

interface CSVImportResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string; data: any }>;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
    crmItems,
    actions,
    crmCollection,
    crmType,
    workspaceId,
    onViewAccount
}) => {
    console.log('[AccountManager] Rendered with crmType:', crmType);
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AnyCrmItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterByStatus, setFilterByStatus] = useState<string>('');
    const [filterByPriority, setFilterByPriority] = useState<string>('');
    const [filterByTag, setFilterByTag] = useState<string>('');
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
    const [newTag, setNewTag] = useState('');
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<AnyCrmItem[][]>([]);
    const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<AnyCrmItem[] | null>(null);
    const [primaryItem, setPrimaryItem] = useState<AnyCrmItem | null>(null);
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<'tag' | 'delete' | 'export' | null>(null);
    const [bulkTagToAdd, setBulkTagToAdd] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filterByContactCount, setFilterByContactCount] = useState<'any' | 'none' | 'has'>('any');
    const [filterByNoteCount, setFilterByNoteCount] = useState<'any' | 'none' | 'has'>('any');
    const [filterOverdue, setFilterOverdue] = useState(false);
    const [formData, setFormData] = useState<AccountFormData>({
        company: '',
        priority: 'Medium',
        status: 'Active',
        nextAction: '',
        nextActionDate: '',
        nextActionTime: '',
        website: '',
        industry: '',
        description: ''
    });
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<'company' | 'priority' | 'status' | 'value' | 'lastContact'>('company');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Get all unique tags from CRM items
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        crmItems.forEach(item => {
            (item as any).tags?.forEach((tag: string) => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [crmItems]);

    // Get all unique statuses
    const allStatuses = useMemo(() => {
        const statusSet = new Set<string>();
        crmItems.forEach(item => statusSet.add(item.status));
        return Array.from(statusSet).sort();
    }, [crmItems]);

    // Filter items
    const filteredItems = useMemo(() => {
        let filtered = crmItems;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                item.company.toLowerCase().includes(query) ||
                item.status.toLowerCase().includes(query) ||
                (item.nextAction && item.nextAction.toLowerCase().includes(query)) ||
                item.contacts?.some(c => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query))
            );
        }

        // Status filter
        if (filterByStatus) {
            filtered = filtered.filter(item => item.status === filterByStatus);
        }

        // Priority filter
        if (filterByPriority) {
            filtered = filtered.filter(item => item.priority === filterByPriority);
        }

        // Tag filter
        if (filterByTag) {
            filtered = filtered.filter(item => (item as any).tags?.includes(filterByTag));
        }

        // Advanced filters
        if (filterByContactCount !== 'any') {
            filtered = filtered.filter(item => {
                const contactCount = (item.contacts || []).length;
                if (filterByContactCount === 'none') return contactCount === 0;
                if (filterByContactCount === 'has') return contactCount > 0;
                return true;
            });
        }

        if (filterByNoteCount !== 'any') {
            filtered = filtered.filter(item => {
                const noteCount = (item.notes || []).length;
                if (filterByNoteCount === 'none') return noteCount === 0;
                if (filterByNoteCount === 'has') return noteCount > 0;
                return true;
            });
        }

        if (filterOverdue) {
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(item => item.nextActionDate && item.nextActionDate < today);
        }

        // Sort items
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'company':
                    comparison = a.company.localeCompare(b.company);
                    break;
                case 'priority':
                    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                case 'value':
                    const aValue = ('checkSize' in a ? (a as Investor).checkSize : 'dealValue' in a ? (a as Customer).dealValue : 0) || 0;
                    const bValue = ('checkSize' in b ? (b as Investor).checkSize : 'dealValue' in b ? (b as Customer).dealValue : 0) || 0;
                    comparison = aValue - bValue;
                    break;
                case 'lastContact':
                    const aLastNote = a.notes?.length ? Math.max(...a.notes.map(n => n.timestamp)) : 0;
                    const bLastNote = b.notes?.length ? Math.max(...b.notes.map(n => n.timestamp)) : 0;
                    comparison = aLastNote - bLastNote;
                    break;
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [crmItems, searchQuery, filterByStatus, filterByPriority, filterByTag, filterByContactCount, filterByNoteCount, filterOverdue, sortBy, sortOrder]);

    // Calculate analytics
    const analytics = useMemo(() => {
        const total = filteredItems.length;
        const highPriority = filteredItems.filter(i => i.priority === 'High').length;
        const overdueCount = filteredItems.filter(i => {
            const today = new Date().toISOString().split('T')[0];
            return i.nextActionDate && i.nextActionDate < today;
        }).length;
        
        let totalValue = 0;
        filteredItems.forEach(item => {
            if ('checkSize' in item && item.checkSize) totalValue += item.checkSize;
            if ('dealValue' in item && item.dealValue) totalValue += item.dealValue;
        });
        
        const withContacts = filteredItems.filter(i => (i.contacts || []).length > 0).length;
        const avgContactsPerAccount = total > 0 ? filteredItems.reduce((sum, i) => sum + (i.contacts || []).length, 0) / total : 0;
        
        return {
            total,
            highPriority,
            overdueCount,
            totalValue,
            withContacts,
            avgContactsPerAccount: Math.round(avgContactsPerAccount * 10) / 10
        };
    }, [filteredItems]);

    const getCrmTypeLabel = () => {
        switch (crmType) {
            case 'investors': return 'Investor';
            case 'customers': return 'Customer';
            case 'partners': return 'Partner';
            default: return 'Account';
        }
    };

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.company.trim()) {
            alert('Company name is required');
            return;
        }

        try {
            const itemData: any = {
                company: formData.company.trim(),
                priority: formData.priority,
                status: formData.status,
                nextAction: formData.nextAction || undefined,
                nextActionDate: formData.nextActionDate || undefined,
                nextActionTime: formData.nextActionTime || undefined,
                // Add deal flow management fields
                website: formData.website || undefined,
                industry: formData.industry || undefined,
                description: formData.description || undefined,
            };

            // Add type-specific fields
            if (crmType === 'investors') {
                if (formData.checkSize) itemData.checkSize = formData.checkSize;
                if (formData.stage) itemData.stage = formData.stage;
            } else if (crmType === 'customers') {
                if (formData.dealValue) itemData.dealValue = formData.dealValue;
                if (formData.dealStage) itemData.dealStage = formData.dealStage;
            } else if (crmType === 'partners') {
                if (formData.opportunity) itemData.opportunity = formData.opportunity;
                if (formData.partnerType) itemData.partnerType = formData.partnerType;
            }

            console.log('[AccountManager] Creating account with data:', itemData);
            await actions.createCrmItem(crmCollection, itemData);
            
            // Reset form
            setFormData(resetFormData());
            setShowAddModal(false);
        } catch (error) {
            console.error('Error creating account:', error);
            alert('Failed to create account. Please try again.');
        }
    };

    const handleEditAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedItem) return;

        try {
            const updates: any = {
                company: formData.company.trim(),
                priority: formData.priority,
                status: formData.status,
                nextAction: formData.nextAction || undefined,
                nextActionDate: formData.nextActionDate || undefined,
                nextActionTime: formData.nextActionTime || undefined,
                // Add deal flow management fields
                website: formData.website || undefined,
                industry: formData.industry || undefined,
                description: formData.description || undefined,
            };

            // Add type-specific fields
            if (crmType === 'investors') {
                if (formData.checkSize !== undefined) updates.checkSize = formData.checkSize;
                if (formData.stage) updates.stage = formData.stage;
            } else if (crmType === 'customers') {
                if (formData.dealValue !== undefined) updates.dealValue = formData.dealValue;
                if (formData.dealStage) updates.dealStage = formData.dealStage;
            } else if (crmType === 'partners') {
                if (formData.opportunity) updates.opportunity = formData.opportunity;
                if (formData.partnerType) updates.partnerType = formData.partnerType;
            }

            console.log('[AccountManager] Updating account with data:', updates);
            await actions.updateCrmItem(crmCollection, selectedItem.id, updates);
            
            setShowEditModal(false);
            setSelectedItem(null);
            setFormData(resetFormData());
        } catch (error) {
            console.error('Error updating account:', error);
            alert('Failed to update account. Please try again.');
        }
    };

    const handleDeleteAccount = async (item: AnyCrmItem) => {
        if (!confirm(`Delete ${item.company}? This will also delete all contacts, tasks, meetings, and notes.`)) return;

        try {
            await actions.deleteItem(crmCollection, item.id);
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Failed to delete account. Please try again.');
        }
    };

    const openEditModal = (item: AnyCrmItem) => {
        setSelectedItem(item);
        const formUpdate: AccountFormData = {
            company: item.company,
            priority: item.priority,
            status: item.status,
            nextAction: item.nextAction || '',
            nextActionDate: item.nextActionDate || '',
            nextActionTime: item.nextActionTime || '',
            website: (item as any).website || '',
            industry: (item as any).industry || '',
            description: (item as any).description || ''
        };

        // Add type-specific fields
        if ('checkSize' in item) {
            formUpdate.checkSize = (item as Investor).checkSize;
            formUpdate.stage = (item as any).stage || '';
        }
        if ('dealValue' in item) {
            formUpdate.dealValue = (item as Customer).dealValue;
            formUpdate.dealStage = (item as any).dealStage || '';
        }
        if ('opportunity' in item) {
            formUpdate.opportunity = (item as Partner).opportunity;
            formUpdate.partnerType = (item as any).partnerType || '';
        }

        setFormData(formUpdate);
        setShowEditModal(true);
    };

    const resetFormData = () => ({
        company: '',
        priority: 'Medium' as Priority,
        status: 'Active',
        nextAction: '',
        nextActionDate: '',
        nextActionTime: '',
        website: '',
        industry: '',
        description: ''
    });

    const closeAddModal = () => {
        setShowAddModal(false);
        setFormData(resetFormData());
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedItem(null);
        setFormData(resetFormData());
    };

    // CSV Export
    const exportAccountsToCSV = () => {
        if (filteredItems.length === 0) {
            alert('No accounts to export');
            return;
        }

        // CSV headers
        const headers = ['company', 'status', 'priority', 'contacts', 'next_action', 'next_action_date'];
        const csvRows = [headers.join(',')];

        // Add data rows
        filteredItems.forEach(item => {
            const contactNames = (item.contacts || []).map(c => c.name).join('; ');
            const row = [
                `"${item.company.replace(/"/g, '""')}"`,
                `"${item.status.replace(/"/g, '""')}"`,
                item.priority,
                `"${contactNames.replace(/"/g, '""')}"`,
                `"${(item.nextAction || '').replace(/"/g, '""')}"`,
                item.nextActionDate || ''
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0];
        a.download = `${crmType}_export_${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Duplicate Detection
    const detectDuplicates = () => {
        const groups: AnyCrmItem[][] = [];
        const processed = new Set<string>();

        crmItems.forEach((item, index) => {
            if (processed.has(item.id)) return;

            const potentialDuplicates: AnyCrmItem[] = [item];
            processed.add(item.id);

            // Check remaining items
            for (let i = index + 1; i < crmItems.length; i++) {
                const other = crmItems[i];
                if (processed.has(other.id)) continue;

                const name1 = item.company.toLowerCase().trim();
                const name2 = other.company.toLowerCase().trim();

                let isDuplicate = false;

                // Exact match
                if (name1 === name2) {
                    isDuplicate = true;
                }

                // Very similar names
                if (!isDuplicate && name1.includes(name2) || name2.includes(name1)) {
                    isDuplicate = true;
                }

                if (isDuplicate) {
                    potentialDuplicates.push(other);
                    processed.add(other.id);
                }
            }

            // Only add groups with 2+ items
            if (potentialDuplicates.length > 1) {
                groups.push(potentialDuplicates);
            }
        });

        setDuplicateGroups(groups);
        setShowDuplicateModal(true);
    };

    // Bulk Operations
    const toggleBulkSelect = () => {
        setBulkSelectMode(!bulkSelectMode);
        setSelectedItemIds(new Set());
    };

    const toggleItemSelection = (itemId: string) => {
        const newSet = new Set(selectedItemIds);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setSelectedItemIds(newSet);
    };

    const selectAllFiltered = () => {
        const allIds = new Set(filteredItems.map(i => i.id));
        setSelectedItemIds(allIds);
    };

    const deselectAll = () => {
        setSelectedItemIds(new Set());
    };

    const handleBulkAction = (action: 'tag' | 'delete' | 'export') => {
        if (selectedItemIds.size === 0) {
            alert('Please select at least one account');
            return;
        }
        setBulkAction(action);
        setShowBulkActionsModal(true);
    };

    const executeBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedItemIds.size} account(s)? This cannot be undone.`)) {
            return;
        }

        try {
            const selectedItems = crmItems.filter(i => selectedItemIds.has(i.id));
            let successCount = 0;

            for (const item of selectedItems) {
                await actions.deleteItem(crmCollection, item.id);
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            alert(`Successfully deleted ${successCount} account(s)`);
            setShowBulkActionsModal(false);
            setBulkSelectMode(false);
            setSelectedItemIds(new Set());
        } catch (error) {
            console.error('Error bulk deleting:', error);
            alert('Failed to delete some accounts');
        }
    };

    const executeBulkExport = () => {
        const selectedItems = crmItems.filter(i => selectedItemIds.has(i.id));
        
        if (selectedItems.length === 0) {
            alert('No accounts selected for export');
            return;
        }

        // Similar to exportAccountsToCSV but only for selected items
        const headers = ['company', 'status', 'priority', 'contacts', 'next_action', 'next_action_date'];
        const csvRows = [headers.join(',')];

        selectedItems.forEach(item => {
            const contactNames = (item.contacts || []).map(c => c.name).join('; ');
            const row = [
                `"${item.company.replace(/"/g, '""')}"`,
                `"${item.status.replace(/"/g, '""')}"`,
                item.priority,
                `"${contactNames.replace(/"/g, '""')}"`,
                `"${(item.nextAction || '').replace(/"/g, '""')}"`,
                item.nextActionDate || ''
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0];
        a.download = `bulk_${crmType}_export_${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert(`Successfully exported ${selectedItems.length} account(s)`);
        setShowBulkActionsModal(false);
        setBulkSelectMode(false);
        setSelectedItemIds(new Set());
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-mono font-bold text-lg">
                    📊 {getCrmTypeLabel()} Management ({filteredItems.length})
                </h3>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={exportAccountsToCSV}
                        disabled={filteredItems.length === 0}
                        className="font-mono bg-purple-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        📥 Export CSV
                    </button>
                    <button
                        onClick={detectDuplicates}
                        disabled={crmItems.length < 2}
                        className="font-mono bg-yellow-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        🔍 Find Duplicates
                    </button>
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
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="font-mono bg-green-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-green-600 transition-all"
                    >
                        + Add {getCrmTypeLabel()}
                    </button>
                </div>
            </div>

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
                                Select All ({filteredItems.length})
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
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkAction('export')}
                                disabled={selectedItemIds.size === 0}
                                className="font-mono bg-blue-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all disabled:opacity-50"
                            >
                                📥 Export
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={selectedItemIds.size === 0}
                                className="font-mono bg-red-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <label htmlFor="account-search" className="sr-only">Search accounts</label>
                    <input
                        id="account-search"
                        name="account-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search accounts..."
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                    />
                    <label htmlFor="account-filter-status" className="sr-only">Filter by status</label>
                    <select
                        id="account-filter-status"
                        name="account-filter-status"
                        value={filterByStatus}
                        onChange={(e) => setFilterByStatus(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
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
                        onChange={(e) => setFilterByPriority(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                    >
                        <option value="">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                    <label htmlFor="account-filter-tag" className="sr-only">Filter by tag</label>
                    <select
                        id="account-filter-tag"
                        name="account-filter-tag"
                        value={filterByTag}
                        onChange={(e) => setFilterByTag(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                    >
                        <option value="">All Tags</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>
                                🏷️ {tag}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Advanced Filters Toggle */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="text-sm font-mono text-blue-600 hover:underline flex items-center gap-1"
                    >
                        {showAdvancedFilters ? '▼' : '▶'} Advanced Filters
                    </button>
                    {(filterByContactCount !== 'any' || filterByNoteCount !== 'any' || filterOverdue) && (
                        <button
                            onClick={() => {
                                setFilterByContactCount('any');
                                setFilterByNoteCount('any');
                                setFilterOverdue(false);
                            }}
                            className="text-xs font-mono text-gray-600 hover:text-red-600"
                        >
                            Clear Advanced Filters
                        </button>
                    )}
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="bg-gray-50 border-2 border-gray-300 p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label htmlFor="filter-contact-count" className="block text-xs font-mono font-semibold text-gray-700 mb-1">
                                Contacts
                            </label>
                            <select
                                id="filter-contact-count"
                                name="filter-contact-count"
                                value={filterByContactCount}
                                onChange={(e) => setFilterByContactCount(e.target.value as any)}
                                className="w-full bg-white border-2 border-gray-400 text-black p-2 text-sm rounded-none focus:outline-none focus:border-blue-500"
                            >
                                <option value="any">Any</option>
                                <option value="has">Has Contacts</option>
                                <option value="none">No Contacts</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filter-note-count" className="block text-xs font-mono font-semibold text-gray-700 mb-1">
                                Notes
                            </label>
                            <select
                                id="filter-note-count"
                                name="filter-note-count"
                                value={filterByNoteCount}
                                onChange={(e) => setFilterByNoteCount(e.target.value as any)}
                                className="w-full bg-white border-2 border-gray-400 text-black p-2 text-sm rounded-none focus:outline-none focus:border-blue-500"
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
                                    onChange={(e) => setFilterOverdue(e.target.checked)}
                                    className="w-4 h-4 accent-red-500 border-2 border-black rounded-none"
                                />
                                <span className="text-xs font-mono font-semibold text-gray-700">
                                    Overdue Actions Only
                                </span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-blue-800">{analytics.total}</div>
                    <div className="text-xs font-mono text-blue-600">Total {getCrmTypeLabel()}s</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-red-800">{analytics.highPriority}</div>
                    <div className="text-xs font-mono text-red-600">High Priority</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-400 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-orange-800">{analytics.overdueCount}</div>
                    <div className="text-xs font-mono text-orange-600">Overdue</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 p-3 text-center">
                    <div className="text-xl font-bold font-mono text-green-800">
                        ${(analytics.totalValue / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs font-mono text-green-600">Total Value</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-purple-800">{analytics.withContacts}</div>
                    <div className="text-xs font-mono text-purple-600">With Contacts</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-400 p-3 text-center">
                    <div className="text-2xl font-bold font-mono text-indigo-800">{analytics.avgContactsPerAccount}</div>
                    <div className="text-xs font-mono text-indigo-600">Avg Contacts</div>
                </div>
            </div>

            {/* View Controls and Sort */}
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-gray-700">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="text-sm bg-white border-2 border-black text-black py-1 px-2 rounded-none focus:outline-none focus:border-blue-500"
                    >
                        <option value="company">Company</option>
                        <option value="priority">Priority</option>
                        <option value="status">Status</option>
                        <option value="value">Value</option>
                        <option value="lastContact">Last Contact</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1 bg-gray-200 border-2 border-black text-black text-sm font-mono hover:bg-gray-300 transition-all"
                        title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-gray-700">View:</span>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1 border-2 border-black text-sm font-mono font-semibold transition-all ${
                            viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                        List
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1 border-2 border-black text-sm font-mono font-semibold transition-all ${
                            viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                        Grid
                    </button>
                </div>
            </div>

            {/* Account List */}
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'} max-h-96 overflow-y-auto`}>
                {filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No accounts found</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-2 text-blue-600 hover:underline"
                        >
                            Add your first {crmType.slice(0, -1)}
                        </button>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const isSelected = selectedItemIds.has(item.id);
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isOverdue = item.nextActionDate && item.nextActionDate < todayStr;
                        const lastNote = item.notes && item.notes.length > 0 
                            ? [...item.notes].sort((a, b) => b.timestamp - a.timestamp)[0] 
                            : null;
                        const daysSinceContact = lastNote 
                            ? Math.floor((Date.now() - lastNote.timestamp) / (1000 * 60 * 60 * 24))
                            : null;
                        
                        return (
                            <div
                                key={item.id}
                                className={`bg-white border-2 p-4 shadow-neo hover:shadow-neo-lg transition-all ${
                                    isSelected ? 'border-orange-500 bg-orange-50' : isOverdue ? 'border-red-500' : 'border-black'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {bulkSelectMode && (
                                        <div className="flex-shrink-0">
                                            <label htmlFor={`bulk-select-${item.id}`} className="sr-only">
                                                Select {item.company}
                                            </label>
                                            <input
                                                id={`bulk-select-${item.id}`}
                                                name={`bulk-select-${item.id}`}
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleItemSelection(item.id)}
                                                className="w-5 h-5 cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex-grow min-w-0">
                                                <h4 className="font-bold text-lg text-black truncate">
                                                    {item.company}
                                                </h4>
                                                {(item.contacts || []).length > 0 && (
                                                    <p className="text-sm text-gray-600 truncate">
                                                        {item.contacts![0].name}
                                                        {item.contacts!.length > 1 && ` +${item.contacts!.length - 1} more`}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                {'checkSize' in item && item.checkSize && (
                                                    <div>
                                                        <div className="font-bold text-lg text-green-600">
                                                            ${(item.checkSize / 1000)}K
                                                        </div>
                                                        <div className="text-xs text-gray-500">Check Size</div>
                                                    </div>
                                                )}
                                                {'dealValue' in item && item.dealValue && (
                                                    <div>
                                                        <div className="font-bold text-lg text-blue-600">
                                                            ${(item.dealValue / 1000)}K
                                                        </div>
                                                        <div className="text-xs text-gray-500">Deal Value</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className={`priority-badge priority-${item.priority.toLowerCase()}`}>
                                                {item.priority}
                                            </span>
                                            <span className="px-2 py-1 bg-gray-100 border border-black text-xs font-mono">
                                                {item.status}
                                            </span>
                                            {item.assignedToName && (
                                                <span className="px-2 py-1 bg-blue-50 border border-blue-300 text-xs font-mono text-blue-700">
                                                    → {item.assignedToName}
                                                </span>
                                            )}
                                            {isOverdue && (
                                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-mono font-bold">
                                                    OVERDUE
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <span>👥</span>
                                                <span>{(item.contacts || []).length} contacts</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <span>�</span>
                                                <span>{(item.notes || []).length} notes</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <span>📄</span>
                                                <span>{((item as any).documents || []).length} docs</span>
                                            </div>
                                            {daysSinceContact !== null && (
                                                <div className={`flex items-center gap-1 ${daysSinceContact > 30 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                                    <span>🕐</span>
                                                    <span>{daysSinceContact}d ago</span>
                                                </div>
                                            )}
                                        </div>

                                        {item.nextAction && (
                                            <div className="bg-blue-50 border-l-4 border-blue-500 p-2 mb-2">
                                                <p className="text-sm font-medium text-gray-800">{item.nextAction}</p>
                                                {item.nextActionDate && (
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        📅 {new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric', 
                                                            year: 'numeric',
                                                            timeZone: 'UTC' 
                                                        })}
                                                        {item.nextActionTime && ` at ${item.nextActionTime}`}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {lastNote && (
                                            <div className="bg-gray-50 border-l-4 border-gray-400 p-2 mb-2">
                                                <p className="text-xs text-gray-500 mb-1">Latest Note:</p>
                                                <p className="text-sm text-gray-700 line-clamp-2">{lastNote.text}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {onViewAccount && (
                                            <button
                                                onClick={() => onViewAccount(item)}
                                                className="font-mono bg-green-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-green-600 transition-all"
                                            >
                                                👁️ View
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="font-mono bg-blue-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAccount(item)}
                                            className="font-mono bg-red-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-red-600 transition-all"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={closeAddModal}
                title={`Add New ${getCrmTypeLabel()} [Type: ${crmType}]`}
            >
                <form onSubmit={handleAddAccount} className="space-y-4">
                    <div>
                        <label htmlFor="add-company" className="block font-mono text-sm font-semibold text-black mb-1">
                            Company Name *
                        </label>
                        <input
                            id="add-company"
                            name="add-company"
                            type="text"
                            value={formData.company}
                            onChange={(e) => setFormData(p => ({ ...p, company: e.target.value }))}
                            placeholder="e.g., Acme Corp"
                            required
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="add-priority" className="block font-mono text-sm font-semibold text-black mb-1">
                                Priority
                            </label>
                            <select
                                id="add-priority"
                                name="add-priority"
                                value={formData.priority}
                                onChange={(e) => setFormData(p => ({ ...p, priority: e.target.value as Priority }))}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="add-status" className="block font-mono text-sm font-semibold text-black mb-1">
                                Status
                            </label>
                            <input
                                id="add-status"
                                name="add-status"
                                type="text"
                                value={formData.status}
                                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                placeholder="e.g., Active, Prospect"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="add-website" className="block font-mono text-sm font-semibold text-black mb-1">
                                Website
                            </label>
                            <input
                                id="add-website"
                                name="add-website"
                                type="url"
                                value={formData.website || ''}
                                onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))}
                                placeholder="https://example.com"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="add-industry" className="block font-mono text-sm font-semibold text-black mb-1">
                                Industry
                            </label>
                            <input
                                id="add-industry"
                                name="add-industry"
                                type="text"
                                value={formData.industry || ''}
                                onChange={(e) => setFormData(p => ({ ...p, industry: e.target.value }))}
                                placeholder="e.g., SaaS, Fintech"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="add-description" className="block font-mono text-sm font-semibold text-black mb-1">
                            Description
                        </label>
                        <textarea
                            id="add-description"
                            name="add-description"
                            value={formData.description || ''}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            placeholder="Brief description of the company..."
                            rows={3}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Type-specific fields */}
                    <div style={{ padding: '10px', backgroundColor: '#ffeb3b', border: '2px solid red', margin: '10px 0' }}>
                        DEBUG: crmType = "{crmType}" | 
                        investors={String(crmType === 'investors')} | 
                        customers={String(crmType === 'customers')} | 
                        partners={String(crmType === 'partners')}
                    </div>
                    {crmType === 'investors' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-check-size" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Check Size ($)
                                </label>
                                <input
                                    id="add-check-size"
                                    name="add-check-size"
                                    type="number"
                                    value={formData.checkSize || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, checkSize: e.target.value ? Number(e.target.value) : undefined }))}
                                    placeholder="e.g., 100000"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="add-stage" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Investment Stage
                                </label>
                                <select
                                    id="add-stage"
                                    name="add-stage"
                                    value={formData.stage || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, stage: e.target.value }))}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select stage...</option>
                                    <option value="Pre-Seed">Pre-Seed</option>
                                    <option value="Seed">Seed</option>
                                    <option value="Series A">Series A</option>
                                    <option value="Series B">Series B</option>
                                    <option value="Series C+">Series C+</option>
                                    <option value="Growth">Growth</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {crmType === 'customers' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-deal-value" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Deal Value ($)
                                </label>
                                <input
                                    id="add-deal-value"
                                    name="add-deal-value"
                                    type="number"
                                    value={formData.dealValue || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, dealValue: e.target.value ? Number(e.target.value) : undefined }))}
                                    placeholder="e.g., 50000"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="add-deal-stage" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Deal Stage
                                </label>
                                <select
                                    id="add-deal-stage"
                                    name="add-deal-stage"
                                    value={formData.dealStage || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, dealStage: e.target.value }))}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select stage...</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {crmType === 'partners' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-opportunity" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Opportunity
                                </label>
                                <input
                                    id="add-opportunity"
                                    name="add-opportunity"
                                    type="text"
                                    value={formData.opportunity || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, opportunity: e.target.value }))}
                                    placeholder="e.g., Co-marketing campaign"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="add-partner-type" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Partner Type
                                </label>
                                <select
                                    id="add-partner-type"
                                    name="add-partner-type"
                                    value={formData.partnerType || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, partnerType: e.target.value }))}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select type...</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Distribution">Distribution</option>
                                    <option value="Integration">Integration</option>
                                    <option value="Referral">Referral</option>
                                    <option value="Strategic">Strategic</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="add-next-action" className="block font-mono text-sm font-semibold text-black mb-1">
                            Next Action
                        </label>
                        <input
                            id="add-next-action"
                            name="add-next-action"
                            type="text"
                            value={formData.nextAction}
                            onChange={(e) => setFormData(p => ({ ...p, nextAction: e.target.value }))}
                            placeholder="e.g., Send intro email"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="add-next-action-date" className="block font-mono text-sm font-semibold text-black mb-1">
                                Next Action Date
                            </label>
                            <input
                                id="add-next-action-date"
                                name="add-next-action-date"
                                type="date"
                                value={formData.nextActionDate}
                                onChange={(e) => setFormData(p => ({ ...p, nextActionDate: e.target.value }))}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="add-next-action-time" className="block font-mono text-sm font-semibold text-black mb-1">
                                Next Action Time
                            </label>
                            <input
                                id="add-next-action-time"
                                name="add-next-action-time"
                                type="time"
                                value={formData.nextActionTime}
                                onChange={(e) => setFormData(p => ({ ...p, nextActionTime: e.target.value }))}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="flex-1 font-mono font-semibold bg-green-500 text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-green-600"
                        >
                            Create {getCrmTypeLabel()}
                        </button>
                        <button
                            type="button"
                            onClick={closeAddModal}
                            className="flex-1 font-mono font-semibold bg-white text-black py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal - similar structure to Add Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={closeEditModal}
                title={`Edit ${getCrmTypeLabel()}`}
            >
                <form onSubmit={handleEditAccount} className="space-y-4">
                    {/* Similar form fields as Add Modal */}
                    <div>
                        <label htmlFor="edit-company" className="block font-mono text-sm font-semibold text-black mb-1">
                            Company Name *
                        </label>
                        <input
                            id="edit-company"
                            name="edit-company"
                            type="text"
                            value={formData.company}
                            onChange={(e) => setFormData(p => ({ ...p, company: e.target.value }))}
                            placeholder="e.g., Acme Corp"
                            required
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-priority" className="block font-mono text-sm font-semibold text-black mb-1">
                                Priority
                            </label>
                            <select
                                id="edit-priority"
                                name="edit-priority"
                                value={formData.priority}
                                onChange={(e) => setFormData(p => ({ ...p, priority: e.target.value as Priority }))}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="edit-status" className="block font-mono text-sm font-semibold text-black mb-1">
                                Status
                            </label>
                            <input
                                id="edit-status"
                                name="edit-status"
                                type="text"
                                value={formData.status}
                                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                placeholder="e.g., Active, Prospect"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-website" className="block font-mono text-sm font-semibold text-black mb-1">
                                Website
                            </label>
                            <input
                                id="edit-website"
                                name="edit-website"
                                type="url"
                                value={formData.website || ''}
                                onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))}
                                placeholder="https://example.com"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-industry" className="block font-mono text-sm font-semibold text-black mb-1">
                                Industry
                            </label>
                            <input
                                id="edit-industry"
                                name="edit-industry"
                                type="text"
                                value={formData.industry || ''}
                                onChange={(e) => setFormData(p => ({ ...p, industry: e.target.value }))}
                                placeholder="e.g., SaaS, Fintech"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="edit-description" className="block font-mono text-sm font-semibold text-black mb-1">
                            Description
                        </label>
                        <textarea
                            id="edit-description"
                            name="edit-description"
                            value={formData.description || ''}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            placeholder="Brief description of the company..."
                            rows={3}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Type-specific fields */}
                    {crmType === 'investors' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="edit-check-size" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Check Size ($)
                                </label>
                                <input
                                    id="edit-check-size"
                                    name="edit-check-size"
                                    type="number"
                                    value={formData.checkSize || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, checkSize: e.target.value ? Number(e.target.value) : undefined }))}
                                    placeholder="e.g., 100000"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-stage" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Investment Stage
                                </label>
                                <select
                                    id="edit-stage"
                                    name="edit-stage"
                                    value={formData.stage || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, stage: e.target.value }))}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select stage...</option>
                                    <option value="Pre-Seed">Pre-Seed</option>
                                    <option value="Seed">Seed</option>
                                    <option value="Series A">Series A</option>
                                    <option value="Series B">Series B</option>
                                    <option value="Series C+">Series C+</option>
                                    <option value="Growth">Growth</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {crmType === 'customers' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="edit-deal-value" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Deal Value ($)
                                </label>
                                <input
                                    id="edit-deal-value"
                                    name="edit-deal-value"
                                    type="number"
                                    value={formData.dealValue || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, dealValue: e.target.value ? Number(e.target.value) : undefined }))}
                                    placeholder="e.g., 50000"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-deal-stage" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Deal Stage
                                </label>
                                <select
                                    id="edit-deal-stage"
                                    name="edit-deal-stage"
                                    value={formData.dealStage || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, dealStage: e.target.value }))}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select stage...</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {crmType === 'partners' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="edit-opportunity" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Opportunity
                                </label>
                                <input
                                    id="edit-opportunity"
                                    name="edit-opportunity"
                                    type="text"
                                    value={formData.opportunity || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, opportunity: e.target.value }))}
                                    placeholder="e.g., Co-marketing campaign"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-partner-type" className="block font-mono text-sm font-semibold text-black mb-1">
                                    Partner Type
                                </label>
                                <select
                                    id="edit-partner-type"
                                    name="edit-partner-type"
                                    value={formData.partnerType || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, partnerType: e.target.value }))}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select type...</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Distribution">Distribution</option>
                                    <option value="Integration">Integration</option>
                                    <option value="Referral">Referral</option>
                                    <option value="Strategic">Strategic</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="edit-next-action" className="block font-mono text-sm font-semibold text-black mb-1">
                            Next Action
                        </label>
                        <input
                            id="edit-next-action"
                            name="edit-next-action"
                            type="text"
                            value={formData.nextAction}
                            onChange={(e) => setFormData(p => ({ ...p, nextAction: e.target.value }))}
                            placeholder="e.g., Send intro email"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-next-action-date" className="block font-mono text-sm font-semibold text-black mb-1">
                                Next Action Date
                            </label>
                            <input
                                id="edit-next-action-date"
                                name="edit-next-action-date"
                                type="date"
                                value={formData.nextActionDate}
                                onChange={(e) => setFormData(p => ({ ...p, nextActionDate: e.target.value }))}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-next-action-time" className="block font-mono text-sm font-semibold text-black mb-1">
                                Next Action Time
                            </label>
                            <input
                                id="edit-next-action-time"
                                name="edit-next-action-time"
                                type="time"
                                value={formData.nextActionTime}
                                onChange={(e) => setFormData(p => ({ ...p, nextActionTime: e.target.value }))}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="flex-1 font-mono font-semibold bg-blue-500 text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-blue-600"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={closeEditModal}
                            className="flex-1 font-mono font-semibold bg-white text-black py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Bulk Actions Modal */}
            <Modal
                isOpen={showBulkActionsModal}
                onClose={() => {
                    setShowBulkActionsModal(false);
                    setBulkAction(null);
                }}
                title={`Bulk ${bulkAction === 'delete' ? 'Delete' : 'Export'}`}
            >
                <div className="space-y-4">
                    {bulkAction === 'delete' && (
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Are you sure you want to delete {selectedItemIds.size} account(s)? This action cannot be undone and will also delete all associated contacts, tasks, and data.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={executeBulkDelete}
                                    className="flex-1 font-mono bg-red-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-red-600 transition-all"
                                >
                                    Confirm Delete
                                </button>
                                <button
                                    onClick={() => setShowBulkActionsModal(false)}
                                    className="flex-1 font-mono bg-gray-200 text-black border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {bulkAction === 'export' && (
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Export {selectedItemIds.size} selected account(s) to CSV file.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={executeBulkExport}
                                    className="flex-1 font-mono bg-blue-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                                >
                                    Export to CSV
                                </button>
                                <button
                                    onClick={() => setShowBulkActionsModal(false)}
                                    className="flex-1 font-mono bg-gray-200 text-black border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Duplicate Detection Modal */}
            <Modal
                isOpen={showDuplicateModal}
                onClose={() => {
                    setShowDuplicateModal(false);
                    setDuplicateGroups([]);
                }}
                title="Duplicate Accounts Detected"
            >
                <div className="space-y-4">
                    {duplicateGroups.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-green-600 font-semibold text-lg">✓ No duplicates found!</p>
                            <p className="text-sm text-gray-600 mt-2">All accounts appear to be unique.</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Found {duplicateGroups.length} group(s) of potential duplicate accounts. Review and manage them individually in the detailed account view.
                            </p>
                            <div className="max-h-96 overflow-y-auto space-y-3">
                                {duplicateGroups.map((group, index) => (
                                    <div key={index} className="bg-yellow-50 border-2 border-yellow-400 p-3">
                                        <h4 className="font-mono font-semibold text-sm mb-2">
                                            Duplicate Group {index + 1} ({group.length} accounts)
                                        </h4>
                                        <ul className="space-y-1">
                                            {group.map(item => (
                                                <li key={item.id} className="text-sm">
                                                    • {item.company} ({item.status})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowDuplicateModal(false)}
                                className="w-full mt-4 font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
