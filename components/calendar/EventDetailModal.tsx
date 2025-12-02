import React, { useState, useMemo } from 'react';
import { Task, CalendarEvent, CalendarTaskEvent, MarketingItem, AppActions, Priority, CrmCollectionName, Workspace, BaseCrmItem, WorkspaceMember, TaskCollectionName } from '../../types';
import { TASK_TAG_BG_COLORS } from '../../constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocLibraryPicker } from '../workspace/DocLibraryPicker';
import { LinkedDocsDisplay } from '../workspace/LinkedDocsDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteConfirm } from '../../hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { DatabaseService } from '../../lib/services/database';
import { showError } from '../../lib/utils/toast';

// Event edit form components
interface TaskEditFormProps {
    editText: string;
    editPriority: Priority;
    editCategory: TaskCollectionName;
    editAssignedTo: string;
    editDueDate: string;
    editTime: string;
    workspaceMembers: WorkspaceMember[];
    canAssign: boolean;
    onTextChange: (value: string) => void;
    onPriorityChange: (value: Priority) => void;
    onCategoryChange: (value: TaskCollectionName) => void;
    onAssignedToChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
}

const CATEGORY_OPTIONS: { value: TaskCollectionName; label: string }[] = [
    { value: 'productsServicesTasks', label: 'Products & Services' },
    { value: 'investorTasks', label: 'Investors' },
    { value: 'customerTasks', label: 'Customers' },
    { value: 'partnerTasks', label: 'Partners' },
    { value: 'marketingTasks', label: 'Marketing' },
    { value: 'financialTasks', label: 'Financial' },
];

