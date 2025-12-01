import React from 'react';
import { CalendarEvent, Task } from '../../types';
import { TASK_TAG_BG_COLORS } from '../../constants';

interface CalendarViewsProps {
    events: CalendarEvent[];
    currentDate: Date;
    todayIso: string;
    realTimeNow: Date;
    onEventClick: (event: CalendarEvent, triggerRef: React.RefObject<HTMLButtonElement>) => void;
}

export const MonthView: React.FC<CalendarViewsProps> = ({
    events,
    currentDate,
    todayIso,
    onEventClick
}) => {
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
                const isToday = day && day.toISOString().split('T')[0] === todayIso;
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
                                    onClick={(e) => onEventClick(event, { current: e.currentTarget })}
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
    );
};

export const WeekView: React.FC<CalendarViewsProps> = ({
    events,
    currentDate,
    todayIso,
    onEventClick
}) => {
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
                const isToday = day.toISOString().split('T')[0] === todayIso;
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
                                    onClick={(e) => onEventClick(event, { current: e.currentTarget })}
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
    );
};

export const DayView: React.FC<CalendarViewsProps> = ({
    events,
    currentDate,
    realTimeNow,
    onEventClick
}) => {
    const dayEvents = events.filter(e => e.dueDate === currentDate.toISOString().split('T')[0]);
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours
    const isToday = currentDate.toDateString() === realTimeNow.toDateString();
    const currentHour = realTimeNow.getHours();
    const currentMinute = realTimeNow.getMinutes();

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
                                onClick={(e) => onEventClick(event, { current: e.currentTarget })}
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
                                                onClick={(e) => onEventClick(event, { current: e.currentTarget })}
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
};
