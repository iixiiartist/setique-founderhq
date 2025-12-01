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
                    <h4 className="font-mono font-semibold text-black mb-2">Current Tags:</h4>
                    {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {contact.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 border-2 border-purple-300 text-sm font-mono text-purple-700 font-semibold"
                                >
                                    🏷️ {tag}
                                    <button
                                        onClick={() => onRemoveTag(tag)}
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
                            onChange={(e) => onNewTagChange(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddTag();
                                }
                            }}
                            placeholder="e.g., decision-maker, champion"
                            className="flex-1 bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={onAddTag}
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
                                .filter(tag => !contact.tags?.includes(tag))
                                .map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => onNewTagChange(tag)}
                                        className="px-2 py-1 bg-gray-100 border border-gray-300 text-xs font-mono text-gray-700 hover:bg-purple-100 hover:border-purple-300 transition-all"
                                    >
                                        {tag}
                                    </button>
                                ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
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
                <div className="max-h-64 overflow-y-auto bg-white border-2 border-gray-200 p-3">
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
                                            className="text-xs bg-blue-500 text-white px-2 py-1 border-2 border-black rounded-none"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDeleteNote(note.timestamp)}
                                            className="text-xs bg-red-500 text-white px-2 py-1 border-2 border-black rounded-none"
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
                    <label className="block font-mono text-sm font-semibold text-black mb-1">Add / Edit Note</label>
                    <textarea
                        value={noteDraft}
                        onChange={(e) => onNoteDraftChange(e.target.value)}
                        rows={4}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        placeholder="Write a note. Use Markdown or plain text."
                    />
                    <div className="flex gap-2 mt-2">
                        {editingNoteTimestamp ? (
                            <>
                                <button
                                    onClick={onUpdateNote}
                                    className="font-mono bg-blue-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-blue-600 transition-all"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={onCancelEdit}
                                    className="font-mono bg-gray-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onAddNote}
                                    className="font-mono bg-green-500 text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-green-600 transition-all"
                                >
                                    + Add Note
                                </button>
                                <button
                                    onClick={() => onNoteDraftChange('')}
                                    className="font-mono bg-gray-200 text-black border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:bg-gray-300 transition-all"
                                >
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
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
                        <div className="relative border-l-4 border-blue-300 pl-6 space-y-4">
                            {activities.map((activity, idx) => {
                                const date = new Date(activity.timestamp);
                                return (
                                    <div key={`${activity.type}-${activity.timestamp}-${idx}`} className="relative">
                                        <div className="absolute -left-8 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                                        
                                        <div className={`p-3 border-2 ${
                                            activity.type === 'note' 
                                                ? 'bg-green-50 border-green-300' 
                                                : 'bg-purple-50 border-purple-300'
                                        }`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">
                                                        {activity.type === 'note' ? '📝' : '📅'}
                                                    </span>
                                                    <div>
                                                        <p className="font-mono font-semibold text-sm">
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
                    className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
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
                        className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
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
                    <div className="bg-blue-50 border-2 border-blue-300 p-4">
                        <h4 className="font-mono font-bold text-black mb-2 flex items-center gap-2">
                            🏢 Same Account: {linkedAccount.company}
                        </h4>
                        {sameAccountContacts.length === 0 ? (
                            <p className="text-sm text-gray-600">No other contacts in this account</p>
                        ) : (
                            <div className="space-y-2">
                                {sameAccountContacts.map(c => (
                                    <div key={c.id} className="bg-white border border-blue-200 p-2">
                                        <p className="font-semibold text-sm">{c.name}</p>
                                        <p className="text-xs text-gray-600">{c.email}</p>
                                        {c.title && (
                                            <p className="text-xs text-gray-500">💼 {c.title}</p>
                                        )}
                                        {c.tags && c.tags.length > 0 && (
                                            <div className="mt-1 flex gap-1 flex-wrap">
                                                {c.tags.map(tag => (
                                                    <span key={tag} className="text-xs px-1 py-0.5 bg-purple-100 text-purple-700">
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
                        <div className="bg-purple-50 border-2 border-purple-300 p-4">
                            <h4 className="font-mono font-bold text-black mb-2 flex items-center gap-2">
                                🔗 Related Contacts (Shared Tags)
                            </h4>
                            <div className="space-y-2">
                                {relatedContactsFromOtherAccounts.map(c => {
                                    const contactAccount = getLinkedAccount(c);
                                    const commonTags = (c.tags || []).filter(tag => sharedTags.includes(tag));
                                    return (
                                        <div key={c.id} className="bg-white border border-purple-200 p-2">
                                            <p className="font-semibold text-sm">{c.name}</p>
                                            <p className="text-xs text-gray-600">{c.email}</p>
                                            {contactAccount && (
                                                <p className="text-xs text-gray-500">🏢 {contactAccount.company}</p>
                                            )}
                                            {c.title && (
                                                <p className="text-xs text-gray-500">💼 {c.title}</p>
                                            )}
                                            <div className="mt-1 flex gap-1 flex-wrap">
                                                {commonTags.map(tag => (
                                                    <span key={tag} className="text-xs px-1 py-0.5 bg-purple-200 text-purple-800 font-semibold">
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
                    <div className="bg-gray-50 border-2 border-gray-300 p-3">
                        <p className="text-sm font-mono">
                            <strong>Network Summary:</strong>
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
                    className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}
