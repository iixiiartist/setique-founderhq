import React, { useState, useMemo } from 'react';
import { 
    Search, Filter, Plus, Upload, Download, Users, ChevronDown, ChevronUp, Tag,
    CheckSquare, Trash2, Eye, Pencil, LayoutGrid, List, BarChart3, TrendingUp,
    Calendar, X, FileText, Folder, Clock, AlertCircle
} from 'lucide-react';
import { AnyCrmItem, AppActions, CrmCollectionName, Investor, Customer, Partner, Priority } from '../../types';
import Modal from './Modal';
import { useModal, useBulkSelection } from '../../hooks';
import { toCSV, downloadCSV, createCSVFilename } from '../../lib/utils/csvUtils';

interface AccountManagerProps {
    crmItems: AnyCrmItem[];
    actions: AppActions;
    crmCollection: CrmCollectionName;
    crmType: 'investors' | 'customers' | 'partners' | 'accounts';
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

export function AccountManager({
    crmItems,
    actions,
    crmCollection,
    crmType,
    workspaceId,
    onViewAccount
}: AccountManagerProps) {
    // Modal state using shared hook
    const addModal = useModal();
    const editModal = useModal<AnyCrmItem>();
    const importModal = useModal();
    const tagModal = useModal<AnyCrmItem>();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterByStatus, setFilterByStatus] = useState<string>('');
    const [filterByPriority, setFilterByPriority] = useState<string>('');
    const [filterByTag, setFilterByTag] = useState<string>('');
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
    const [newTag, setNewTag] = useState('');
    const duplicateModal = useModal();
    const [duplicateGroups, setDuplicateGroups] = useState<AnyCrmItem[][]>([]);
    const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<AnyCrmItem[] | null>(null);
    const [primaryItem, setPrimaryItem] = useState<AnyCrmItem | null>(null);
    
