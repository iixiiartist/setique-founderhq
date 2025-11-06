import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnyCrmItem, Task, AppActions, CrmCollectionName, TaskCollectionName, Investor, Customer, Partner, Priority, Note, Contact, WorkspaceMember } from '../../types';
import Modal from './Modal';
import NotesManager from './NotesManager';
import { TASK_TAG_BG_COLORS } from '../../constants';
import XpBadge from './XpBadge';
import { AssignmentDropdown } from './AssignmentDropdown';

interface AccountDetailViewProps {
    item: AnyCrmItem;
    tasks: Task[];
    actions: AppActions;
    onBack: () => void;
    onViewContact: (contact: Contact) => void;
    title: string;
    crmCollection: CrmCollectionName;
    taskCollection: TaskCollectionName;
    workspaceMembers?: WorkspaceMember[];
    onAssignCompany?: (userId: string | null, userName: string | null) => void;
}

const AccountTaskItem: React.FC<{ task: Task; onEdit: (task: Task, triggerRef: React.RefObject<HTMLButtonElement>) => void; actions: AppActions; tag: string; taskCollection: TaskCollectionName; }> = ({ task, onEdit, actions, tag, taskCollection }) => {
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const tagColorClass = TASK_TAG_BG_COLORS[tag] || 'bg-gray-300';
    return (
        <li className="flex items-stretch">
            <div className={`w-2 shrink-0 ${tagColorClass}`}></div>
            <div className="flex items-start justify-between py-2 flex-grow pl-3">
                <div className="flex items-start flex-grow overflow-hidden">
                    <label htmlFor={`acc-task-complete-${task.id}`} className="sr-only">Mark task as complete</label>
                    <input 
                        id={`acc-task-complete-${task.id}`}
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

const ContactForm: React.FC<{ crmItemId: string, collection: CrmCollectionName, actions: AppActions, onDone: () => void }> = ({ crmItemId, collection, actions, onDone }) => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', title: '', linkedin: '' });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.name.trim() === '') return;
        actions.createContact(collection, crmItemId, form);
        setForm({ name: '', email: '', phone: '', title: '', linkedin: '' });
        onDone();
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <input value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} placeholder="Name" required className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
            <input value={form.email} onChange={e => setForm(p=>({...p, email: e.target.value}))} placeholder="Email" type="email" className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
            <input value={form.phone} onChange={e => setForm(p=>({...p, phone: e.target.value}))} placeholder="Phone" type="tel" className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
            <input value={form.title} onChange={e => setForm(p=>({...p, title: e.target.value}))} placeholder="Title (e.g., CEO, VP Sales)" className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
            <input value={form.linkedin} onChange={e => setForm(p=>({...p, linkedin: e.target.value}))} placeholder="LinkedIn URL" type="url" className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
            <button type="submit" className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn">Add Contact</button>
        </form>
    );
};


