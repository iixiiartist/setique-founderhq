import React from 'react';
import { AnyCrmItem, AppActions, CrmCollectionName } from '../../../types';
import Modal from '../../shared/Modal';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { useAccountManager } from './hooks/useAccountManager';
import { AccountHeader, BulkActionsBar, AccountAnalytics, ViewControls } from './AccountHeader';
import { AccountFilters } from './AccountFilters';
import { AccountList } from './AccountList';
import { AccountForm } from './AccountForm';
import { BulkActionsModal, DuplicateModal } from './AccountModals';

interface AccountManagerRefactoredProps {
    crmItems: AnyCrmItem[];
    actions: AppActions;
    crmCollection: CrmCollectionName;
    crmType: 'investors' | 'customers' | 'partners' | 'accounts';
    workspaceId?: string;
    onViewAccount?: (item: AnyCrmItem) => void;
}

export function AccountManagerRefactored({
    crmItems,
    actions,
    crmCollection,
    crmType,
    workspaceId,
    onViewAccount
}: AccountManagerRefactoredProps) {
    const manager = useAccountManager({
        crmItems,
        actions,
        crmCollection,
        crmType
    });

    const crmTypeLabel = manager.getCrmTypeLabel();

    return (
        <div className="space-y-5">
            {/* Header */}
            <AccountHeader
                crmTypeLabel={crmTypeLabel}
                filteredCount={manager.filteredItems.length}
                totalCount={crmItems.length}
                onExport={manager.exportAccountsToCSV}
                onDetectDuplicates={manager.detectDuplicates}
                onToggleBulkSelect={manager.toggleBulkSelect}
                onAddAccount={() => manager.setShowAddModal(true)}
                bulkSelectMode={manager.bulkSelectMode}
                canExport={manager.filteredItems.length > 0}
                canDetectDuplicates={crmItems.length >= 2}
            />

            {/* Bulk Actions Bar */}
            {manager.bulkSelectMode && (
                <BulkActionsBar
                    selectedCount={manager.selectedItemIds.size}
                    filteredCount={manager.filteredItems.length}
                    onSelectAll={manager.selectAllFiltered}
                    onDeselectAll={manager.deselectAll}
                    onBulkExport={() => manager.handleBulkAction('export')}
                    onBulkDelete={() => manager.handleBulkAction('delete')}
                />
            )}

            {/* Search and Filters */}
            <AccountFilters
                searchQuery={manager.searchQuery}
                onSearchChange={manager.setSearchQuery}
                filterByStatus={manager.filterByStatus}
                onFilterByStatusChange={manager.setFilterByStatus}
                filterByPriority={manager.filterByPriority}
                onFilterByPriorityChange={manager.setFilterByPriority}
                filterByTag={manager.filterByTag}
                onFilterByTagChange={manager.setFilterByTag}
                allStatuses={manager.allStatuses}
                allTags={manager.allTags}
                showAdvancedFilters={manager.showAdvancedFilters}
                onToggleAdvancedFilters={() => manager.setShowAdvancedFilters(!manager.showAdvancedFilters)}
                filterByContactCount={manager.filterByContactCount}
                onFilterByContactCountChange={manager.setFilterByContactCount}
                filterByNoteCount={manager.filterByNoteCount}
                onFilterByNoteCountChange={manager.setFilterByNoteCount}
                filterOverdue={manager.filterOverdue}
                onFilterOverdueChange={manager.setFilterOverdue}
                onClearAdvancedFilters={manager.clearAdvancedFilters}
                hasActiveAdvancedFilters={manager.hasActiveAdvancedFilters}
            />

            {/* Analytics Dashboard */}
            <AccountAnalytics analytics={manager.analytics} />

            {/* View Controls and Sort */}
            <ViewControls
                sortBy={manager.sortBy}
                onSortByChange={manager.setSortBy}
                sortOrder={manager.sortOrder}
                onSortOrderToggle={() => manager.setSortOrder(manager.sortOrder === 'asc' ? 'desc' : 'asc')}
                viewMode={manager.viewMode}
                onViewModeChange={manager.setViewMode}
            />

            {/* Account List */}
            <AccountList
                items={manager.filteredItems}
                viewMode={manager.viewMode}
                bulkSelectMode={manager.bulkSelectMode}
                selectedItemIds={manager.selectedItemIds}
                onToggleSelection={manager.toggleItemSelection}
                onViewAccount={onViewAccount}
                onEdit={manager.openEditModal}
                onDelete={manager.handleDeleteAccount}
                crmType={crmType}
                onAddClick={() => manager.setShowAddModal(true)}
            />

            {/* Add Modal */}
            <Modal
                isOpen={manager.showAddModal}
                onClose={manager.closeAddModal}
                title={`Add New ${crmTypeLabel}`}
            >
                <AccountForm
                    formData={manager.formData}
                    onFormDataChange={manager.setFormData}
                    onSubmit={manager.handleAddAccount}
                    onCancel={manager.closeAddModal}
                    crmType={crmType}
                    crmTypeLabel={crmTypeLabel}
                    mode="add"
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={manager.showEditModal}
                onClose={manager.closeEditModal}
                title={`Edit ${crmTypeLabel}`}
            >
                <AccountForm
                    formData={manager.formData}
                    onFormDataChange={manager.setFormData}
                    onSubmit={manager.handleEditAccount}
                    onCancel={manager.closeEditModal}
                    crmType={crmType}
                    crmTypeLabel={crmTypeLabel}
                    mode="edit"
                />
            </Modal>

            {/* Bulk Actions Modal */}
            <BulkActionsModal
                isOpen={manager.showBulkActionsModal}
                onClose={() => {
                    manager.setShowBulkActionsModal(false);
                    manager.setBulkAction(null);
                }}
                bulkAction={manager.bulkAction}
                selectedCount={manager.selectedItemIds.size}
                onConfirmDelete={manager.executeBulkDelete}
                onConfirmExport={manager.executeBulkExport}
            />

            {/* Duplicate Detection Modal */}
            <DuplicateModal
                isOpen={manager.showDuplicateModal}
                onClose={() => {
                    manager.setShowDuplicateModal(false);
                    manager.setDuplicateGroups([]);
                }}
                duplicateGroups={manager.duplicateGroups}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={manager.deleteAccountConfirm.isOpen}
                onClose={manager.deleteAccountConfirm.cancel}
                onConfirm={manager.deleteAccountConfirm.confirm}
                title={manager.deleteAccountConfirm.title}
                message={`${manager.deleteAccountConfirm.message} This will also delete all contacts, tasks, meetings, and notes.`}
                confirmLabel={manager.deleteAccountConfirm.confirmLabel}
                cancelLabel={manager.deleteAccountConfirm.cancelLabel}
                variant={manager.deleteAccountConfirm.variant}
                isLoading={manager.deleteAccountConfirm.isProcessing}
            />

            {/* Bulk Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={manager.bulkDeleteConfirm.isOpen}
                onClose={manager.bulkDeleteConfirm.cancel}
                onConfirm={manager.bulkDeleteConfirm.confirm}
                title="Delete Selected Accounts"
                message={`Are you sure you want to delete ${manager.selectedItemIds.size} account(s)? This will also delete all associated contacts, tasks, meetings, and notes. This cannot be undone.`}
                confirmLabel="Delete All"
                cancelLabel="Cancel"
                variant="danger"
                isLoading={manager.bulkDeleteConfirm.isProcessing}
            />
        </div>
    );
}

export default AccountManagerRefactored;