    // Bulk selection using shared hook
    const bulkSelection = useBulkSelection<string>();
    const bulkActionsModal = useModal<'tag' | 'delete' | 'export'>();
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
            case 'accounts': return 'Account';
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
            addModal.close();
        } catch (error) {
            console.error('Error creating account:', error);
            alert('Failed to create account. Please try again.');
        }
    };

    const handleEditAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!editModal.data) return;

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
            await actions.updateCrmItem(crmCollection, editModal.data.id, updates);
            
            editModal.close();
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
        editModal.openWith(item);
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
        addModal.close();
        setFormData(resetFormData());
    };

    const closeEditModal = () => {
        editModal.close();
        setFormData(resetFormData());
    };

    // CSV Export using shared utility
    const exportAccountsToCSV = () => {
        if (filteredItems.length === 0) {
            alert('No accounts to export');
            return;
        }

        const csvData = filteredItems.map(item => ({
            company: item.company,
            status: item.status,
            priority: item.priority,
            contacts: (item.contacts || []).map(c => c.name).join('; '),
            next_action: item.nextAction || '',
            next_action_date: item.nextActionDate || ''
        }));

        const csv = toCSV(csvData, {
            fields: ['company', 'status', 'priority', 'contacts', 'next_action', 'next_action_date'],
            headerNames: {
                company: 'Company',
                status: 'Status', 
                priority: 'Priority',
                contacts: 'Contacts',
                next_action: 'Next Action',
                next_action_date: 'Next Action Date'
            }
        });

        downloadCSV(csv, createCSVFilename(crmType));
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
        duplicateModal.open();
    };

    // Bulk Operations - using shared hook
    const handleBulkAction = (action: 'tag' | 'delete' | 'export') => {
        if (bulkSelection.selectedCount === 0) {
            alert('Please select at least one account');
            return;
        }
        bulkActionsModal.openWith(action);
    };

    const executeBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${bulkSelection.selectedCount} account(s)? This cannot be undone.`)) {
            return;
        }

        try {
            const selectedItems = crmItems.filter(i => bulkSelection.isSelected(i.id));
            let successCount = 0;

            for (const item of selectedItems) {
                await actions.deleteItem(crmCollection, item.id);
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            alert(`Successfully deleted ${successCount} account(s)`);
            bulkActionsModal.close();
            bulkSelection.disableSelectionMode();
        } catch (error) {
            console.error('Error bulk deleting:', error);
            alert('Failed to delete some accounts');
        }
    };

    const executeBulkExport = () => {
        const selectedItems = crmItems.filter(i => bulkSelection.isSelected(i.id));
        
        if (selectedItems.length === 0) {
            alert('No accounts selected for export');
            return;
        }

        const csvData = selectedItems.map(item => ({
            company: item.company,
            status: item.status,
            priority: item.priority,
            contacts: (item.contacts || []).map(c => c.name).join('; '),
            next_action: item.nextAction || '',
            next_action_date: item.nextActionDate || ''
        }));

        const csv = toCSV(csvData, {
            fields: ['company', 'status', 'priority', 'contacts', 'next_action', 'next_action_date'],
            headerNames: {
                company: 'Company',
                status: 'Status',
                priority: 'Priority', 
                contacts: 'Contacts',
                next_action: 'Next Action',
                next_action_date: 'Next Action Date'
            }
        });

        downloadCSV(csv, createCSVFilename(`bulk_${crmType}`));

        alert(`Successfully exported ${selectedItems.length} account(s)`);
        bulkActionsModal.close();
        bulkSelection.disableSelectionMode();
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {getCrmTypeLabel()}s
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({filteredItems.length}{filteredItems.length !== crmItems.length ? ` of ${crmItems.length}` : ''})
                        </span>
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    {/* Secondary actions - more subtle */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={exportAccountsToCSV}
                            disabled={filteredItems.length === 0}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Export to CSV"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                        <button
                            onClick={detectDuplicates}
                            disabled={crmItems.length < 2}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Find Duplicates"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button
                            onClick={bulkSelection.toggleSelectionMode}
                            className={`p-2 rounded-md transition-colors ${
                                bulkSelection.isSelectionMode
                                    ? 'text-black bg-gray-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                            title={bulkSelection.isSelectionMode ? 'Exit Bulk Select' : 'Bulk Select'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </button>
                    </div>
                    {/* Primary action */}
                    <button
                        onClick={addModal.open}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add {getCrmTypeLabel()}
                    </button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {bulkSelection.isSelectionMode && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">
                            {bulkSelection.selectedCount} selected
                        </span>
                        <button
                            onClick={() => bulkSelection.selectAll(filteredItems.map(i => i.id))}
                            className="text-sm text-gray-600 hover:text-black hover:underline"
                        >
                            Select all {filteredItems.length}
                        </button>
                        {bulkSelection.selectedCount > 0 && (
                            <button
                                onClick={bulkSelection.clearSelection}
                                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleBulkAction('export')}
                            disabled={bulkSelection.selectedCount === 0}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Export
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            disabled={bulkSelection.selectedCount === 0}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
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
                                onChange={(e) => setSearchQuery(e.target.value)}
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
                        onChange={(e) => setFilterByStatus(e.target.value)}
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
                        onChange={(e) => setFilterByPriority(e.target.value)}
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
                                onChange={(e) => setFilterByTag(e.target.value)}
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
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
                    >
                        <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        More filters
                    </button>
                    {(filterByContactCount !== 'any' || filterByNoteCount !== 'any' || filterOverdue) && (
                        <button
                            onClick={() => {
                                setFilterByContactCount('any');
                                setFilterByNoteCount('any');
                                setFilterOverdue(false);
                            }}
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
                                onChange={(e) => setFilterByContactCount(e.target.value as any)}
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
                                onChange={(e) => setFilterByNoteCount(e.target.value as any)}
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
                                    onChange={(e) => setFilterOverdue(e.target.checked)}
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

            {/* Analytics Dashboard */}
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

            {/* View Controls and Sort */}
            <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Sort:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="text-sm bg-white border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                        <option value="company">Company</option>
                        <option value="priority">Priority</option>
                        <option value="status">Status</option>
                        <option value="value">Value</option>
                        <option value="lastContact">Last Contact</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
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
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 text-sm transition-colors ${
                            viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
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

            {/* Account List */}
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'} max-h-[500px] overflow-y-auto`}>
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 col-span-full">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <p className="text-gray-500 mb-3">No {crmType === 'accounts' ? 'accounts' : crmType} found</p>
                        <button
                            onClick={addModal.open}
                            className="text-sm font-medium text-black hover:underline"
                        >
                            Add your first {crmType === 'accounts' ? 'account' : crmType.slice(0, -1)}
                        </button>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const isSelected = bulkSelection.isSelected(item.id);
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
                                className={`bg-white rounded-lg border p-4 hover:shadow-md transition-all ${
                                    isSelected 
                                        ? 'border-black bg-gray-50 ring-2 ring-black ring-opacity-20' 
                                        : isOverdue 
                                            ? 'border-red-300 bg-red-50/30' 
                                            : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {bulkSelection.isSelectionMode && (
                                        <div className="flex-shrink-0 pt-1">
                                            <label htmlFor={`bulk-select-${item.id}`} className="sr-only">
                                                Select {item.company}
                                            </label>
                                            <input
                                                id={`bulk-select-${item.id}`}
                                                name={`bulk-select-${item.id}`}
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => bulkSelection.toggleItem(item.id)}
                                                className="w-4 h-4 cursor-pointer accent-black rounded"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex-grow min-w-0">
                                                <h4 className="font-semibold text-base text-gray-900 truncate mb-1">
                                                    {item.company}
                                                </h4>
                                                {(item.contacts || []).length > 0 && (
                                                    <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {item.contacts![0].name}
                                                        {item.contacts!.length > 1 && (
                                                            <span className="text-gray-400 text-xs">+{item.contacts!.length - 1}</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                {'checkSize' in item && item.checkSize && (
                                                    <div className="bg-green-50 px-2.5 py-1 rounded-md">
                                                        <div className="font-semibold text-sm text-green-700">
                                                            ${(item.checkSize / 1000).toFixed(0)}K
                                                        </div>
                                                        <div className="text-[10px] text-green-600">Check Size</div>
                                                    </div>
                                                )}
                                                {'dealValue' in item && item.dealValue && (
                                                    <div className="bg-gray-100 px-2.5 py-1 rounded-md">
                                                        <div className="font-semibold text-sm text-gray-800">
                                                            ${(item.dealValue / 1000).toFixed(0)}K
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">Deal Value</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Status badges row */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                item.priority === 'High' 
                                                    ? 'bg-red-100 text-red-700' 
                                                    : item.priority === 'Medium' 
                                                        ? 'bg-yellow-100 text-yellow-700' 
                                                        : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {item.priority}
                                            </span>
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                                {item.status}
                                            </span>
                                            {item.assignedToName && (
                                                <span className="px-2 py-0.5 bg-gray-50 rounded text-xs text-gray-500 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                    {item.assignedToName}
                                                </span>
                                            )}
                                            {isOverdue && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                                    Overdue
                                                </span>
                                            )}
                                        </div>

                                        {/* Stats row */}
                                        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{(item.contacts || []).length}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>{(item.notes || []).length}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Folder className="w-3.5 h-3.5" />
                                                <span>{((item as any).documents || []).length}</span>
                                            </div>
                                            {daysSinceContact !== null && (
                                                <div className={`flex items-center gap-1 ${daysSinceContact > 30 ? 'text-red-500 font-medium' : ''}`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{daysSinceContact}d</span>
                                                </div>
                                            )}
                                        </div>

                                        {item.nextAction && (
                                            <div className="bg-gray-50 rounded-md p-2.5 mb-2 border-l-2 border-gray-800">
                                                <p className="text-sm text-gray-700">{item.nextAction}</p>
                                                {item.nextActionDate && (
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { 
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
                                            <div className="bg-gray-50/50 rounded-md p-2 border-l-2 border-gray-300">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Latest Note</p>
                                                <p className="text-xs text-gray-600 line-clamp-2">{lastNote.text}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Action buttons */}
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        {onViewAccount && (
                                            <button
                                                onClick={() => onViewAccount(item)}
                                                className="flex items-center justify-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 text-xs rounded-md font-medium hover:bg-gray-800 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="flex items-center justify-center gap-1.5 bg-white text-gray-700 border border-gray-200 px-3 py-1.5 text-xs rounded-md font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAccount(item)}
                                            className="flex items-center justify-center bg-white text-gray-400 border border-gray-200 px-3 py-1.5 text-xs rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
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
                isOpen={addModal.isOpen}
                onClose={closeAddModal}
                title={`Add New ${getCrmTypeLabel()}`}
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
                isOpen={editModal.isOpen}
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
                isOpen={bulkActionsModal.isOpen}
                onClose={bulkActionsModal.close}
                title={`Bulk ${bulkActionsModal.data === 'delete' ? 'Delete' : 'Export'}`}
            >
                <div className="space-y-4">
                    {bulkActionsModal.data === 'delete' && (
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Are you sure you want to delete {bulkSelection.selectedCount} account(s)? This action cannot be undone and will also delete all associated contacts, tasks, and data.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={executeBulkDelete}
                                    className="flex-1 font-mono bg-red-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-red-600 transition-all"
                                >
                                    Confirm Delete
                                </button>
                                <button
                                    onClick={bulkActionsModal.close}
                                    className="flex-1 font-mono bg-gray-200 text-black border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {bulkActionsModal.data === 'export' && (
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Export {bulkSelection.selectedCount} selected account(s) to CSV file.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={executeBulkExport}
                                    className="flex-1 font-mono bg-blue-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                                >
                                    Export to CSV
                                </button>
                                <button
                                    onClick={bulkActionsModal.close}
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
                isOpen={duplicateModal.isOpen}
                onClose={() => {
                    duplicateModal.close();
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
                                onClick={duplicateModal.close}
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
