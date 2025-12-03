/**
 * useContactManagerShared Hook
 * 
 * Unified contact manager hook that uses shared primitives.
 * Replaces duplicate logic in:
 * - components/crm/contacts/hooks/useContactManager.ts
 * - components/shared/ContactManager.tsx (inline state)
 * 
 * This hook composes:
 * - useContactFilters for filtering/sorting
 * - useCrmSelection for bulk selection
 * - useCsvImportExport for import/export
 * - useModal for modal state
 */

import { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Contact, AnyCrmItem, AppActions, CrmCollectionName } from '../../../../types';
import { useContactFilters } from '../../../../hooks/useCrmFilters';
import { useCrmSelection } from '../../../../hooks/useCrmSelection';
import { useCsvImportExport } from '../../../../hooks/useCsvImportExport';
import { useModal } from '../../../../hooks/useModal';

// Form data interface
export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  title: string;
  linkedin: string;
  linkedCrmId: string;
  newAccountName: string;
}

const INITIAL_FORM_DATA: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  title: '',
  linkedin: '',
  linkedCrmId: '',
  newAccountName: '',
};

export interface UseContactManagerSharedOptions {
  contacts: Contact[];
  crmItems: AnyCrmItem[];
  actions: AppActions;
  crmType: CrmCollectionName;
  workspaceId?: string;
}

