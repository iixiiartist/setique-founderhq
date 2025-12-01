import { useState, useMemo, useCallback } from 'react';
import { AnyCrmItem, AppActions, CrmCollectionName, Investor, Customer, Partner, Priority } from '../../../../types';
import { AccountFormData } from '../AccountForm';

interface UseAccountManagerProps {
    crmItems: AnyCrmItem[];
    actions: AppActions;
    crmCollection: CrmCollectionName;
    crmType: 'investors' | 'customers' | 'partners' | 'accounts';
}

export function useAccountManager({
    crmItems,
    actions,
    crmCollection,
    crmType
}: UseAccountManagerProps) {
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);

    // Selection states
    const [selectedItem, setSelectedItem] = useState<AnyCrmItem | null>(null);
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<'tag' | 'delete' | 'export' | null>(null);
    const [duplicateGroups, setDuplicateGroups] = useState<AnyCrmItem[][]>([]);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterByStatus, setFilterByStatus] = useState<string>('');
    const [filterByPriority, setFilterByPriority] = useState<string>('');
    const [filterByTag, setFilterByTag] = useState<string>('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filterByContactCount, setFilterByContactCount] = useState<'any' | 'none' | 'has'>('any');
    const [filterByNoteCount, setFilterByNoteCount] = useState<'any' | 'none' | 'has'>('any');
    const [filterOverdue, setFilterOverdue] = useState(false);

    // View states
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<'company' | 'priority' | 'status' | 'value' | 'lastContact'>('company');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Form state
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

    // Check if advanced filters are active
    const hasActiveAdvancedFilters = useMemo(() => {
        return filterByContactCount !== 'any' || filterByNoteCount !== 'any' || filterOverdue;
    }, [filterByContactCount, filterByNoteCount, filterOverdue]);

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

    const getCrmTypeLabel = useCallback(() => {
        switch (crmType) {
            case 'investors': return 'Investor';
            case 'customers': return 'Customer';
            case 'partners': return 'Partner';
            case 'accounts': return 'Account';
            default: return 'Account';
        }
    }, [crmType]);

    const resetFormData = useCallback((): AccountFormData => ({
        company: '',
        priority: 'Medium' as Priority,
        status: 'Active',
        nextAction: '',
        nextActionDate: '',
        nextActionTime: '',
        website: '',
        industry: '',
        description: ''
    }), []);

    // Form handlers
    const handleAddAccount = useCallback(async (e: React.FormEvent) => {
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
            
            setFormData(resetFormData());
            setShowAddModal(false);
        } catch (error) {
            console.error('Error creating account:', error);
            alert('Failed to create account. Please try again.');
        }
    }, [formData, crmType, crmCollection, actions, resetFormData]);

    const handleEditAccount = useCallback(async (e: React.FormEvent) => {
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
    }, [selectedItem, formData, crmType, crmCollection, actions, resetFormData]);

    const handleDeleteAccount = useCallback(async (item: AnyCrmItem) => {
        if (!confirm(`Delete ${item.company}? This will also delete all contacts, tasks, meetings, and notes.`)) return;

        try {
            await actions.deleteItem(crmCollection, item.id);
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Failed to delete account. Please try again.');
        }
    }, [crmCollection, actions]);

    const openEditModal = useCallback((item: AnyCrmItem) => {
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
    }, []);

    const closeAddModal = useCallback(() => {
        setShowAddModal(false);
        setFormData(resetFormData());
    }, [resetFormData]);

    const closeEditModal = useCallback(() => {
        setShowEditModal(false);
        setSelectedItem(null);
        setFormData(resetFormData());
    }, [resetFormData]);

    // Export function
    const exportAccountsToCSV = useCallback(() => {
        if (filteredItems.length === 0) {
            alert('No accounts to export');
            return;
        }

        const headers = ['company', 'status', 'priority', 'contacts', 'next_action', 'next_action_date'];
        const csvRows = [headers.join(',')];

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
    }, [filteredItems, crmType]);

    // Duplicate detection
    const detectDuplicates = useCallback(() => {
        const groups: AnyCrmItem[][] = [];
        const processed = new Set<string>();

        crmItems.forEach((item, index) => {
            if (processed.has(item.id)) return;

            const potentialDuplicates: AnyCrmItem[] = [item];
            processed.add(item.id);

            for (let i = index + 1; i < crmItems.length; i++) {
                const other = crmItems[i];
                if (processed.has(other.id)) continue;

                const name1 = item.company.toLowerCase().trim();
                const name2 = other.company.toLowerCase().trim();

                let isDuplicate = false;

                if (name1 === name2) {
                    isDuplicate = true;
                }

                if (!isDuplicate && (name1.includes(name2) || name2.includes(name1))) {
                    isDuplicate = true;
                }

                if (isDuplicate) {
                    potentialDuplicates.push(other);
                    processed.add(other.id);
                }
            }

            if (potentialDuplicates.length > 1) {
                groups.push(potentialDuplicates);
            }
        });

        setDuplicateGroups(groups);
        setShowDuplicateModal(true);
    }, [crmItems]);

    // Bulk operations
    const toggleBulkSelect = useCallback(() => {
        setBulkSelectMode(!bulkSelectMode);
        setSelectedItemIds(new Set());
    }, [bulkSelectMode]);

    const toggleItemSelection = useCallback((itemId: string) => {
        const newSet = new Set(selectedItemIds);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setSelectedItemIds(newSet);
    }, [selectedItemIds]);

    const selectAllFiltered = useCallback(() => {
        const allIds = new Set(filteredItems.map(i => i.id));
        setSelectedItemIds(allIds);
    }, [filteredItems]);

    const deselectAll = useCallback(() => {
        setSelectedItemIds(new Set());
    }, []);

    const handleBulkAction = useCallback((action: 'tag' | 'delete' | 'export') => {
        if (selectedItemIds.size === 0) {
            alert('Please select at least one account');
            return;
        }
        setBulkAction(action);
        setShowBulkActionsModal(true);
    }, [selectedItemIds.size]);

    const executeBulkDelete = useCallback(async () => {
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
    }, [selectedItemIds, crmItems, crmCollection, actions]);

    const executeBulkExport = useCallback(() => {
        const selectedItems = crmItems.filter(i => selectedItemIds.has(i.id));
        
        if (selectedItems.length === 0) {
            alert('No accounts selected for export');
            return;
        }

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
    }, [selectedItemIds, crmItems, crmType]);

    const clearAdvancedFilters = useCallback(() => {
        setFilterByContactCount('any');
        setFilterByNoteCount('any');
        setFilterOverdue(false);
    }, []);

    return {
        // Modal states
        showAddModal,
        setShowAddModal,
        showEditModal,
        setShowEditModal,
        showDuplicateModal,
        setShowDuplicateModal,
        showBulkActionsModal,
        setShowBulkActionsModal,
        
        // Selection states
        selectedItem,
        setSelectedItem,
        bulkSelectMode,
        setBulkSelectMode,
        selectedItemIds,
        setSelectedItemIds,
        bulkAction,
        setBulkAction,
        duplicateGroups,
        setDuplicateGroups,
        
        // Filter states
        searchQuery,
        setSearchQuery,
        filterByStatus,
        setFilterByStatus,
        filterByPriority,
        setFilterByPriority,
        filterByTag,
        setFilterByTag,
        showAdvancedFilters,
        setShowAdvancedFilters,
        filterByContactCount,
        setFilterByContactCount,
        filterByNoteCount,
        setFilterByNoteCount,
        filterOverdue,
        setFilterOverdue,
        hasActiveAdvancedFilters,
        clearAdvancedFilters,
        
        // View states
        viewMode,
        setViewMode,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        
        // Form state
        formData,
        setFormData,
        
        // Computed values
        allTags,
        allStatuses,
        filteredItems,
        analytics,
        getCrmTypeLabel,
        
        // Form handlers
        handleAddAccount,
        handleEditAccount,
        handleDeleteAccount,
        openEditModal,
        closeAddModal,
        closeEditModal,
        resetFormData,
        
        // Export & duplicates
        exportAccountsToCSV,
        detectDuplicates,
        
        // Bulk operations
        toggleBulkSelect,
        toggleItemSelection,
        selectAllFiltered,
        deselectAll,
        handleBulkAction,
        executeBulkDelete,
        executeBulkExport,
    };
}

export default useAccountManager;
