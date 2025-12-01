import React from 'react';
import {
    Mail, Phone, Briefcase, Building, Eye, Pencil, Trash2,
    Tag, FileText, Clock, Users, AlertTriangle, X
} from 'lucide-react';
import { Contact, AnyCrmItem } from '../../../types';

interface ContactListItemProps {
    contact: Contact;
    linkedAccount?: AnyCrmItem;
    isSelected?: boolean;
    bulkSelectMode?: boolean;
    onToggleSelection?: (contactId: string) => void;
    onViewContact?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onOpenTags: () => void;
    onOpenNotes: () => void;
    onOpenTimeline: () => void;
    onOpenRelationships: () => void;
    onRemoveTag: (tag: string) => void;
}

export function ContactListItem({
    contact,
    linkedAccount,
    isSelected = false,
    bulkSelectMode = false,
    onToggleSelection,
    onViewContact,
    onEdit,
    onDelete,
    onOpenTags,
    onOpenNotes,
    onOpenTimeline,
    onOpenRelationships,
    onRemoveTag
}: ContactListItemProps) {
    return (
        <div
            className={`bg-white rounded-lg border p-3 hover:shadow-sm transition-all ${
                isSelected 
                    ? 'border-black bg-gray-50 ring-2 ring-black ring-opacity-20' 
                    : 'border-gray-200 hover:border-gray-300'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                {bulkSelectMode && onToggleSelection && (
                    <div className="flex-shrink-0">
                        <label htmlFor={`bulk-select-${contact.id}`} className="sr-only">
                            Select {contact.name}
                        </label>
                        <input
                            id={`bulk-select-${contact.id}`}
                            name={`bulk-select-${contact.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(contact.id)}
                            className="w-4 h-4 cursor-pointer accent-black rounded"
                        />
                    </div>
                )}
                <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 mb-0.5">
                        {contact.name}
                    </h4>
                    {contact.title && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5">
                            <Briefcase className="w-3 h-3" />
                            {contact.title}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                        </a>
                        {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                            </a>
                        )}
                    </div>
                    {linkedAccount && (
                        <div className="mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                                <Building className="w-3 h-3" />
                                {linkedAccount.company}
                            </span>
                        </div>
                    )}
                    {!linkedAccount && (
                        <div className="mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-xs text-yellow-700 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                Not linked
                            </span>
                        </div>
                    )}
                    {/* Tags */}
                    {contact.tags && contact.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {contact.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-xs text-gray-600 rounded group"
                                >
                                    {tag}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveTag(tag);
                                        }}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove tag"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    <button
                        onClick={onOpenRelationships}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View relationships"
                    >
                        <Users className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onOpenTimeline}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View timeline"
                    >
                        <Clock className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onOpenNotes}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View notes"
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onOpenTags}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Manage tags"
                    >
                        <Tag className="w-4 h-4" />
                    </button>
                    {onViewContact && (
                        <button
                            onClick={onViewContact}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="View details"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ContactListItem;