const AccountDetailView: React.FC<AccountDetailViewProps> = ({ 
    item, 
    tasks, 
    actions, 
    onBack, 
    onViewContact, 
    title, 
    crmCollection, 
    taskCollection,
    workspaceMembers = [],
    onAssignCompany
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<AnyCrmItem>(item);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [showAddContact, setShowAddContact] = useState(false);

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>('Medium');
    const [editDueDate, setEditDueDate] = useState('');
    
    const editCrmModalTriggerRef = useRef<HTMLButtonElement | null>(null);
    const editTaskModalTriggerRef = useRef<HTMLButtonElement | null>(null);

    // Transform workspace members to match AssignmentDropdown's expected format
    const transformedMembers = useMemo(() => 
        workspaceMembers.map(m => ({
            id: m.userId,
            name: m.fullName || 'Unknown',
            email: '', // Not available in WorkspaceMember type
            role: m.role
        })),
        [workspaceMembers]
    );

    useEffect(() => {
        setEditForm(item);
    }, [item]);

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

    const companyTasks = useMemo(() => tasks.filter(t => t.crmItemId === item.id && !t.contactId), [tasks, item.id]);

    const handleUpdate = () => {
        actions.updateCrmItem(crmCollection, editForm.id, editForm);
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
        actions.createTask(taskCollection, newTaskText, newTaskPriority, item.id, undefined, newTaskDueDate);
        setNewTaskText('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
    };

    const openEditTaskModal = (task: Task, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingTask(task);
        editTaskModalTriggerRef.current = triggerRef.current;
    }

    const valueDisplay = (label: string, value: string | number) => (
        <div>
            <p className="text-sm font-mono uppercase text-gray-600">{label}</p>
            <p className="text-lg font-semibold text-black">{value}</p>
        </div>
    );
    
    const specificValueDisplay = () => {
        if ('checkSize' in item && item.checkSize != null) return valueDisplay('Est. Check Size', `$${(item as Investor).checkSize.toLocaleString()}`);
        if ('dealValue' in item && item.dealValue != null) return valueDisplay('Deal Value', `$${(item as Customer).dealValue.toLocaleString()}`);
        if ('opportunity' in item) return valueDisplay('Opportunity', (item as Partner).opportunity);
        return null;
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack} 
                        className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-2 px-4 rounded-none font-semibold shadow-neo-btn transition-all"
                    >
                        &larr; Back to Pipeline
                    </button>
                    <h2 className="text-3xl">{item.company}</h2>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {workspaceMembers.length > 0 && onAssignCompany && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 font-mono">ASSIGN TO:</span>
                            <AssignmentDropdown
                                workspaceMembers={transformedMembers}
                                currentAssignee={item.assignedTo || undefined}
                                onAssign={(userId, userName) => {
                                    console.log('[AccountDetailView] Assignment requested:', { userId, userName, itemId: item.id });
                                    onAssignCompany(userId, userName);
                                }}
                                placeholder="Assign..."
                            />
                        </div>
                    )}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete ${item.company}? This will also delete all associated contacts, tasks, meetings, and documents.`)) {
                                actions.deleteItem(crmCollection, item.id);
                                onBack();
                            }
                        }} 
                        className="font-mono bg-red-600 border-2 border-black text-white cursor-pointer text-sm py-2 px-4 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-red-700"
                    >
                        Delete Account
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl">Account Info</h3>
                            <button ref={editCrmModalTriggerRef} onClick={() => setIsEditing(true)} className="font-mono bg-white border-2 border-black text-black cursor-pointer text-xs py-1 px-2 rounded-none font-semibold shadow-neo-btn transition-all">Edit</button>
                        </div>
                        <div className="space-y-4">
                            {valueDisplay('Primary Contact', item.contacts[0]?.name || 'N/A')}
                            {valueDisplay('Status', item.status)}
                            {valueDisplay('Priority', item.priority)}
                            {item.assignedToName && valueDisplay('Assigned To', item.assignedToName)}
                            {specificValueDisplay()}
                            <div>
                                <p className="text-sm font-mono uppercase text-gray-600">Next Action</p>
                                <p className={`text-lg font-semibold ${item.nextActionDate && new Date(item.nextActionDate + 'T00:00:00').toISOString().split('T')[0] < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-black'}`}>
                                    {item.nextAction || 'None'}
                                </p>
                                {item.nextActionDate && <p className="text-sm text-gray-600">{new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>}
                            </div>
                        </div>
                    </div>
                     <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl">Contacts</h3>
                            <button onClick={() => setShowAddContact(!showAddContact)} className="font-mono bg-white border-2 border-black text-black cursor-pointer text-xs py-1 px-2 rounded-none font-semibold shadow-neo-btn transition-all">{showAddContact ? 'Cancel' : '+ Add'}</button>
                        </div>
                         {showAddContact && <div className="mb-4"><ContactForm crmItemId={item.id} collection={crmCollection} actions={actions} onDone={() => setShowAddContact(false)} /></div>}
                        <ul className="max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {(item.contacts || []).map(contact => (
                                <li key={contact.id} className="p-2 border border-black bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{contact.name}</p>
                                        <p className="text-sm text-gray-600">{contact.email}</p>
                                    </div>
                                    <button onClick={() => onViewContact(contact)} className="font-mono bg-white border-2 border-black text-black cursor-pointer text-xs py-1 px-2 rounded-none font-semibold shadow-neo-btn transition-all shrink-0 ml-2">View</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h3 className="text-xl mb-2">Company Tasks</h3>
                         <form onSubmit={handleAddTask} className="mb-2 space-y-2">
                            <label htmlFor="new-account-task" className="sr-only">New task description</label>
                            <input
                                id="new-account-task"
                                value={newTaskText || ''}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="Add a company-level task..."
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                required
                            />
                            <div className="flex gap-2">
                                <select
                                    value={newTaskPriority || 'Medium'}
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
                                    value={newTaskDueDate || ''}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    aria-label="Set due date for new task"
                                />
                            </div>
                            <button type="submit" className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn">Add</button>
                        </form>
                        <ul className="max-h-60 overflow-y-auto custom-scrollbar pr-2 divide-y divide-dashed divide-gray-300">
                            {companyTasks.length > 0 ? (
                                companyTasks.map(task => <AccountTaskItem key={task.id} task={task} onEdit={openEditTaskModal} actions={actions} tag={title} taskCollection={taskCollection} />)
                            ) : (
                                <p className="text-gray-500 italic py-2">No company-level tasks.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
             <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title={`Edit ${title}`} triggerRef={editCrmModalTriggerRef}>
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`edit-company-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Company</label>
                            <input id={`edit-company-${editForm.id}`} value={editForm.company || ''} onChange={(e) => setEditForm(p => ({...p!, company: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                        </div>
                        <div>
                            <label htmlFor={`edit-priority-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Priority</label>
                            <select id={`edit-priority-${editForm.id}`} value={editForm.priority || 'Medium'} onChange={(e) => setEditForm(p => ({...p!, priority: e.target.value as Priority}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none">
                                <option>Low</option><option>Medium</option><option>High</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor={`edit-status-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Status</label>
                            <input id={`edit-status-${editForm.id}`} value={editForm.status || ''} onChange={(e) => setEditForm(p => ({...p!, status: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                        </div>
                         <div>
                            <label htmlFor={`edit-nextAction-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Next Action</label>
                            <input id={`edit-nextAction-${editForm.id}`} value={editForm.nextAction || ''} onChange={(e) => setEditForm(p => ({...p!, nextAction: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                        </div>
                        <div>
                            <label htmlFor={`edit-nextActionDate-${editForm.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Next Action Date</label>
                            <input id={`edit-nextActionDate-${editForm.id}`} type="date" value={editForm.nextActionDate || ''} onChange={(e) => setEditForm(p => ({...p!, nextActionDate: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                        </div>
                    </div>
                    <NotesManager 
                        notes={editForm.notes} 
                        itemId={editForm.id} 
                        collection={crmCollection} 
                        addNoteAction={actions.addNote}
                        updateNoteAction={actions.updateNote}
                        deleteNoteAction={actions.deleteNote}
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
                            <label htmlFor={`edit-acc-task-${editingTask.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Task Description</label>
                            <textarea 
                                id={`edit-acc-task-${editingTask.id}`}
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

export default AccountDetailView;