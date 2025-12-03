/**
 * useAccountManagerShared Hook
 * 
 * Unified account manager hook that uses shared primitives.
 * Replaces duplicate logic in:
 * - components/crm/accounts/hooks/useAccountManager.ts
 * - components/shared/AccountManager.tsx (inline state)
 * 
 * This hook composes:
 * - useAccountFilters for filtering/sorting
 * - useCrmSelection for bulk selection
 * - useCsvImportExport for import/export
 * - useModal for modal state
 */

import { useState, useCallback, useMemo } from 'react';
import { AnyCrmItem, AppActions, CrmCollectionName, Investor, Customer, Partner, Priority } from '../../../../types';
import { useAccountFilters } from '../../../../hooks/useCrmFilters';
import { useCrmSelection } from '../../../../hooks/useCrmSelection';
import { useCsvImportExport } from '../../../../hooks/useCsvImportExport';
import { useModal } from '../../../../hooks/useModal';

// Form data interface
export interface AccountFormData {
  company: string;
  priority: Priority;
  status: string;
  nextAction: string;
  nextActionDate: string;
  nextActionTime: string;
  website?: string;
  industry?: string;
  description?: string;
  // Enrichment fields
  location?: string;
  companySize?: string;
  foundedYear?: string;
  linkedin?: string;
  twitter?: string;
  // Type selection (used when creating from "all accounts" view)
  accountType?: 'investor' | 'customer' | 'partner';
  // Type-specific fields
  checkSize?: number;
  stage?: string;
  dealValue?: number;
  dealStage?: string;
  opportunity?: string;
  partnerType?: string;
}

const INITIAL_FORM_DATA: AccountFormData = {
  company: '',
  priority: 'Medium',
  status: 'Active',
  nextAction: '',
  nextActionDate: '',
  nextActionTime: '',
  website: '',
  industry: '',
  description: '',
  location: '',
  companySize: '',
  foundedYear: '',
  linkedin: '',
  twitter: '',
};

export interface UseAccountManagerSharedOptions {
  crmItems: AnyCrmItem[];
  actions: AppActions;
  crmCollection: CrmCollectionName;
  crmType: 'investors' | 'customers' | 'partners' | 'accounts';
  workspaceId?: string;
}

