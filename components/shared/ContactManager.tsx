import React, { useState, useMemo } from 'react';
import { Contact, AnyCrmItem, AppActions, CrmCollectionName } from '../../types';
import Modal from './Modal';

interface ContactManagerProps {
    contacts: Contact[];
    crmItems: AnyCrmItem[];
    actions: AppActions;
    crmType: 'investors' | 'customers' | 'partners'; // Which CRM context we're in
    workspaceId?: string;
}

interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    title: string;
    linkedCrmId: string; // Empty string means create new account
    newAccountName: string; // For creating new CRM account
}

interface CSVImportResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string; data: any }>;
}

export const ContactManager: React.FC<ContactManagerProps> = ({
    contacts,
    crmItems,
    actions,
    crmType,
    workspaceId
}) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBy, setFilterBy] = useState<'all' | 'linked' | 'unlinked'>('all');
    const [filterByTag, setFilterByTag] = useState<string>('');
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
    const [newTag, setNewTag] = useState('');
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<Contact[][]>([]);
    const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<Contact[] | null>(null);
    const [primaryContact, setPrimaryContact] = useState<Contact | null>(null);
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<'tag' | 'delete' | 'export' | null>(null);
    const [bulkTagToAdd, setBulkTagToAdd] = useState('');
    const [formData, setFormData] = useState<ContactFormData>({
        name: '',
        email: '',
        phone: '',
        title: '',
        linkedCrmId: '',
        newAccountName: ''
    });

    // Get contacts for this CRM type
    const relevantContacts = useMemo(() => {
        return contacts.filter(contact => {
            const linkedItem = crmItems.find(item => 
                item.contacts?.some(c => c.id === contact.id)
            );
            return linkedItem !== undefined;
        });
    }, [contacts, crmItems]);

    // All contacts (including orphaned ones)
    const allContacts = useMemo(() => {
        return contacts;
    }, [contacts]);

    // Get all unique tags from contacts
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        allContacts.forEach(contact => {
            contact.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [allContacts]);

    // Filter contacts based on search and filter
    const filteredContacts = useMemo(() => {
        let filtered = allContacts;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                (c.phone && c.phone.toLowerCase().includes(query)) ||
                (c.title && c.title.toLowerCase().includes(query))
            );
        }

        // Linked/unlinked filter
        if (filterBy !== 'all') {
            filtered = filtered.filter(contact => {
                const isLinked = crmItems.some(item => 
                    item.contacts?.some(c => c.id === contact.id)
                );
                return filterBy === 'linked' ? isLinked : !isLinked;
            });
        }

        // Tag filter
        if (filterByTag) {
            filtered = filtered.filter(contact => 
                contact.tags?.includes(filterByTag)
            );
        }

        return filtered;
    }, [allContacts, searchQuery, filterBy, filterByTag, crmItems]);

    // Get CRM account name for a contact
    const getLinkedAccount = (contact: Contact): AnyCrmItem | undefined => {
        return crmItems.find(item => 
            item.contacts?.some(c => c.id === contact.id)
        );
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.email.trim()) {
            alert('Name and email are required');
            return;
        }

        try {
            let crmItemId = formData.linkedCrmId;

            // Create new CRM account if specified
            if (!crmItemId && formData.newAccountName.trim()) {
                const result = await actions.createCrmItem(crmType, {
                    company: formData.newAccountName.trim()
                });
                
                if (result.success && result.itemId) {
                    crmItemId = result.itemId;
                }
            }

            // Create the contact (requires a CRM account)
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
                    linkedin: ''
                }
            );

            if (contactResult.success) {
                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    title: '',
                    linkedCrmId: '',
                    newAccountName: ''
                });
                setShowAddModal(false);
            }
        } catch (error) {
            console.error('Error creating contact:', error);
            alert('Failed to create contact. Please try again.');
        }
    };

    const handleEditContact = async (e: React.FormEvent) => {
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
                    title: formData.title.trim()
                }
            );

            setShowEditModal(false);
            setSelectedContact(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                title: '',
                linkedCrmId: '',
                newAccountName: ''
            });
        } catch (error) {
            console.error('Error updating contact:', error);
            alert('Failed to update contact. Please try again.');
        }
    };

    const handleDeleteContact = async (contact: Contact) => {
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
    };

    const openEditModal = (contact: Contact) => {
        setSelectedContact(contact);
        setFormData({
            name: contact.name,
            email: contact.email,
            phone: contact.phone || '',
            title: contact.title || '',
            linkedCrmId: getLinkedAccount(contact)?.id || '',
            newAccountName: ''
        });
        setShowEditModal(true);
    };

    // Tag Management
    const openTagModal = (contact: Contact) => {
        setSelectedContact(contact);
        setNewTag('');
        setShowTagModal(true);
    };

    const handleAddTag = async () => {
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
            await actions.updateContact(
                crmType,
                linkedAccount.id,
                selectedContact.id,
                { tags: updatedTags } as any
            );

            setNewTag('');
        } catch (error) {
            console.error('Error adding tag:', error);
            alert('Failed to add tag');
        }
    };

    const handleRemoveTag = async (contact: Contact, tagToRemove: string) => {
        try {
            const linkedAccount = getLinkedAccount(contact);
            if (!linkedAccount) {
                alert('Cannot remove tag: No linked account found.');
                return;
            }

            const updatedTags = (contact.tags || []).filter(tag => tag !== tagToRemove);
            await actions.updateContact(
                crmType,
                linkedAccount.id,
                contact.id,
                { tags: updatedTags } as any
            );
        } catch (error) {
            console.error('Error removing tag:', error);
            alert('Failed to remove tag');
        }
    };

    // Duplicate Detection
    const normalizeString = (str: string): string => {
        return str.toLowerCase().trim().replace(/[^\w\s]/g, '');
    };

    const normalizePhone = (phone: string): string => {
        return phone.replace(/\D/g, '');
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
        // Simple similarity: check if one contains the other or they share significant prefix
        const norm1 = normalizeString(str1);
        const norm2 = normalizeString(str2);
        
        if (norm1 === norm2) return 1.0;
        if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
        
        // Check if they share first 3 characters (for similar names)
        if (norm1.length >= 3 && norm2.length >= 3 && norm1.substring(0, 3) === norm2.substring(0, 3)) {
            return 0.6;
        }
        
        return 0;
    };

    const detectDuplicates = () => {
        const groups: Contact[][] = [];
        const processed = new Set<string>();

        allContacts.forEach((contact, index) => {
            if (processed.has(contact.id)) return;

            const potentialDuplicates: Contact[] = [contact];
            processed.add(contact.id);

            // Check remaining contacts
            for (let i = index + 1; i < allContacts.length; i++) {
                const other = allContacts[i];
                if (processed.has(other.id)) continue;

                let isDuplicate = false;

                // Exact email match
                if (contact.email && other.email && 
                    normalizeString(contact.email) === normalizeString(other.email)) {
                    isDuplicate = true;
                }

                // Exact phone match
                if (!isDuplicate && contact.phone && other.phone &&
                    normalizePhone(contact.phone) === normalizePhone(other.phone)) {
                    isDuplicate = true;
                }

                // Similar names (high similarity)
                if (!isDuplicate) {
                    const nameSimilarity = calculateSimilarity(contact.name, other.name);
                    if (nameSimilarity >= 0.8) {
                        isDuplicate = true;
                    }
                }

                if (isDuplicate) {
                    potentialDuplicates.push(other);
                    processed.add(other.id);
                }
            }

            // Only add groups with 2+ contacts
            if (potentialDuplicates.length > 1) {
                groups.push(potentialDuplicates);
            }
        });

        setDuplicateGroups(groups);
        setShowDuplicateModal(true);
    };

    const startMergeWorkflow = (group: Contact[]) => {
        setSelectedDuplicateGroup(group);
        setPrimaryContact(group[0]); // Default to first contact as primary
    };

    const handleMergeContacts = async () => {
        if (!selectedDuplicateGroup || !primaryContact) return;

        try {
            // Merge logic: combine data from duplicates into primary
            const duplicatesToRemove = selectedDuplicateGroup.filter(c => c.id !== primaryContact.id);
            
            // Combine tags
            const allTagsSet = new Set<string>(primaryContact.tags || []);
            duplicatesToRemove.forEach(dup => {
                dup.tags?.forEach(tag => allTagsSet.add(tag));
            });

            // Combine notes (notes is an array of Note objects)
            const combinedNotes = [...(primaryContact.notes || [])];
            duplicatesToRemove.forEach(dup => {
                if (dup.notes && dup.notes.length > 0) {
                    // Add a separator note
                    combinedNotes.push({
                        text: `--- Merged from ${dup.name} ---`,
                        timestamp: Date.now(),
                    });
                    // Add all notes from duplicate
                    combinedNotes.push(...dup.notes);
                }
            });

            // Update primary contact with merged data
            const linkedAccount = getLinkedAccount(primaryContact);
            if (linkedAccount) {
                await actions.updateContact(
                    crmType,
                    linkedAccount.id,
                    primaryContact.id,
                    {
                        tags: Array.from(allTagsSet),
                        notes: combinedNotes,
                        // Keep phone if primary doesn't have it
                        phone: primaryContact.phone || duplicatesToRemove.find(d => d.phone)?.phone || '',
                        // Keep title if primary doesn't have it
                        title: primaryContact.title || duplicatesToRemove.find(d => d.title)?.title || '',
                    } as any
                );

                // Delete duplicate contacts
                for (const duplicate of duplicatesToRemove) {
                    const dupLinkedAccount = getLinkedAccount(duplicate);
                    if (dupLinkedAccount) {
                        await actions.deleteContact(crmType, dupLinkedAccount.id, duplicate.id);
                    }
                }

                alert(`Successfully merged ${duplicatesToRemove.length} duplicate contact(s) into ${primaryContact.name}`);
                
                // Refresh duplicate detection
                setSelectedDuplicateGroup(null);
                setPrimaryContact(null);
                detectDuplicates();
            }
        } catch (error) {
            console.error('Error merging contacts:', error);
            alert('Failed to merge contacts');
        }
    };

    // Bulk Operations
    const toggleBulkSelect = () => {
        setBulkSelectMode(!bulkSelectMode);
        setSelectedContactIds(new Set());
    };

    const toggleContactSelection = (contactId: string) => {
        const newSet = new Set(selectedContactIds);
        if (newSet.has(contactId)) {
            newSet.delete(contactId);
        } else {
            newSet.add(contactId);
        }
        setSelectedContactIds(newSet);
    };

    const selectAllFilteredContacts = () => {
        const allIds = new Set(filteredContacts.map(c => c.id));
        setSelectedContactIds(allIds);
    };

    const deselectAllContacts = () => {
        setSelectedContactIds(new Set());
    };

    const handleBulkAction = (action: 'tag' | 'delete' | 'export') => {
        if (selectedContactIds.size === 0) {
            alert('Please select at least one contact');
            return;
        }
        setBulkAction(action);
        setShowBulkActionsModal(true);
    };

    const executeBulkTag = async () => {
        if (!bulkTagToAdd.trim()) {
            alert('Please enter a tag');
            return;
        }

        try {
            const selectedContacts = allContacts.filter(c => selectedContactIds.has(c.id));
            let successCount = 0;

            for (const contact of selectedContacts) {
                const linkedAccount = getLinkedAccount(contact);
                if (linkedAccount) {
                    const currentTags = contact.tags || [];
                    if (!currentTags.includes(bulkTagToAdd.trim())) {
                        await actions.updateContact(
                            crmType,
                            linkedAccount.id,
                            contact.id,
                            { tags: [...currentTags, bulkTagToAdd.trim()] } as any
                        );
                        successCount++;
                    }
                }
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            alert(`Successfully added tag "${bulkTagToAdd}" to ${successCount} contact(s)`);
            setBulkTagToAdd('');
            setShowBulkActionsModal(false);
            setBulkSelectMode(false);
            setSelectedContactIds(new Set());
        } catch (error) {
            console.error('Error bulk tagging:', error);
            alert('Failed to add tags to some contacts');
        }
    };

    const executeBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedContactIds.size} contact(s)? This cannot be undone.`)) {
            return;
        }

        try {
            const selectedContacts = allContacts.filter(c => selectedContactIds.has(c.id));
            let successCount = 0;

            for (const contact of selectedContacts) {
                const linkedAccount = getLinkedAccount(contact);
                if (linkedAccount) {
                    await actions.deleteContact(crmType, linkedAccount.id, contact.id);
                    successCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            alert(`Successfully deleted ${successCount} contact(s)`);
            setShowBulkActionsModal(false);
            setBulkSelectMode(false);
            setSelectedContactIds(new Set());
        } catch (error) {
            console.error('Error bulk deleting:', error);
            alert('Failed to delete some contacts');
        }
    };

    const executeBulkExport = () => {
        const selectedContacts = allContacts.filter(c => selectedContactIds.has(c.id));
        
        if (selectedContacts.length === 0) {
            alert('No contacts selected for export');
            return;
        }

        // CSV Header
        const headers = ['name', 'email', 'phone', 'title', 'company', 'tags'];
        const csvRows = [headers.join(',')];

        // CSV Data
        selectedContacts.forEach(contact => {
            const linkedAccount = getLinkedAccount(contact);
            const row = [
                contact.name,
                contact.email,
                contact.phone || '',
                contact.title || '',
                linkedAccount?.company || '',
                (contact.tags || []).join('; ')
            ];
            
            // Escape and wrap fields with commas/quotes
            const escapedRow = row.map(field => {
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            });
            
            csvRows.push(escapedRow.join(','));
        });

        // Download
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
        setShowBulkActionsModal(false);
        setBulkSelectMode(false);
        setSelectedContactIds(new Set());
    };

    const getCrmTypeLabel = () => {
        switch (crmType) {
            case 'investors': return 'Investor';
            case 'customers': return 'Customer';
            case 'partners': return 'Partner';
            default: return 'Account';
        }
    };

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

    // CSV Export
    const exportContactsToCSV = () => {
        if (filteredContacts.length === 0) {
            alert('No contacts to export');
            return;
        }

        // CSV headers
        const headers = ['name', 'email', 'phone', 'title', 'company'];
        const csvRows = [headers.join(',')];

        // Add data rows
        filteredContacts.forEach(contact => {
            const linkedAccount = getLinkedAccount(contact);
            const row = [
                `"${contact.name.replace(/"/g, '""')}"`, // Escape quotes
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
        setIsImporting(true);
        setImportProgress(0);
        setImportResult(null);

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            if (rows.length === 0) {
                alert('No valid data found in CSV file');
                setIsImporting(false);
                return;
            }

            const result: CSVImportResult = {
                success: 0,
                failed: 0,
                errors: []
            };

            // Process each row
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                setImportProgress(Math.round(((i + 1) / rows.length) * 100));

                try {
                    // Validate required fields
                    if (!row.name || !row.email) {
                        result.failed++;
                        result.errors.push({
                            row: i + 2, // +2 for header and 0-index
                            error: 'Missing required fields (name, email)',
                            data: row
                        });
                        continue;
                    }

                    // Find or create CRM account
                    let crmItemId = '';
                    if (row.company && row.company.trim()) {
                        // Check if company exists
                        const existingItem = crmItems.find(
                            item => item.company.toLowerCase() === row.company.trim().toLowerCase()
                        );

                        if (existingItem) {
                            crmItemId = existingItem.id;
                        } else {
                            // Create new CRM account
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

                    // Create contact
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

                // Small delay to prevent overwhelming the system
                if (i < rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            setImportResult(result);
        } catch (error) {
            console.error('CSV import error:', error);
            alert('Failed to process CSV file. Please check the format and try again.');
        } finally {
            setIsImporting(false);
            setImportProgress(100);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-mono font-bold text-lg">
                    📇 Contact Management ({filteredContacts.length})
                </h3>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={exportContactsToCSV}
                        disabled={filteredContacts.length === 0}
                        className="font-mono bg-purple-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        📥 Export CSV
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="font-mono bg-blue-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                    >
                        📤 Import CSV
                    </button>
                    <button
                        onClick={detectDuplicates}
                        disabled={allContacts.length < 2}
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
                        + Add Contact
                    </button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {bulkSelectMode && (
                <div className="bg-orange-50 border-2 border-orange-400 p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">
                                {selectedContactIds.size} selected
                            </span>
                            <button
                                onClick={selectAllFilteredContacts}
                                className="text-xs font-mono text-blue-600 hover:underline"
                            >
                                Select All ({filteredContacts.length})
                            </button>
                            {selectedContactIds.size > 0 && (
                                <button
                                    onClick={deselectAllContacts}
                                    className="text-xs font-mono text-gray-600 hover:underline"
                                >
                                    Deselect All
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkAction('tag')}
                                disabled={selectedContactIds.size === 0}
                                className="font-mono bg-purple-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-purple-600 transition-all disabled:opacity-50"
                            >
                                🏷️ Tag
                            </button>
                            <button
                                onClick={() => handleBulkAction('export')}
                                disabled={selectedContactIds.size === 0}
                                className="font-mono bg-blue-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all disabled:opacity-50"
                            >
                                📥 Export
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={selectedContactIds.size === 0}
                                className="font-mono bg-red-500 text-white border-2 border-black px-3 py-1 text-sm rounded-none font-semibold shadow-neo-btn hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search contacts by name, email, phone..."
                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                />
                <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as any)}
                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                >
                    <option value="all">All Contacts</option>
                    <option value="linked">Linked to {getCrmTypeLabel()}s</option>
                    <option value="unlinked">Unlinked Contacts</option>
                </select>
                <select
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

            {/* Contact List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No contacts found</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-2 text-blue-600 hover:underline"
                        >
                            Add your first contact
                        </button>
                    </div>
                ) : (
                    filteredContacts.map(contact => {
                        const linkedAccount = getLinkedAccount(contact);
                        const isSelected = selectedContactIds.has(contact.id);
                        return (
                            <div
                                key={contact.id}
                                className={`bg-white border-2 p-4 shadow-neo hover:shadow-neo-lg transition-all ${
                                    isSelected ? 'border-orange-500 bg-orange-50' : 'border-black'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {bulkSelectMode && (
                                        <div className="flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleContactSelection(contact.id)}
                                                className="w-5 h-5 cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-grow min-w-0">
                                        <h4 className="font-bold text-lg text-black truncate">
                                            {contact.name}
                                        </h4>
                                        {contact.title && (
                                            <p className="text-sm text-gray-600">{contact.title}</p>
                                        )}
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm font-mono">
                                                📧 <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                                            </p>
                                            {contact.phone && (
                                                <p className="text-sm font-mono">
                                                    📞 <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{contact.phone}</a>
                                                </p>
                                            )}
                                        </div>
                                        {linkedAccount && (
                                            <div className="mt-2">
                                                <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-300 text-xs font-mono text-blue-700 font-semibold">
                                                    🔗 {linkedAccount.company}
                                                </span>
                                            </div>
                                        )}
                                        {!linkedAccount && (
                                            <div className="mt-2">
                                                <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-300 text-xs font-mono text-gray-600">
                                                    ⚠️ Not linked to any account
                                                </span>
                                            </div>
                                        )}
                                        {/* Tags */}
                                        {contact.tags && contact.tags.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {contact.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-300 text-xs font-mono text-purple-700 font-semibold"
                                                    >
                                                        🏷️ {tag}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveTag(contact, tag);
                                                            }}
                                                            className="ml-1 text-purple-900 hover:text-red-600"
                                                            title="Remove tag"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => openTagModal(contact)}
                                            className="px-3 py-1 bg-purple-500 text-white border-2 border-black text-xs font-bold hover:bg-purple-600 transition-all"
                                            title="Manage tags"
                                        >
                                            🏷️
                                        </button>
                                        <button
                                            onClick={() => openEditModal(contact)}
                                            className="px-3 py-1 bg-blue-500 text-white border-2 border-black text-xs font-bold hover:bg-blue-600 transition-all"
                                            title="Edit contact"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDeleteContact(contact)}
                                            className="px-3 py-1 bg-red-500 text-white border-2 border-black text-xs font-bold hover:bg-red-600 transition-all"
                                            title="Delete contact"
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

            {/* Add Contact Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        title: '',
                        linkedCrmId: '',
                        newAccountName: ''
                    });
                }}
                title={`Add New Contact`}
            >
                <form onSubmit={handleAddContact} className="space-y-4">
                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Contact Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g., John Smith"
                            required
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                            placeholder="e.g., john@example.com"
                            required
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                            placeholder="e.g., (555) 123-4567"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Job Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                            placeholder="e.g., CEO, VP of Sales"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="border-t-2 border-gray-300 pt-4">
                        <label className="block font-mono text-sm font-semibold text-black mb-2">
                            Link to {getCrmTypeLabel()} Account
                        </label>
                        <select
                            value={formData.linkedCrmId}
                            onChange={(e) => setFormData(p => ({ ...p, linkedCrmId: e.target.value }))}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 mb-2"
                        >
                            <option value="">-- Select existing account or create new --</option>
                            {crmItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.company}
                                </option>
                            ))}
                        </select>

                        {!formData.linkedCrmId && (
                            <div>
                                <label className="block font-mono text-xs text-gray-600 mb-1">
                                    Or create new {getCrmTypeLabel().toLowerCase()} account:
                                </label>
                                <input
                                    type="text"
                                    value={formData.newAccountName}
                                    onChange={(e) => setFormData(p => ({ ...p, newAccountName: e.target.value }))}
                                    placeholder={`e.g., New ${getCrmTypeLabel()} Company`}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="flex-1 font-mono font-semibold bg-green-500 text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-green-600"
                        >
                            Create Contact
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="flex-1 font-mono font-semibold bg-white text-black py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Contact Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedContact(null);
                    setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        title: '',
                        linkedCrmId: '',
                        newAccountName: ''
                    });
                }}
                title={`Edit Contact`}
            >
                <form onSubmit={handleEditContact} className="space-y-4">
                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Contact Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g., John Smith"
                            required
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                            placeholder="e.g., john@example.com"
                            required
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                            placeholder="e.g., (555) 123-4567"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Job Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                            placeholder="e.g., CEO, VP of Sales"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
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
                            onClick={() => setShowEditModal(false)}
                            className="flex-1 font-mono font-semibold bg-white text-black py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>

            {/* CSV Import Modal */}
            <Modal
                isOpen={showImportModal}
                onClose={() => {
                    if (!isImporting) {
                        setShowImportModal(false);
                        setImportResult(null);
                        setImportProgress(0);
                    }
                }}
                title="Import Contacts from CSV"
            >
                <div className="space-y-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border-2 border-blue-500 p-4 rounded-none">
                        <h4 className="font-mono font-semibold text-black mb-2">📋 Instructions:</h4>
                        <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                            <li>CSV must include headers: name, email, phone, title, company</li>
                            <li>Name and email are required for each contact</li>
                            <li>Company field will create or link to existing accounts</li>
                            <li>Download the template below for correct format</li>
                        </ul>
                    </div>

                    {/* Download Template */}
                    <button
                        onClick={downloadCSVTemplate}
                        className="w-full font-mono bg-gray-200 text-black border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-300 transition-all"
                    >
                        📥 Download CSV Template
                    </button>

                    {/* File Upload */}
                    {!isImporting && !importResult && (
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-2">
                                Select CSV File
                            </label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleCSVImport(file);
                                    }
                                }}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    )}

                    {/* Progress Bar */}
                    {isImporting && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-sm font-semibold">Importing contacts...</span>
                                <span className="font-mono text-sm font-semibold">{importProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 border-2 border-black h-8">
                                <div
                                    className="bg-blue-500 h-full transition-all duration-300"
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Import Results */}
                    {importResult && !isImporting && (
                        <div className="space-y-3">
                            <div className="bg-green-50 border-2 border-green-500 p-4 rounded-none">
                                <h4 className="font-mono font-semibold text-green-800 mb-2">✅ Import Complete</h4>
                                <div className="text-sm space-y-1">
                                    <p className="text-green-700">
                                        <span className="font-semibold">Success:</span> {importResult.success} contacts imported
                                    </p>
                                    <p className="text-red-700">
                                        <span className="font-semibold">Failed:</span> {importResult.failed} contacts
                                    </p>
                                </div>
                            </div>

                            {/* Error Details */}
                            {importResult.errors.length > 0 && (
                                <div className="bg-red-50 border-2 border-red-500 p-4 rounded-none max-h-60 overflow-y-auto">
                                    <h4 className="font-mono font-semibold text-red-800 mb-2">❌ Errors:</h4>
                                    <div className="space-y-2 text-sm">
                                        {importResult.errors.map((error, idx) => (
                                            <div key={idx} className="border-b border-red-200 pb-2 last:border-0">
                                                <p className="text-red-700">
                                                    <span className="font-semibold">Row {error.row}:</span> {error.error}
                                                </p>
                                                <p className="text-gray-600 text-xs mt-1">
                                                    {JSON.stringify(error.data)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportResult(null);
                                    setImportProgress(0);
                                }}
                                className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Tag Management Modal */}
            <Modal
                isOpen={showTagModal}
                onClose={() => {
                    setShowTagModal(false);
                    setSelectedContact(null);
                    setNewTag('');
                }}
                title={selectedContact ? `Manage Tags - ${selectedContact.name}` : 'Manage Tags'}
            >
                {selectedContact && (
                    <div className="space-y-4">
                        {/* Current Tags */}
                        <div>
                            <h4 className="font-mono font-semibold text-black mb-2">Current Tags:</h4>
                            {selectedContact.tags && selectedContact.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedContact.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 border-2 border-purple-300 text-sm font-mono text-purple-700 font-semibold"
                                        >
                                            🏷️ {tag}
                                            <button
                                                onClick={() => handleRemoveTag(selectedContact, tag)}
                                                className="text-purple-900 hover:text-red-600 font-bold"
                                                title="Remove tag"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No tags assigned yet</p>
                            )}
                        </div>

                        {/* Add New Tag */}
                        <div>
                            <h4 className="font-mono font-semibold text-black mb-2">Add New Tag:</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    placeholder="e.g., decision-maker, champion"
                                    className="flex-1 bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    onClick={handleAddTag}
                                    disabled={!newTag.trim()}
                                    className="font-mono bg-purple-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    + Add
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Common tags: decision-maker, technical, champion, influencer, blocker
                            </p>
                        </div>

                        {/* Suggested Tags */}
                        {allTags.length > 0 && (
                            <div>
                                <h4 className="font-mono font-semibold text-black mb-2">Existing Tags in System:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {allTags
                                        .filter(tag => !selectedContact.tags?.includes(tag))
                                        .map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    setNewTag(tag);
                                                }}
                                                className="px-2 py-1 bg-gray-100 border border-gray-300 text-xs font-mono text-gray-700 hover:bg-purple-100 hover:border-purple-300 transition-all"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setShowTagModal(false);
                                setSelectedContact(null);
                                setNewTag('');
                            }}
                            className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
                        >
                            Done
                        </button>
                    </div>
                )}
            </Modal>

            {/* Bulk Actions Modal */}
            <Modal
                isOpen={showBulkActionsModal}
                onClose={() => {
                    setShowBulkActionsModal(false);
                    setBulkAction(null);
                    setBulkTagToAdd('');
                }}
                title={`Bulk ${bulkAction === 'tag' ? 'Tag' : bulkAction === 'delete' ? 'Delete' : 'Export'}`}
            >
                <div className="space-y-4">
                    {bulkAction === 'tag' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Add a tag to {selectedContactIds.size} selected contact(s)
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={bulkTagToAdd}
                                    onChange={(e) => setBulkTagToAdd(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            executeBulkTag();
                                        }
                                    }}
                                    placeholder="Enter tag name..."
                                    className="flex-1 bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    onClick={executeBulkTag}
                                    className="font-mono bg-purple-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-purple-600 transition-all"
                                >
                                    Add Tag
                                </button>
                            </div>
                            {allTags.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Quick select:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {allTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => setBulkTagToAdd(tag)}
                                                className="px-2 py-1 bg-purple-50 border border-purple-300 text-xs font-mono text-purple-700 hover:bg-purple-100 transition-all"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {bulkAction === 'delete' && (
                        <div className="space-y-3">
                            <div className="bg-red-50 border-2 border-red-300 p-3">
                                <p className="text-sm font-mono text-red-800">
                                    <strong>⚠️ Warning:</strong> You are about to delete {selectedContactIds.size} contact(s). 
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={executeBulkDelete}
                                    className="flex-1 font-mono bg-red-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-red-600 transition-all"
                                >
                                    Delete {selectedContactIds.size} Contact(s)
                                </button>
                                <button
                                    onClick={() => setShowBulkActionsModal(false)}
                                    className="font-mono bg-gray-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {bulkAction === 'export' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Export {selectedContactIds.size} selected contact(s) to CSV file
                            </p>
                            <button
                                onClick={executeBulkExport}
                                className="w-full font-mono bg-blue-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                            >
                                📥 Download CSV
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setShowBulkActionsModal(false)}
                        className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
                    >
                        Close
                    </button>
                </div>
            </Modal>

            {/* Duplicate Detection Modal */}
            <Modal
                isOpen={showDuplicateModal}
                onClose={() => {
                    setShowDuplicateModal(false);
                    setSelectedDuplicateGroup(null);
                    setPrimaryContact(null);
                }}
                title="Duplicate Contacts"
            >
                <div className="space-y-4">
                    {selectedDuplicateGroup ? (
                        /* Merge Workflow */
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border-2 border-yellow-300 p-3">
                                <p className="text-sm font-mono">
                                    <strong>⚠️ Merge Warning:</strong> Select the primary contact to keep. 
                                    Other contacts will be deleted, but their data (tags, notes) will be merged into the primary.
                                </p>
                            </div>

                            <div className="space-y-2">
                                {selectedDuplicateGroup.map((contact) => (
                                    <div
                                        key={contact.id}
                                        className={`p-4 border-2 cursor-pointer transition-all ${
                                            primaryContact?.id === contact.id
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-300 bg-white hover:border-blue-400'
                                        }`}
                                        onClick={() => setPrimaryContact(contact)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {primaryContact?.id === contact.id && (
                                                        <span className="text-green-600 font-bold">✓ PRIMARY</span>
                                                    )}
                                                    <h4 className="font-mono font-bold text-black">{contact.name}</h4>
                                                </div>
                                                <p className="text-sm text-gray-600">📧 {contact.email}</p>
                                                {contact.phone && (
                                                    <p className="text-sm text-gray-600">📞 {contact.phone}</p>
                                                )}
                                                {contact.title && (
                                                    <p className="text-sm text-gray-600">💼 {contact.title}</p>
                                                )}
                                                {contact.tags && contact.tags.length > 0 && (
                                                    <div className="mt-1 flex gap-1 flex-wrap">
                                                        {contact.tags.map(tag => (
                                                            <span key={tag} className="text-xs px-2 py-1 bg-purple-100 text-purple-700">
                                                                🏷️ {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {contact.notes && contact.notes.length > 0 && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        📝 {contact.notes.length} note(s)
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleMergeContacts}
                                    disabled={!primaryContact}
                                    className="flex-1 font-mono bg-green-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ✓ Merge Contacts
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedDuplicateGroup(null);
                                        setPrimaryContact(null);
                                    }}
                                    className="font-mono bg-gray-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Duplicate Groups List */
                        <div className="space-y-4">
                            {duplicateGroups.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-green-600 font-mono font-semibold">
                                        ✓ No duplicate contacts found!
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        All contacts appear to be unique.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-yellow-50 border-2 border-yellow-300 p-3">
                                        <p className="text-sm font-mono">
                                            <strong>Found {duplicateGroups.length} potential duplicate group(s)</strong>
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Click "Review & Merge" to combine duplicate contacts
                                        </p>
                                    </div>

                                    {duplicateGroups.map((group, idx) => (
                                        <div key={idx} className="border-2 border-gray-300 p-3 bg-white">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-mono font-semibold text-black">
                                                    Duplicate Group {idx + 1} ({group.length} contacts)
                                                </h4>
                                                <button
                                                    onClick={() => startMergeWorkflow(group)}
                                                    className="font-mono bg-blue-500 text-white border-2 border-black px-3 py-1 text-xs rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                                                >
                                                    Review & Merge
                                                </button>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                {group.map((contact) => (
                                                    <div key={contact.id} className="text-gray-700">
                                                        • <strong>{contact.name}</strong> - {contact.email}
                                                        {contact.phone && ` - ${contact.phone}`}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setShowDuplicateModal(false)}
                                className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
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
