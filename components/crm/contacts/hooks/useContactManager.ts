import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Contact, AnyCrmItem, AppActions, CrmCollectionName } from '../../../../types';

interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    title: string;
    linkedin: string;
    linkedCrmId: string;
    newAccountName: string;
}

interface CSVImportResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string; data: any }>;
}

const initialFormData: ContactFormData = {
    name: '',
    email: '',
    phone: '',
    title: '',
    linkedin: '',
    linkedCrmId: '',
    newAccountName: ''
};

export function useContactManager(
    contacts: Contact[],
    crmItems: AnyCrmItem[],
    actions: AppActions,
    crmType: CrmCollectionName
) {
    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);

    // Selection state
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<'tag' | 'delete' | 'export' | null>(null);
    const [bulkTagToAdd, setBulkTagToAdd] = useState('');

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBy, setFilterBy] = useState<'all' | 'linked' | 'unlinked'>('all');
    const [filterByTag, setFilterByTag] = useState<string>('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filterByTitle, setFilterByTitle] = useState('');
    const [filterByNoteCount, setFilterByNoteCount] = useState<'any' | 'none' | 'has'>('any');
    const [filterByMeetingCount, setFilterByMeetingCount] = useState<'any' | 'none' | 'has'>('any');

    // Form state
    const [formData, setFormData] = useState<ContactFormData>(initialFormData);
    const [newTag, setNewTag] = useState('');
    const [noteDraft, setNoteDraft] = useState('');
    const [editingNoteTimestamp, setEditingNoteTimestamp] = useState<number | null>(null);

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

    // Duplicate detection state
    const [duplicateGroups, setDuplicateGroups] = useState<Contact[][]>([]);
    const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<Contact[] | null>(null);
    const [primaryContact, setPrimaryContact] = useState<Contact | null>(null);

    // Computed values
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        contacts.forEach(contact => {
            contact.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [contacts]);

    const filteredContacts = useMemo(() => {
        let filtered = contacts;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                (c.phone && c.phone.toLowerCase().includes(query)) ||
                (c.title && c.title.toLowerCase().includes(query))
            );
        }

        if (filterBy !== 'all') {
            filtered = filtered.filter(contact => {
                const isLinked = crmItems.some(item =>
                    item.contacts?.some(c => c.id === contact.id)
                );
                return filterBy === 'linked' ? isLinked : !isLinked;
            });
        }

        if (filterByTag) {
            filtered = filtered.filter(contact =>
                contact.tags?.includes(filterByTag)
            );
        }

        if (filterByTitle.trim()) {
            const titleQuery = filterByTitle.toLowerCase();
            filtered = filtered.filter(c =>
                c.title && c.title.toLowerCase().includes(titleQuery)
            );
        }

        if (filterByNoteCount !== 'any') {
            filtered = filtered.filter(contact => {
                const noteCount = (contact.notes || []).length;
                if (filterByNoteCount === 'none') return noteCount === 0;
                if (filterByNoteCount === 'has') return noteCount > 0;
                return true;
            });
        }

        if (filterByMeetingCount !== 'any') {
            filtered = filtered.filter(contact => {
                const meetingCount = (contact.meetings || []).length;
                if (filterByMeetingCount === 'none') return meetingCount === 0;
                if (filterByMeetingCount === 'has') return meetingCount > 0;
                return true;
            });
        }

        return filtered;
    }, [contacts, searchQuery, filterBy, filterByTag, filterByTitle, filterByNoteCount, filterByMeetingCount, crmItems]);

    // Helper functions
    const getLinkedAccount = useCallback((contact: Contact): AnyCrmItem | undefined => {
        return crmItems.find(item =>
            item.contacts?.some(c => c.id === contact.id)
        );
    }, [crmItems]);

    const getCrmTypeLabel = useCallback(() => {
        switch (crmType) {
            case 'investors': return 'Investor';
            case 'customers': return 'Customer';
            case 'partners': return 'Partner';
            default: return 'Account';
        }
    }, [crmType]);

    const resetFormData = useCallback(() => {
        setFormData(initialFormData);
    }, []);

    // CRUD operations
    const handleAddContact = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.email.trim()) {
            alert('Name and email are required');
            return;
        }

        try {
            let crmItemId = formData.linkedCrmId;

            if (!crmItemId && formData.newAccountName.trim()) {
                const result = await actions.createCrmItem(crmType, {
                    company: formData.newAccountName.trim()
                });

                if (result.success && result.itemId) {
                    crmItemId = result.itemId;
                }
            }

            if (!crmItemId) {
                alert('Please select or create a CRM account to add this contact to.');
                return;
            }

            const contactResult = await actions.createContact(
                crmType,
                crmItemId,
                {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    phone: formData.phone.trim(),
                    title: formData.title.trim(),
                    linkedin: formData.linkedin.trim()
                }
            );

            if (contactResult.success) {
                resetFormData();
                setShowAddModal(false);
            }
        } catch (error) {
            console.error('Error creating contact:', error);
            alert('Failed to create contact. Please try again.');
        }
    }, [formData, actions, crmType, resetFormData]);

    const handleEditContact = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedContact) return;

        try {
            const linkedAccount = getLinkedAccount(selectedContact);

            if (!linkedAccount) {
                alert('Cannot update contact: No linked account found.');
                return;
            }

            await actions.updateContact(
                crmType,
                linkedAccount.id,
                selectedContact.id,
                {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    phone: formData.phone.trim(),
                    title: formData.title.trim(),
                    linkedin: formData.linkedin.trim()
                }
            );

            setShowEditModal(false);
            setSelectedContact(null);
            resetFormData();
        } catch (error) {
            console.error('Error updating contact:', error);
            alert('Failed to update contact. Please try again.');
        }
    }, [selectedContact, formData, actions, crmType, getLinkedAccount, resetFormData]);

    const handleDeleteContact = useCallback(async (contact: Contact) => {
        if (!confirm(`Delete contact ${contact.name}?`)) return;

        try {
            const linkedAccount = getLinkedAccount(contact);
            if (!linkedAccount) {
                alert('Cannot delete contact: No linked account found.');
                return;
            }
            await actions.deleteContact(crmType, linkedAccount.id, contact.id);
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Failed to delete contact. Please try again.');
        }
    }, [actions, crmType, getLinkedAccount]);

    // Tag operations
    const handleAddTag = useCallback(async () => {
        if (!selectedContact || !newTag.trim()) return;

        try {
            const linkedAccount = getLinkedAccount(selectedContact);
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
            const result = await actions.updateContact(
                crmType,
                linkedAccount.id,
                selectedContact.id,
                { tags: updatedTags } as any
            );

            if (result.success) {
                setSelectedContact({ ...selectedContact, tags: updatedTags });
            }

            setNewTag('');
        } catch (error) {
            console.error('Error adding tag:', error);
            alert('Failed to add tag');
        }
    }, [selectedContact, newTag, actions, crmType, getLinkedAccount]);

    const handleRemoveTag = useCallback(async (contact: Contact, tagToRemove: string) => {
        try {
            const linkedAccount = getLinkedAccount(contact);
            if (!linkedAccount) {
                alert('Cannot remove tag: No linked account found.');
                return;
            }

            const updatedTags = (contact.tags || []).filter(tag => tag !== tagToRemove);
            const result = await actions.updateContact(
                crmType,
                linkedAccount.id,
                contact.id,
                { tags: updatedTags } as any
            );

            if (result.success && selectedContact && selectedContact.id === contact.id) {
                setSelectedContact({ ...selectedContact, tags: updatedTags });
            }
        } catch (error) {
            console.error('Error removing tag:', error);
            alert('Failed to remove tag');
        }
    }, [actions, crmType, getLinkedAccount, selectedContact]);

    // Note operations
    const handleAddNote = useCallback(async () => {
        if (!selectedContact || !noteDraft.trim()) return;

        try {
            const linkedAccount = getLinkedAccount(selectedContact);
            const res = await actions.addNote('contacts', selectedContact.id, noteDraft.trim(), linkedAccount?.id);
            if (res.success) {
                const newNote = { text: noteDraft.trim(), timestamp: Date.now() } as any;
                setSelectedContact({ ...selectedContact, notes: [...(selectedContact.notes || []), newNote] });
                setNoteDraft('');
            } else {
                alert('Failed to add note: ' + res.message);
            }
        } catch (err) {
            console.error('Error adding note:', err);
            alert('Failed to add note');
        }
    }, [selectedContact, noteDraft, actions, getLinkedAccount]);

    const handleUpdateNote = useCallback(async () => {
        if (!selectedContact || editingNoteTimestamp === null) return;

        try {
            const linkedAccount = getLinkedAccount(selectedContact);
            const res = await actions.updateNote('contacts', selectedContact.id, editingNoteTimestamp, noteDraft.trim(), linkedAccount?.id);
            if (res.success) {
                const updatedNotes = (selectedContact.notes || []).map(n => 
                    n.timestamp === editingNoteTimestamp ? { ...n, text: noteDraft.trim() } : n
                );
                setSelectedContact({ ...selectedContact, notes: updatedNotes });
                setEditingNoteTimestamp(null);
                setNoteDraft('');
            } else {
                toast.error('Failed to update note: ' + res.message);
            }
        } catch (err) {
            console.error('Error updating note:', err);
            toast.error('Failed to update note');
        }
    }, [selectedContact, editingNoteTimestamp, noteDraft, actions, getLinkedAccount]);

    const handleDeleteNote = useCallback(async (noteTimestamp: number) => {
        if (!selectedContact) return;
        if (!confirm('Delete this note?')) return;

        try {
            const linkedAccount = getLinkedAccount(selectedContact);
            const res = await actions.deleteNote('contacts', selectedContact.id, noteTimestamp, linkedAccount?.id);
            if (res.success) {
                const remaining = (selectedContact.notes || []).filter(n => n.timestamp !== noteTimestamp);
                setSelectedContact({ ...selectedContact, notes: remaining });
            } else {
                toast.error('Failed to delete note: ' + res.message);
            }
        } catch (err) {
            console.error('Error deleting note:', err);
            toast.error('Failed to delete note');
        }
    }, [selectedContact, actions, getLinkedAccount]);

    // Bulk operations
    const toggleBulkSelect = useCallback(() => {
        setBulkSelectMode(!bulkSelectMode);
        setSelectedContactIds(new Set());
    }, [bulkSelectMode]);

    const toggleContactSelection = useCallback((contactId: string) => {
        const newSet = new Set(selectedContactIds);
        if (newSet.has(contactId)) {
            newSet.delete(contactId);
        } else {
            newSet.add(contactId);
        }
        setSelectedContactIds(newSet);
    }, [selectedContactIds]);

    const selectAllFilteredContacts = useCallback(() => {
        const allIds = new Set(filteredContacts.map(c => c.id));
        setSelectedContactIds(allIds);
    }, [filteredContacts]);

    const deselectAllContacts = useCallback(() => {
        setSelectedContactIds(new Set());
    }, []);

    // Export operations
    const exportContactsToCSV = useCallback(() => {
        if (filteredContacts.length === 0) {
            alert('No contacts to export');
            return;
        }

        const headers = ['name', 'email', 'phone', 'title', 'company'];
        const csvRows = [headers.join(',')];

        filteredContacts.forEach(contact => {
            const linkedAccount = getLinkedAccount(contact);
            const row = [
                `"${contact.name.replace(/"/g, '""')}"`,
                contact.email,
                contact.phone || '',
                `"${(contact.title || '').replace(/"/g, '""')}"`,
                `"${(linkedAccount?.company || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0];
        a.download = `contacts_export_${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, [filteredContacts, getLinkedAccount]);

    // Duplicate detection
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

                if (contact.email && other.email &&
                    normalizeString(contact.email) === normalizeString(other.email)) {
                    isDuplicate = true;
                }

                if (!isDuplicate && contact.phone && other.phone &&
                    normalizePhone(contact.phone) === normalizePhone(other.phone)) {
                    isDuplicate = true;
                }

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
        setShowDuplicateModal(true);
    }, [contacts]);

    // Modal open helpers
    const openEditModal = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setFormData({
            name: contact.name,
            email: contact.email,
            phone: contact.phone || '',
            title: contact.title || '',
            linkedin: contact.linkedin || '',
            linkedCrmId: getLinkedAccount(contact)?.id || '',
            newAccountName: ''
        });
        setShowEditModal(true);
    }, [getLinkedAccount]);

    const openTagModal = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setNewTag('');
        setShowTagModal(true);
    }, []);

    const openNotesModal = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setNoteDraft('');
        setEditingNoteTimestamp(null);
        setShowNotesModal(true);
    }, []);

    const openTimelineModal = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setShowTimelineModal(true);
    }, []);

    const openRelationshipModal = useCallback((contact: Contact) => {
        setSelectedContact(contact);
        setShowRelationshipModal(true);
    }, []);

    const clearAdvancedFilters = useCallback(() => {
        setFilterByTitle('');
        setFilterByNoteCount('any');
        setFilterByMeetingCount('any');
    }, []);

    const hasActiveAdvancedFilters = filterByTitle !== '' || filterByNoteCount !== 'any' || filterByMeetingCount !== 'any';

    return {
        // Modal state
        showAddModal,
        setShowAddModal,
        showEditModal,
        setShowEditModal,
        showImportModal,
        setShowImportModal,
        showTagModal,
        setShowTagModal,
        showNotesModal,
        setShowNotesModal,
        showTimelineModal,
        setShowTimelineModal,
        showRelationshipModal,
        setShowRelationshipModal,
        showDuplicateModal,
        setShowDuplicateModal,
        showBulkActionsModal,
        setShowBulkActionsModal,

        // Selection state
        selectedContact,
        setSelectedContact,
        bulkSelectMode,
        selectedContactIds,
        bulkAction,
        setBulkAction,
        bulkTagToAdd,
        setBulkTagToAdd,

        // Filter state
        searchQuery,
        setSearchQuery,
        filterBy,
        setFilterBy,
        filterByTag,
        setFilterByTag,
        showAdvancedFilters,
        setShowAdvancedFilters,
        filterByTitle,
        setFilterByTitle,
        filterByNoteCount,
        setFilterByNoteCount,
        filterByMeetingCount,
        setFilterByMeetingCount,
        hasActiveAdvancedFilters,
        clearAdvancedFilters,

        // Form state
        formData,
        setFormData,
        newTag,
        setNewTag,
        noteDraft,
        setNoteDraft,
        editingNoteTimestamp,
        setEditingNoteTimestamp,

        // Import state
        isImporting,
        setIsImporting,
        importProgress,
        setImportProgress,
        importResult,
        setImportResult,

        // Duplicate state
        duplicateGroups,
        setDuplicateGroups,
        selectedDuplicateGroup,
        setSelectedDuplicateGroup,
        primaryContact,
        setPrimaryContact,

        // Computed values
        allTags,
        filteredContacts,

        // Helper functions
        getLinkedAccount,
        getCrmTypeLabel,
        resetFormData,

        // CRUD operations
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

        // Bulk operations
        toggleBulkSelect,
        toggleContactSelection,
        selectAllFilteredContacts,
        deselectAllContacts,

        // Export operations
        exportContactsToCSV,

        // Duplicate detection
        detectDuplicates,

        // Modal open helpers
        openEditModal,
        openTagModal,
        openNotesModal,
        openTimelineModal,
        openRelationshipModal
    };
}

export type UseContactManagerReturn = ReturnType<typeof useContactManager>;
