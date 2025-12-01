
import React, { useState } from 'react';
import { useDeleteConfirm } from '../../hooks';
import { Note, NoteableCollectionName, AppActions } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ConfirmDialog } from './ConfirmDialog';

interface NotesManagerProps {
    notes: Note[];
    itemId: string;
    collection: NoteableCollectionName;
    addNoteAction: AppActions['addNote'];
    updateNoteAction: AppActions['updateNote'];
    deleteNoteAction: AppActions['deleteNote'];
}

const NotesManager: React.FC<NotesManagerProps> = ({ notes, itemId, collection, addNoteAction, updateNoteAction, deleteNoteAction }) => {
    const [newNote, setNewNote] = useState('');
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [editText, setEditText] = useState('');
    const { user } = useAuth();
    const { isWorkspaceOwner } = useWorkspace();
    const deleteConfirm = useDeleteConfirm();

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newNote.trim() === '') return;
        await addNoteAction(collection, itemId, newNote);
        setNewNote('');
    };
    
    const handleEditClick = (note: Note) => {
        setEditingNote(note);
        setEditText(note.text);
    };

    const handleCancelEdit = () => {
        setEditingNote(null);
        setEditText('');
    };

    const handleSaveEdit = async () => {
        if (editingNote && editText.trim() !== '') {
            await updateNoteAction(collection, itemId, editingNote.timestamp, editText);
            handleCancelEdit();
        }
    };


    const sortedNotes = notes ? [...notes].sort((a, b) => b.timestamp - a.timestamp) : [];

    return (
        <div className="mt-4 pt-4 border-t-2 border-dashed border-black">
            <h4 className="text-lg font-semibold mb-2 font-mono">Notes</h4>
            <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                <label htmlFor={`new-note-${itemId}`} className="sr-only">Add a new note for item {itemId}</label>
                <input
                    id={`new-note-${itemId}`}
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new note..."
                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="font-mono font-semibold bg-black text-white p-2 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn text-sm shrink-0">Add Note</button>
            </form>
            <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {sortedNotes.length > 0 ? (
                    sortedNotes.map((note, index) => (
                        <div key={index} className="bg-gray-100 p-2 border-2 border-black text-sm">
                            {editingNote?.timestamp === note.timestamp ? (
                                <div className="space-y-2">
                                    <label htmlFor={`edit-note-textarea-${note.timestamp}`} className="sr-only">Edit note</label>
                                    <textarea
                                        id={`edit-note-textarea-${note.timestamp}`}
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="w-full bg-white border-2 border-black text-black rounded-none focus:outline-none p-2 min-h-[60px]"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={handleSaveEdit} className="font-mono bg-black text-white text-xs py-1 px-2 rounded-none font-semibold shadow-neo-btn transition-all">Save</button>
                                        <button onClick={handleCancelEdit} className="font-mono bg-gray-200 text-black text-xs py-1 px-2 rounded-none font-semibold border-2 border-black shadow-neo-btn transition-all">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="whitespace-pre-wrap break-words">{note.text}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</p>
                                            {note.userName && (
                                                <p className="text-xs text-blue-600 font-medium">by {note.userName}</p>
                                            )}
                                        </div>
                                        {user && (note.userId === user.id || isWorkspaceOwner()) && (
                                            <div className="flex gap-2">
                                                {note.userId === user.id && (
                                                    <button 
                                                        onClick={() => handleEditClick(note)} 
                                                        className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                                                        title="Edit note"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        deleteConfirm.requestConfirm(note.timestamp.toString(), 'note', async () => {
                                                            await deleteNoteAction(collection, itemId, note.timestamp);
                                                        });
                                                    }} 
                                                    className="font-mono text-xs font-semibold text-red-600 hover:underline"
                                                    title={note.userId === user.id ? 'Delete note' : 'Delete note (workspace owner)'}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 italic">No notes yet.</p>
                )}
            </div>
            
            {/* Delete confirmation dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isConfirming}
                onClose={deleteConfirm.cancel}
                onConfirm={deleteConfirm.confirm}
                title="Delete Note"
                message="Are you sure you want to delete this note? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
};

export default NotesManager;