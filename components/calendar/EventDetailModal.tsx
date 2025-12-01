import React, { useState } from 'react';
import { Task, CalendarEvent, MarketingItem, AppActions, Priority, CrmCollectionName, Workspace } from '../../types';
import { TASK_TAG_BG_COLORS } from '../../constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocLibraryPicker } from '../workspace/DocLibraryPicker';
import { LinkedDocsDisplay } from '../workspace/LinkedDocsDisplay';
import { useAuth } from '../../contexts/AuthContext';
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
            <label htmlFor="edit-task-text" className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
            <textarea
                id="edit-task-text"
                value={editText || ''}
                onChange={e => onTextChange(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-task-priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                    id="edit-task-priority"
                    value={editPriority || 'Medium'}
                    onChange={e => onPriorityChange(e.target.value as Priority)}
                    className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select>
            </div>
            <div>
                <label htmlFor="edit-task-duedate" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                    id="edit-task-duedate"
                    type="date"
                    value={editDueDate || ''}
                    onChange={e => onDueDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
            </div>
        </div>
        <div>
            <label htmlFor="edit-task-duetime" className="block text-sm font-medium text-gray-700 mb-1">Due Time (Optional)</label>
            <input
                id="edit-task-duetime"
                type="time"
                value={editTime || ''}
                onChange={e => onTimeChange(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
            <label htmlFor="edit-mkt-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
                id="edit-mkt-title"
                type="text"
                value={editTitle || ''}
                onChange={e => onTitleChange(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-mkt-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                    id="edit-mkt-status"
                    value={editStatus || 'Planned'}
                    onChange={e => onStatusChange(e.target.value as MarketingItem['status'])}
                    className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                    <option>Planned</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Published</option>
                    <option>Cancelled</option>
                </select>
            </div>
            <div>
                <label htmlFor="edit-mkt-duedate" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                    id="edit-mkt-duedate"
                    type="date"
                    value={editDueDate || ''}
                    onChange={e => onDueDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
            </div>
        </div>
        <div>
            <label htmlFor="edit-mkt-duetime" className="block text-sm font-medium text-gray-700 mb-1">Due Time (Optional)</label>
            <input
                id="edit-mkt-duetime"
                type="time"
                value={editTime || ''}
                onChange={e => onTimeChange(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
            <label htmlFor="edit-meet-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input id="edit-meet-title" type="text" value={editTitle || ''} onChange={e => onTitleChange(e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-meet-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input id="edit-meet-date" type="date" value={editDueDate || ''} onChange={e => onDueDateChange(e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            </div>
            <div>
                <label htmlFor="edit-meet-time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input id="edit-meet-time" type="time" value={editTime || ''} onChange={e => onTimeChange(e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            </div>
        </div>
        <div>
            <label htmlFor="edit-meet-attendees" className="block text-sm font-medium text-gray-700 mb-1">Attendees</label>
            <input id="edit-meet-attendees" type="text" value={editAttendees || ''} onChange={e => onAttendeesChange(e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>
        <div>
            <label htmlFor="edit-meet-summary" className="block text-sm font-medium text-gray-700 mb-1">Summary (Markdown)</label>
            <textarea id="edit-meet-summary" value={editSummary || ''} onChange={e => onSummaryChange(e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md min-h-[150px] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
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
            <label htmlFor="edit-crm-action" className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
            <input
                id="edit-crm-action"
                type="text"
                value={editNextAction || ''}
                onChange={e => onNextActionChange(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="e.g., Send follow-up email"
            />
        </div>
        <div>
            <label htmlFor="edit-crm-date" className="block text-sm font-medium text-gray-700 mb-1">Next Action Date</label>
            <input
                id="edit-crm-date"
                type="date"
                value={editDueDate || ''}
                onChange={e => onDueDateChange(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
        </div>
        <div>
            <label htmlFor="edit-crm-time" className="block text-sm font-medium text-gray-700 mb-1">Next Action Time (Optional)</label>
            <input
                id="edit-crm-time"
                type="time"
                value={editTime || ''}
                onChange={e => onTimeChange(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
                <strong>Company:</strong> {editCompany}
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
        const confirmDelete = window.confirm(`Are you sure you want to delete this ${event.type}? This action cannot be undone.`);
        if (!confirmDelete) return;

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
                <div className="flex gap-2 mt-4">
                    <button onClick={handleSaveChanges} className="w-full font-medium bg-black text-white py-2.5 px-4 rounded-md hover:bg-gray-800 transition-colors">Save Changes</button>
                    <button onClick={handleCancelEditing} className="w-full font-medium bg-gray-100 text-gray-700 py-2.5 px-4 rounded-md border border-gray-200 hover:bg-gray-200 transition-colors">Cancel</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <h3 className={`text-2xl p-2 border-2 border-black ${TASK_TAG_BG_COLORS[event.tag]}`}>{event.title}</h3>
            {isTask && task && (
                <div className="flex items-center gap-2 p-2 bg-gray-100 border-2 border-dashed border-black">
                    <input
                        type="checkbox"
                        id={`complete-task-${task.id}`}
                        checked={task.status === 'Done'}
                        onChange={(e) => actions.updateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' })}
                        className="w-5 h-5 accent-blue-500 shrink-0 border-2 border-black rounded-none"
                    />
                    <label htmlFor={`complete-task-${task.id}`} className="font-mono font-semibold">Mark as Complete</label>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <div><p className="font-mono text-sm uppercase">Module</p><p className="font-semibold text-lg">{event.tag}</p></div>
                <div>
                    <p className="font-mono text-sm uppercase">Type</p>
                    <p className="font-semibold text-lg capitalize">
                        {isMarketing ? event.contentType : event.type}
                    </p>
                </div>
                <div>
                    <p className="font-mono text-sm uppercase">Date & Time</p>
                    <p className="font-semibold text-lg">
                        {new Date(event.dueDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', dateStyle: 'long' })}
                        {isMeeting && (
                            <span className="ml-2 text-blue-600">
                                {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        {(isTask && 'dueTime' in event && event.dueTime) && (
                            <span className="ml-2 text-blue-600">{event.dueTime}</span>
                        )}
                        {(isMarketing && 'dueTime' in event && event.dueTime) && (
                            <span className="ml-2 text-blue-600">{event.dueTime}</span>
                        )}
                        {(isCrmAction && 'nextActionTime' in event && event.nextActionTime) && (
                            <span className="ml-2 text-blue-600">{event.nextActionTime}</span>
                        )}
                    </p>
                </div>
                {isTask && <div><p className="font-mono text-sm uppercase">Status</p><p className="font-semibold text-lg">{event.status}</p></div>}
                {isMarketing && <div><p className="font-mono text-sm uppercase">Status</p><p className="font-semibold text-lg">{event.status}</p></div>}
            </div>
            {isTask && (
                <div><p className="font-mono text-sm uppercase">Priority</p><p className="font-semibold text-lg">{task!.priority}</p></div>
            )}
            {isTask && task!.assignedToName && (
                <div><p className="font-mono text-sm uppercase">Assigned To</p><p className="font-semibold text-lg">👤 {task!.assignedToName}</p></div>
            )}
            {isMeeting && (
                 <>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="font-mono text-sm uppercase">Company</p><p className="font-semibold text-lg">{event.companyName}</p></div>
                        <div><p className="font-mono text-sm uppercase">Contact</p><p className="font-semibold text-lg">{event.contactName}</p></div>
                    </div>
                    <div>
                        <p className="font-mono text-sm uppercase">Attendees</p>
                        <p className="font-semibold text-lg">{event.attendees || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="font-mono text-sm uppercase">Summary</p>
                        <div className="bg-gray-50 border-2 border-dashed border-black p-4 max-h-48 overflow-y-auto custom-scrollbar">
                            <ReactMarkdown className="markdown-content" remarkPlugins={[remarkGfm]}>
                                {event.summary}
                            </ReactMarkdown>
                        </div>
                    </div>
                </>
            )}
            {isCrmAction && (
                <>
                    <div>
                        <p className="font-mono text-sm uppercase">Company</p>
                        <p className="font-semibold text-lg">{event.companyName}</p>
                    </div>
                    <div>
                        <p className="font-mono text-sm uppercase">Priority</p>
                        <p className="font-semibold text-lg">{event.priority}</p>
                    </div>
                    <div>
                        <p className="font-mono text-sm uppercase">Status</p>
                        <p className="font-semibold text-lg">{event.status}</p>
                    </div>
                    {event.assignedToName && (
                        <div>
                            <p className="font-mono text-sm uppercase">Assigned To</p>
                            <p className="font-semibold text-lg">👤 {event.assignedToName}</p>
                        </div>
                    )}
                </>
            )}
            
            {/* Linked GTM Docs Section */}
            {workspace && (isMeeting || isTask) && (
                <div className="border-t-2 border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-mono text-sm font-semibold text-black">📎 Linked Documents</h4>
                        <button
                            type="button"
                            onClick={() => setShowDocPicker(true)}
                            className="font-mono bg-blue-500 border-2 border-black text-white text-xs py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-blue-600"
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
            
            <div className="flex gap-2 mt-4">
                <button onClick={handleEditClick} className="flex-1 font-mono font-semibold bg-white text-black py-2 px-4 rounded-none border-2 border-black shadow-neo-btn hover:bg-gray-100">Edit</button>
                <button onClick={handleDelete} className="flex-1 font-mono font-semibold bg-red-600 text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn hover:bg-red-700">Delete</button>
                <button onClick={onClose} className="flex-1 font-mono font-semibold bg-black text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Close</button>
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
        </div>
    );
};
