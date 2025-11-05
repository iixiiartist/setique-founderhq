import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Contact, Task, AppActions, CrmCollectionName, TaskCollectionName, Note, AnyCrmItem, Priority } from '../../types';
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

const ContactDetailView: React.FC<ContactDetailViewProps> = ({ contact, parentItem, tasks, actions, onBack, crmCollection, taskCollection }) => {
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

    useEffect(() => {
        setEditForm(contact);
    }, [contact]);

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

    const handleUpdate = () => {
        actions.updateContact(crmCollection, contact.crmItemId, editForm.id, editForm);
        setIsEditing(false);
    };
    
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
        <div>
            <div className="mb-6 flex items-center gap-4">
                <button onClick={onBack} className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-2 px-4 rounded-none font-semibold shadow-neo-btn transition-all">
                    &larr; Back to {parentItem.company}
                </button>
                <h2 className="text-3xl">{contact.name}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl">Contact Info</h3>
                             <div className="flex gap-2">
                                <button ref={editContactModalTriggerRef} onClick={() => setIsEditing(true)} className="font-mono bg-white border-2 border-black text-black cursor-pointer text-xs py-1 px-2 rounded-none font-semibold shadow-neo-btn transition-all">Edit</button>
                                <button onClick={() => actions.deleteContact(crmCollection, contact.crmItemId, contact.id)} className="text-xl font-bold hover:text-red-500 transition-colors" aria-label={`Delete contact: ${contact.name}`}>&times;</button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {valueDisplay('Email', contact.email || 'N/A')}
                            {valueDisplay('LinkedIn', contact.linkedin ? <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Profile</a> : 'N/A')}
                        </div>
                    </div>
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <MeetingsManager 
                            meetings={contact.meetings || []}
                            contactId={contact.id}
                            crmItemId={contact.crmItemId}
                            crmCollection={crmCollection}
                            actions={actions}
                        />
                    </div>
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h3 className="text-xl mb-4">Add Task for {contact.name}</h3>
                        <form onSubmit={handleAddTask} className="space-y-2">
                            <label htmlFor="new-contact-task" className="sr-only">New task description</label>
                            <textarea
                                id="new-contact-task"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="e.g., Send intro email..."
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 min-h-[80px]"
                                required
                            />
                             <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    aria-label="Set priority for new task"
                                >
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                    <option value="High">High</option>
                                </select>
                                <input
                                    type="date"
                                    value={newTaskDueDate}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    aria-label="Set due date for new task"
                                />
                            </div>
                            <button type="submit" className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn">Add Task</button>
                        </form>
                    </div>
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h3 className="text-xl mb-2">Tasks</h3>
                        <ul className="max-h-60 overflow-y-auto custom-scrollbar pr-2 divide-y divide-dashed divide-gray-300">
                            {contactTasks.length > 0 ? (
                                contactTasks.map(task => <ContactTaskItem key={task.id} task={task} onEdit={openEditTaskModal} actions={actions} tag={tag} taskCollection={taskCollection} />)
                            ) : (
                                <p className="text-gray-500 italic py-2">No tasks for this contact.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
             <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title={`Edit Contact`} triggerRef={editContactModalTriggerRef}>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor={`edit-contact-name-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Name</label>
                        <input id={`edit-contact-name-${editForm.id}`} value={editForm.name || ''} onChange={(e) => setEditForm(p => ({...p!, name: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                    </div>
                    <div>
                        <label htmlFor={`edit-contact-email-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Email</label>
                        <input id={`edit-contact-email-${editForm.id}`} value={editForm.email || ''} onChange={(e) => setEditForm(p => ({...p!, email: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" type="email"/>
                    </div>
                     <div>
                        <label htmlFor={`edit-contact-linkedin-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">LinkedIn</label>
                        <input id={`edit-contact-linkedin-${editForm.id}`} value={editForm.linkedin || ''} onChange={(e) => setEditForm(p => ({...p!, linkedin: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" type="url"/>
                    </div>
                    <NotesManager 
                        notes={editForm.notes} 
                        itemId={editForm.id} 
                        collection='contacts'
                        addNoteAction={(collection, itemId, noteText) => actions.addNote(collection, itemId, noteText, contact.crmItemId)}
                        updateNoteAction={(collection, itemId, ts, newText) => actions.updateNote(collection, itemId, ts, newText, contact.crmItemId)}
                        deleteNoteAction={(collection, itemId, ts) => actions.deleteNote(collection, itemId, ts, contact.crmItemId)}
                    />
                    <div className="flex gap-4 mt-4">
                        <button onClick={handleUpdate} className="font-mono w-full bg-black border-2 border-black text-white cursor-pointer text-sm py-2 px-3 rounded-none font-semibold shadow-neo-btn transition-all">Save Changes</button>
                        <button onClick={() => setIsEditing(false)} className="font-mono w-full bg-gray-200 border-2 border-black text-black cursor-pointer text-sm py-2 px-3 rounded-none font-semibold shadow-neo-btn transition-all">Cancel</button>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task" triggerRef={editTaskModalTriggerRef}>
                {editingTask && (
                    <div className="space-y-4">
                         <div>
                            <label htmlFor={`edit-contact-task-${editingTask.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Task Description</label>
                            <textarea 
                                id={`edit-contact-task-${editingTask.id}`}
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