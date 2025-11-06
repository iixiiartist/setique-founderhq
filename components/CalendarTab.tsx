import React, { useState, useEffect, useRef } from 'react';
import { Task, AppActions, Priority, CalendarEvent, MarketingItem, CrmCollectionName } from '../types';
import { TASK_TAG_BG_COLORS } from '../constants';
import Modal from './shared/Modal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CalendarTabProps {
    events: CalendarEvent[];
    actions: AppActions;
}

type ViewMode = 'month' | 'week' | 'day';

const CalendarHeader: React.FC<{
    currentDate: Date;
    viewMode: ViewMode;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: ViewMode) => void;
}> = ({ currentDate, viewMode, onPrev, onNext, onToday, onViewChange }) => {
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
        } else if (isMarketing) {
            setEditTitle(event.title);
            setEditStatus(event.status as MarketingItem['status']);
            setEditDueDate(event.dueDate || '');
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
                });
            }
        } else if (isMarketing) {
            if (editTitle.trim() !== '') {
                actions.updateMarketingItem(event.id, {
                    title: editTitle,
                    status: editStatus,
                    dueDate: editDueDate,
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
            });
        }
        setIsEditing(false);
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
                <div><p className="font-mono text-sm uppercase">Type</p><p className="font-semibold text-lg capitalize">{event.type}</p></div>
                <div><p className="font-mono text-sm uppercase">Date</p><p className="font-semibold text-lg">{new Date(event.dueDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', dateStyle: 'long' })}</p></div>
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
                <button onClick={handleEditClick} className="w-full font-mono font-semibold bg-white text-black py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Edit</button>
                <button onClick={onClose} className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Close</button>
            </div>
        </div>
    );
};

const CalendarTab: React.FC<CalendarTabProps> = ({ events, actions }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

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
         return (
             <div className="border-2 border-black p-4">
                 <ul className="space-y-3">
                     {dayEvents.length > 0 ? dayEvents.map(event => (
                          <li key={event.id}>
                             <button
                                onClick={(e) => openEventModal(event, { current: e.currentTarget })}
                                className={`w-full text-left p-4 shadow-neo-sm border-2 border-black flex items-center justify-between ${TASK_TAG_BG_COLORS[event.tag] || 'bg-gray-300'}`}
                             >
                                <div>
                                    <p className="font-bold text-lg">{event.title}</p>
                                    {event.type === 'meeting' ? (
                                        <p className="font-mono">{event.tag} / with {event.contactName}</p>
                                    ) : (
                                        <p className="font-mono">{event.tag} / {event.status}</p>
                                    )}
                                    {event.type === 'task' && (event as Task).assignedToName && (
                                        <p className="font-mono text-sm mt-1">👤 Assigned to: {(event as Task).assignedToName}</p>
                                    )}
                                </div>
                                {event.type === 'task' && <span className={`priority-badge priority-${(event as Task).priority.toLowerCase()}`}>{(event as Task).priority}</span>}
                                {event.type === 'meeting' && <span className="font-mono text-xs font-bold uppercase p-1 border-2 border-black bg-yellow-200">Meeting</span>}
                             </button>
                          </li>
                     )) : <p className="text-gray-500 italic text-center p-8">No events scheduled for today.</p>}
                 </ul>
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
        </div>
    );
};

export default CalendarTab;