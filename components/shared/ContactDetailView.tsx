import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { z } from 'zod';
import {
    ArrowLeft, Trash2, Pencil, Mail, Phone, Linkedin, Building, User, Calendar, CheckSquare
} from 'lucide-react';
import { Contact, Task, AppActions, CrmCollectionName, TaskCollectionName, Note, AnyCrmItem, Priority, NoteableCollectionName, WorkspaceMember, Subtask } from '../../types';
import { AssignmentDropdown } from './AssignmentDropdown';
import Modal from './Modal';
import NotesManager from './NotesManager';
import { TASK_TAG_BG_COLORS } from '../../constants';
import MeetingsManager from './MeetingsManager';
import { SubtaskManager } from './SubtaskManager';
import { Form } from '../forms/Form';
import { FormField } from '../forms/FormField';
import { Button } from '../ui/Button';

const contactEditSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().max(50).optional(),
    title: z.string().max(200).optional(),
    linkedin: z.union([z.string().url('Enter a valid LinkedIn URL'), z.literal('')]).optional()
});

type ContactEditFormData = z.infer<typeof contactEditSchema>;

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
        <li className="flex items-stretch rounded-md overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors">
            <div className={`w-1 shrink-0 ${tagColorClass}`}></div>
            <div className="flex items-start justify-between py-2.5 flex-grow pl-3 pr-2">
                <div className="flex items-start flex-grow overflow-hidden">
                    <label htmlFor={`contact-task-complete-${task.id}`} className="sr-only">Mark task as complete</label>
                    <input 
                        id={`contact-task-complete-${task.id}`}
                        type="checkbox" 
                        checked={task.status === 'Done'}
                        onChange={(e) => actions.updateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' })}
                        className="w-4 h-4 mr-2.5 mt-0.5 accent-gray-900 shrink-0 rounded"
                    />
                    <div className="flex-grow">
                        <span className={`text-sm ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.text}</span>
                    </div>
                </div>
                <div className="flex gap-1.5 shrink-0 ml-2">
                    <button 
                        ref={editButtonRef}
                        onClick={() => onEdit(task, editButtonRef)}
                        className="text-gray-500 hover:text-gray-700 text-xs py-1 px-2 rounded hover:bg-gray-100 transition-colors">
                        Edit
                    </button>
                    <button 
                        onClick={() => {
                            if (window.confirm('Delete this task?')) {
                                actions.deleteItem(taskCollection, task.id);
                            }
                        }}
                        className="text-gray-400 hover:text-red-600 text-xs py-1 px-2 rounded hover:bg-red-50 transition-colors">
                        Del
                    </button>
                </div>
            </div>
        </li>
    );
};

function ContactDetailView({ contact, parentItem, tasks, actions, onBack, crmCollection, taskCollection, workspaceMembers = [], onAssignContact }: ContactDetailViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskSubtasks, setNewTaskSubtasks] = useState<Subtask[]>([]);

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>('Medium');
    const [editDueDate, setEditDueDate] = useState('');
    
    const editContactModalTriggerRef = useRef<HTMLButtonElement | null>(null);
    const editTaskModalTriggerRef = useRef<HTMLButtonElement | null>(null);

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

    const closeEditModal = useCallback(() => {
        setIsEditing(false);
    }, []);

    const closeEditTaskModal = useCallback(() => {
        setEditingTask(null);
    }, []);

    const handleUpdate = useCallback(async (data: ContactEditFormData) => {
        const updatedContact: Contact = {
            ...contact,
            name: data.name.trim(),
            email: data.email.trim(),
            phone: data.phone?.trim() || '',
            title: data.title?.trim() || '',
            linkedin: data.linkedin?.trim() || '',
        };
        const result = await actions.updateContact(crmCollection, contact.crmItemId, contact.id, updatedContact);
        if (result.success) {
            setIsEditing(false);
        }
    }, [actions, crmCollection, contact]);

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
        actions.createTask(taskCollection, newTaskText, newTaskPriority, contact.crmItemId, contact.id, newTaskDueDate, undefined, undefined, newTaskSubtasks);
        setNewTaskText('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
        setNewTaskSubtasks([]);
    };

    const openEditTaskModal = (task: Task, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingTask(task);
        editTaskModalTriggerRef.current = triggerRef.current;
    }

    const valueDisplay = (label: string, value: string | React.ReactNode) => (
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
        </div>
    );

    const tag = useMemo(() => crmCollection.charAt(0).toUpperCase() + crmCollection.slice(1, -1), [crmCollection]);
    

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={onBack} 
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {parentItem.company}
                            </button>
                            <div className="h-6 w-px bg-gray-200"></div>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">{contact.name}</h1>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <Building className="w-3.5 h-3.5" />
                                    Contact at {parentItem.company}
                                </p>
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
                            className="flex items-center gap-1.5 text-gray-400 hover:text-red-600 text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Contact Info & Meetings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Contact Info</h2>
                            <button 
                                ref={editContactModalTriggerRef} 
                                onClick={() => setIsEditing(true)} 
                                className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {contact.title && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Title</p>
                                    <p className="text-sm font-medium text-gray-900">{contact.title}</p>
                                </div>
                            )}
                            {contact.assignedToName && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Assigned To</p>
                                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                        {contact.assignedToName}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                                {contact.email ? (
                                    <a href={`mailto:${contact.email}`} className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1 break-all">
                                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        {contact.email}
                                    </a>
                                ) : (
                                    <p className="text-sm text-gray-400">N/A</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                                {contact.phone ? (
                                    <a href={`tel:${contact.phone}`} className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        {contact.phone}
                                    </a>
                                ) : (
                                    <p className="text-sm text-gray-400">N/A</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">LinkedIn</p>
                                {contact.linkedin ? (
                                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1">
                                        <Linkedin className="w-3.5 h-3.5 text-gray-400" />
                                        View Profile
                                    </a>
                                ) : (
                                    <p className="text-sm text-gray-400">N/A</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Meetings Section */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-5">
                            <MeetingsManager 
                                meetings={contact.meetings || []}
                                contactId={contact.id}
                                crmItemId={contact.crmItemId}
                                crmCollection={crmCollection}
                                actions={actions}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column - Tasks */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Tasks for {contact.name}</h2>
                        </div>
                        <form onSubmit={handleAddTask} className="p-5 bg-gray-50 border-b border-gray-100 space-y-3">
                            <label htmlFor="new-contact-task" className="block text-xs text-gray-500 uppercase tracking-wide font-medium">
                                Add New Task
                            </label>
                            <textarea
                                id="new-contact-task"
                                name="new-contact-task"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="e.g., Send intro email, Schedule follow-up call..."
                                className="w-full bg-white border border-gray-200 text-gray-900 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 min-h-[80px]"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="new-task-priority" className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Priority</label>
                                    <select
                                        id="new-task-priority"
                                        name="new-task-priority"
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                                        className="w-full bg-white border border-gray-200 text-gray-900 p-2 rounded-md text-sm focus:outline-none focus:border-gray-400"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="new-task-duedate" className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Due Date</label>
                                    <input
                                        id="new-task-duedate"
                                        name="new-task-duedate"
                                        type="date"
                                        value={newTaskDueDate}
                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-gray-900 p-2 rounded-md text-sm focus:outline-none focus:border-gray-400"
                                    />
                                </div>
                            </div>
                            
                            {/* Subtasks section */}
                            <div className="border-t border-gray-200 pt-3 mt-3">
                                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Subtasks (Optional)</label>
                                <SubtaskManager 
                                    subtasks={newTaskSubtasks}
                                    onSubtasksChange={setNewTaskSubtasks}
                                />
                            </div>
                            
                            <button type="submit" className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
                                Add Task
                            </button>
                        </form>
                        <div className="p-5">
                            <h3 className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Task List ({contactTasks.length})</h3>
                            <ul className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-1">
                                {contactTasks.length > 0 ? (
                                    contactTasks.map(task => <ContactTaskItem key={task.id} task={task} onEdit={openEditTaskModal} actions={actions} tag={tag} taskCollection={taskCollection} />)
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-400 text-sm">No tasks for this contact yet.</p>
                                        <p className="text-gray-400 text-xs mt-1">Add a task above to track work with {contact.name}</p>
                                    </div>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
             <Modal isOpen={isEditing} onClose={closeEditModal} title="Edit Contact" triggerRef={editContactModalTriggerRef}>
                 <Form
                     key={contact.id}
                     schema={contactEditSchema}
                     defaultValues={{
                         name: contact.name,
                         email: contact.email,
                         phone: contact.phone || '',
                         title: contact.title || '',
                         linkedin: contact.linkedin || '',
                     }}
                     onSubmit={handleUpdate}
                 >
                     {() => (
                         <div className="space-y-4">
                             <FormField
                                 name="name"
                                 label="Name *"
                                 type="text"
                                 required
                             />
                             <FormField
                                 name="email"
                                 label="Email *"
                                 type="email"
                                 required
                             />
                             <FormField
                                 name="phone"
                                 label="Phone"
                                 type="tel"
                                 placeholder="e.g., +1 (555) 123-4567"
                             />
                             <FormField
                                 name="title"
                                 label="Title"
                                 type="text"
                                 placeholder="e.g., CEO, VP Sales, Product Manager"
                             />
                             <FormField
                                 name="linkedin"
                                 label="LinkedIn Profile"
                                 type="url"
                                 placeholder="https://linkedin.com/in/username"
                             />
                             <div className="pt-4 border-t border-gray-200">
                                 <NotesManager 
                                     notes={contact.notes} 
                                     itemId={contact.id} 
                                     collection='contacts'
                                     addNoteAction={handleAddNote}
                                     updateNoteAction={handleUpdateNote}
                                     deleteNoteAction={handleDeleteNote}
                                 />
                             </div>
                             <div className="flex gap-4 pt-4">
                                 <Button type="submit" className="w-full">
                                     Save Changes
                                 </Button>
                                 <Button type="button" variant="secondary" onClick={closeEditModal} className="w-full">
                                     Cancel
                                 </Button>
                             </div>
                         </div>
                     )}
                 </Form>
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
}

export default ContactDetailView;