const TaskEditForm: React.FC<TaskEditFormProps> = ({
    editText, editPriority, editCategory, editAssignedTo, editDueDate, editTime,
    workspaceMembers, canAssign,
    onTextChange, onPriorityChange, onCategoryChange, onAssignedToChange, onDueDateChange, onTimeChange
}) => (
    <>
        <div>
            <label htmlFor="edit-task-text" className="block text-sm font-medium text-slate-700 mb-1.5">Task Description</label>
            <textarea
                id="edit-task-text"
                value={editText || ''}
                onChange={e => onTextChange(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-task-category" className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select
                    id="edit-task-category"
                    value={editCategory || 'productsServicesTasks'}
                    onChange={e => onCategoryChange(e.target.value as TaskCollectionName)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="edit-task-priority" className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                <select
                    id="edit-task-priority"
                    value={editPriority || 'Medium'}
                    onChange={e => onPriorityChange(e.target.value as Priority)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-task-duedate" className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
                <input
                    id="edit-task-duedate"
                    type="date"
                    value={editDueDate || ''}
                    onChange={e => onDueDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
            </div>
            <div>
                <label htmlFor="edit-task-duetime" className="block text-sm font-medium text-slate-700 mb-1.5">Due Time (Optional)</label>
                <input
                    id="edit-task-duetime"
                    type="time"
                    value={editTime || ''}
                    onChange={e => onTimeChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
            </div>
        </div>
        {canAssign && (
            <div>
                <label htmlFor="edit-task-assigned" className="block text-sm font-medium text-slate-700 mb-1.5">Assign To</label>
                <select
                    id="edit-task-assigned"
                    value={editAssignedTo || ''}
                    onChange={e => onAssignedToChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    <option value="">Unassigned</option>
                    {workspaceMembers.map(member => (
                        <option key={member.userId} value={member.userId}>
                            {member.fullName || member.email}
                        </option>
                    ))}
                </select>
            </div>
        )}
    </>
);

interface MarketingEditFormProps {
    editTitle: string;
    editStatus: MarketingItem['status'];
    editDueDate: string;
    editTime: string;
    onTitleChange: (value: string) => void;
    onStatusChange: (value: MarketingItem['status']) => void;
    onDueDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
}

const MarketingEditForm: React.FC<MarketingEditFormProps> = ({
    editTitle, editStatus, editDueDate, editTime,
    onTitleChange, onStatusChange, onDueDateChange, onTimeChange
}) => (
    <>
        <div>
            <label htmlFor="edit-mkt-title" className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
                id="edit-mkt-title"
                type="text"
                value={editTitle || ''}
                onChange={e => onTitleChange(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-mkt-status" className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                    id="edit-mkt-status"
                    value={editStatus || 'Planned'}
                    onChange={e => onStatusChange(e.target.value as MarketingItem['status'])}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    <option>Planned</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Published</option>
                    <option>Cancelled</option>
                </select>
            </div>
            <div>
                <label htmlFor="edit-mkt-duedate" className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
                <input
                    id="edit-mkt-duedate"
                    type="date"
                    value={editDueDate || ''}
                    onChange={e => onDueDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
            </div>
        </div>
        <div>
            <label htmlFor="edit-mkt-duetime" className="block text-sm font-medium text-slate-700 mb-1.5">Due Time (Optional)</label>
            <input
                id="edit-mkt-duetime"
                type="time"
                value={editTime || ''}
                onChange={e => onTimeChange(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
            />
        </div>
    </>
);

interface MeetingEditFormProps {
    editTitle: string;
    editDueDate: string;
    editTime: string;
    editAttendees: string;
    editSummary: string;
    editCrmCollection: CrmCollectionName;
    editCrmItemId: string;
    editContactId: string;
    crmItems: BaseCrmItem[];
    contacts: { id: string; name: string; email?: string }[];
    onTitleChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
    onAttendeesChange: (value: string) => void;
    onSummaryChange: (value: string) => void;
    onCrmCollectionChange: (value: CrmCollectionName) => void;
    onCrmItemChange: (value: string) => void;
    onContactChange: (value: string) => void;
}

const CRM_COLLECTION_OPTIONS: { value: CrmCollectionName; label: string }[] = [
    { value: 'investors', label: 'Investors' },
    { value: 'customers', label: 'Customers' },
    { value: 'partners', label: 'Partners' },
];

const MeetingEditForm: React.FC<MeetingEditFormProps> = ({
    editTitle, editDueDate, editTime, editAttendees, editSummary,
    editCrmCollection, editCrmItemId, editContactId, crmItems, contacts,
    onTitleChange, onDueDateChange, onTimeChange, onAttendeesChange, onSummaryChange,
    onCrmCollectionChange, onCrmItemChange, onContactChange
}) => (
    <>
        {/* CRM Type and Company/Contact Selection */}
        <div className="grid grid-cols-3 gap-4">
            <div>
                <label htmlFor="edit-meet-crm-type" className="block text-sm font-medium text-slate-700 mb-1.5">CRM Type</label>
                <select
                    id="edit-meet-crm-type"
                    value={editCrmCollection}
                    onChange={e => onCrmCollectionChange(e.target.value as CrmCollectionName)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    {CRM_COLLECTION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="edit-meet-company" className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                <select
                    id="edit-meet-company"
                    value={editCrmItemId}
                    onChange={e => onCrmItemChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    <option value="">Select company...</option>
                    {crmItems.map(item => (
                        <option key={item.id} value={item.id}>{item.company}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="edit-meet-contact" className="block text-sm font-medium text-slate-700 mb-1.5">Contact</label>
                <select
                    id="edit-meet-contact"
                    value={editContactId}
                    onChange={e => onContactChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                    disabled={!editCrmItemId || contacts.length === 0}
                >
                    <option value="">Select contact...</option>
                    {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>{contact.name}</option>
                    ))}
                </select>
            </div>
        </div>
        <div>
            <label htmlFor="edit-meet-title" className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input id="edit-meet-title" type="text" value={editTitle || ''} onChange={e => onTitleChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-meet-date" className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input id="edit-meet-date" type="date" value={editDueDate || ''} onChange={e => onDueDateChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors" />
            </div>
            <div>
                <label htmlFor="edit-meet-time" className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
                <input id="edit-meet-time" type="time" value={editTime || ''} onChange={e => onTimeChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors" />
            </div>
        </div>
        <div>
            <label htmlFor="edit-meet-attendees" className="block text-sm font-medium text-slate-700 mb-1.5">Attendees</label>
            <input id="edit-meet-attendees" type="text" value={editAttendees || ''} onChange={e => onAttendeesChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors" />
        </div>
        <div>
            <label htmlFor="edit-meet-summary" className="block text-sm font-medium text-slate-700 mb-1.5">Summary (Markdown)</label>
            <textarea id="edit-meet-summary" value={editSummary || ''} onChange={e => onSummaryChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-3 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors" />
        </div>
    </>
);

interface CrmActionEditFormProps {
    editNextAction: string;
    editDueDate: string;
    editTime: string;
    editCrmCollection: CrmCollectionName;
    editCrmItemId: string;
    crmItems: BaseCrmItem[];
    onNextActionChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
    onCrmCollectionChange: (value: CrmCollectionName) => void;
    onCrmItemChange: (value: string) => void;
}

const CrmActionEditForm: React.FC<CrmActionEditFormProps> = ({
    editNextAction, editDueDate, editTime, editCrmCollection, editCrmItemId, crmItems,
    onNextActionChange, onDueDateChange, onTimeChange, onCrmCollectionChange, onCrmItemChange
}) => (
    <>
        {/* CRM Type and Company Selection */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-crm-type" className="block text-sm font-medium text-slate-700 mb-1.5">CRM Type</label>
                <select
                    id="edit-crm-type"
                    value={editCrmCollection}
                    onChange={e => onCrmCollectionChange(e.target.value as CrmCollectionName)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    {CRM_COLLECTION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="edit-crm-company" className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                <select
                    id="edit-crm-company"
                    value={editCrmItemId}
                    onChange={e => onCrmItemChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                >
                    <option value="">Select company...</option>
                    {crmItems.map(item => (
                        <option key={item.id} value={item.id}>{item.company}</option>
                    ))}
                </select>
            </div>
        </div>
        <div>
            <label htmlFor="edit-crm-action" className="block text-sm font-medium text-slate-700 mb-1.5">Next Action</label>
            <input
                id="edit-crm-action"
                type="text"
                value={editNextAction || ''}
                onChange={e => onNextActionChange(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                placeholder="e.g., Send follow-up email"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-crm-date" className="block text-sm font-medium text-slate-700 mb-1.5">Next Action Date</label>
                <input
                    id="edit-crm-date"
                    type="date"
                    value={editDueDate || ''}
                    onChange={e => onDueDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
            </div>
            <div>
                <label htmlFor="edit-crm-time" className="block text-sm font-medium text-slate-700 mb-1.5">Next Action Time</label>
                <input
                    id="edit-crm-time"
                    type="time"
                    value={editTime || ''}
                    onChange={e => onTimeChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
            </div>
        </div>
    </>
);

// CRM collection map helper
const getCrmCollection = (tag: string): CrmCollectionName => {
    const crmCollectionMap: Record<string, CrmCollectionName> = {
        'Investor': 'investors',
        'Customer': 'customers',
        'Partner': 'partners',
    };
    return crmCollectionMap[tag];
};

// Extended CalendarEvent type that includes team calendar event types
type ExtendedCalendarEvent = CalendarEvent | {
    id: string;
    title: string;
    type: 'deal';
    dueDate?: string;
    status?: string;
    assignedTo?: string;
    assignedToName?: string;
    tag?: string;
    start?: Date;
    end?: Date;
    [key: string]: any;
};

interface EventDetailModalContentProps {
    event: ExtendedCalendarEvent;
    actions: AppActions;
    onClose: () => void;
    workspace?: Workspace;
    crmItems?: {
        investors: BaseCrmItem[];
        customers: BaseCrmItem[];
        partners: BaseCrmItem[];
    };
    workspaceMembers?: WorkspaceMember[];
}

export const EventDetailModalContent: React.FC<EventDetailModalContentProps> = ({ 
    event, 
    actions, 
    onClose, 
    workspace,
    crmItems,
    workspaceMembers = []
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const { user } = useAuth();

    // Task edit state
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>('Medium');
    const [editCategory, setEditCategory] = useState<TaskCollectionName>('productsServicesTasks');
    const [editAssignedTo, setEditAssignedTo] = useState('');
    
    // Marketing item edit state
    const [editTitle, setEditTitle] = useState('');
    const [editStatus, setEditStatus] = useState<MarketingItem['status']>('Planned');

    // Meeting edit state
    const [editAttendees, setEditAttendees] = useState('');
    const [editSummary, setEditSummary] = useState('');
    const [editTime, setEditTime] = useState('');

    // CRM/Meeting shared edit state
    const [editCrmCollection, setEditCrmCollection] = useState<CrmCollectionName>('investors');
    const [editCrmItemId, setEditCrmItemId] = useState('');
    const [editContactId, setEditContactId] = useState('');

    // CRM action edit state
    const [editNextAction, setEditNextAction] = useState('');
    const [editCompany, setEditCompany] = useState('');

    // Doc linking state
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [linkedDocsKey, setLinkedDocsKey] = useState(0);

    // Shared edit state
    const [editDueDate, setEditDueDate] = useState('');
    
    // Delete confirmation
    const deleteEventConfirm = useDeleteConfirm<ExtendedCalendarEvent>('event');

    const isTask = event.type === 'task';
    const isMarketing = event.type === 'marketing';
    const isMeeting = event.type === 'meeting';
    const isCrmAction = event.type === 'crm-action';
    const isDeal = (event as any).type === 'deal';
    const task = isTask ? event as CalendarTaskEvent : null;

    // Helper to safely get event properties (handles different data structures from personal vs team calendar)
    const getEventDate = (): string => {
        if ('dueDate' in event && event.dueDate) return event.dueDate;
        if ('nextActionDate' in event && event.nextActionDate) return event.nextActionDate;
        if ('start' in event && (event as any).start instanceof Date) {
            return (event as any).start.toISOString().split('T')[0];
        }
        return '';
    };

    const getEventTime = (): string => {
        if ('dueTime' in event && event.dueTime) return event.dueTime;
        if ('nextActionTime' in event && event.nextActionTime) return event.nextActionTime;
        if ('timestamp' in event && event.timestamp) {
            const date = new Date(event.timestamp);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        if ('start' in event && (event as any).start instanceof Date) {
            const date = (event as any).start;
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        return '';
    };

    const getEventTag = (): string => {
        if ('tag' in event && event.tag) return event.tag;
        if ('crmType' in event && (event as any).crmType) {
            const type = (event as any).crmType;
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
        return event.type.charAt(0).toUpperCase() + event.type.slice(1);
    };

    // Get available CRM items for the selected collection
    const availableCrmItems = useMemo(() => {
        if (!crmItems) return [];
        return crmItems[editCrmCollection] || [];
    }, [crmItems, editCrmCollection]);

    // Get available contacts for the selected CRM item
    const availableContacts = useMemo(() => {
        const selectedItem = availableCrmItems.find(item => item.id === editCrmItemId);
        return selectedItem?.contacts || [];
    }, [availableCrmItems, editCrmItemId]);

    // Determine CRM collection from tag
    const getCollectionFromTag = (tag: string): CrmCollectionName => {
        const tagLower = tag.toLowerCase();
        if (tagLower === 'investor' || tagLower === 'investors') return 'investors';
        if (tagLower === 'customer' || tagLower === 'customers') return 'customers';
        if (tagLower === 'partner' || tagLower === 'partners') return 'partners';
        return 'investors';
    };

    const handleEditClick = () => {
        const eventDate = getEventDate();
        const eventTime = getEventTime();
        const ev = event as any; // Cast for flexible access
        const eventTag = getEventTag();

        if (isTask) {
            setEditText('text' in event ? (event as any).text : ev.title);
            setEditPriority('priority' in event ? (event as any).priority as Priority : 'Medium');
            setEditCategory('category' in event ? (event as any).category as TaskCollectionName : 'productsServicesTasks');
            setEditAssignedTo('assignedTo' in event ? (event as any).assignedTo || '' : '');
            setEditDueDate(eventDate);
            setEditTime(eventTime);
        } else if (isMarketing) {
            setEditTitle(ev.title);
            setEditStatus('status' in event ? (event as any).status as MarketingItem['status'] : 'Planned');
            setEditDueDate(eventDate);
            setEditTime(eventTime);
        } else if (isMeeting) {
            setEditTitle(ev.title);
            setEditAttendees('attendees' in event ? (event as any).attendees || '' : '');
            setEditSummary('summary' in event ? (event as any).summary || '' : '');
            // Set CRM collection, item, and contact
            const collection = getCollectionFromTag(eventTag);
            setEditCrmCollection(collection);
            setEditCrmItemId(ev.crmItemId || '');
            setEditContactId(ev.contactId || '');
            setEditDueDate(eventDate);
            setEditTime(eventTime);
        } else if (isCrmAction) {
            setEditNextAction('nextAction' in event ? (event as any).nextAction || '' : ev.title || '');
            setEditCompany('company' in event ? event.company || '' : ('companyName' in event ? (event as any).companyName || '' : ''));
            // Set CRM collection and item
            const collection = getCollectionFromTag(eventTag);
            setEditCrmCollection(collection);
            setEditCrmItemId(event.id); // For CRM actions, the event ID is the CRM item ID
            setEditDueDate(eventDate);
            setEditTime(eventTime);
        } else if (isDeal) {
            // Deals - read-only view for now, can be extended
            const dealEvent = event as any;
            setEditTitle(dealEvent.title);
            setEditDueDate(eventDate);
            setEditStatus('status' in dealEvent ? dealEvent.status : 'Planned');
        }
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setIsEditing(false);
    };

    const handleSaveChanges = () => {
        const ev = event as any;
        
        if (isTask) {
            if (editText.trim() !== '') {
                actions.updateTask(event.id, {
                    text: editText,
                    priority: editPriority,
                    category: editCategory,
                    assignedTo: editAssignedTo || undefined,
                    dueDate: editDueDate,
                    dueTime: editTime,
                });
            }
        } else if (isMarketing) {
            if (editTitle.trim() !== '') {
                actions.updateMarketingItem(event.id, {
                    title: editTitle,
                    status: editStatus,
                    dueDate: editDueDate,
                    dueTime: editTime,
                });
            }
        } else if (isMeeting) {
            if (editTitle.trim() !== '') {
                const newTimestamp = new Date(`${editDueDate}T${editTime || '00:00'}`).getTime();
                
                // Use event values as fallback if edit values are empty
                const oldCrmItemId = ev.crmItemId || '';
                const oldContactId = ev.contactId || '';
                const oldCollection = getCollectionFromTag(getEventTag());
                
                // Determine effective CRM item and contact IDs (use event values if edit values empty)
                const effectiveCrmItemId = editCrmItemId || oldCrmItemId;
                const effectiveContactId = editContactId || oldContactId;
                
                if (oldCrmItemId !== effectiveCrmItemId || oldContactId !== effectiveContactId) {
                    // CRM item or contact changed - delete old and create new
                    if (oldCrmItemId && oldContactId) {
                        actions.deleteMeeting(oldCollection, oldCrmItemId, oldContactId, event.id);
                    }
                    if (effectiveCrmItemId && effectiveContactId) {
                        actions.createMeeting(editCrmCollection, effectiveCrmItemId, effectiveContactId, {
                            title: editTitle,
                            attendees: editAttendees,
                            summary: editSummary,
                            timestamp: newTimestamp
                        });
                    }
                } else {
                    // Just update existing meeting
                    actions.updateMeeting(editCrmCollection || oldCollection, effectiveCrmItemId, effectiveContactId, event.id, {
                        title: editTitle,
                        attendees: editAttendees,
                        summary: editSummary,
                        timestamp: newTimestamp
                    });
                }
            }
        } else if (isCrmAction) {
            // Check if CRM item changed - need to clear old and set on new
            const oldCrmItemId = event.id;
            const oldCollection = getCollectionFromTag(getEventTag());
            
            if (oldCrmItemId !== editCrmItemId || oldCollection !== editCrmCollection) {
                // Clear action from old CRM item
                actions.updateCrmItem(oldCollection, oldCrmItemId, {
                    nextAction: undefined,
                    nextActionDate: undefined,
                    nextActionTime: undefined,
                });
                // Set action on new CRM item
                actions.updateCrmItem(editCrmCollection, editCrmItemId, {
                    nextAction: editNextAction,
                    nextActionDate: editDueDate,
                    nextActionTime: editTime,
                });
            } else {
                // Just update existing CRM item
                actions.updateCrmItem(editCrmCollection, event.id, {
                    nextAction: editNextAction,
                    nextActionDate: editDueDate,
                    nextActionTime: editTime,
                });
            }
        }
        setIsEditing(false);
    };

    const handleDelete = () => {
        const eventTag = getEventTag();
        const ev = event as any;
        
        deleteEventConfirm.requestConfirm(event, () => {
            if (isTask) {
                actions.deleteTask(event.id);
            } else if (isMarketing) {
                actions.deleteMarketingItem(event.id);
            } else if (isMeeting) {
                const collection = getCrmCollection(eventTag);
                actions.deleteMeeting(collection, ev.crmItemId, ev.contactId, event.id);
            } else if (isCrmAction) {
                const collection = getCrmCollection(eventTag);
                // Clear the next action (this is how we "delete" a CRM action)
                actions.updateCrmItem(collection, event.id, {
                    nextAction: undefined,
                    nextActionDate: undefined,
                    nextActionTime: undefined,
                });
            }
            onClose();
        });
    };

    const handleLinkDoc = async (doc: { id: string }) => {
        if (!workspace || !user) return;
        
        try {
            const { error } = await DatabaseService.linkDocToEntity(
                doc.id,
                workspace.id,
                isMeeting ? 'event' : 'task',
                event.id
            );

            if (error) {
                console.error('Error linking doc:', error);
                showError('Failed to link document');
                return;
            }

            // Refresh the linked docs display
            setLinkedDocsKey(prev => prev + 1);
            setShowDocPicker(false);
        } catch (error) {
            console.error('Failed to link doc:', error);
            showError('Failed to link document');
        }
    };

    if (isEditing) {
        return (
            <div className="space-y-4">
                {isTask && (
                    <TaskEditForm
                        editText={editText}
                        editPriority={editPriority}
                        editCategory={editCategory}
                        editAssignedTo={editAssignedTo}
                        editDueDate={editDueDate}
                        editTime={editTime}
                        workspaceMembers={workspaceMembers}
                        canAssign={workspaceMembers.length > 0}
                        onTextChange={setEditText}
                        onPriorityChange={setEditPriority}
                        onCategoryChange={setEditCategory}
                        onAssignedToChange={setEditAssignedTo}
                        onDueDateChange={setEditDueDate}
                        onTimeChange={setEditTime}
                    />
                )}
                {isMarketing && (
                    <MarketingEditForm
                        editTitle={editTitle}
                        editStatus={editStatus}
                        editDueDate={editDueDate}
                        editTime={editTime}
                        onTitleChange={setEditTitle}
                        onStatusChange={setEditStatus}
                        onDueDateChange={setEditDueDate}
                        onTimeChange={setEditTime}
                    />
                )}
                {isMeeting && (
                    <MeetingEditForm
                        editTitle={editTitle}
                        editDueDate={editDueDate}
                        editTime={editTime}
                        editAttendees={editAttendees}
                        editSummary={editSummary}
                        editCrmCollection={editCrmCollection}
                        editCrmItemId={editCrmItemId}
                        editContactId={editContactId}
                        crmItems={availableCrmItems}
                        contacts={availableContacts}
                        onTitleChange={setEditTitle}
                        onDueDateChange={setEditDueDate}
                        onTimeChange={setEditTime}
                        onAttendeesChange={setEditAttendees}
                        onSummaryChange={setEditSummary}
                        onCrmCollectionChange={setEditCrmCollection}
                        onCrmItemChange={setEditCrmItemId}
                        onContactChange={setEditContactId}
                    />
                )}
                {isCrmAction && (
                    <CrmActionEditForm
                        editNextAction={editNextAction}
                        editDueDate={editDueDate}
                        editTime={editTime}
                        editCrmCollection={editCrmCollection}
                        editCrmItemId={editCrmItemId}
                        crmItems={availableCrmItems}
                        onNextActionChange={setEditNextAction}
                        onDueDateChange={setEditDueDate}
                        onTimeChange={setEditTime}
                        onCrmCollectionChange={setEditCrmCollection}
                        onCrmItemChange={setEditCrmItemId}
                    />
                )}
                <div className="flex gap-3 mt-6">
                    <button onClick={handleSaveChanges} className="flex-1 font-semibold text-sm bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all">Save Changes</button>
                    <button onClick={handleCancelEditing} className="flex-1 font-semibold text-sm bg-white text-slate-700 py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">Cancel</button>
                </div>
            </div>
        );
    }
    
    // Get display values using helpers
    const displayDate = getEventDate();
    const displayTime = getEventTime();
    const displayTag = getEventTag();
    
    return (
        <div className="space-y-4">
            <h3 className={`text-xl font-semibold p-3 rounded-xl ${TASK_TAG_BG_COLORS[displayTag] || 'bg-gray-100'}`}>{event.title}</h3>
            {isTask && task && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
                    <input
                        type="checkbox"
                        id={`complete-task-${task.id}`}
                        checked={task.status === 'Done'}
                        onChange={(e) => actions.updateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' })}
                        className="w-5 h-5 accent-emerald-500 shrink-0 rounded"
                    />
                    <label htmlFor={`complete-task-${task.id}`} className="font-medium text-slate-700">Mark as Complete</label>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Module</p><p className="font-semibold text-slate-900">{displayTag}</p></div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Type</p>
                    <p className="font-semibold text-slate-900 capitalize">
                        {isMarketing && 'contentType' in event ? event.contentType : event.type}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date & Time</p>
                    <p className="font-semibold text-slate-900">
                        {displayDate ? new Date(displayDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', dateStyle: 'long' }) : 'Not set'}
                        {displayTime && displayTime !== '00:00' && (
                            <span className="ml-2 text-slate-500 font-normal">{displayTime}</span>
                        )}
                    </p>
                </div>
                {(isTask || isMarketing || isDeal) && 'status' in event && <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p><p className="font-semibold text-slate-900">{event.status}</p></div>}
            </div>
            {isTask && (
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Priority</p><p className="font-semibold text-slate-900">{'priority' in event ? event.priority : 'Medium'}</p></div>
            )}
            {isTask && 'assignedToName' in event && event.assignedToName && (
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned To</p><p className="font-semibold text-slate-900">👤 {event.assignedToName}</p></div>
            )}
            {isMeeting && (
                 <>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Company</p><p className="font-semibold text-slate-900">{'companyName' in event ? event.companyName || 'N/A' : 'N/A'}</p></div>
                        <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Contact</p><p className="font-semibold text-slate-900">{'contactName' in event ? event.contactName || 'N/A' : 'N/A'}</p></div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Attendees</p>
                        <p className="font-semibold text-slate-900">{'attendees' in event ? event.attendees || 'N/A' : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Summary</p>
                        <div className="bg-slate-50 rounded-xl border border-gray-200 p-4 max-h-48 overflow-y-auto custom-scrollbar">
                            <ReactMarkdown className="markdown-content prose prose-sm max-w-none" remarkPlugins={[remarkGfm]}>
                                {'summary' in event ? event.summary || '' : ''}
                            </ReactMarkdown>
                        </div>
                    </div>
                </>
            )}
            {isCrmAction && (
                <>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Company</p>
                        <p className="font-semibold text-slate-900">{'companyName' in event ? event.companyName || 'N/A' : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Priority</p>
                        <p className="font-semibold text-slate-900">{'priority' in event ? event.priority || 'N/A' : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
                        <p className="font-semibold text-slate-900">{'status' in event ? event.status || 'N/A' : 'N/A'}</p>
                    </div>
                    {'assignedToName' in event && event.assignedToName && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned To</p>
                            <p className="font-semibold text-slate-900">👤 {event.assignedToName}</p>
                        </div>
                    )}
                </>
            )}
            {isDeal && (
                <>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Deal Stage</p>
                        <p className="font-semibold text-slate-900 capitalize">{'status' in event ? event.status || 'N/A' : 'N/A'}</p>
                    </div>
                    {'assignedToName' in event && event.assignedToName && event.assignedToName !== 'Unassigned' && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned To</p>
                            <p className="font-semibold text-slate-900">👤 {event.assignedToName}</p>
                        </div>
                    )}
                </>
            )}
            
            {/* Linked GTM Docs Section */}
            {workspace && (isMeeting || isTask) && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            Linked Documents
                        </h4>
                        <button
                            type="button"
                            onClick={() => setShowDocPicker(true)}
                            className="bg-slate-900 text-white text-xs py-1.5 px-3 font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                        >
                            + Attach Doc
                        </button>
                    </div>
                    <LinkedDocsDisplay
                        key={linkedDocsKey}
                        workspaceId={workspace.id}
                        entityType={isMeeting ? 'event' : 'task'}
                        entityId={event.id}
                        compact={false}
                    />
                </div>
            )}
            
            <div className="flex gap-3 mt-6">
                <button onClick={handleEditClick} className="flex-1 font-semibold text-sm bg-white text-slate-700 py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">Edit</button>
                <button onClick={handleDelete} className="flex-1 font-semibold text-sm bg-red-50 text-red-600 py-2.5 px-4 rounded-xl border border-red-200 hover:bg-red-100 transition-all">Delete</button>
                <button onClick={onClose} className="flex-1 font-semibold text-sm bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all">Close</button>
            </div>
            
            {/* Doc Library Picker Modal */}
            {showDocPicker && workspace && user && (isMeeting || isTask) && (
                <DocLibraryPicker
                    isOpen={showDocPicker}
                    workspaceId={workspace.id}
                    userId={user.id}
                    onClose={() => setShowDocPicker(false)}
                    onSelect={handleLinkDoc}
                    title={isMeeting ? "Attach Document to Meeting" : "Attach Document to Task"}
                />
            )}

            {/* Delete Event Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteEventConfirm.isOpen}
                onClose={deleteEventConfirm.cancel}
                onConfirm={deleteEventConfirm.confirm}
                title={`Delete ${event.type}`}
                message={`Are you sure you want to delete this ${event.type}? This action cannot be undone.`}
                confirmLabel={deleteEventConfirm.confirmLabel}
                cancelLabel={deleteEventConfirm.cancelLabel}
                variant={deleteEventConfirm.variant}
                isLoading={deleteEventConfirm.isProcessing}
            />
        </div>
    );
};
