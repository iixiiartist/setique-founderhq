import React, { useState } from 'react';
import { Task, CalendarEvent, MarketingItem, AppActions, Priority, CrmCollectionName, Workspace } from '../../types';
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
    editDueDate: string;
    editTime: string;
    onTextChange: (value: string) => void;
    onPriorityChange: (value: Priority) => void;
    onDueDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
}

const TaskEditForm: React.FC<TaskEditFormProps> = ({
    editText, editPriority, editDueDate, editTime,
    onTextChange, onPriorityChange, onDueDateChange, onTimeChange
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
    onTitleChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
    onAttendeesChange: (value: string) => void;
    onSummaryChange: (value: string) => void;
}

const MeetingEditForm: React.FC<MeetingEditFormProps> = ({
    editTitle, editDueDate, editTime, editAttendees, editSummary,
    onTitleChange, onDueDateChange, onTimeChange, onAttendeesChange, onSummaryChange
}) => (
    <>
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
    editCompany: string;
    editDueDate: string;
    editTime: string;
    onNextActionChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
}

const CrmActionEditForm: React.FC<CrmActionEditFormProps> = ({
    editNextAction, editCompany, editDueDate, editTime,
    onNextActionChange, onDueDateChange, onTimeChange
}) => (
    <>
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
            <label htmlFor="edit-crm-time" className="block text-sm font-medium text-slate-700 mb-1.5">Next Action Time (Optional)</label>
            <input
                id="edit-crm-time"
                type="time"
                value={editTime || ''}
                onChange={e => onTimeChange(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl text-slate-900 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
            />
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-gray-200">
            <p className="text-sm text-slate-700">
                <span className="font-medium">Company:</span> {editCompany}
            </p>
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

interface EventDetailModalContentProps {
    event: CalendarEvent;
    actions: AppActions;
    onClose: () => void;
    workspace?: Workspace;
}

export const EventDetailModalContent: React.FC<EventDetailModalContentProps> = ({ 
    event, 
    actions, 
    onClose, 
    workspace 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const { user } = useAuth();

    // Task edit state
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>('Medium');
    
    // Marketing item edit state
    const [editTitle, setEditTitle] = useState('');
    const [editStatus, setEditStatus] = useState<MarketingItem['status']>('Planned');

    // Meeting edit state
    const [editAttendees, setEditAttendees] = useState('');
    const [editSummary, setEditSummary] = useState('');
    const [editTime, setEditTime] = useState('');

    // CRM action edit state
    const [editNextAction, setEditNextAction] = useState('');
    const [editCompany, setEditCompany] = useState('');

    // Doc linking state
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [linkedDocsKey, setLinkedDocsKey] = useState(0);

    // Shared edit state
    const [editDueDate, setEditDueDate] = useState('');
    
    // Delete confirmation
    const deleteEventConfirm = useDeleteConfirm<CalendarEvent>('event');

    const isTask = event.type === 'task';
    const isMarketing = event.type === 'marketing';
    const isMeeting = event.type === 'meeting';
    const isCrmAction = event.type === 'crm-action';
    const task = isTask ? event : null;

    const handleEditClick = () => {
        if (isTask) {
            setEditText(event.text);
            setEditPriority(event.priority);
            setEditDueDate(event.dueDate || '');
            setEditTime(event.dueTime || '');
        } else if (isMarketing) {
            setEditTitle(event.title);
            setEditStatus(event.status as MarketingItem['status']);
            setEditDueDate(event.dueDate || '');
            setEditTime(event.dueTime || '');
        } else if (isMeeting) {
            setEditTitle(event.title);
            setEditAttendees(event.attendees);
            setEditSummary(event.summary);
            setEditDueDate(event.dueDate);
            const date = new Date(event.timestamp);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            setEditTime(`${hours}:${minutes}`);
        } else if (isCrmAction) {
            setEditNextAction(event.nextAction || '');
            setEditCompany(event.company);
            setEditDueDate(event.nextActionDate || '');
            setEditTime(event.nextActionTime || '');
        }
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setIsEditing(false);
    };

    const handleSaveChanges = () => {
        if (isTask) {
            if (editText.trim() !== '') {
                actions.updateTask(event.id, {
                    text: editText,
                    priority: editPriority,
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
                const collection = getCrmCollection(event.tag);
                const newTimestamp = new Date(`${editDueDate}T${editTime || '00:00'}`).getTime();

                actions.updateMeeting(collection, event.crmItemId, event.contactId, event.id, {
                    title: editTitle,
                    attendees: editAttendees,
                    summary: editSummary,
                    timestamp: newTimestamp
                });
            }
        } else if (isCrmAction) {
            const collection = getCrmCollection(event.tag);
            actions.updateCrmItem(collection, event.id, {
                nextAction: editNextAction,
                nextActionDate: editDueDate,
                nextActionTime: editTime,
            });
        }
        setIsEditing(false);
    };

    const handleDelete = () => {
        deleteEventConfirm.requestConfirm(event, () => {
            if (isTask) {
                actions.deleteTask(event.id);
            } else if (isMarketing) {
                actions.deleteMarketingItem(event.id);
            } else if (isMeeting) {
                const collection = getCrmCollection(event.tag);
                actions.deleteMeeting(collection, event.crmItemId, event.contactId, event.id);
            } else if (isCrmAction) {
                const collection = getCrmCollection(event.tag);
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
                        editDueDate={editDueDate}
                        editTime={editTime}
                        onTextChange={setEditText}
                        onPriorityChange={setEditPriority}
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
                        onTitleChange={setEditTitle}
                        onDueDateChange={setEditDueDate}
                        onTimeChange={setEditTime}
                        onAttendeesChange={setEditAttendees}
                        onSummaryChange={setEditSummary}
                    />
                )}
                {isCrmAction && (
                    <CrmActionEditForm
                        editNextAction={editNextAction}
                        editCompany={editCompany}
                        editDueDate={editDueDate}
                        editTime={editTime}
                        onNextActionChange={setEditNextAction}
                        onDueDateChange={setEditDueDate}
                        onTimeChange={setEditTime}
                    />
                )}
                <div className="flex gap-3 mt-6">
                    <button onClick={handleSaveChanges} className="flex-1 font-semibold text-sm bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all">Save Changes</button>
                    <button onClick={handleCancelEditing} className="flex-1 font-semibold text-sm bg-white text-slate-700 py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">Cancel</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <h3 className={`text-xl font-semibold p-3 rounded-xl ${TASK_TAG_BG_COLORS[event.tag]}`}>{event.title}</h3>
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
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Module</p><p className="font-semibold text-slate-900">{event.tag}</p></div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Type</p>
                    <p className="font-semibold text-slate-900 capitalize">
                        {isMarketing ? event.contentType : event.type}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date & Time</p>
                    <p className="font-semibold text-slate-900">
                        {new Date(event.dueDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', dateStyle: 'long' })}
                        {isMeeting && (
                            <span className="ml-2 text-slate-500 font-normal">
                                {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        {(isTask && 'dueTime' in event && event.dueTime) && (
                            <span className="ml-2 text-slate-500 font-normal">{event.dueTime}</span>
                        )}
                        {(isMarketing && 'dueTime' in event && event.dueTime) && (
                            <span className="ml-2 text-slate-500 font-normal">{event.dueTime}</span>
                        )}
                        {(isCrmAction && 'nextActionTime' in event && event.nextActionTime) && (
                            <span className="ml-2 text-slate-500 font-normal">{event.nextActionTime}</span>
                        )}
                    </p>
                </div>
                {isTask && <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p><p className="font-semibold text-slate-900">{event.status}</p></div>}
                {isMarketing && <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p><p className="font-semibold text-slate-900">{event.status}</p></div>}
            </div>
            {isTask && (
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Priority</p><p className="font-semibold text-slate-900">{task!.priority}</p></div>
            )}
            {isTask && task!.assignedToName && (
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned To</p><p className="font-semibold text-slate-900">👤 {task!.assignedToName}</p></div>
            )}
            {isMeeting && (
                 <>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Company</p><p className="font-semibold text-slate-900">{event.companyName}</p></div>
                        <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Contact</p><p className="font-semibold text-slate-900">{event.contactName}</p></div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Attendees</p>
                        <p className="font-semibold text-slate-900">{event.attendees || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Summary</p>
                        <div className="bg-slate-50 rounded-xl border border-gray-200 p-4 max-h-48 overflow-y-auto custom-scrollbar">
                            <ReactMarkdown className="markdown-content prose prose-sm max-w-none" remarkPlugins={[remarkGfm]}>
                                {event.summary}
                            </ReactMarkdown>
                        </div>
                    </div>
                </>
            )}
            {isCrmAction && (
                <>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Company</p>
                        <p className="font-semibold text-slate-900">{event.companyName}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Priority</p>
                        <p className="font-semibold text-slate-900">{event.priority}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
                        <p className="font-semibold text-slate-900">{event.status}</p>
                    </div>
                    {event.assignedToName && (
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
