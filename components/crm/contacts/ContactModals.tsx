import React from 'react';
import Modal from '../../shared/Modal';
import { Contact, AnyCrmItem } from '../../../types';

// ============== Tag Modal ==============
interface TagModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact | null;
    newTag: string;
    onNewTagChange: (tag: string) => void;
    onAddTag: () => void;
    onRemoveTag: (tag: string) => void;
    allTags: string[];
}

export function TagModal({
    isOpen,
    onClose,
    contact,
    newTag,
    onNewTagChange,
    onAddTag,
    onRemoveTag,
    allTags
}: TagModalProps) {
    if (!contact) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Tags - ${contact.name}`}
        >
            <div className="space-y-4">
                {/* Current Tags */}
                <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Current Tags:</h4>
                    {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {contact.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 text-sm text-slate-700 font-medium rounded-full"
                                >
                                    🏷️ {tag}
                                    <button
                                        onClick={() => onRemoveTag(tag)}
                                        className="text-slate-500 hover:text-red-500 font-bold transition-colors"
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
                    <h4 className="font-semibold text-slate-900 mb-2">Add New Tag:</h4>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => onNewTagChange(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddTag();
                                }
                            }}
                            placeholder="e.g., decision-maker, champion"
                            className="flex-1 bg-white border border-gray-200 text-slate-900 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                        />
                        <button
                            onClick={onAddTag}
                            disabled={!newTag.trim()}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <h4 className="font-semibold text-slate-900 mb-2">Existing Tags in System:</h4>
                        <div className="flex flex-wrap gap-2">
                            {allTags
                                .filter(tag => !contact.tags?.includes(tag))
                                .map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => onNewTagChange(tag)}
                                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-sm text-slate-600 rounded-full hover:bg-slate-100 hover:border-slate-300 transition-all"
                                    >
                                        {tag}
                                    </button>
                                ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                >
                    Done
                </button>
            </div>
        </Modal>
    );
}

// ============== Notes Modal ==============
interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact | null;
    noteDraft: string;
    onNoteDraftChange: (text: string) => void;
    editingNoteTimestamp: number | null;
    onAddNote: () => void;
    onUpdateNote: () => void;
    onDeleteNote: (timestamp: number) => void;
    onStartEditNote: (timestamp: number, currentText: string) => void;
    onCancelEdit: () => void;
}

export function NotesModal({
    isOpen,
    onClose,
    contact,
    noteDraft,
    onNoteDraftChange,
    editingNoteTimestamp,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onStartEditNote,
    onCancelEdit
}: NotesModalProps) {
    if (!contact) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Notes - ${contact.name}`}
        >
            <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl p-3">
                    {(contact.notes || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No notes yet</p>
                    ) : (
                        (contact.notes || []).slice().reverse().map((note: any) => (
                            <div key={note.timestamp} className="mb-3 p-2 border-b border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-gray-600">
                                            {new Date(note.timestamp).toLocaleString()}
                                        </p>
                                        <p className="mt-1 text-sm whitespace-pre-wrap">{note.text}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 ml-3">
                                        <button
                                            onClick={() => onStartEditNote(note.timestamp, note.text)}
                                            className="text-xs bg-slate-900 text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDeleteNote(note.timestamp)}
                                            className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Add / Edit Note</label>
                    <textarea
                        value={noteDraft}
                        onChange={(e) => onNoteDraftChange(e.target.value)}
                        rows={4}
                        className="w-full bg-white border border-gray-200 text-slate-900 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                        placeholder="Write a note. Use Markdown or plain text."
                    />
                    <div className="flex gap-2 mt-2">
                        {editingNoteTimestamp ? (
                            <>
                                <button
                                    onClick={onUpdateNote}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={onCancelEdit}
                                    className="bg-white text-slate-700 border border-gray-200 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onAddNote}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                                >
                                    + Add Note
                                </button>
                                <button
                                    onClick={() => onNoteDraftChange('')}
                                    className="bg-white text-slate-700 border border-gray-200 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                >
                    Done
                </button>
            </div>
        </Modal>
    );
}

// ============== Timeline Modal ==============
interface TimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact | null;
}

export function TimelineModal({
    isOpen,
    onClose,
    contact
}: TimelineModalProps) {
    if (!contact) return null;

    // Combine all activities with timestamps
    const activities: Array<{
        type: 'note' | 'meeting';
        timestamp: number;
        data: any;
    }> = [];

    (contact.notes || []).forEach(note => {
        activities.push({ type: 'note', timestamp: note.timestamp, data: note });
    });

    (contact.meetings || []).forEach(meeting => {
        activities.push({ type: 'meeting', timestamp: meeting.timestamp, data: meeting });
    });

    activities.sort((a, b) => b.timestamp - a.timestamp);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Activity Timeline - ${contact.name}`}
        >
            <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto">
                    {activities.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>No activity yet</p>
                            <p className="text-sm mt-2">Notes and meetings will appear here</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-300 pl-6 space-y-4">
                            {activities.map((activity, idx) => {
                                const date = new Date(activity.timestamp);
                                return (
                                    <div key={`${activity.type}-${activity.timestamp}-${idx}`} className="relative">
                                        <div className="absolute -left-[1.625rem] w-3 h-3 rounded-full bg-slate-400 border-2 border-white"></div>
                                        
                                        <div className={`p-4 border rounded-xl ${
                                            activity.type === 'note' 
                                                ? 'bg-emerald-50 border-emerald-200' 
                                                : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">
                                                        {activity.type === 'note' ? '📝' : '📅'}
                                                    </span>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-900">
                                                            {activity.type === 'note' ? 'Note Added' : 'Meeting'}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                            {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {activity.type === 'note' && (
                                                <p className="mt-2 text-sm whitespace-pre-wrap text-gray-700">
                                                    {activity.data.text}
                                                </p>
                                            )}
                                            
                                            {activity.type === 'meeting' && (
                                                <div className="mt-2 text-sm">
                                                    <p className="font-semibold text-gray-900">{activity.data.title}</p>
                                                    {activity.data.attendees && (
                                                        <p className="text-gray-600 mt-1">
                                                            <strong>Attendees:</strong> {activity.data.attendees}
                                                        </p>
                                                    )}
                                                    {activity.data.summary && (
                                                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                                                            {activity.data.summary}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}

// ============== Relationship Modal ==============
interface RelationshipModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact | null;
    getLinkedAccount: (contact: Contact) => AnyCrmItem | undefined;
    allContacts: Contact[];
}

export function RelationshipModal({
    isOpen,
    onClose,
    contact,
    getLinkedAccount,
    allContacts
}: RelationshipModalProps) {
    if (!contact) return null;

    const linkedAccount = getLinkedAccount(contact);

    if (!linkedAccount) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Relationships - ${contact.name}`}
            >
                <div className="space-y-4">
                    <div className="text-center py-8 text-gray-500">
                        <p>⚠️ This contact is not linked to any account</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        );
    }

    // Get all contacts in the same account
    const sameAccountContacts = allContacts.filter(c => 
        c.id !== contact.id && 
        getLinkedAccount(c)?.id === linkedAccount.id
    );

    // Get contacts from other accounts with shared tags
    const sharedTags = contact.tags || [];
    const relatedContactsFromOtherAccounts = sharedTags.length > 0
        ? allContacts.filter(c => {
            if (c.id === contact.id) return false;
            const cAccount = getLinkedAccount(c);
            if (!cAccount || cAccount.id === linkedAccount.id) return false;
            return (c.tags || []).some(tag => sharedTags.includes(tag));
        })
        : [];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Relationships - ${contact.name}`}
        >
            <div className="space-y-4">
                <div className="space-y-3">
                    {/* Same Account Section */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            🏢 Same Account: {linkedAccount.company}
                        </h4>
                        {sameAccountContacts.length === 0 ? (
                            <p className="text-sm text-gray-600">No other contacts in this account</p>
                        ) : (
                            <div className="space-y-2">
                                {sameAccountContacts.map(c => (
                                    <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-3">
                                        <p className="font-semibold text-sm text-slate-900">{c.name}</p>
                                        <p className="text-xs text-gray-600">{c.email}</p>
                                        {c.title && (
                                            <p className="text-xs text-gray-500">💼 {c.title}</p>
                                        )}
                                        {c.tags && c.tags.length > 0 && (
                                            <div className="mt-1.5 flex gap-1 flex-wrap">
                                                {c.tags.map(tag => (
                                                    <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                                        🏷️ {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Related Contacts (Shared Tags) Section */}
                    {relatedContactsFromOtherAccounts.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                🔗 Related Contacts (Shared Tags)
                            </h4>
                            <div className="space-y-2">
                                {relatedContactsFromOtherAccounts.map(c => {
                                    const contactAccount = getLinkedAccount(c);
                                    const commonTags = (c.tags || []).filter(tag => sharedTags.includes(tag));
                                    return (
                                        <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-3">
                                            <p className="font-semibold text-sm text-slate-900">{c.name}</p>
                                            <p className="text-xs text-gray-600">{c.email}</p>
                                            {contactAccount && (
                                                <p className="text-xs text-gray-500">🏢 {contactAccount.company}</p>
                                            )}
                                            {c.title && (
                                                <p className="text-xs text-gray-500">💼 {c.title}</p>
                                            )}
                                            <div className="mt-1.5 flex gap-1 flex-wrap">
                                                {commonTags.map(tag => (
                                                    <span key={tag} className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-medium">
                                                        🏷️ {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-slate-900">
                            Network Summary:
                        </p>
                        <ul className="text-sm text-gray-700 mt-1 space-y-1">
                            <li>• {sameAccountContacts.length} colleague(s) in same account</li>
                            <li>• {relatedContactsFromOtherAccounts.length} related contact(s) across other accounts</li>
                            <li>• {(contact.tags || []).length} tag(s) for relationship tracking</li>
                        </ul>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full font-semibold bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}
