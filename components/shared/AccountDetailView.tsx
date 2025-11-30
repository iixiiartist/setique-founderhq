import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    ArrowLeft, Trash2, Sparkles, Pencil, Plus, User, Mail, Phone, Briefcase,
    ExternalLink, Building, FileText, Calendar, Clock, ChevronRight, CheckSquare
} from 'lucide-react';
import { AnyCrmItem, Task, AppActions, CrmCollectionName, TaskCollectionName, Investor, Customer, Partner, Priority, Note, Contact, WorkspaceMember, Subtask } from '../../types';
import Modal from './Modal';
import NotesManager from './NotesManager';
import { LinkedDocumentsSection } from './LinkedDocumentsSection';
import { TASK_TAG_BG_COLORS } from '../../constants';
import { AssignmentDropdown } from './AssignmentDropdown';
import { SubtaskManager } from './SubtaskManager';
import { searchWeb } from '../../src/lib/services/youSearchService';
import { getAiResponse } from '../../services/groqService';
import { ModerationError, formatModerationErrorMessage } from '../../lib/services/moderationService';

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
        <li className="flex items-stretch rounded-md overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors">
            <div className={`w-1 shrink-0 ${tagColorClass}`}></div>
            <div className="flex items-start justify-between py-2.5 flex-grow pl-3 pr-2">
                <div className="flex items-start flex-grow overflow-hidden">
                    <label htmlFor={`acc-task-complete-${task.id}`} className="sr-only">Mark task as complete</label>
                    <input 
                        id={`acc-task-complete-${task.id}`}
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
        <form onSubmit={handleSubmit} className="space-y-2.5">
            <label htmlFor={`contact-form-name-${crmItemId}`} className="sr-only">Name</label>
            <input id={`contact-form-name-${crmItemId}`} name={`contact-form-name-${crmItemId}`} value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} placeholder="Name" required className="w-full bg-white border border-gray-200 text-gray-900 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400"/>
            <label htmlFor={`contact-form-email-${crmItemId}`} className="sr-only">Email</label>
            <input id={`contact-form-email-${crmItemId}`} name={`contact-form-email-${crmItemId}`} value={form.email} onChange={e => setForm(p=>({...p, email: e.target.value}))} placeholder="Email" type="email" className="w-full bg-white border border-gray-200 text-gray-900 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400"/>
            <label htmlFor={`contact-form-phone-${crmItemId}`} className="sr-only">Phone</label>
            <input id={`contact-form-phone-${crmItemId}`} name={`contact-form-phone-${crmItemId}`} value={form.phone} onChange={e => setForm(p=>({...p, phone: e.target.value}))} placeholder="Phone" type="tel" className="w-full bg-white border border-gray-200 text-gray-900 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400"/>
            <label htmlFor={`contact-form-title-${crmItemId}`} className="sr-only">Title</label>
            <input id={`contact-form-title-${crmItemId}`} name={`contact-form-title-${crmItemId}`} value={form.title} onChange={e => setForm(p=>({...p, title: e.target.value}))} placeholder="Title (e.g., CEO, VP Sales)" className="w-full bg-white border border-gray-200 text-gray-900 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400"/>
            <label htmlFor={`contact-form-linkedin-${crmItemId}`} className="sr-only">LinkedIn URL</label>
            <input id={`contact-form-linkedin-${crmItemId}`} name={`contact-form-linkedin-${crmItemId}`} value={form.linkedin} onChange={e => setForm(p=>({...p, linkedin: e.target.value}))} placeholder="LinkedIn URL" type="url" className="w-full bg-white border border-gray-200 text-gray-900 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400"/>
            <button type="submit" className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">Add Contact</button>
        </form>
    );
};


