import React, { useState, useEffect, useRef } from 'react';
import { Task, AppActions, Priority, CalendarEvent, MarketingItem, BaseCrmItem, CrmCollectionName, TaskCollectionName, Workspace, WorkspaceMember } from '../types';
import { TASK_TAG_BG_COLORS } from '../constants';
import Modal from './shared/Modal';
import CalendarEventForm, { CalendarEventFormData } from './calendar/CalendarEventForm';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CalendarTabProps {
    events: CalendarEvent[];
    actions: AppActions;
    workspace?: Workspace;
    workspaceMembers?: WorkspaceMember[];
    crmItems?: {
        investors: BaseCrmItem[];
        customers: BaseCrmItem[];
        partners: BaseCrmItem[];
    };
}

type ViewMode = 'month' | 'week' | 'day';

const CalendarHeader: React.FC<{
    currentDate: Date;
    viewMode: ViewMode;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: ViewMode) => void;
    onNewEvent: () => void;
}> = ({ currentDate, viewMode, onPrev, onNext, onToday, onViewChange, onNewEvent }) => {
    const formatHeaderDate = () => {
        switch (viewMode) {
            case 'month':
                return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            case 'week':
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
            case 'day':
                return currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
    };

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-black">
                    <button onClick={onPrev} className="p-2 hover:bg-gray-100 border-r-2 border-black" aria-label="Previous period">&larr;</button>
                    <button onClick={onToday} className="p-2 font-mono font-semibold hover:bg-gray-100 border-r-2 border-black">Today</button>
                    <button onClick={onNext} className="p-2 hover:bg-gray-100" aria-label="Next period">&rarr;</button>
                </div>
                <h2 className="text-2xl font-semibold text-black">{formatHeaderDate()}</h2>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={onNewEvent}
                    className="py-2 px-4 font-mono font-semibold bg-blue-600 text-white border-2 border-black shadow-neo-btn hover:bg-blue-700"
                >
                    + New Event
                </button>
                <div className="flex border-2 border-black">
                    {(['month', 'week', 'day'] as ViewMode[]).map(view => (
                        <button
                            key={view}
                            onClick={() => onViewChange(view)}
                            className={`py-2 px-4 font-mono font-semibold capitalize ${viewMode === view ? 'bg-black text-white' : 'bg-white text-black'} ${view !== 'month' ? 'border-l-2 border-black' : ''}`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const EventDetailModalContent: React.FC<{ event: CalendarEvent; actions: AppActions; onClose: () => void; }> = ({ event, actions, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);

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
                const crmCollectionMap: Record<string, CrmCollectionName> = {
                    'Investor': 'investors',
                    'Customer': 'customers',
                    'Partner': 'partners',
                };
                const collection = crmCollectionMap[event.tag];
                const newTimestamp = new Date(`${editDueDate}T${editTime || '00:00'}`).getTime();

                actions.updateMeeting(collection, event.crmItemId, event.contactId, event.id, {
                    title: editTitle,
                    attendees: editAttendees,
                    summary: editSummary,
                    timestamp: newTimestamp
                });
            }
        } else if (isCrmAction) {
            const crmCollectionMap: Record<string, CrmCollectionName> = {
                'Investor': 'investors',
                'Customer': 'customers',
                'Partner': 'partners',
            };
            const collection = crmCollectionMap[event.tag];
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
            const crmCollectionMap: Record<string, CrmCollectionName> = {
                'Investor': 'investors',
                'Customer': 'customers',
                'Partner': 'partners',
            };
            const collection = crmCollectionMap[event.tag];
            actions.deleteMeeting(collection, event.crmItemId, event.contactId, event.id);
        } else if (isCrmAction) {
            const crmCollectionMap: Record<string, CrmCollectionName> = {
                'Investor': 'investors',
                'Customer': 'customers',
                'Partner': 'partners',
            };
            const collection = crmCollectionMap[event.tag];
            // Clear the next action (this is how we "delete" a CRM action)
            actions.updateCrmItem(collection, event.id, {
                nextAction: undefined,
                nextActionDate: undefined,
                nextActionTime: undefined,
            });
        }
        onClose();
    };

    if (isEditing) {
        return (
            <div className="space-y-4">
                {isTask ? (
                    <>
                        <div>
                            <label htmlFor="edit-task-text" className="block font-mono text-sm font-semibold text-black mb-1">Task Description</label>
                            <textarea
                                id="edit-task-text"
                                value={editText || ''}
                                onChange={e => setEditText(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none min-h-[100px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="edit-task-priority" className="block font-mono text-sm font-semibold text-black mb-1">Priority</label>
                                <select
                                    id="edit-task-priority"
                                    value={editPriority || 'Medium'}
                                    onChange={e => setEditPriority(e.target.value as Priority)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                                >
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit-task-duedate" className="block font-mono text-sm font-semibold text-black mb-1">Due Date</label>
                                <input
                                    id="edit-task-duedate"
                                    type="date"
                                    value={editDueDate || ''}
                                    onChange={e => setEditDueDate(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="edit-task-duetime" className="block font-mono text-sm font-semibold text-black mb-1">Due Time (Optional)</label>
                            <input
                                id="edit-task-duetime"
                                type="time"
                                value={editTime || ''}
                                onChange={e => setEditTime(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                            />
                        </div>
                    </>
                ) : isMarketing ? (
                    <>
                        <div>
                            <label htmlFor="edit-mkt-title" className="block font-mono text-sm font-semibold text-black mb-1">Title</label>
                            <input
                                id="edit-mkt-title"
                                type="text"
                                value={editTitle || ''}
                                onChange={e => setEditTitle(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="edit-mkt-status" className="block font-mono text-sm font-semibold text-black mb-1">Status</label>
                                <select
                                    id="edit-mkt-status"
                                    value={editStatus || 'Planned'}
                                    onChange={e => setEditStatus(e.target.value as MarketingItem['status'])}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                                >
                                    <option>Planned</option>
                                    <option>In Progress</option>
                                    <option>Completed</option>
                                    <option>Published</option>
                                    <option>Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit-mkt-duedate" className="block font-mono text-sm font-semibold text-black mb-1">Due Date</label>
                                <input
                                    id="edit-mkt-duedate"
                                    type="date"
                                    value={editDueDate || ''}
                                    onChange={e => setEditDueDate(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="edit-mkt-duetime" className="block font-mono text-sm font-semibold text-black mb-1">Due Time (Optional)</label>
                            <input
                                id="edit-mkt-duetime"
                                type="time"
                                value={editTime || ''}
                                onChange={e => setEditTime(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                            />
                        </div>
                    </>
                ) : isMeeting ? ( // Meeting Item
                    <>
                        <div>
                            <label htmlFor="edit-meet-title" className="block font-mono text-sm font-semibold text-black mb-1">Title</label>
                            <input id="edit-meet-title" type="text" value={editTitle || ''} onChange={e => setEditTitle(e.target.value)} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="edit-meet-date" className="block font-mono text-sm font-semibold text-black mb-1">Date</label>
                                <input id="edit-meet-date" type="date" value={editDueDate || ''} onChange={e => setEditDueDate(e.target.value)} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                            </div>
                            <div>
                                <label htmlFor="edit-meet-time" className="block font-mono text-sm font-semibold text-black mb-1">Time</label>
                                <input id="edit-meet-time" type="time" value={editTime || ''} onChange={e => setEditTime(e.target.value)} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="edit-meet-attendees" className="block font-mono text-sm font-semibold text-black mb-1">Attendees</label>
                            <input id="edit-meet-attendees" type="text" value={editAttendees || ''} onChange={e => setEditAttendees(e.target.value)} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                        </div>
                        <div>
                            <label htmlFor="edit-meet-summary" className="block font-mono text-sm font-semibold text-black mb-1">Summary (Markdown)</label>
                            <textarea id="edit-meet-summary" value={editSummary || ''} onChange={e => setEditSummary(e.target.value)} className="w-full bg-white border-2 border-black text-black p-2 rounded-none min-h-[150px]" />
                        </div>
                    </>
                ) : ( // CRM Action
                    <>
                        <div>
                            <label htmlFor="edit-crm-action" className="block font-mono text-sm font-semibold text-black mb-1">Next Action</label>
                            <input
                                id="edit-crm-action"
                                type="text"
                                value={editNextAction || ''}
                                onChange={e => setEditNextAction(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                                placeholder="e.g., Send follow-up email"
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-crm-date" className="block font-mono text-sm font-semibold text-black mb-1">Next Action Date</label>
                            <input
                                id="edit-crm-date"
                                type="date"
                                value={editDueDate || ''}
                                onChange={e => setEditDueDate(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-crm-time" className="block font-mono text-sm font-semibold text-black mb-1">Next Action Time (Optional)</label>
                            <input
                                id="edit-crm-time"
                                type="time"
                                value={editTime || ''}
                                onChange={e => setEditTime(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                            />
                        </div>
                        <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-none">
                            <p className="font-mono text-sm text-blue-800">
                                <strong>Company:</strong> {editCompany}
                            </p>
                        </div>
                    </>
                )}
                <div className="flex gap-2 mt-4">
                    <button onClick={handleSaveChanges} className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Save Changes</button>
                    <button onClick={handleCancelEditing} className="w-full font-mono font-semibold bg-gray-200 text-black py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Cancel</button>
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
                <div><p className="font-mono text-sm uppercase">Priority</p><p className="font-semibold text-lg">{task.priority}</p></div>
            )}
            {isTask && task.assignedToName && (
                <div><p className="font-mono text-sm uppercase">Assigned To</p><p className="font-semibold text-lg">👤 {task.assignedToName}</p></div>
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
            <div className="flex gap-2 mt-4">
                <button onClick={handleEditClick} className="flex-1 font-mono font-semibold bg-white text-black py-2 px-4 rounded-none border-2 border-black shadow-neo-btn hover:bg-gray-100">Edit</button>
                <button onClick={handleDelete} className="flex-1 font-mono font-semibold bg-red-600 text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn hover:bg-red-700">Delete</button>
                <button onClick={onClose} className="flex-1 font-mono font-semibold bg-black text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Close</button>
            </div>
        </div>
    );
};

const CalendarTab: React.FC<CalendarTabProps> = ({ 
    events, 
    actions,
    workspace,
    workspaceMembers = [],
    crmItems
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const modalTriggerRef = useRef<HTMLButtonElement | null>(null);
    
    // New event modal state
    const [showNewEventModal, setShowNewEventModal] = useState(false);
    const [newEventType, setNewEventType] = useState<'task' | 'meeting' | 'crm-action'>('task');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const newEventModalTriggerRef = useRef<HTMLButtonElement | null>(null);

    const handlePrev = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (viewMode === 'month') newDate.setMonth(prev.getMonth() - 1);
            if (viewMode === 'week') newDate.setDate(prev.getDate() - 7);
            if (viewMode === 'day') newDate.setDate(prev.getDate() - 1);
            return newDate;
        });
    };

    const handleNext = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (viewMode === 'month') newDate.setMonth(prev.getMonth() + 1);
            if (viewMode === 'week') newDate.setDate(prev.getDate() + 7);
            if (viewMode === 'day') newDate.setDate(prev.getDate() + 1);
            return newDate;
        });
    };
    
    const handleToday = () => setCurrentDate(new Date());
    
    const openEventModal = (event: CalendarEvent, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setSelectedEvent(event);
        modalTriggerRef.current = triggerRef.current;
    }
    
    const handleOpenNewEventModal = () => {
        setNewEventDate(currentDate.toISOString().split('T')[0]);
        setNewEventTime('');
        setShowNewEventModal(true);
    }

    const handleEventFormSubmit = async (formData: CalendarEventFormData) => {
        try {
            if (formData.type === 'task') {
                // Create task with proper await
                await actions.createTask(
                    formData.category!,
                    formData.title!,
                    formData.priority!,
                    undefined, // crmItemId
                    undefined, // contactId
                    formData.dueDate,
                    formData.assignedTo,
                    formData.dueTime
                );
            } else if (formData.type === 'meeting' && formData.crmItemId && formData.contactId) {
                // Create meeting - convert date/time to Unix timestamp
                const meetingDateTime = formData.dueTime 
                    ? new Date(`${formData.dueDate}T${formData.dueTime}`)
                    : new Date(formData.dueDate);
                
                await actions.createMeeting(
                    formData.crmCollection!,
                    formData.crmItemId,
                    formData.contactId,
                    {
                        title: formData.meetingTitle!,
                        attendees: formData.attendees!,
                        summary: formData.meetingSummary || '',
                        timestamp: meetingDateTime.getTime()
                    }
                );
            } else if (formData.type === 'crm-action' && formData.crmItemId) {
                // Update CRM item with next action
                await actions.updateCrmItem(
                    formData.crmCollection!,
                    formData.crmItemId,
                    {
                        nextAction: formData.nextAction!,
                        nextActionDate: formData.dueDate
                    }
                );
            }
            
            // Close modal on success
            setShowNewEventModal(false);
        } catch (error) {
            console.error('[CalendarTab] Failed to create event:', error);
            // Error is already handled and displayed in the form
            throw error;
        }
    }

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, i) => {
            if (i < firstDayOfMonth) return null; // Padding days
            return new Date(year, month, i - firstDayOfMonth + 1);
        });
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
            <div className="grid grid-cols-7 border-t-2 border-l-2 border-black">
                {dayNames.map(day => (
                    <div key={day} className="p-2 border-b-2 border-r-2 border-black bg-gray-100 font-mono text-center">{day}</div>
                ))}
                {days.map((day, index) => {
                    const isToday = day && day.toDateString() === new Date().toDateString();
                    const dayEvents = day ? events.filter(e => e.dueDate === day.toISOString().split('T')[0]) : [];
                    
                    return (
                        <div key={index} className="h-40 border-b-2 border-r-2 border-black p-1 flex flex-col overflow-hidden">
                           {day && (
                                <span className={`text-sm font-semibold mb-1 ${isToday ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                                    {day.getDate()}
                                </span>
                            )}
                            {day && (
                                <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                                {dayEvents.map(event => (
                                    <button 
                                        key={event.id}
                                        onClick={(e) => openEventModal(event, { current: e.currentTarget })}
                                        className={`w-full text-left text-xs font-semibold p-1 mb-1 truncate ${TASK_TAG_BG_COLORS[event.tag] || 'bg-gray-300'}`}
                                        title={`${event.title}${event.type === 'task' && (event as Task).assignedToName ? ` (👤 ${(event as Task).assignedToName})` : ''}`}
                                    >
                                       {event.type === 'task' && (event as Task).status === 'Done' && '✅ '}
                                       {event.type === 'meeting' && '🤝 '}
                                       {event.title}
                                       {event.type === 'task' && (event as Task).assignedToName && <span className="ml-1 opacity-75">👤</span>}
                                    </button>
                                ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )
    };
    
    const renderWeekView = () => {
         const startOfWeek = new Date(currentDate);
         startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
         const days = Array.from({ length: 7 }, (_, i) => {
             const day = new Date(startOfWeek);
             day.setDate(startOfWeek.getDate() + i);
             return day;
         });

        return (
            <div className="border-t-2 border-l-2 border-black">
                {days.map(day => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayEvents = events.filter(e => e.dueDate === day.toISOString().split('T')[0]);
                    return (
                        <div key={day.toISOString()} className="flex border-b-2 border-black">
                            <div className={`w-32 text-center p-2 border-r-2 border-black shrink-0 ${isToday ? 'bg-blue-100' : 'bg-gray-50'}`}>
                                <p className="font-mono text-sm">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                                <p className="font-bold text-2xl">{day.getDate()}</p>
                            </div>
                            <div className="flex-grow p-2 border-r-2 border-black grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                               {dayEvents.length > 0 ? dayEvents.map(event => (
                                    <button 
                                        key={event.id} 
                                        onClick={(e) => openEventModal(event, { current: e.currentTarget })}
                                        className={`text-left text-sm font-semibold p-2 shadow-neo-sm border-2 border-black ${TASK_TAG_BG_COLORS[event.tag] || 'bg-gray-300'}`}
                                    >
                                        <p className="truncate font-bold">{event.title}</p>
                                        <p className="font-normal">{event.tag}</p>
                                        {event.type === 'task' && (event as Task).assignedToName && (
                                            <p className="font-mono text-xs mt-1">👤 {(event as Task).assignedToName}</p>
                                        )}
                                    </button>
                                )) : <span className="text-gray-500 italic self-center">No events</span>}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderDayView = () => {
        const dayEvents = events.filter(e => e.dueDate === currentDate.toISOString().split('T')[0]);
        const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours
        const now = new Date();
        const isToday = currentDate.toDateString() === now.toDateString();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Helper to get events for a specific hour
        const getEventsForHour = (hour: number) => {
            return dayEvents.filter(event => {
                if (event.type === 'meeting') {
                    const eventDate = new Date(event.timestamp);
                    return eventDate.getHours() === hour;
                } else {
                    const timeStr = event.type === 'task' ? (event as Task).dueTime :
                                   event.type === 'marketing' ? ('dueTime' in event ? event.dueTime : undefined) :
                                   event.type === 'crm-action' ? ('nextActionTime' in event ? event.nextActionTime : undefined) :
                                   undefined;
                    if (timeStr) {
                        const eventHour = parseInt(timeStr.split(':')[0]);
                        return eventHour === hour;
                    }
                }
                return false;
            });
        };

        // Events without time
        const eventsWithoutTime = dayEvents.filter(event => {
            if (event.type === 'meeting') return false;
            const timeStr = event.type === 'task' ? (event as Task).dueTime :
                           event.type === 'marketing' ? ('dueTime' in event ? event.dueTime : undefined) :
                           event.type === 'crm-action' ? ('nextActionTime' in event ? event.nextActionTime : undefined) :
                           undefined;
            return !timeStr;
        });

        return (
            <div className="border-2 border-black">
                {/* Events without time section */}
                {eventsWithoutTime.length > 0 && (
                    <div className="p-4 bg-gray-50 border-b-2 border-black">
                        <h3 className="font-mono font-bold text-sm uppercase mb-2">No Specific Time</h3>
                        <div className="space-y-2">
                            {eventsWithoutTime.map(event => (
                                <button
                                    key={event.id}
                                    onClick={(e) => openEventModal(event, { current: e.currentTarget })}
                                    className={`w-full text-left p-2 text-sm shadow-neo-sm border-2 border-black ${TASK_TAG_BG_COLORS[event.tag] || 'bg-gray-300'}`}
                                >
                                    <span className="font-bold">{event.title}</span>
                                    {event.type === 'task' && (event as Task).assignedToName && (
                                        <span className="ml-2 text-xs">👤 {(event as Task).assignedToName}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Time slots */}
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    {hours.map(hour => {
                        const hourEvents = getEventsForHour(hour);
                        const isCurrentHour = isToday && hour === currentHour;
                        
                        return (
                            <div 
                                key={hour} 
                                className={`flex border-b border-gray-300 ${isCurrentHour ? 'bg-blue-50' : ''}`}
                            >
                                {/* Time label */}
                                <div className={`w-20 flex-shrink-0 p-2 border-r-2 border-black text-center font-mono text-sm font-semibold ${isCurrentHour ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                </div>
                                
                                {/* Events column */}
                                <div className="flex-grow p-2 min-h-[60px] relative">
                                    {isCurrentHour && (
                                        <div 
                                            className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10"
                                            style={{ top: `${(currentMinute / 60) * 60}px` }}
                                        >
                                            <div className="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                        </div>
                                    )}
                                    
                                    {hourEvents.length > 0 ? (
                                        <div className="space-y-1">
                                            {hourEvents.map(event => (
                                                <button
                                                    key={event.id}
                                                    onClick={(e) => openEventModal(event, { current: e.currentTarget })}
                                                    className={`w-full text-left p-2 text-sm shadow-neo-sm border-2 border-black ${TASK_TAG_BG_COLORS[event.tag] || 'bg-gray-300'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold">{event.title}</span>
                                                        {event.type === 'meeting' && '🤝'}
                                                        {event.type === 'task' && (event as Task).status === 'Done' && '✅'}
                                                    </div>
                                                    <div className="text-xs opacity-75 mt-1">
                                                        {event.type === 'meeting' ? (
                                                            <>with {event.contactName}</>
                                                        ) : (
                                                            <>{event.tag}</>
                                                        )}
                                                        {event.type === 'task' && (event as Task).assignedToName && (
                                                            <> · 👤 {(event as Task).assignedToName}</>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                                            {/* Empty slot */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 border-2 border-black shadow-neo">
            <CalendarHeader 
                currentDate={currentDate}
                viewMode={viewMode}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onViewChange={setViewMode}
                onNewEvent={handleOpenNewEventModal}
            />
            
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}

            <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details" triggerRef={modalTriggerRef}>
                {selectedEvent && (
                    <EventDetailModalContent 
                        event={selectedEvent} 
                        actions={actions}
                        onClose={() => setSelectedEvent(null)}
                    />
                )}
            </Modal>

            <Modal isOpen={showNewEventModal} onClose={() => setShowNewEventModal(false)} title="Create New Event" triggerRef={newEventModalTriggerRef}>
                <div className="space-y-4">
                    {/* Event Type Selection */}
                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-2">Event Type</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setNewEventType('task')}
                                className={`flex-1 py-2 px-4 font-mono font-semibold border-2 border-black ${newEventType === 'task' ? 'bg-black text-white' : 'bg-white text-black'}`}
                            >
                                Task
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewEventType('meeting')}
                                className={`flex-1 py-2 px-4 font-mono font-semibold border-2 border-black ${newEventType === 'meeting' ? 'bg-black text-white' : 'bg-white text-black'}`}
                            >
                                Meeting
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewEventType('crm-action')}
                                className={`flex-1 py-2 px-4 font-mono font-semibold border-2 border-black ${newEventType === 'crm-action' ? 'bg-black text-white' : 'bg-white text-black'}`}
                            >
                                CRM Action
                            </button>
                        </div>
                    </div>

                    {/* Calendar Event Form */}
                    <CalendarEventForm
                        eventType={newEventType}
                        initialDate={newEventDate}
                        initialTime={newEventTime}
                        workspaceMembers={workspaceMembers}
                        crmItems={crmItems}
                        onSubmit={handleEventFormSubmit}
                        onCancel={() => setShowNewEventModal(false)}
                        planType={workspace?.planType}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default CalendarTab;