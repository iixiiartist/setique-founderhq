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

export const ContactManager: React.FC<ContactManagerProps> = ({
    contacts,
    crmItems,
    actions,
    crmType,
    workspaceId
}) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBy, setFilterBy] = useState<'all' | 'linked' | 'unlinked'>('all');
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

        return filtered;
    }, [allContacts, searchQuery, filterBy, crmItems]);

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

    const getCrmTypeLabel = () => {
        switch (crmType) {
            case 'investors': return 'Investor';
            case 'customers': return 'Customer';
            case 'partners': return 'Partner';
            default: return 'Account';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-mono font-bold text-lg">
                    📇 Contact Management ({filteredContacts.length})
                </h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="font-mono bg-green-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-green-600 transition-all"
                >
                    + Add Contact
                </button>
            </div>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        return (
                            <div
                                key={contact.id}
                                className="bg-white border-2 border-black p-4 shadow-neo hover:shadow-neo-lg transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
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
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
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
        </div>
    );
};
