import React from 'react';
import { Contact, AnyCrmItem, AppActions, CrmCollectionName } from '../../../types';
import Modal from '../../shared/Modal';
import { useContactManager } from './hooks/useContactManager';
import { ContactHeader } from './ContactHeader';
import { ContactFilters } from './ContactFilters';
import { ContactList } from './ContactList';
import { ContactForm } from './ContactForm';
import { TagModal, NotesModal, TimelineModal, RelationshipModal } from './ContactModals';
import { CSVImportModal, BulkActionsModal, DuplicateModal } from './ContactBulkModals';

interface ContactManagerProps {
    contacts: Contact[];
    crmItems: AnyCrmItem[];
    actions: AppActions;
    crmType: 'investors' | 'customers' | 'partners';
    workspaceId?: string;
    onViewContact?: (contact: Contact, parentItem: AnyCrmItem) => void;
}

export function ContactManagerRefactored({
    contacts,
    crmItems,
    actions,
    crmType,
    workspaceId,
    onViewContact
}: ContactManagerProps) {
    const manager = useContactManager(contacts, crmItems, actions, crmType);

    // CSV Template Download
    const downloadCSVTemplate = () => {
        const template = `name,email,phone,title,company
John Doe,john@example.com,555-1234,CEO,Acme Corp
Jane Smith,jane@example.com,555-5678,CTO,Tech Inc`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts_import_template.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Parse CSV file
    const parseCSV = (text: string): Array<any> => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            rows.push(row);
        }

        return rows;
    };

    // Handle CSV Import
    const handleCSVImport = async (file: File) => {
        manager.setIsImporting(true);
        manager.setImportProgress(0);
        manager.setImportResult(null);

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            if (rows.length === 0) {
                alert('No valid data found in CSV file');
                manager.setIsImporting(false);
                return;
            }

            const result = {
                success: 0,
                failed: 0,
                errors: [] as Array<{ row: number; error: string; data: any }>
            };

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                manager.setImportProgress(Math.round(((i + 1) / rows.length) * 100));

                try {
                    if (!row.name || !row.email) {
                        result.failed++;
                        result.errors.push({
                            row: i + 2,
                            error: 'Missing required fields (name, email)',
                            data: row
                        });
                        continue;
                    }

                    let crmItemId = '';
                    if (row.company && row.company.trim()) {
                        const existingItem = crmItems.find(
                            item => item.company.toLowerCase() === row.company.trim().toLowerCase()
                        );

                        if (existingItem) {
                            crmItemId = existingItem.id;
                        } else {
                            const createResult = await actions.createCrmItem(crmType, {
                                company: row.company.trim()
                            });
                            if (createResult.success && createResult.itemId) {
                                crmItemId = createResult.itemId;
                            }
                        }
                    }

                    if (!crmItemId) {
                        result.failed++;
                        result.errors.push({
                            row: i + 2,
                            error: 'No company specified or failed to create account',
                            data: row
                        });
                        continue;
                    }

                    const contactResult = await actions.createContact(
                        crmType,
                        crmItemId,
                        {
                            name: row.name.trim(),
                            email: row.email.trim(),
                            phone: row.phone || '',
                            title: row.title || '',
                            linkedin: ''
                        }
                    );

                    if (contactResult.success) {
                        result.success++;
                    } else {
                        result.failed++;
                        result.errors.push({
                            row: i + 2,
                            error: 'Failed to create contact',
                            data: row
                        });
                    }
                } catch (error) {
                    result.failed++;
                    result.errors.push({
                        row: i + 2,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        data: row
                    });
                }

                if (i < rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            manager.setImportResult(result);
        } catch (error) {
            console.error('CSV import error:', error);
            alert('Failed to process CSV file. Please check the format and try again.');
        } finally {
            manager.setIsImporting(false);
            manager.setImportProgress(100);
        }
    };

    // Bulk operations execution
    const executeBulkTag = async () => {
        if (!manager.bulkTagToAdd.trim()) {
            alert('Please enter a tag');
            return;
        }

        try {
            const selectedContacts = contacts.filter(c => manager.selectedContactIds.has(c.id));
            let successCount = 0;

            for (const contact of selectedContacts) {
                const linkedAccount = manager.getLinkedAccount(contact);
                if (linkedAccount) {
                    const currentTags = contact.tags || [];
                    if (!currentTags.includes(manager.bulkTagToAdd.trim())) {
                        await actions.updateContact(
                            crmType,
                            linkedAccount.id,
                            contact.id,
                            { tags: [...currentTags, manager.bulkTagToAdd.trim()] } as any
                        );
                        successCount++;
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            alert(`Successfully added tag "${manager.bulkTagToAdd}" to ${successCount} contact(s)`);
            manager.setBulkTagToAdd('');
            manager.setShowBulkActionsModal(false);
            manager.toggleBulkSelect();
        } catch (error) {
            console.error('Error bulk tagging:', error);
            alert('Failed to add tags to some contacts');
        }
    };

    const executeBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${manager.selectedContactIds.size} contact(s)? This cannot be undone.`)) {
            return;
        }

        try {
            const selectedContacts = contacts.filter(c => manager.selectedContactIds.has(c.id));
            let successCount = 0;

            for (const contact of selectedContacts) {
                const linkedAccount = manager.getLinkedAccount(contact);
                if (linkedAccount) {
                    await actions.deleteContact(crmType, linkedAccount.id, contact.id);
                    successCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            alert(`Successfully deleted ${successCount} contact(s)`);
            manager.setShowBulkActionsModal(false);
            manager.toggleBulkSelect();
        } catch (error) {
            console.error('Error bulk deleting:', error);
            alert('Failed to delete some contacts');
        }
    };

    const executeBulkExport = () => {
        const selectedContacts = contacts.filter(c => manager.selectedContactIds.has(c.id));

        if (selectedContacts.length === 0) {
            alert('No contacts selected for export');
            return;
        }

        const headers = ['name', 'email', 'phone', 'title', 'company', 'tags'];
        const csvRows = [headers.join(',')];

        selectedContacts.forEach(contact => {
            const linkedAccount = manager.getLinkedAccount(contact);
            const row = [
                contact.name,
                contact.email,
                contact.phone || '',
                contact.title || '',
                linkedAccount?.company || '',
                (contact.tags || []).join('; ')
            ];

            const escapedRow = row.map(field => {
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            });

            csvRows.push(escapedRow.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulk_contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert(`Successfully exported ${selectedContacts.length} contact(s)`);
        manager.setShowBulkActionsModal(false);
        manager.toggleBulkSelect();
    };

    // Merge contacts
    const handleMergeContacts = async () => {
        if (!manager.selectedDuplicateGroup || !manager.primaryContact) return;

        try {
            const duplicatesToRemove = manager.selectedDuplicateGroup.filter(c => c.id !== manager.primaryContact!.id);

            const allTagsSet = new Set<string>(manager.primaryContact.tags || []);
            duplicatesToRemove.forEach(dup => {
                dup.tags?.forEach(tag => allTagsSet.add(tag));
            });

            const combinedNotes = [...(manager.primaryContact.notes || [])];
            duplicatesToRemove.forEach(dup => {
                if (dup.notes && dup.notes.length > 0) {
                    combinedNotes.push({
                        text: `--- Merged from ${dup.name} ---`,
                        timestamp: Date.now(),
                    } as any);
                    combinedNotes.push(...dup.notes);
                }
            });

            const linkedAccount = manager.getLinkedAccount(manager.primaryContact);
            if (linkedAccount) {
                await actions.updateContact(
                    crmType,
                    linkedAccount.id,
                    manager.primaryContact.id,
                    {
                        tags: Array.from(allTagsSet),
                        notes: combinedNotes,
                        phone: manager.primaryContact.phone || duplicatesToRemove.find(d => d.phone)?.phone || '',
                        title: manager.primaryContact.title || duplicatesToRemove.find(d => d.title)?.title || '',
                    } as any
                );

                for (const duplicate of duplicatesToRemove) {
                    const dupLinkedAccount = manager.getLinkedAccount(duplicate);
                    if (dupLinkedAccount) {
                        await actions.deleteContact(crmType, dupLinkedAccount.id, duplicate.id);
                    }
                }

                alert(`Successfully merged ${duplicatesToRemove.length} duplicate contact(s) into ${manager.primaryContact.name}`);

                manager.setSelectedDuplicateGroup(null);
                manager.setPrimaryContact(null);
                manager.detectDuplicates();
            }
        } catch (error) {
            console.error('Error merging contacts:', error);
            alert('Failed to merge contacts');
        }
    };

    return (
        <div className="space-y-4">
            <ContactHeader
                filteredCount={manager.filteredContacts.length}
                totalCount={contacts.length}
                bulkSelectMode={manager.bulkSelectMode}
                selectedCount={manager.selectedContactIds.size}
                onExport={manager.exportContactsToCSV}
                onImport={() => manager.setShowImportModal(true)}
                onDetectDuplicates={manager.detectDuplicates}
                onToggleBulkSelect={manager.toggleBulkSelect}
                onSelectAll={manager.selectAllFilteredContacts}
                onDeselectAll={manager.deselectAllContacts}
                onBulkTag={() => {
                    if (manager.selectedContactIds.size === 0) {
                        alert('Please select at least one contact');
                        return;
                    }
                    manager.setBulkAction('tag');
                    manager.setShowBulkActionsModal(true);
                }}
                onBulkExport={() => {
                    if (manager.selectedContactIds.size === 0) {
                        alert('Please select at least one contact');
                        return;
                    }
                    manager.setBulkAction('export');
                    manager.setShowBulkActionsModal(true);
                }}
                onBulkDelete={() => {
                    if (manager.selectedContactIds.size === 0) {
                        alert('Please select at least one contact');
                        return;
                    }
                    manager.setBulkAction('delete');
                    manager.setShowBulkActionsModal(true);
                }}
                onAdd={() => manager.setShowAddModal(true)}
            />

            <ContactFilters
                searchQuery={manager.searchQuery}
                onSearchChange={manager.setSearchQuery}
                filterBy={manager.filterBy}
                onFilterByChange={manager.setFilterBy}
                filterByTag={manager.filterByTag}
                onFilterByTagChange={manager.setFilterByTag}
                allTags={manager.allTags}
                crmTypeLabel={manager.getCrmTypeLabel()}
                showAdvancedFilters={manager.showAdvancedFilters}
                onToggleAdvancedFilters={() => manager.setShowAdvancedFilters(!manager.showAdvancedFilters)}
                filterByTitle={manager.filterByTitle}
                onFilterByTitleChange={manager.setFilterByTitle}
                filterByNoteCount={manager.filterByNoteCount}
                onFilterByNoteCountChange={manager.setFilterByNoteCount}
                filterByMeetingCount={manager.filterByMeetingCount}
                onFilterByMeetingCountChange={manager.setFilterByMeetingCount}
                onClearAdvancedFilters={manager.clearAdvancedFilters}
                hasActiveAdvancedFilters={manager.hasActiveAdvancedFilters}
            />

            <ContactList
                contacts={manager.filteredContacts}
                getLinkedAccount={manager.getLinkedAccount}
                selectedContactIds={manager.selectedContactIds}
                bulkSelectMode={manager.bulkSelectMode}
                crmItems={crmItems}
                onToggleSelection={manager.toggleContactSelection}
                onViewContact={onViewContact}
                onEdit={manager.openEditModal}
                onDelete={manager.handleDeleteContact}
                onOpenTags={manager.openTagModal}
                onOpenNotes={manager.openNotesModal}
                onOpenTimeline={manager.openTimelineModal}
                onOpenRelationships={manager.openRelationshipModal}
                onRemoveTag={manager.handleRemoveTag}
                onAddClick={() => manager.setShowAddModal(true)}
            />

            {/* Add Contact Modal */}
            <Modal
                isOpen={manager.showAddModal}
                onClose={() => {
                    manager.setShowAddModal(false);
                    manager.resetFormData();
                }}
                title="Add New Contact"
            >
                <ContactForm
                    formData={manager.formData}
                    onFormDataChange={(data) => manager.setFormData(prev => ({ ...prev, ...data }))}
                    onSubmit={manager.handleAddContact}
                    onCancel={() => {
                        manager.setShowAddModal(false);
                        manager.resetFormData();
                    }}
                    crmItems={crmItems}
                    crmTypeLabel={manager.getCrmTypeLabel()}
                    isEdit={false}
                />
            </Modal>

            {/* Edit Contact Modal */}
            <Modal
                isOpen={manager.showEditModal}
                onClose={() => {
                    manager.setShowEditModal(false);
                    manager.setSelectedContact(null);
                    manager.resetFormData();
                }}
                title="Edit Contact"
            >
                <ContactForm
                    formData={manager.formData}
                    onFormDataChange={(data) => manager.setFormData(prev => ({ ...prev, ...data }))}
                    onSubmit={manager.handleEditContact}
                    onCancel={() => {
                        manager.setShowEditModal(false);
                        manager.setSelectedContact(null);
                        manager.resetFormData();
                    }}
                    crmItems={crmItems}
                    crmTypeLabel={manager.getCrmTypeLabel()}
                    isEdit={true}
                />
            </Modal>

            {/* Tag Modal */}
            <TagModal
                isOpen={manager.showTagModal}
                onClose={() => {
                    manager.setShowTagModal(false);
                    manager.setSelectedContact(null);
                    manager.setNewTag('');
                }}
                contact={manager.selectedContact}
                newTag={manager.newTag}
                onNewTagChange={manager.setNewTag}
                onAddTag={manager.handleAddTag}
                onRemoveTag={(tag) => manager.selectedContact && manager.handleRemoveTag(manager.selectedContact, tag)}
                allTags={manager.allTags}
            />

            {/* Notes Modal */}
            <NotesModal
                isOpen={manager.showNotesModal}
                onClose={() => {
                    manager.setShowNotesModal(false);
                    manager.setSelectedContact(null);
                    manager.setNoteDraft('');
                    manager.setEditingNoteTimestamp(null);
                }}
                contact={manager.selectedContact}
                noteDraft={manager.noteDraft}
                onNoteDraftChange={manager.setNoteDraft}
                editingNoteTimestamp={manager.editingNoteTimestamp}
                onAddNote={manager.handleAddNote}
                onUpdateNote={manager.handleUpdateNote}
                onDeleteNote={manager.handleDeleteNote}
                onStartEditNote={(timestamp, text) => {
                    manager.setEditingNoteTimestamp(timestamp);
                    manager.setNoteDraft(text);
                }}
                onCancelEdit={() => {
                    manager.setEditingNoteTimestamp(null);
                    manager.setNoteDraft('');
                }}
            />

            {/* Timeline Modal */}
            <TimelineModal
                isOpen={manager.showTimelineModal}
                onClose={() => {
                    manager.setShowTimelineModal(false);
                    manager.setSelectedContact(null);
                }}
                contact={manager.selectedContact}
            />

            {/* Relationship Modal */}
            <RelationshipModal
                isOpen={manager.showRelationshipModal}
                onClose={() => {
                    manager.setShowRelationshipModal(false);
                    manager.setSelectedContact(null);
                }}
                contact={manager.selectedContact}
                getLinkedAccount={manager.getLinkedAccount}
                allContacts={contacts}
            />

            {/* CSV Import Modal */}
            <CSVImportModal
                isOpen={manager.showImportModal}
                onClose={() => {
                    if (!manager.isImporting) {
                        manager.setShowImportModal(false);
                        manager.setImportResult(null);
                        manager.setImportProgress(0);
                    }
                }}
                isImporting={manager.isImporting}
                importProgress={manager.importProgress}
                importResult={manager.importResult}
                onDownloadTemplate={downloadCSVTemplate}
                onFileSelect={handleCSVImport}
            />

            {/* Bulk Actions Modal */}
            <BulkActionsModal
                isOpen={manager.showBulkActionsModal}
                onClose={() => {
                    manager.setShowBulkActionsModal(false);
                    manager.setBulkAction(null);
                    manager.setBulkTagToAdd('');
                }}
                action={manager.bulkAction}
                selectedCount={manager.selectedContactIds.size}
                bulkTagToAdd={manager.bulkTagToAdd}
                onBulkTagChange={manager.setBulkTagToAdd}
                allTags={manager.allTags}
                onExecuteBulkTag={executeBulkTag}
                onExecuteBulkDelete={executeBulkDelete}
                onExecuteBulkExport={executeBulkExport}
            />

            {/* Duplicate Detection Modal */}
            <DuplicateModal
                isOpen={manager.showDuplicateModal}
                onClose={() => {
                    manager.setShowDuplicateModal(false);
                    manager.setSelectedDuplicateGroup(null);
                    manager.setPrimaryContact(null);
                }}
                duplicateGroups={manager.duplicateGroups}
                selectedDuplicateGroup={manager.selectedDuplicateGroup}
                primaryContact={manager.primaryContact}
                onSelectPrimary={manager.setPrimaryContact}
                onStartMergeWorkflow={(group) => {
                    manager.setSelectedDuplicateGroup(group);
                    manager.setPrimaryContact(group[0]);
                }}
                onMergeContacts={handleMergeContacts}
                onCancelMerge={() => {
                    manager.setSelectedDuplicateGroup(null);
                    manager.setPrimaryContact(null);
                }}
            />
        </div>
    );
}

export default ContactManagerRefactored;
