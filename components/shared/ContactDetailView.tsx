import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Contact, Task, AppActions, CrmCollectionName, TaskCollectionName, Note, AnyCrmItem, Priority, NoteableCollectionName, WorkspaceMember } from '../../types';
import { AssignmentDropdown } from './AssignmentDropdown';
import Modal from './Modal';
import NotesManager from './NotesManager';
import { TASK_TAG_BG_COLORS } from '../../constants';
import MeetingsManager from './MeetingsManager';
import XpBadge from './XpBadge';

interface ContactDetailViewProps {
    contact: Contact;
    parentItem: AnyCrmItem;
    tasks: Task[];
    actions: AppActions;
    onBack: () => void;
    crmCollection: CrmCollectionName;
    taskCollection: TaskCollectionName;
    // Optional members and assign handler to enable assigning contacts to team members
    workspaceMembers?: WorkspaceMember[];
    onAssignContact?: (userId: string | null, userName: string | null, contactId: string) => void;
}

const ContactTaskItem: React.FC<{ task: Task; onEdit: (task: Task, triggerRef: React.RefObject<HTMLButtonElement>) => void; actions: AppActions; tag: string; taskCollection: TaskCollectionName; }> = ({ task, onEdit, actions, tag, taskCollection }) => {
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const tagColorClass = TASK_TAG_BG_COLORS[tag] || 'bg-gray-300';
    return (
        <li className="flex items-stretch">
            <div className={`w-2 shrink-0 ${tagColorClass}`}></div>
            <div className="flex items-start justify-between py-2 flex-grow pl-3">
                <div className="flex items-start flex-grow overflow-hidden">
                    <label htmlFor={`contact-task-complete-${task.id}`} className="sr-only">Mark task as complete</label>
                    <input 
                        id={`contact-task-complete-${task.id}`}
                        type="checkbox" 
                        checked={task.status === 'Done'}
                        onChange={(e) => actions.updateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' })}
                        className="w-5 h-5 mr-3 mt-1 accent-blue-500 shrink-0 border-2 border-black rounded-none"
                    />
                    <div className="flex-grow">
                        <span className={`text-black ${task.status === 'Done' ? 'line-through' : ''}`}>{task.text}</span>
                        <div className="mt-1"><XpBadge priority={task.priority} /></div>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                    <button 
                        ref={editButtonRef}
                        onClick={() => onEdit(task, editButtonRef)}
                        className="font-mono bg-white border-2 border-black text-black cursor-pointer text-xs py-1 px-2 rounded-none font-semibold shadow-neo-btn transition-all">
                        Edit
                    </button>
                    <button 
                        onClick={() => {
                            if (window.confirm('Delete this task?')) {
                                actions.deleteItem(taskCollection, task.id);
                            }
                        }}
                        className="font-mono bg-red-600 border-2 border-black text-white cursor-pointer text-xs py-1 px-2 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-red-700">
                        Del
                    </button>
                </div>
            </div>
        </li>
    );
};

const ContactDetailView: React.FC<ContactDetailViewProps> = ({ contact, parentItem, tasks, actions, onBack, crmCollection, taskCollection, workspaceMembers = [], onAssignContact }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Contact>(contact);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>('Medium');
    const [editDueDate, setEditDueDate] = useState('');
    
    const editContactModalTriggerRef = useRef<HTMLButtonElement | null>(null);
    const editTaskModalTriggerRef = useRef<HTMLButtonElement | null>(null);
    // Debugging: render counter to help trace re-renders/focus issues
    const renderCountRef = useRef(0);
    renderCountRef.current += 1;
    // Lightweight focus logger when editing to help diagnose single-key typing focus loss
    useEffect(() => {
        if (!isEditing) return;

        const onFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            console.debug('[ContactDetailView] focusin', { contactId: contact.id, activeId: target.id, tag: target.tagName, renderCount: renderCountRef.current });
        };

        document.addEventListener('focusin', onFocusIn);
        return () => document.removeEventListener('focusin', onFocusIn);
    }, [isEditing, contact.id]);

    // Only sync editForm with contact prop when modal is closed
    useEffect(() => {
        if (!isEditing) {
            setEditForm(contact);
        }
    }, [contact, isEditing]);

    useEffect(() => {
        if (editingTask) {
            setEditText(editingTask.text);
            setEditPriority(editingTask.priority);
            setEditDueDate(editingTask.dueDate || '');
        }
    }, [editingTask]);

    // Sync editingTask with external changes
    useEffect(() => {
        if (editingTask) {
            const updatedTask = tasks.find(t => t.id === editingTask.id);
            setEditingTask(updatedTask || null);
        }
    }, [tasks]);

    const contactTasks = useMemo(() => tasks.filter(t => t.contactId === contact.id), [tasks, contact.id]);

    const closeEditModal = () => {
        setIsEditing(false);
    };

    const closeEditTaskModal = () => {
        setEditingTask(null);
    };

    const handleUpdate = () => {
        actions.updateContact(crmCollection, contact.crmItemId, editForm.id, editForm);
        setIsEditing(false);
    };

    // Stable handlers for form inputs
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({ ...prev, name: e.target.value }));
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({ ...prev, email: e.target.value }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({ ...prev, phone: e.target.value }));
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({ ...prev, title: e.target.value }));
    };

    const handleLinkedinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({ ...prev, linkedin: e.target.value }));
    };

    // Stable handlers for NotesManager to prevent re-renders
    const handleAddNote = useCallback((collection: NoteableCollectionName, itemId: string, noteText: string) => {
        return actions.addNote(collection, itemId, noteText, contact.crmItemId);
    }, [actions, contact.crmItemId]);

    const handleUpdateNote = useCallback((collection: NoteableCollectionName, itemId: string, ts: number, newText: string) => {
        return actions.updateNote(collection, itemId, ts, newText, contact.crmItemId);
    }, [actions, contact.crmItemId]);

    const handleDeleteNote = useCallback((collection: NoteableCollectionName, itemId: string, ts: number) => {
        return actions.deleteNote(collection, itemId, ts, contact.crmItemId);
    }, [actions, contact.crmItemId]);
    
    const handleUpdateTask = () => {
        if (editingTask && editText.trim() !== '') {
            actions.updateTask(editingTask.id, { text: editText, priority: editPriority, dueDate: editDueDate });
        }
        setEditingTask(null);
    }

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim() === '') return;
        actions.createTask(taskCollection, newTaskText, newTaskPriority, contact.crmItemId, contact.id, newTaskDueDate);
        setNewTaskText('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
    };

    const openEditTaskModal = (task: Task, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingTask(task);
        editTaskModalTriggerRef.current = triggerRef.current;
    }

    const valueDisplay = (label: string, value: string | React.ReactNode) => (
        <div>
            <p className="text-sm font-mono uppercase text-gray-600">{label}</p>
            <p className="text-lg font-semibold text-black break-words">{value}</p>
        </div>
    );

    const tag = useMemo(() => crmCollection.charAt(0).toUpperCase() + crmCollection.slice(1, -1), [crmCollection]);
    

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack} 
                            className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-2 px-4 rounded-none font-semibold shadow-neo-btn hover:bg-gray-100 transition-all"
                        >
                            ← Back to {parentItem.company}
                        </button>
                            <div>
                            <h1 className="text-3xl font-bold">{contact.name}</h1>
                            <p className="text-gray-600 text-sm mt-1">Contact at {parentItem.company}</p>
                        </div>
                            {workspaceMembers.length > 0 && onAssignContact && (
                                <div className="ml-4">
                                    <AssignmentDropdown
                                        workspaceMembers={workspaceMembers.map(m => ({ id: m.userId, name: m.fullName || 'Unknown', email: m.email || '', role: m.role }))}
                                        currentAssignee={contact.assignedTo || undefined}
                                        onAssign={(userId, userName) => onAssignContact(userId, userName, contact.id)}
                                        placeholder="Assign contact..."
                                    />
                                </div>
                            )}
                    </div>
                    <button 
                        onClick={() => {
                            if (window.confirm(`Delete ${contact.name}? This will also delete all associated tasks and meetings.`)) {
                                actions.deleteContact(crmCollection, contact.crmItemId, contact.id);
                                onBack();
                            }
                        }} 
                        className="font-mono bg-red-600 border-2 border-black text-white cursor-pointer text-sm py-2 px-4 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-red-700"
                    >
                        Delete Contact
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Contact Info & Meetings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Contact Info</h2>
                            <button 
                                ref={editContactModalTriggerRef} 
                                onClick={() => setIsEditing(true)} 
                                className="font-mono bg-black text-white border-2 border-black cursor-pointer text-xs py-2 px-3 rounded-none font-semibold shadow-neo-btn hover:bg-gray-800 transition-all"
                            >
                                Edit
                            </button>
                        </div>
                        <div className="space-y-5">
                            {contact.title && (
                                <div>
                                    <p className="text-sm font-mono uppercase text-gray-600">Title</p>
                                    <p className="text-lg font-semibold text-black">{contact.title}</p>
                                </div>
                            )}
                            {contact.assignedToName && (
                                <div>
                                    <p className="text-sm font-mono uppercase text-gray-600">Assigned To</p>
                                    <p className="text-lg font-semibold text-black">→ {contact.assignedToName}</p>
                                </div>
                            )}
                            {valueDisplay('Email', contact.email ? (
                                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline break-all">
                                    {contact.email}
                                </a>
                            ) : 'N/A')}
                            {valueDisplay('Phone', contact.phone ? (
                                <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                                    {contact.phone}
                                </a>
                            ) : 'N/A')}
                            {valueDisplay('LinkedIn', contact.linkedin ? (
                                <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                    View Profile →
                                </a>
                            ) : 'N/A')}
                        </div>
                    </div>

                    {/* Meetings Section */}
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <MeetingsManager 
                            meetings={contact.meetings || []}
                            contactId={contact.id}
                            crmItemId={contact.crmItemId}
                            crmCollection={crmCollection}
                            actions={actions}
                        />
                    </div>
                </div>

                {/* Right Column - Tasks */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-2xl font-bold mb-6">Tasks for {contact.name}</h2>
                        <form onSubmit={handleAddTask} className="mb-6 p-4 bg-gray-50 border-2 border-black space-y-3">
                            <label htmlFor="new-contact-task" className="block font-mono text-sm font-semibold text-black">
                                Add New Task
                            </label>
                            <textarea
                                id="new-contact-task"
                                name="new-contact-task"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="e.g., Send intro email, Schedule follow-up call..."
                                className="w-full bg-white border-2 border-black text-black p-3 rounded-none focus:outline-none focus:border-blue-500 min-h-[100px]"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="new-task-priority" className="block text-xs font-mono text-gray-600 mb-1">PRIORITY</label>
                                    <select
                                        id="new-task-priority"
                                        name="new-task-priority"
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="new-task-duedate" className="block text-xs font-mono text-gray-600 mb-1">DUE DATE</label>
                                    <input
                                        id="new-task-duedate"
                                        name="new-task-duedate"
                                        type="date"
                                        value={newTaskDueDate}
                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full font-mono font-semibold bg-black text-white py-3 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-800">
                                Add Task
                            </button>
                        </form>
                        <div className="space-y-2">
                            <h3 className="font-mono text-sm text-gray-600 uppercase mb-3">Task List ({contactTasks.length})</h3>
                            <ul className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-1">
                                {contactTasks.length > 0 ? (
                                    contactTasks.map(task => <ContactTaskItem key={task.id} task={task} onEdit={openEditTaskModal} actions={actions} tag={tag} taskCollection={taskCollection} />)
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-400 text-lg italic">No tasks for this contact yet.</p>
                                        <p className="text-gray-400 text-sm mt-2">Add a task above to track work with {contact.name}</p>
                                    </div>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
             <Modal isOpen={isEditing} onClose={closeEditModal} title="Edit Contact" triggerRef={editContactModalTriggerRef}>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor={`edit-contact-name-${contact.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Name</label>
                        <input id={`edit-contact-name-${contact.id}`} name={`edit-contact-name-${contact.id}`} value={editForm.name || ''} onChange={handleNameChange} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                    </div>
                    <div>
                        <label htmlFor={`edit-contact-email-${contact.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Email</label>
                        <input id={`edit-contact-email-${contact.id}`} name={`edit-contact-email-${contact.id}`} value={editForm.email || ''} onChange={handleEmailChange} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" type="email"/>
                    </div>
                    <div>
                        <label htmlFor={`edit-contact-phone-${contact.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Phone</label>
                        <input id={`edit-contact-phone-${contact.id}`} name={`edit-contact-phone-${contact.id}`} value={editForm.phone || ''} onChange={handlePhoneChange} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" type="tel"/>
                    </div>
                    <div>
                        <label htmlFor={`edit-contact-title-${contact.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Title</label>
                        <input id={`edit-contact-title-${contact.id}`} name={`edit-contact-title-${contact.id}`} value={editForm.title || ''} onChange={handleTitleChange} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" placeholder="e.g., CEO, VP Sales"/>
                    </div>
                     <div>
                        <label htmlFor={`edit-contact-linkedin-${contact.id}`} className="block font-mono text-sm font-semibold text-black mb-1">LinkedIn</label>
                        <input id={`edit-contact-linkedin-${contact.id}`} name={`edit-contact-linkedin-${contact.id}`} value={editForm.linkedin || ''} onChange={handleLinkedinChange} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" type="url"/>
                    </div>
                    <NotesManager 
                        notes={editForm.notes} 
                        itemId={editForm.id} 
                        collection='contacts'
                        addNoteAction={handleAddNote}
                        updateNoteAction={handleUpdateNote}
                        deleteNoteAction={handleDeleteNote}
                    />
                    <div className="flex gap-4 mt-4">
                        <button onClick={handleUpdate} className="font-mono w-full bg-black border-2 border-black text-white cursor-pointer text-sm py-2 px-3 rounded-none font-semibold shadow-neo-btn transition-all">Save Changes</button>
                        <button onClick={closeEditModal} className="font-mono w-full bg-gray-200 border-2 border-black text-black cursor-pointer text-sm py-2 px-3 rounded-none font-semibold shadow-neo-btn transition-all">Cancel</button>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={!!editingTask} onClose={closeEditTaskModal} title="Edit Task" triggerRef={editTaskModalTriggerRef}>
                {editingTask && (
                    <div className="space-y-4">
                         <div>
                            <label htmlFor={`edit-contact-task-${editingTask.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Task Description</label>
                            <textarea 
                                id={`edit-contact-task-${editingTask.id}`}
                                name={`edit-contact-task-${editingTask.id}`}
                                value={editText || ''}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black rounded-none focus:outline-none p-2 min-h-[80px]"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={`edit-priority-${editingTask.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Priority</label>
                                <select
                                    id={`edit-priority-${editingTask.id}`}
                                    name={`edit-priority-${editingTask.id}`}
                                    value={editPriority || 'Medium'}
                                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                                    className="w-full bg-white border-2 border-black text-black rounded-none focus:outline-none p-2 h-full"
                                >
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`edit-duedate-${editingTask.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Due Date</label>
                                <input
                                    id={`edit-duedate-${editingTask.id}`}
                                    name={`edit-duedate-${editingTask.id}`}
                                    type="date"
                                    value={editDueDate || ''}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black rounded-none focus:outline-none p-2 h-full"
                                />
                            </div>
                        </div>
                        <NotesManager 
                            notes={editingTask.notes} 
                            itemId={editingTask.id} 
                            collection={taskCollection} 
                            addNoteAction={actions.addNote}
                            updateNoteAction={actions.updateNote}
                            deleteNoteAction={actions.deleteNote}
                        />
                        <button onClick={handleUpdateTask} className="mt-4 font-mono w-full bg-black border-2 border-black text-white cursor-pointer text-sm py-2 px-3 rounded-none font-semibold shadow-neo-btn transition-all">
                            Save Changes
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ContactDetailView;