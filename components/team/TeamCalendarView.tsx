import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Plus, Filter } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'task' | 'meeting' | 'deal' | 'event';
  assignedTo?: string;
  assignedToName?: string;
  color: string;
}

interface TeamCalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export const TeamCalendarView: React.FC<TeamCalendarViewProps> = ({ onEventClick }) => {
  const { workspace, workspaceMembers } = useWorkspace();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (workspace) {
      loadEvents();
    }
  }, [workspace, currentDate, view]);

  const loadEvents = async () => {
    if (!workspace) return;

    setLoading(true);
    try {
      const startDate = getStartDate();
      const endDate = getEndDate();

      // Load tasks with due dates
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, text, due_date, assigned_to, status, profiles:assigned_to(full_name)')
        .eq('workspace_id', workspace.id)
        .neq('status', 'Done')
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0]);

      if (tasksError) throw tasksError;

      // Load deals with expected close dates
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id, title, expected_close_date, assigned_to, stage, profiles:assigned_to(full_name)')
        .eq('workspace_id', workspace.id)
        .not('stage', 'in', '(closed_won,closed_lost)')
        .gte('expected_close_date', startDate.toISOString().split('T')[0])
        .lte('expected_close_date', endDate.toISOString().split('T')[0]);

      if (dealsError) throw dealsError;

      // Convert to calendar events
      const allEvents: CalendarEvent[] = [
        ...(tasks || []).map((task) => ({
          id: `task-${task.id}`,
          title: task.text,
          start: new Date(task.due_date + 'T00:00:00'),
          end: new Date(task.due_date + 'T23:59:59'),
          type: 'task' as const,
          assignedTo: task.assigned_to,
          assignedToName: Array.isArray(task.profiles) ? task.profiles[0]?.full_name : (task.profiles as any)?.full_name || 'Unassigned',
          color: '#3B82F6', // Blue
        })),
        ...(deals || []).map((deal) => ({
          id: `deal-${deal.id}`,
          title: deal.title,
          start: new Date(deal.expected_close_date + 'T00:00:00'),
          end: new Date(deal.expected_close_date + 'T23:59:59'),
          type: 'deal' as const,
          assignedTo: deal.assigned_to,
          assignedToName: Array.isArray(deal.profiles) ? deal.profiles[0]?.full_name : (deal.profiles as any)?.full_name || 'Unassigned',
          color: '#F59E0B', // Amber
        })),
      ];

      setEvents(allEvents);
    } catch (error) {
      logger.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (): Date => {
    const date = new Date(currentDate);
    if (view === 'month') {
      date.setDate(1);
      date.setDate(date.getDate() - date.getDay()); // Start from Sunday
    } else if (view === 'week') {
      date.setDate(date.getDate() - date.getDay());
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const getEndDate = (): Date => {
    const date = new Date(currentDate);
    if (view === 'month') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setDate(date.getDate() + (6 - date.getDay())); // End on Saturday
    } else if (view === 'week') {
      date.setDate(date.getDate() + (6 - date.getDay()));
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  };

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterUser !== 'all' && event.assignedTo !== filterUser) return false;
      if (filterType !== 'all' && event.type !== filterType) return false;
      return true;
    });
  }, [events, filterUser, filterType]);

  const getDaysInMonth = (): Date[] => {
    const start = getStartDate();
    const end = getEndDate();
    const days: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const formatMonthYear = (): string => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getEventTypeIcon = (type: string): string => {
    switch (type) {
      case 'task':
        return '✓';
      case 'meeting':
        return '👥';
      case 'deal':
        return '💼';
      case 'event':
        return '📅';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 border-2 border-black shadow-neo animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 border-2 border-black shadow-neo">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Team Calendar</h2>
          </div>

          {/* View Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm font-semibold border-2 border-black transition-all ${
                view === 'month'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm font-semibold border-2 border-black transition-all ${
                view === 'week'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1 text-sm font-semibold border-2 border-black transition-all ${
                view === 'day'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Day
            </button>
          </div>
        </div>

        {/* Navigation & Filters */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('prev')}
              className="p-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors font-semibold"
            >
              Today
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold ml-4">{formatMonthYear()}</h3>
          </div>

          <div className="flex gap-2">
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-black bg-white"
            >
              <option value="all">All Team Members</option>
              {workspaceMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName || member.email}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-black bg-white"
            >
              <option value="all">All Types</option>
              <option value="task">Tasks</option>
              <option value="meeting">Meetings</option>
              <option value="deal">Deals</option>
              <option value="event">Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <div className="bg-white border-2 border-black shadow-neo overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b-2 border-black bg-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="p-2 text-center font-bold text-sm border-r-2 border-black last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {getDaysInMonth().map((date, index) => {
              const dayEvents = getEventsForDay(date);
              const isTodayDate = isToday(date);
              const isCurrentMonthDate = isCurrentMonth(date);

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r-2 border-b-2 border-black last:border-r-0 ${
                    !isCurrentMonthDate ? 'bg-gray-50' : ''
                  } ${isTodayDate ? 'bg-blue-50' : ''}`}
                >
                  <div
                    className={`text-sm font-semibold mb-2 ${
                      isTodayDate ? 'text-blue-600' : isCurrentMonthDate ? 'text-black' : 'text-gray-400'
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="w-full text-left px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity truncate"
                        style={{ backgroundColor: event.color, color: 'white' }}
                        title={event.title}
                      >
                        <span className="mr-1">{getEventTypeIcon(event.type)}</span>
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-600 pl-2">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="bg-white p-6 border-2 border-black shadow-neo">
          <p className="text-gray-600 mb-4">Week view coming soon...</p>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="bg-white p-6 border-2 border-black shadow-neo">
          <h3 className="text-lg font-semibold mb-4">
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h3>

          <div className="space-y-2">
            {getEventsForDay(currentDate).map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="w-full text-left p-4 border-2 border-black hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-12 h-12 flex items-center justify-center text-white font-bold rounded"
                    style={{ backgroundColor: event.color }}
                  >
                    {getEventTypeIcon(event.type)}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-semibold">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    {event.assignedToName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned to: {event.assignedToName}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {event.start.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </button>
            ))}

            {getEventsForDay(currentDate).length === 0 && (
              <p className="text-gray-500 italic text-center py-8">No events scheduled for this day</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white p-4 border-2 border-black shadow-neo">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-semibold">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 border-2 border-black"></div>
            <span className="text-sm">Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 border-2 border-black"></div>
            <span className="text-sm">Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 border-2 border-black"></div>
            <span className="text-sm">Deals</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCalendarView;