function AccountDetailView({ 
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
}: AccountDetailViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<AnyCrmItem>(item);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskSubtasks, setNewTaskSubtasks] = useState<Subtask[]>([]);
    const [showAddContact, setShowAddContact] = useState(false);

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>('Medium');
    const [editDueDate, setEditDueDate] = useState('');
    
    const editCrmModalTriggerRef = useRef<HTMLButtonElement | null>(null);
    const editTaskModalTriggerRef = useRef<HTMLButtonElement | null>(null);

    const [isEnriching, setIsEnriching] = useState(false);

    const handleEnrich = async () => {
        setIsEnriching(true);
        try {
            const query = `Overview of company ${item.company} ${item.website || ''}`;
            const searchResults = await searchWeb(query, 'search');
            
            if (!searchResults.hits || searchResults.hits.length === 0) {
                alert('No information found.');
                setIsEnriching(false);
                return;
            }

            const context = searchResults.hits.map((h: any) => `${h.title}: ${h.description}`).join('\n');
            const prompt = `
            Based on the following search results for "${item.company}", extract the following information in JSON format:
            - description: A brief 1-2 sentence summary of what the company does.
            - website: The official website URL (if found).
            - linkedin: The LinkedIn company page URL (if found).
            - twitter: The Twitter/X handle or URL (if found).
            - industry: The primary industry.
            - location: Headquarters location.

            Search Results:
            ${context}

            Return ONLY valid JSON.
            `;

            const history: any[] = [{
                role: 'user',
                parts: [{ text: prompt }]
            }];
            
            const systemPrompt = "You are a helpful assistant that extracts structured data from text.";
            
            const aiResponse = await getAiResponse(history, systemPrompt, false);
            const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                
                await actions.updateCrmItem(crmCollection, item.id, {
                    description: data.description || item.description,
                    website: data.website || item.website,
                    linkedin: data.linkedin || item.linkedin,
                    twitter: data.twitter || item.twitter,
                    industry: data.industry || item.industry,
                    location: data.location || item.location,
                });
                alert('Enrichment complete!');
            } else {
                throw new Error('Failed to parse AI response');
            }

        } catch (error) {
            if (error instanceof ModerationError) {
                alert(formatModerationErrorMessage(error));
            } else {
                console.error('Enrichment failed:', error);
                alert('Enrichment failed. See console for details.');
            }
        } finally {
            setIsEnriching(false);
        }
    };

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

    const handleFormChange = useCallback((field: string, value: any) => {
        setEditForm(prev => ({ ...prev!, [field]: value }));
    }, []);

    const closeEditModal = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleUpdate = useCallback(() => {
        setEditForm(currentForm => {
            actions.updateCrmItem(crmCollection, currentForm.id, currentForm);
            return currentForm;
        });
        setIsEditing(false);
    }, [actions, crmCollection]);
    
    const handleUpdateTask = useCallback(() => {
        if (editingTask && editText.trim() !== '') {
            actions.updateTask(editingTask.id, { text: editText, priority: editPriority, dueDate: editDueDate });
        }
        setEditingTask(null);
    }, [editingTask, editText, editPriority, editDueDate, actions]);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim() === '') return;
        actions.createTask(taskCollection, newTaskText, newTaskPriority, item.id, undefined, newTaskDueDate, undefined, undefined, newTaskSubtasks);
        setNewTaskText('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
        setNewTaskSubtasks([]);
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
        <div className="space-y-4 sm:space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-3 sm:p-5">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Top row: back button and title */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button 
                                onClick={onBack} 
                                className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors min-h-[44px] px-2 -ml-2"
                            >
                                <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                            <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">{item.company}</h1>
                        </div>
                        
                        {/* Bottom row: actions */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {workspaceMembers.length > 0 && onAssignCompany && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 uppercase tracking-wide hidden sm:inline">Assign:</span>
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
                                    if (window.confirm(`Delete ${item.company}? This will also delete all contacts, tasks, meetings, and documents.`)) {
                                        actions.deleteItem(crmCollection, item.id);
                                        onBack();
                                    }
                                }} 
                                className="flex items-center gap-1.5 text-gray-400 hover:text-red-600 text-sm font-medium transition-colors min-h-[44px] px-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Left Column - Account Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Account Info</h2>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleEnrich}
                                    disabled={isEnriching}
                                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-50"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {isEnriching ? 'Enriching...' : 'Enrich'}
                                </button>
                                <button 
                                    ref={editCrmModalTriggerRef} 
                                    onClick={() => setIsEditing(true)} 
                                    className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Primary Contact</p>
                                <p className="text-sm font-medium text-gray-900">{item.contacts[0]?.name || 'N/A'}</p>
                            </div>
                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                                <p className="text-sm font-medium text-gray-900">{item.status}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    item.priority === 'High' 
                                        ? 'bg-red-100 text-red-700' 
                                        : item.priority === 'Medium' 
                                            ? 'bg-yellow-100 text-yellow-700' 
                                            : 'bg-gray-100 text-gray-600'
                                }`}>{item.priority}</span>
                                {item.assignedToName && (
                                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                        {item.assignedToName}
                                    </span>
                                )}
                            </div>
                            
                            {/* Deal Flow / Value Section */}
                            <div className="pt-3 border-t border-gray-100 space-y-3">
                                {specificValueDisplay()}
                                
                                {/* Investment Stage for Investors */}
                                {'checkSize' in item && (item as any).stage && (
                                    <div className="bg-green-50 rounded-md p-3">
                                        <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Investment Stage</p>
                                        <p className="text-sm font-semibold text-green-800">{(item as any).stage}</p>
                                    </div>
                                )}
                                
                                {/* Deal Stage for Customers */}
                                {'dealValue' in item && (item as any).dealStage && (
                                    <div className="bg-gray-100 rounded-md p-3">
                                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Deal Stage</p>
                                        <p className="text-sm font-semibold text-gray-800">{(item as any).dealStage}</p>
                                    </div>
                                )}
                                
                                {/* Partner Type for Partners */}
                                {'opportunity' in item && (item as any).partnerType && (
                                    <div className="bg-gray-100 rounded-md p-3">
                                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Partner Type</p>
                                        <p className="text-sm font-semibold text-gray-800">{(item as any).partnerType}</p>
                                    </div>
                                )}
                            </div>

                            {/* Additional Info Section */}
                            {((item as any).website || (item as any).industry || (item as any).description) && (
                                <div className="pt-3 border-t border-gray-100 space-y-3">
                                    {(item as any).website && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Website</p>
                                            <a 
                                                href={(item as any).website} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1"
                                            >
                                                {(item as any).website}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                    {(item as any).industry && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Industry</p>
                                            <p className="text-sm text-gray-900">{(item as any).industry}</p>
                                        </div>
                                    )}
                                    {(item as any).description && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{(item as any).description}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Next Action</p>
                                <p className={`text-sm font-medium ${item.nextActionDate && new Date(item.nextActionDate + 'T00:00:00').toISOString().split('T')[0] < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-gray-900'}`}>
                                    {item.nextAction || 'None'}
                                </p>
                                {item.nextActionDate && (
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC' })}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contacts Section */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Contacts ({item.contacts?.length || 0})</h2>
                            <button 
                                onClick={() => setShowAddContact(!showAddContact)} 
                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                                    showAddContact 
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                                        : 'bg-gray-900 text-white hover:bg-gray-800'
                                }`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {showAddContact ? 'Cancel' : 'Add'}
                            </button>
                        </div>
                        {showAddContact && (
                            <div className="p-5 bg-gray-50 border-b border-gray-100">
                                <ContactForm crmItemId={item.id} collection={crmCollection} actions={actions} onDone={() => setShowAddContact(false)} />
                            </div>
                        )}
                        <div className="p-5">
                            <ul className="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                {(item.contacts || []).length > 0 ? (
                                    (item.contacts || []).map(contact => (
                                        <li key={contact.id} className="group p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-grow min-w-0">
                                                    <p className="font-medium text-sm text-gray-900 mb-0.5">{contact.name}</p>
                                                    {contact.title && (
                                                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                                            <Briefcase className="w-3 h-3" />
                                                            {contact.title}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                                                        {contact.email && (
                                                            <span className="flex items-center gap-1 truncate">
                                                                <Mail className="w-3 h-3" />
                                                                {contact.email}
                                                            </span>
                                                        )}
                                                        {contact.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />
                                                                {contact.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => onViewContact(contact)} 
                                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium shrink-0 transition-colors"
                                                >
                                                    View
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-6">No contacts yet. Add one to get started!</p>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right Column - Tasks */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Company Tasks</h2>
                        </div>
                        <form onSubmit={handleAddTask} className="p-5 bg-gray-50 border-b border-gray-100 space-y-3">
                            <label htmlFor="new-account-task" className="block text-xs text-gray-500 uppercase tracking-wide font-medium">
                                Add New Task
                            </label>
                            <input
                                id="new-account-task"
                                name="new-account-task"
                                value={newTaskText || ''}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="e.g., Prepare Q4 presentation..."
                                className="w-full bg-white border border-gray-200 text-gray-900 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="new-task-priority" className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Priority</label>
                                    <select
                                        id="new-task-priority"
                                        name="new-task-priority"
                                        value={newTaskPriority || 'Medium'}
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
                                        value={newTaskDueDate || ''}
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
                            <h3 className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Task List ({companyTasks.length})</h3>
                            <ul className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-1">
                                {companyTasks.length > 0 ? (
                                    companyTasks.map(task => <AccountTaskItem key={task.id} task={task} onEdit={openEditTaskModal} actions={actions} tag={title} taskCollection={taskCollection} />)
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-400 text-sm">No company-level tasks yet.</p>
                                        <p className="text-gray-400 text-xs mt-1">Add a task above to track work for {item.company}</p>
                                    </div>
                                )}
                            </ul>
                        </div>
                    </div>
                    
                    {/* Linked Documents Section */}
                    <div className="mt-6">
                        <LinkedDocumentsSection companyId={item.id} />
                    </div>
                </div>
            </div>
             <Modal isOpen={isEditing} onClose={closeEditModal} title={`Edit ${title}`} triggerRef={editCrmModalTriggerRef}>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="edit-company" className="block font-mono text-sm font-semibold text-black mb-1">Company Name *</label>
                        <input 
                            id="edit-company" 
                            value={editForm.company || ''} 
                            onChange={(e) => handleFormChange('company', e.target.value)} 
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-priority" className="block font-mono text-sm font-semibold text-black mb-1">Priority</label>
                            <select 
                                id="edit-priority" 
                                value={editForm.priority || 'Medium'} 
                                onChange={(e) => handleFormChange('priority', e.target.value as Priority)} 
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            >
                                <option>Low</option><option>Medium</option><option>High</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="edit-status" className="block font-mono text-sm font-semibold text-black mb-1">Status</label>
                            <input 
                                id="edit-status" 
                                value={editForm.status || ''} 
                                onChange={(e) => handleFormChange('status', e.target.value)} 
                                placeholder="e.g., Active, Prospect"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-website" className="block font-mono text-sm font-semibold text-black mb-1">Website</label>
                            <input 
                                id="edit-website" 
                                type="url"
                                value={(editForm as any).website || ''} 
                                onChange={(e) => handleFormChange('website', e.target.value)} 
                                placeholder="https://example.com"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-industry" className="block font-mono text-sm font-semibold text-black mb-1">Industry</label>
                            <input 
                                id="edit-industry" 
                                value={(editForm as any).industry || ''} 
                                onChange={(e) => handleFormChange('industry', e.target.value)} 
                                placeholder="e.g., SaaS, Fintech"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="edit-description" className="block font-mono text-sm font-semibold text-black mb-1">Description</label>
                        <textarea 
                            id="edit-description" 
                            value={(editForm as any).description || ''} 
                            onChange={(e) => handleFormChange('description', e.target.value)} 
                            placeholder="Brief description of the company..."
                            rows={3}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 resize-none" 
                        />
                    </div>

                    {/* Type-specific fields */}
                    {crmCollection === 'investors' && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                            <div>
                                <label htmlFor="edit-check-size" className="block font-mono text-sm font-semibold text-black mb-1">Check Size ($)</label>
                                <input 
                                    id="edit-check-size" 
                                    type="number"
                                    value={(editForm as any).checkSize || ''} 
                                    onChange={(e) => handleFormChange('checkSize', e.target.value ? Number(e.target.value) : undefined)} 
                                    placeholder="e.g., 100000"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-stage" className="block font-mono text-sm font-semibold text-black mb-1">Investment Stage</label>
                                <select 
                                    id="edit-stage" 
                                    value={(editForm as any).stage || ''} 
                                    onChange={(e) => handleFormChange('stage', e.target.value)} 
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select stage...</option>
                                    <option value="Pre-Seed">Pre-Seed</option>
                                    <option value="Seed">Seed</option>
                                    <option value="Series A">Series A</option>
                                    <option value="Series B">Series B</option>
                                    <option value="Series C+">Series C+</option>
                                    <option value="Growth">Growth</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {crmCollection === 'customers' && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                            <div>
                                <label htmlFor="edit-deal-value" className="block font-mono text-sm font-semibold text-black mb-1">Deal Value ($)</label>
                                <input 
                                    id="edit-deal-value" 
                                    type="number"
                                    value={(editForm as any).dealValue || ''} 
                                    onChange={(e) => handleFormChange('dealValue', e.target.value ? Number(e.target.value) : undefined)} 
                                    placeholder="e.g., 50000"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-deal-stage" className="block font-mono text-sm font-semibold text-black mb-1">Deal Stage</label>
                                <select 
                                    id="edit-deal-stage" 
                                    value={(editForm as any).dealStage || ''} 
                                    onChange={(e) => handleFormChange('dealStage', e.target.value)} 
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select stage...</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {crmCollection === 'partners' && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                            <div>
                                <label htmlFor="edit-opportunity" className="block font-mono text-sm font-semibold text-black mb-1">Opportunity</label>
                                <input 
                                    id="edit-opportunity" 
                                    value={(editForm as any).opportunity || ''} 
                                    onChange={(e) => handleFormChange('opportunity', e.target.value)} 
                                    placeholder="e.g., Co-marketing campaign"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-partner-type" className="block font-mono text-sm font-semibold text-black mb-1">Partner Type</label>
                                <select 
                                    id="edit-partner-type" 
                                    value={(editForm as any).partnerType || ''} 
                                    onChange={(e) => handleFormChange('partnerType', e.target.value)} 
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select type...</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Distribution">Distribution</option>
                                    <option value="Integration">Integration</option>
                                    <option value="Referral">Referral</option>
                                    <option value="Strategic">Strategic</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 border-t border-gray-200">
                        <label htmlFor="edit-next-action" className="block font-mono text-sm font-semibold text-black mb-1">Next Action</label>
                        <input 
                            id="edit-next-action" 
                            value={editForm.nextAction || ''} 
                            onChange={(e) => handleFormChange('nextAction', e.target.value)} 
                            placeholder="e.g., Send intro email"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-next-action-date" className="block font-mono text-sm font-semibold text-black mb-1">Next Action Date</label>
                            <input 
                                id="edit-next-action-date" 
                                type="date" 
                                value={editForm.nextActionDate || ''} 
                                onChange={(e) => handleFormChange('nextActionDate', e.target.value)} 
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-next-action-time" className="block font-mono text-sm font-semibold text-black mb-1">Next Action Time</label>
                            <input 
                                id="edit-next-action-time" 
                                type="time" 
                                value={editForm.nextActionTime || ''} 
                                onChange={(e) => handleFormChange('nextActionTime', e.target.value)} 
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <NotesManager 
                            notes={editForm.notes} 
                            itemId={editForm.id} 
                            collection={crmCollection} 
                            addNoteAction={actions.addNote}
                            updateNoteAction={actions.updateNote}
                            deleteNoteAction={actions.deleteNote}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button onClick={handleUpdate} className="font-mono w-full bg-black border-2 border-black text-white cursor-pointer text-sm py-3 px-4 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-gray-800">Save Changes</button>
                        <button onClick={() => setIsEditing(false)} className="font-mono w-full bg-white border-2 border-black text-black cursor-pointer text-sm py-3 px-4 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-gray-100">Cancel</button>
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
                                name={`edit-acc-task-${editingTask.id}`}
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

export default AccountDetailView;