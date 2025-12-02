import React from 'react';
import { CalendarEvent, Task } from '../../types';
import { CheckSquare, Users, Target, Handshake, Clock, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewsProps {
    events: CalendarEvent[];
    currentDate: Date;
    todayIso: string;
    realTimeNow: Date;
    onEventClick: (event: CalendarEvent, triggerRef: React.RefObject<HTMLButtonElement>) => void;
}

// Helper to get event colors based on type
const getEventColor = (event: CalendarEvent): string => {
    if (event.type === 'meeting') return '#6366F1'; // Indigo
    if (event.type === 'task') return '#3B82F6'; // Blue
    if (event.type === 'marketing') return '#F59E0B'; // Amber
    if (event.type === 'crm-action') {
        if ('crmType' in event) {
            if (event.crmType === 'investor') return '#10B981'; // Green
            if (event.crmType === 'customer') return '#8B5CF6'; // Purple
            if (event.crmType === 'partner') return '#EC4899'; // Pink
        }
        return '#10B981';
    }
    return '#6B7280'; // Gray default
};

// Helper to get event icon
const getEventIcon = (event: CalendarEvent): React.ReactNode => {
    if (event.type === 'meeting') return <Users className="w-3 h-3" />;
    if (event.type === 'task') return <CheckSquare className="w-3 h-3" />;
    if (event.type === 'crm-action') {
        if ('crmType' in event) {
            if (event.crmType === 'investor') return <Target className="w-3 h-3" />;
            if (event.crmType === 'customer') return <Users className="w-3 h-3" />;
            if (event.crmType === 'partner') return <Handshake className="w-3 h-3" />;
        }
        return <Clock className="w-3 h-3" />;
    }
    return <CalendarIcon className="w-3 h-3" />;
};

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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {dayNames.map(day => (
                    <div key={day} className="p-2 text-center font-semibold text-xs text-slate-600 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Days Grid */}
            <div className="grid grid-cols-7">
                {days.map((day, index) => {
                    const isToday = day && day.toISOString().split('T')[0] === todayIso;
                    const isCurrentMonthDate = day !== null;
                    const dayEvents = day ? events.filter(e => e.dueDate === day.toISOString().split('T')[0]) : [];
                    
                    return (
                        <div 
                            key={index} 
                            className={`min-h-[100px] p-1.5 border-r border-b border-gray-100 last:border-r-0 transition-colors ${
                                !isCurrentMonthDate ? 'bg-gray-50/50' : 'bg-white'
                            } ${isToday ? 'bg-blue-50/50' : ''}`}
                        >
                            {day && (
                                <>
                                    <div
                                        className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                                            isToday 
                                                ? 'bg-slate-900 text-white' 
                                                : 'text-slate-700'
                                        }`}
                                    >
                                        {day.getDate()}
                                    </div>
                                    
                                    <div className="space-y-0.5">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <button 
                                                key={event.id}
                                                onClick={(e) => onEventClick(event, { current: e.currentTarget })}
                                                className="w-full text-left px-1.5 py-0.5 text-xs rounded hover:opacity-80 transition-opacity truncate flex items-center gap-1"
                                                style={{ backgroundColor: getEventColor(event), color: 'white' }}
                                                title={`${event.title}${event.type === 'task' && (event as Task).assignedToName ? ` (${(event as Task).assignedToName})` : ''}`}
                                            >
                                                {getEventIcon(event)}
                                                <span className="truncate">{event.title}</span>
                                            </button>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-xs text-gray-500 pl-1.5 font-medium">
                                                +{dayEvents.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
                <div className="p-2 text-center font-semibold text-xs text-slate-600 uppercase tracking-wide border-r border-gray-200">
                    Time
                </div>
                {days.map((day, index) => {
                    const isToday = day.toISOString().split('T')[0] === todayIso;
                    return (
                        <div
                            key={index}
                            className={`p-2 text-center ${isToday ? 'bg-blue-50' : ''}`}
                        >
                            <div className="font-semibold text-xs text-slate-600 uppercase tracking-wide">
                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                                {day.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Time Grid - Show 8am to 6pm */}
            <div className="max-h-[500px] overflow-y-auto">
                {Array.from({ length: 11 }, (_, i) => i + 8).map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[60px]">
                        <div className="p-2 text-xs text-slate-500 border-r border-gray-200 bg-gray-50/50 flex items-start">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        {days.map((day, dayIndex) => {
                            const dayEvents = events.filter(e => {
                                if (e.dueDate !== day.toISOString().split('T')[0]) return false;
                                // Check if event has a time matching this hour
                                const timeStr = e.type === 'task' ? (e as Task).dueTime :
                                               e.type === 'meeting' ? new Date(e.timestamp).getHours().toString().padStart(2, '0') + ':00' :
                                               undefined;
                                if (timeStr) {
                                    const eventHour = parseInt(timeStr.split(':')[0]);
                                    return eventHour === hour;
                                }
                                return hour === 8; // Show events without time at 8am
                            });
                            const isToday = day.toISOString().split('T')[0] === todayIso;
                            
                            return (
                                <div
                                    key={dayIndex}
                                    className={`p-1 border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50/30' : ''}`}
                                >
                                    {dayEvents.map((event) => (
                                        <button
                                            key={event.id}
                                            onClick={(e) => onEventClick(event, { current: e.currentTarget })}
                                            className="w-full text-left px-1.5 py-1 text-xs rounded mb-0.5 hover:opacity-80 transition-opacity flex items-center gap-1"
                                            style={{ backgroundColor: getEventColor(event), color: 'white' }}
                                            title={`${event.title}${event.type === 'task' && (event as Task).assignedToName ? ` (${(event as Task).assignedToName})` : ''}`}
                                        >
                                            {getEventIcon(event)}
                                            <span className="truncate">{event.title}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Day Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-slate-900">
                    {currentDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </h3>
            </div>
            
            {/* Events without time section */}
            {eventsWithoutTime.length > 0 && (
                <div className="p-4 bg-gray-50/50 border-b border-gray-200">
                    <h4 className="font-semibold text-sm text-slate-600 mb-2">All Day / No Specific Time</h4>
                    <div className="space-y-1.5">
                        {eventsWithoutTime.map(event => (
                            <button
                                key={event.id}
                                onClick={(e) => onEventClick(event, { current: e.currentTarget })}
                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:opacity-80 transition-opacity flex items-center gap-2"
                                style={{ backgroundColor: getEventColor(event), color: 'white' }}
                            >
                                {getEventIcon(event)}
                                <span className="font-medium">{event.title}</span>
                                {event.type === 'task' && (event as Task).assignedToName && (
                                    <span className="ml-auto text-xs opacity-75 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {(event as Task).assignedToName}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Time slots */}
            <div className="max-h-[500px] overflow-y-auto">
                {hours.filter(h => h >= 6 && h <= 22).map(hour => {
                    const hourEvents = getEventsForHour(hour);
                    const isCurrentHour = isToday && hour === currentHour;
                    
                    return (
                        <div 
                            key={hour} 
                            className={`flex border-b border-gray-100 ${isCurrentHour ? 'bg-blue-50/50' : ''}`}
                        >
                            {/* Time label */}
                            <div className={`w-20 flex-shrink-0 p-2 border-r border-gray-200 text-xs text-slate-500 ${isCurrentHour ? 'bg-blue-50' : 'bg-gray-50/50'}`}>
                                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </div>
                            
                            {/* Events column */}
                            <div className="flex-grow p-2 min-h-[50px] relative">
                                {isCurrentHour && (
                                    <div 
                                        className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10"
                                        style={{ top: `${(currentMinute / 60) * 50}px` }}
                                    >
                                        <div className="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                )}
                                
                                {hourEvents.length > 0 && (
                                    <div className="space-y-1">
                                        {hourEvents.map(event => (
                                            <button
                                                key={event.id}
                                                onClick={(e) => onEventClick(event, { current: e.currentTarget })}
                                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:opacity-80 transition-opacity flex items-center gap-2"
                                                style={{ backgroundColor: getEventColor(event), color: 'white' }}
                                            >
                                                {getEventIcon(event)}
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium truncate block">{event.title}</span>
                                                    {event.type === 'meeting' && event.contactName && (
                                                        <span className="text-xs opacity-75">with {event.contactName}</span>
                                                    )}
                                                </div>
                                                {event.type === 'task' && (event as Task).assignedToName && (
                                                    <span className="text-xs opacity-75 flex items-center gap-1 shrink-0">
                                                        <Users className="w-3 h-3" />
                                                        {(event as Task).assignedToName}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
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