export function useContactManagerShared(options: UseContactManagerSharedOptions) {
  const { contacts, crmItems, actions, crmType, workspaceId } = options;

  // =========================================================================
  // Composed Hooks
  // =========================================================================

  // Filtering and sorting
  const filters = useContactFilters(contacts, {
    crmItems,
    initialSort: { field: 'name', order: 'asc' },
  });

  // Selection management
  const selection = useCrmSelection<Contact>({
    getItemId: (contact) => contact.id,
  });

  // CSV import/export
  const csv = useCsvImportExport<Contact>({
    entityType: 'contacts',
    processImportRow: async (row) => {
      try {
        if (!row.name?.trim() || !row.email?.trim()) {
          return { success: false, error: 'Missing required fields (name, email)' };
        }

        let crmItemId = '';

        // Find or create CRM item
        if (row.company?.trim()) {
          const existingItem = crmItems.find(
            item => item.company.toLowerCase() === row.company.trim().toLowerCase()
          );

          if (existingItem) {
            crmItemId = existingItem.id;
          } else {
            const createResult = await actions.createCrmItem(crmType, {
              company: row.company.trim(),
            });
            if (createResult.success && createResult.itemId) {
              crmItemId = createResult.itemId;
            }
          }
        }

        if (!crmItemId) {
          return { success: false, error: 'No company specified or failed to create account' };
        }

        const contactResult = await actions.createContact(crmType, crmItemId, {
          name: row.name.trim(),
          email: row.email.trim(),
          phone: row.phone || '',
          title: row.title || '',
          linkedin: row.linkedin || '',
        });

        return { success: contactResult.success, error: contactResult.message };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    transformForExport: (contact) => {
      const linkedAccount = filters.getLinkedAccount(contact);
      return {
        name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        title: contact.title || '',
        company: linkedAccount?.company || '',
        linkedin: contact.linkedin || '',
        tags: (contact.tags || []).join('; '),
      };
    },
  });

  // =========================================================================
  // Modal State
  // =========================================================================

  const addModal = useModal();
  const editModal = useModal<Contact>();
  const importModal = useModal();
  const tagModal = useModal<Contact>();
  const notesModal = useModal<Contact>();
  const timelineModal = useModal<Contact>();
  const relationshipModal = useModal<Contact>();
  const duplicateModal = useModal();
  const bulkActionsModal = useModal<'tag' | 'delete' | 'export'>();

  // =========================================================================
  // Form State
  // =========================================================================

  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM_DATA);
  const [newTag, setNewTag] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNoteTimestamp, setEditingNoteTimestamp] = useState<number | null>(null);
  const [bulkTagToAdd, setBulkTagToAdd] = useState('');

  const resetFormData = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
  }, []);

  const populateFormFromContact = useCallback((contact: Contact) => {
    const linkedAccount = filters.getLinkedAccount(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      title: contact.title || '',
      linkedin: contact.linkedin || '',
      linkedCrmId: linkedAccount?.id || '',
      newAccountName: '',
    });
  }, [filters.getLinkedAccount]);

  // =========================================================================
  // Duplicate Detection State
  // =========================================================================

  const [duplicateGroups, setDuplicateGroups] = useState<Contact[][]>([]);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<Contact[] | null>(null);
  const [primaryContact, setPrimaryContact] = useState<Contact | null>(null);

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  const handleAddContact = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and email are required');
      return;
    }

    try {
      let crmItemId = formData.linkedCrmId;

      // Create new account if specified
      if (!crmItemId && formData.newAccountName.trim()) {
        const result = await actions.createCrmItem(crmType, {
          company: formData.newAccountName.trim(),
        });
        if (result.success && result.itemId) {
          crmItemId = result.itemId;
        }
      }

      if (!crmItemId) {
        alert('Please select or create a CRM account to add this contact to.');
        return;
      }

      const contactResult = await actions.createContact(crmType, crmItemId, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        title: formData.title.trim(),
        linkedin: formData.linkedin.trim(),
      });

      if (contactResult.success) {
        resetFormData();
        addModal.close();
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact. Please try again.');
    }
  }, [formData, actions, crmType, resetFormData, addModal]);

  const handleEditContact = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedContact = editModal.data;
    if (!selectedContact) return;

    try {
      const linkedAccount = filters.getLinkedAccount(selectedContact);

      if (!linkedAccount) {
        alert('Cannot update contact: No linked account found.');
        return;
      }

      await actions.updateContact(crmType, linkedAccount.id, selectedContact.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        title: formData.title.trim(),
        linkedin: formData.linkedin.trim(),
      });

      editModal.close();
      resetFormData();
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact. Please try again.');
    }
  }, [editModal.data, formData, filters.getLinkedAccount, actions, crmType, resetFormData, editModal]);

  const handleDeleteContact = useCallback(async (contact: Contact) => {
    if (!confirm(`Delete contact ${contact.name}?`)) return;

    try {
      const linkedAccount = filters.getLinkedAccount(contact);
      if (!linkedAccount) {
        alert('Cannot delete contact: No linked account found.');
        return;
      }
      await actions.deleteContact(crmType, linkedAccount.id, contact.id);
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact. Please try again.');
    }
  }, [filters.getLinkedAccount, actions, crmType]);

  // =========================================================================
  // Tag Operations
  // =========================================================================

  const handleAddTag = useCallback(async () => {
    const selectedContact = tagModal.data;
    if (!selectedContact || !newTag.trim()) return;

    try {
      const linkedAccount = filters.getLinkedAccount(selectedContact);
      if (!linkedAccount) {
        alert('Cannot add tag: No linked account found.');
        return;
      }

      const currentTags = selectedContact.tags || [];
      const tag = newTag.trim().toLowerCase();

      if (currentTags.includes(tag)) {
        alert('Tag already exists on this contact');
        return;
      }

      const updatedTags = [...currentTags, tag];
      await actions.updateContact(crmType, linkedAccount.id, selectedContact.id, {
        tags: updatedTags,
      } as any);

      setNewTag('');
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('Failed to add tag');
    }
  }, [tagModal.data, newTag, filters.getLinkedAccount, actions, crmType]);

  const handleRemoveTag = useCallback(async (contact: Contact, tagToRemove: string) => {
    try {
      const linkedAccount = filters.getLinkedAccount(contact);
      if (!linkedAccount) {
        alert('Cannot remove tag: No linked account found.');
        return;
      }

      const updatedTags = (contact.tags || []).filter(tag => tag !== tagToRemove);
      await actions.updateContact(crmType, linkedAccount.id, contact.id, {
        tags: updatedTags,
      } as any);
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Failed to remove tag');
    }
  }, [filters.getLinkedAccount, actions, crmType]);

  // =========================================================================
  // Note Operations
  // =========================================================================

  const handleAddNote = useCallback(async () => {
    const selectedContact = notesModal.data;
    if (!selectedContact || !noteDraft.trim()) return;

    try {
      const linkedAccount = filters.getLinkedAccount(selectedContact);
      const res = await actions.addNote('contacts', selectedContact.id, noteDraft.trim(), linkedAccount?.id);
      
      if (res.success) {
        setNoteDraft('');
      } else {
        alert('Failed to add note: ' + res.message);
      }
    } catch (err) {
      console.error('Error adding note:', err);
      alert('Failed to add note');
    }
  }, [notesModal.data, noteDraft, filters.getLinkedAccount, actions]);

  const handleUpdateNote = useCallback(async () => {
    const selectedContact = notesModal.data;
    if (!selectedContact || editingNoteTimestamp === null) return;

    try {
      const linkedAccount = filters.getLinkedAccount(selectedContact);
      const res = await actions.updateNote(
        'contacts',
        selectedContact.id,
        editingNoteTimestamp,
        noteDraft.trim(),
        linkedAccount?.id
      );

      if (res.success) {
        setEditingNoteTimestamp(null);
        setNoteDraft('');
      } else {
        toast.error('Failed to update note: ' + res.message);
      }
    } catch (err) {
      console.error('Error updating note:', err);
      toast.error('Failed to update note');
    }
  }, [notesModal.data, editingNoteTimestamp, noteDraft, filters.getLinkedAccount, actions]);

  const handleDeleteNote = useCallback(async (noteTimestamp: number) => {
    const selectedContact = notesModal.data;
    if (!selectedContact) return;
    if (!confirm('Delete this note?')) return;

    try {
      const linkedAccount = filters.getLinkedAccount(selectedContact);
      const res = await actions.deleteNote('contacts', selectedContact.id, noteTimestamp, linkedAccount?.id);
      
      if (!res.success) {
        toast.error('Failed to delete note: ' + res.message);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      toast.error('Failed to delete note');
    }
  }, [notesModal.data, filters.getLinkedAccount, actions]);

  // =========================================================================
  // Modal Helpers
  // =========================================================================

  const openEditModal = useCallback((contact: Contact) => {
    populateFormFromContact(contact);
    editModal.openWith(contact);
  }, [populateFormFromContact, editModal]);

  const openTagModal = useCallback((contact: Contact) => {
    setNewTag('');
    tagModal.openWith(contact);
  }, [tagModal]);

  const openNotesModal = useCallback((contact: Contact) => {
    setNoteDraft('');
    setEditingNoteTimestamp(null);
    notesModal.openWith(contact);
  }, [notesModal]);

  const openTimelineModal = useCallback((contact: Contact) => {
    timelineModal.openWith(contact);
  }, [timelineModal]);

  const openRelationshipModal = useCallback((contact: Contact) => {
    relationshipModal.openWith(contact);
  }, [relationshipModal]);

  // =========================================================================
  // Duplicate Detection
  // =========================================================================

  const normalizeString = (str: string): string => {
    return str.toLowerCase().trim().replace(/[^\w\s]/g, '');
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  const detectDuplicates = useCallback(() => {
    const groups: Contact[][] = [];
    const processed = new Set<string>();

    contacts.forEach((contact, index) => {
      if (processed.has(contact.id)) return;

      const potentialDuplicates: Contact[] = [contact];
      processed.add(contact.id);

      for (let i = index + 1; i < contacts.length; i++) {
        const other = contacts[i];
        if (processed.has(other.id)) continue;

        let isDuplicate = false;

        // Check email match
        if (contact.email && other.email &&
            normalizeString(contact.email) === normalizeString(other.email)) {
          isDuplicate = true;
        }

        // Check phone match
        if (!isDuplicate && contact.phone && other.phone &&
            normalizePhone(contact.phone) === normalizePhone(other.phone)) {
          isDuplicate = true;
        }

        // Check name match
        if (!isDuplicate) {
          const name1 = normalizeString(contact.name);
          const name2 = normalizeString(other.name);
          if (name1 === name2 || name1.includes(name2) || name2.includes(name1)) {
            isDuplicate = true;
          }
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
  }, [contacts, duplicateModal]);

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  const executeBulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selection.selectedCount} contact(s)?`)) return;

    try {
      const selectedContacts = selection.getSelectedItems(contacts);
      let successCount = 0;

      for (const contact of selectedContacts) {
        const linkedAccount = filters.getLinkedAccount(contact);
        if (linkedAccount) {
          await actions.deleteContact(crmType, linkedAccount.id, contact.id);
          successCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      alert(`Successfully deleted ${successCount} contact(s)`);
      bulkActionsModal.close();
      selection.disableSelectionMode();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('Failed to delete some contacts');
    }
  }, [selection, contacts, filters.getLinkedAccount, actions, crmType, bulkActionsModal]);

  const executeBulkAddTag = useCallback(async () => {
    if (!bulkTagToAdd.trim()) {
      alert('Please enter a tag');
      return;
    }

    try {
      const selectedContacts = selection.getSelectedItems(contacts);
      const tag = bulkTagToAdd.trim().toLowerCase();
      let successCount = 0;

      for (const contact of selectedContacts) {
        const linkedAccount = filters.getLinkedAccount(contact);
        if (linkedAccount) {
          const currentTags = contact.tags || [];
          if (!currentTags.includes(tag)) {
            await actions.updateContact(crmType, linkedAccount.id, contact.id, {
              tags: [...currentTags, tag],
            } as any);
            successCount++;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      alert(`Successfully tagged ${successCount} contact(s)`);
      bulkActionsModal.close();
      selection.disableSelectionMode();
      setBulkTagToAdd('');
    } catch (error) {
      console.error('Error bulk tagging:', error);
      alert('Failed to tag some contacts');
    }
  }, [selection, contacts, bulkTagToAdd, filters.getLinkedAccount, actions, crmType, bulkActionsModal]);

  const executeBulkExport = useCallback(() => {
    csv.exportSelected(contacts, selection.selectedIds);
    bulkActionsModal.close();
    selection.disableSelectionMode();
  }, [csv, contacts, selection, bulkActionsModal]);

  // =========================================================================
  // Computed Values
  // =========================================================================

  const getCrmTypeLabel = useCallback(() => {
    switch (crmType) {
      case 'investors': return 'Investor';
      case 'customers': return 'Customer';
      case 'partners': return 'Partner';
      default: return 'Account';
    }
  }, [crmType]);

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Filters (from useContactFilters)
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    setSorting: filters.setSorting,
    filteredContacts: filters.filteredContacts,
    totalCount: filters.totalCount,
    originalCount: filters.originalCount,
    hasActiveFilters: filters.hasActiveFilters,
    allTags: filters.allTags,
    // Advanced filters
    advancedFilters: filters.advancedFilters,
    setAdvancedFilter: filters.setAdvancedFilter,
    clearAdvancedFilters: filters.clearAdvancedFilters,
    showAdvancedFilters: filters.showAdvancedFilters,
    setShowAdvancedFilters: filters.setShowAdvancedFilters,
    hasActiveAdvancedFilters: filters.hasActiveAdvancedFilters,
    // Helpers
    isContactLinked: filters.isContactLinked,
    getLinkedAccount: filters.getLinkedAccount,

    // Selection (from useCrmSelection)
    isSelectionMode: selection.isSelectionMode,
    selectedIds: selection.selectedIds,
    selectedCount: selection.selectedCount,
    toggleSelectionMode: selection.toggleSelectionMode,
    toggleItem: selection.toggleItem,
    isSelected: selection.isSelected,
    selectAll: () => selection.selectAll(filters.filteredContacts),
    clearSelection: selection.clearSelection,
    areAllSelected: () => selection.areAllSelected(filters.filteredContacts),

    // CSV (from useCsvImportExport)
    isImporting: csv.isImporting,
    importProgress: csv.importProgress,
    importResult: csv.importResult,
    startImport: csv.startImport,
    clearImportResult: csv.clearImportResult,
    downloadTemplate: csv.downloadTemplate,
    exportItems: () => csv.exportItems(filters.filteredContacts),
    exportSelected: () => csv.exportSelected(filters.filteredContacts, selection.selectedIds),

    // Modals
    addModal,
    editModal,
    importModal,
    tagModal,
    notesModal,
    timelineModal,
    relationshipModal,
    duplicateModal,
    bulkActionsModal,

    // Form
    formData,
    setFormData,
    resetFormData,
    newTag,
    setNewTag,
    noteDraft,
    setNoteDraft,
    editingNoteTimestamp,
    setEditingNoteTimestamp,
    bulkTagToAdd,
    setBulkTagToAdd,

    // Duplicates
    duplicateGroups,
    selectedDuplicateGroup,
    setSelectedDuplicateGroup,
    primaryContact,
    setPrimaryContact,
    detectDuplicates,

    // CRUD
    handleAddContact,
    handleEditContact,
    handleDeleteContact,

    // Tag operations
    handleAddTag,
    handleRemoveTag,

    // Note operations
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,

    // Modal helpers
    openEditModal,
    openTagModal,
    openNotesModal,
    openTimelineModal,
    openRelationshipModal,

    // Bulk
    executeBulkDelete,
    executeBulkAddTag,
    executeBulkExport,

    // Helpers
    getCrmTypeLabel,
  };
}

export default useContactManagerShared;
