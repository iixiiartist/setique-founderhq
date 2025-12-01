import React from 'react';
import { Users } from 'lucide-react';
import { Contact, AnyCrmItem } from '../../../types';
import { ContactListItem } from './ContactListItem';

interface ContactListProps {
    contacts: Contact[];
    getLinkedAccount: (contact: Contact) => AnyCrmItem | undefined;
    selectedContactIds: Set<string>;
    bulkSelectMode: boolean;
    crmItems: AnyCrmItem[];
    onToggleSelection: (contactId: string) => void;
    onViewContact?: (contact: Contact, parentItem: AnyCrmItem) => void;
    onEdit: (contact: Contact) => void;
    onDelete: (contact: Contact) => void;
    onOpenTags: (contact: Contact) => void;
    onOpenNotes: (contact: Contact) => void;
    onOpenTimeline: (contact: Contact) => void;
    onOpenRelationships: (contact: Contact) => void;
    onRemoveTag: (contact: Contact, tag: string) => void;
    onAddClick: () => void;
}

export function ContactList({
    contacts,
    getLinkedAccount,
    selectedContactIds,
    bulkSelectMode,
    crmItems,
    onToggleSelection,
    onViewContact,
    onEdit,
    onDelete,
    onOpenTags,
    onOpenNotes,
    onOpenTimeline,
    onOpenRelationships,
    onRemoveTag,
    onAddClick
}: ContactListProps) {
    if (contacts.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No contacts found</p>
                <button
                    onClick={onAddClick}
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                    Add your first contact
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-96 overflow-y-auto">
            {contacts.map(contact => {
                const linkedAccount = getLinkedAccount(contact);
                const isSelected = selectedContactIds.has(contact.id);
                const parentItem = crmItems.find(item => 
                    item.contacts?.some(c => c.id === contact.id)
                );

                return (
                    <ContactListItem
                        key={contact.id}
                        contact={contact}
                        linkedAccount={linkedAccount}
                        isSelected={isSelected}
                        bulkSelectMode={bulkSelectMode}
                        onToggleSelection={onToggleSelection}
                        onViewContact={onViewContact && parentItem ? () => onViewContact(contact, parentItem) : undefined}
                        onEdit={() => onEdit(contact)}
                        onDelete={() => onDelete(contact)}
                        onOpenTags={() => onOpenTags(contact)}
                        onOpenNotes={() => onOpenNotes(contact)}
                        onOpenTimeline={() => onOpenTimeline(contact)}
                        onOpenRelationships={() => onOpenRelationships(contact)}
                        onRemoveTag={(tag) => onRemoveTag(contact, tag)}
                    />
                );
            })}
        </div>
    );
}

export default ContactList;