export function useAccountManagerShared(options: UseAccountManagerSharedOptions) {
  const { crmItems, actions, crmCollection, crmType, workspaceId } = options;

  // =========================================================================
  // Composed Hooks
  // =========================================================================

  // Filtering and sorting
  const filters = useAccountFilters(crmItems, {
    initialSort: { field: 'company', order: 'asc' },
  });

  // Selection management
  const selection = useCrmSelection<AnyCrmItem>({
    getItemId: (item) => item.id,
  });

  // CSV import/export
  const csv = useCsvImportExport<AnyCrmItem>({
    entityType: crmType,
    processImportRow: async (row) => {
      try {
        const itemData: any = {
          company: row.company?.trim(),
          priority: row.priority || 'Medium',
          status: row.status || 'Active',
          nextAction: row.nextAction,
          nextActionDate: row.nextActionDate,
          website: row.website,
          industry: row.industry,
          description: row.description,
        };

        // Add type-specific fields
        if (crmType === 'investors' && row.checkSize) {
          itemData.checkSize = parseInt(row.checkSize, 10) || undefined;
        }
        if (crmType === 'customers' && row.dealValue) {
          itemData.dealValue = parseInt(row.dealValue, 10) || undefined;
        }
        if (crmType === 'partners' && row.opportunity) {
          itemData.opportunity = row.opportunity;
        }

        const result = await actions.createCrmItem(crmCollection, itemData);
        return { success: result.success, error: result.message };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    transformForExport: (item) => ({
      company: item.company,
      status: item.status,
      priority: item.priority,
      contacts: (item.contacts || []).map(c => c.name).join('; '),
      nextAction: item.nextAction || '',
      nextActionDate: item.nextActionDate || '',
      website: (item as any).website || '',
      industry: (item as any).industry || '',
    }),
  });

  // =========================================================================
  // Modal State
  // =========================================================================

  const addModal = useModal();
  const editModal = useModal<AnyCrmItem>();
  const importModal = useModal();
  const duplicateModal = useModal();
  const bulkActionsModal = useModal<'tag' | 'delete' | 'export'>();

  // =========================================================================
  // Form State
  // =========================================================================

  const [formData, setFormData] = useState<AccountFormData>(INITIAL_FORM_DATA);

  const resetFormData = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
  }, []);

  const populateFormFromItem = useCallback((item: AnyCrmItem) => {
    const formUpdate: AccountFormData = {
      company: item.company,
      priority: item.priority,
      status: item.status,
      nextAction: item.nextAction || '',
      nextActionDate: item.nextActionDate || '',
      nextActionTime: item.nextActionTime || '',
      website: (item as any).website || '',
      industry: (item as any).industry || '',
      description: (item as any).description || '',
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
  }, []);

  // =========================================================================
  // View State
  // =========================================================================

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // =========================================================================
  // Duplicate Detection State
  // =========================================================================

  const [duplicateGroups, setDuplicateGroups] = useState<AnyCrmItem[][]>([]);

  // =========================================================================
  // CRUD Operations
  // =========================================================================

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

      await actions.createCrmItem(crmCollection, itemData);
      resetFormData();
      addModal.close();
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account. Please try again.');
    }
  }, [formData, crmType, crmCollection, actions, resetFormData, addModal]);

  const handleEditAccount = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItem = editModal.data;
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

      await actions.updateCrmItem(crmCollection, selectedItem.id, updates);
      editModal.close();
      resetFormData();
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account. Please try again.');
    }
  }, [editModal.data, formData, crmType, crmCollection, actions, resetFormData, editModal]);

  const handleDeleteAccount = useCallback(async (item: AnyCrmItem) => {
    if (!confirm(`Delete ${item.company}? This will also delete all contacts, tasks, meetings, and notes.`)) {
      return;
    }

    try {
      await actions.deleteItem(crmCollection, item.id);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    }
  }, [crmCollection, actions]);

  // =========================================================================
  // Modal Helpers
  // =========================================================================

  const openEditModal = useCallback((item: AnyCrmItem) => {
    populateFormFromItem(item);
    editModal.openWith(item);
  }, [populateFormFromItem, editModal]);

  const closeAddModal = useCallback(() => {
    resetFormData();
    addModal.close();
  }, [resetFormData, addModal]);

  const closeEditModal = useCallback(() => {
    resetFormData();
    editModal.close();
  }, [resetFormData, editModal]);

  // =========================================================================
  // Duplicate Detection
  // =========================================================================

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
        if (name1 === name2) isDuplicate = true;
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
    duplicateModal.open();
  }, [crmItems, duplicateModal]);

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  const executeBulkDelete = useCallback(async () => {
    if (!confirm(`Are you sure you want to delete ${selection.selectedCount} account(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const selectedItems = selection.getSelectedItems(crmItems);
      let successCount = 0;

      for (const item of selectedItems) {
        await actions.deleteItem(crmCollection, item.id);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      alert(`Successfully deleted ${successCount} account(s)`);
      bulkActionsModal.close();
      selection.disableSelectionMode();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('Failed to delete some accounts');
    }
  }, [selection, crmItems, crmCollection, actions, bulkActionsModal]);

  const executeBulkExport = useCallback(() => {
    csv.exportSelected(crmItems, selection.selectedIds);
    bulkActionsModal.close();
    selection.disableSelectionMode();
  }, [csv, crmItems, selection, bulkActionsModal]);

  // =========================================================================
  // Computed Values
  // =========================================================================

  const getCrmTypeLabel = useCallback(() => {
    switch (crmType) {
      case 'investors': return 'Investor';
      case 'customers': return 'Customer';
      case 'partners': return 'Partner';
      case 'accounts': return 'Account';
      default: return 'Account';
    }
  }, [crmType]);

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Filters (from useAccountFilters)
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    setSorting: filters.setSorting,
    filteredItems: filters.filteredItems,
    totalCount: filters.totalCount,
    originalCount: filters.originalCount,
    hasActiveFilters: filters.hasActiveFilters,
    allTags: filters.allTags,
    allStatuses: filters.allStatuses,
    analytics: filters.analytics,
    // Advanced filters
    advancedFilters: filters.advancedFilters,
    setAdvancedFilter: filters.setAdvancedFilter,
    clearAdvancedFilters: filters.clearAdvancedFilters,
    showAdvancedFilters: filters.showAdvancedFilters,
    setShowAdvancedFilters: filters.setShowAdvancedFilters,
    hasActiveAdvancedFilters: filters.hasActiveAdvancedFilters,

    // Selection (from useCrmSelection)
    isSelectionMode: selection.isSelectionMode,
    selectedIds: selection.selectedIds,
    selectedCount: selection.selectedCount,
    toggleSelectionMode: selection.toggleSelectionMode,
    toggleItem: selection.toggleItem,
    isSelected: selection.isSelected,
    selectAll: () => selection.selectAll(filters.filteredItems),
    clearSelection: selection.clearSelection,
    areAllSelected: () => selection.areAllSelected(filters.filteredItems),

    // CSV (from useCsvImportExport)
    isImporting: csv.isImporting,
    importProgress: csv.importProgress,
    importResult: csv.importResult,
    startImport: csv.startImport,
    clearImportResult: csv.clearImportResult,
    downloadTemplate: csv.downloadTemplate,
    exportItems: () => csv.exportItems(filters.filteredItems),
    exportSelected: () => csv.exportSelected(filters.filteredItems, selection.selectedIds),

    // Modals
    addModal,
    editModal,
    importModal,
    duplicateModal,
    bulkActionsModal,

    // Form
    formData,
    setFormData,
    resetFormData,
    populateFormFromItem,

    // View
    viewMode,
    setViewMode,

    // Duplicates
    duplicateGroups,
    detectDuplicates,

    // CRUD
    handleAddAccount,
    handleEditAccount,
    handleDeleteAccount,
    openEditModal,
    closeAddModal,
    closeEditModal,

    // Bulk
    executeBulkDelete,
    executeBulkExport,

    // Helpers
    getCrmTypeLabel,
  };
}

export default useAccountManagerShared;
