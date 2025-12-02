import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, CheckSquare, Handshake, Target, Clock } from 'lucide-react';
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
  type: 'task' | 'meeting' | 'deal' | 'crm-action';
  assignedTo?: string;
  assignedToName?: string;
  color: string;
  crmType?: 'investor' | 'customer' | 'partner';
  companyName?: string;
  // Extended fields for EventDetailModal compatibility
  dueDate?: string; // YYYY-MM-DD format
  dueTime?: string; // HH:MM format
  timestamp?: number;
  attendees?: string;
  summary?: string;
  tag?: string;
  text?: string; // For tasks
  status?: string;
  priority?: string;
  contactName?: string;
  contactId?: string;
  crmItemId?: string;
  // For CRM actions
  nextAction?: string;
  nextActionDate?: string;
  nextActionTime?: string;
  company?: string;
}

type ViewMode = 'month' | 'week' | 'day';

interface TeamCalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  // Optional external control - if provided, component uses these instead of internal state
  currentDate?: Date;
  viewMode?: ViewMode;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: ViewMode) => void;
  // If true, hides internal navigation (useful when embedded in parent with its own controls)
  hideNavigation?: boolean;
}

export const TeamCalendarView: React.FC<TeamCalendarViewProps> = ({ 
  onEventClick,
  currentDate: externalDate,
  viewMode: externalView,
  onDateChange,
  onViewChange,
  hideNavigation = false
}) => {
  const { workspace, workspaceMembers } = useWorkspace();
  const { user } = useAuth();
  
  // Use external state if provided, otherwise use internal state
  const [internalDate, setInternalDate] = useState(new Date());
  const [internalView, setInternalView] = useState<ViewMode>('month');
  
  const currentDate = externalDate ?? internalDate;
  const view = externalView ?? internalView;
  
  const setCurrentDate = (date: Date | ((prev: Date) => Date)) => {
    const newDate = typeof date === 'function' ? date(currentDate) : date;
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  };
  
  const setView = (newView: ViewMode) => {
    if (onViewChange) {
      onViewChange(newView);
    } else {
      setInternalView(newView);
    }
  };
  
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
        .select('id, text, due_date, due_time, assigned_to, status, priority, profiles:assigned_to(full_name)')
        .eq('workspace_id', workspace.id)
        .neq('status', 'Done')
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0]);

      if (tasksError) {
        logger.warn('Failed to load tasks:', tasksError);
      }

      // Load deals with expected close dates
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id, title, expected_close_date, assigned_to, stage, profiles:assigned_to(full_name)')
        .eq('workspace_id', workspace.id)
        .not('stage', 'in', '(closed_won,closed_lost)')
        .gte('expected_close_date', startDate.toISOString().split('T')[0])
        .lte('expected_close_date', endDate.toISOString().split('T')[0]);

      if (dealsError) {
        logger.warn('Failed to load deals:', dealsError);
      }

      // Load CRM items with next action dates (unified table with type column)
      const { data: crmItems, error: crmError } = await supabase
        .from('crm_items')
        .select('id, company, type, next_action, next_action_date, next_action_time, assigned_to, assigned_to_name')
        .eq('workspace_id', workspace.id)
        .not('next_action', 'is', null)
        .not('next_action_date', 'is', null)
        .gte('next_action_date', startDate.toISOString().split('T')[0])
        .lte('next_action_date', endDate.toISOString().split('T')[0]);

      if (crmError) {
        logger.warn('Failed to load CRM items:', crmError);
      }

      // Load meetings from meetings table
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, title, summary, timestamp, attendees, user_id, contact_id')
        .eq('workspace_id', workspace.id)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (meetingsError) {
        logger.warn('Failed to load meetings:', meetingsError);
      }

      // If we have meetings, get the contact info for them
      let contactsMap: Record<string, { name: string; company?: string; type?: string; crmItemId?: string }> = {};
      if (meetings && meetings.length > 0) {
        const contactIds = [...new Set(meetings.map(m => m.contact_id))];
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, crm_item_id')
          .in('id', contactIds);
        
        if (contacts && contacts.length > 0) {
          // Get CRM items for company names
          const crmItemIds = [...new Set(contacts.map(c => c.crm_item_id).filter(Boolean))];
          if (crmItemIds.length > 0) {
            const { data: crmItemsData } = await supabase
              .from('crm_items')
              .select('id, company, type')
              .in('id', crmItemIds);
            
            const crmItemsById = (crmItemsData || []).reduce((acc, item) => {
              acc[item.id] = item;
              return acc;
            }, {} as Record<string, { company: string; type: string }>);
            
            contacts.forEach(contact => {
              const crmItem = contact.crm_item_id ? crmItemsById[contact.crm_item_id] : null;
              contactsMap[contact.id] = {
                name: contact.name,
                company: crmItem?.company,
                type: crmItem?.type,
                crmItemId: contact.crm_item_id
              };
            });
          } else {
            contacts.forEach(contact => {
              contactsMap[contact.id] = { name: contact.name, crmItemId: contact.crm_item_id };
            });
          }
        }
      }

      // Helper to get CRM color by type
      const getCrmColor = (type: string): string => {
        switch (type) {
          case 'investor': return '#10B981'; // Green
          case 'customer': return '#8B5CF6'; // Purple
          case 'partner': return '#EC4899'; // Pink
          default: return '#6B7280'; // Gray
        }
      };

      // Helper to get tag name from CRM type
      const getCrmTag = (type: string): string => {
        switch (type) {
          case 'investor': return 'Investor';
          case 'customer': return 'Customer';
          case 'partner': return 'Partner';
          default: return 'CRM';
        }
      };

      // Convert to calendar events with all necessary fields for EventDetailModal
      const allEvents: CalendarEvent[] = [
        // Meetings from meetings table
        ...(meetings || []).map((meeting: any) => {
          const meetingDate = new Date(meeting.timestamp);
          const contactInfo = contactsMap[meeting.contact_id] || { name: 'Unknown' };
          const meetingDateStr = meetingDate.toISOString().split('T')[0];
          const meetingTimeStr = meetingDate.toTimeString().slice(0, 5);
          return {
            id: meeting.id, // Use raw ID for edit/delete operations
            title: meeting.title,
            description: meeting.summary,
            start: meetingDate,
            end: new Date(meetingDate.getTime() + 60 * 60 * 1000),
            type: 'meeting' as const,
            assignedTo: meeting.user_id,
            assignedToName: contactInfo.name,
            companyName: contactInfo.company,
            contactName: contactInfo.name,
            contactId: meeting.contact_id,
            crmItemId: contactInfo.crmItemId,
            color: '#6366F1',
            // Extended fields for EventDetailModal
            dueDate: meetingDateStr,
            dueTime: meetingTimeStr,
            timestamp: meeting.timestamp,
            attendees: meeting.attendees || '',
            summary: meeting.summary || '',
            tag: contactInfo.type ? getCrmTag(contactInfo.type) : 'Meeting',
          };
        }),
        ...(tasks || []).map((task) => {
          const assignedToName = Array.isArray(task.profiles) 
            ? task.profiles[0]?.full_name 
            : (task.profiles as any)?.full_name || 'Unassigned';
          return {
            id: task.id, // Use raw ID
            title: task.text,
            text: task.text,
            start: new Date(task.due_date + (task.due_time ? `T${task.due_time}` : 'T00:00:00')),
            end: new Date(task.due_date + 'T23:59:59'),
            type: 'task' as const,
            assignedTo: task.assigned_to,
            assignedToName,
            color: '#3B82F6',
            // Extended fields
            dueDate: task.due_date,
            dueTime: task.due_time || '',
            status: task.status,
            priority: task.priority || 'Medium',
            tag: 'Task',
          };
        }),
        ...(deals || []).map((deal) => {
          const assignedToName = Array.isArray(deal.profiles) 
            ? deal.profiles[0]?.full_name 
            : (deal.profiles as any)?.full_name || 'Unassigned';
          return {
            id: deal.id, // Use raw ID
            title: deal.title,
            start: new Date(deal.expected_close_date + 'T00:00:00'),
            end: new Date(deal.expected_close_date + 'T23:59:59'),
            type: 'deal' as const,
            assignedTo: deal.assigned_to,
            assignedToName,
            color: '#F59E0B',
            // Extended fields
            dueDate: deal.expected_close_date,
            status: deal.stage,
            tag: 'Deal',
          };
        }),
        // CRM items from unified table
        ...(crmItems || []).map((item) => ({
          id: item.id, // Use raw ID for edit operations
          title: item.next_action || 'CRM Action',
          description: item.next_action,
          start: new Date(item.next_action_date + (item.next_action_time ? `T${item.next_action_time}` : 'T00:00:00')),
          end: new Date(item.next_action_date + 'T23:59:59'),
          type: 'crm-action' as const,
          crmType: item.type as 'investor' | 'customer' | 'partner',
          companyName: item.company,
          company: item.company,
          assignedTo: item.assigned_to,
          assignedToName: item.assigned_to_name || 'Unassigned',
          color: getCrmColor(item.type),
          // Extended fields for EventDetailModal
          dueDate: item.next_action_date,
          nextAction: item.next_action,
          nextActionDate: item.next_action_date,
          nextActionTime: item.next_action_time || '',
          tag: getCrmTag(item.type),
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

  const getEventTypeIcon = (type: string, crmType?: string): React.ReactNode => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-3 h-3" />;
      case 'meeting':
        return <Users className="w-3 h-3" />;
      case 'deal':
        return <Target className="w-3 h-3" />;
      case 'crm-action':
        if (crmType === 'investor') return <Target className="w-3 h-3" />;
        if (crmType === 'customer') return <Users className="w-3 h-3" />;
        if (crmType === 'partner') return <Handshake className="w-3 h-3" />;
        return <Clock className="w-3 h-3" />;
      default:
        return <CalendarIcon className="w-3 h-3" />;
    }
  };

  const getWeekDays = (): Date[] => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getHours = (): number[] => {
    return Array.from({ length: 24 }, (_, i) => i);
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Row - always show filters, but navigation/view toggle only if not hidden */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {!hideNavigation ? (
          <>
            {/* Navigation controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => navigate('prev')}
                  className="min-w-[36px] min-h-[36px] p-2 hover:bg-gray-50 border-r border-gray-200 transition-colors flex items-center justify-center text-slate-600"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToToday}
                  className="min-h-[36px] px-3 py-1.5 font-medium text-sm hover:bg-gray-50 border-r border-gray-200 transition-colors text-slate-700"
                >
                  Today
                </button>
                <button
                  onClick={() => navigate('next')}
                  className="min-w-[36px] min-h-[36px] p-2 hover:bg-gray-50 transition-colors flex items-center justify-center text-slate-600"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-lg font-semibold text-slate-900 ml-2">{formatMonthYear()}</h4>
            </div>

            {/* View Selector */}
            <div className="flex items-center gap-2">
              <div className="flex border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {(['month', 'week', 'day'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`min-h-[36px] py-1.5 px-3 text-sm font-medium capitalize transition-colors ${
                      view === v 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-white text-slate-600 hover:bg-gray-50'
                    } ${v !== 'month' ? 'border-l border-gray-200' : ''}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Team Calendar</h3>
          </div>
        )}

        {/* Filters - always visible */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 min-h-[36px]"
            aria-label="Filter by team member"
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
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 min-h-[36px]"
            aria-label="Filter by event type"
          >
            <option value="all">All Types</option>
            <option value="meeting">Meetings</option>
            <option value="task">Tasks</option>
            <option value="deal">Deals</option>
            <option value="crm-action">CRM Actions</option>
          </select>
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="p-2 text-center font-semibold text-xs text-slate-600 uppercase tracking-wide"
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
                  className={`min-h-[100px] p-1.5 border-r border-b border-gray-100 last:border-r-0 transition-colors ${
                    !isCurrentMonthDate ? 'bg-gray-50/50' : 'bg-white'
                  } ${isTodayDate ? 'bg-blue-50/50' : ''}`}
                >
                  <div
                    className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                      isTodayDate 
                        ? 'bg-slate-900 text-white' 
                        : isCurrentMonthDate 
                          ? 'text-slate-700' 
                          : 'text-gray-400'
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="w-full text-left px-1.5 py-0.5 text-xs rounded hover:opacity-80 transition-opacity truncate flex items-center gap-1"
                        style={{ backgroundColor: event.color, color: 'white' }}
                        title={`${event.title}${event.companyName ? ` (${event.companyName})` : ''}`}
                      >
                        {getEventTypeIcon(event.type, event.crmType)}
                        <span className="truncate">
                          {event.type === 'crm-action' ? (event.companyName || event.title) : event.title}
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1.5 font-medium">
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
            <div className="p-2 text-center font-semibold text-xs text-slate-600 uppercase tracking-wide border-r border-gray-200">
              Time
            </div>
            {getWeekDays().map((day, index) => {
              const isTodayDate = isToday(day);
              return (
                <div
                  key={index}
                  className={`p-2 text-center ${isTodayDate ? 'bg-blue-50' : ''}`}
                >
                  <div className="font-semibold text-xs text-slate-600 uppercase tracking-wide">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${isTodayDate ? 'text-blue-600' : 'text-slate-800'}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid - Show 8am to 6pm */}
          <div className="max-h-[500px] overflow-y-auto">
            {getHours().filter(h => h >= 8 && h <= 18).map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[60px]">
                <div className="p-2 text-xs text-slate-500 border-r border-gray-200 bg-gray-50/50 flex items-start">
                  {formatHour(hour)}
                </div>
                {getWeekDays().map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day).filter(e => {
                    const eventHour = e.start.getHours();
                    return eventHour === hour || (hour === 8 && eventHour < 8);
                  });
                  const isTodayDate = isToday(day);
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`p-1 border-r border-gray-100 last:border-r-0 ${isTodayDate ? 'bg-blue-50/30' : ''}`}
                    >
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          className="w-full text-left px-1.5 py-1 text-xs rounded mb-0.5 hover:opacity-80 transition-opacity flex items-center gap-1"
                          style={{ backgroundColor: event.color, color: 'white' }}
                          title={`${event.title}${event.companyName ? ` (${event.companyName})` : ''}`}
                        >
                          {getEventTypeIcon(event.type, event.crmType)}
                          <span className="truncate">
                            {event.type === 'crm-action' ? (event.companyName || event.title) : event.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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

          <div className="divide-y divide-gray-100">
            {getEventsForDay(currentDate).length > 0 ? (
              getEventsForDay(currentDate).map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-10 h-10 flex items-center justify-center text-white rounded-lg shrink-0"
                      style={{ backgroundColor: event.color }}
                    >
                      {getEventTypeIcon(event.type, event.crmType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-slate-900">{event.title}</h4>
                          {event.companyName && (
                            <p className="text-sm text-slate-600">{event.companyName}</p>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 shrink-0">
                          {event.start.getHours() !== 0 && event.start.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full">
                          {event.type === 'crm-action' ? `${event.crmType} action` : event.type}
                        </span>
                        {event.assignedToName && event.assignedToName !== 'Unassigned' && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.assignedToName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No events scheduled for this day</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <span className="font-semibold text-slate-600">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-indigo-500 rounded"></div>
          <span className="text-slate-600">Meetings</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-slate-600">Tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span className="text-slate-600">Deals</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-slate-600">Investor Actions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span className="text-slate-600">Customer Actions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-pink-500 rounded"></div>
          <span className="text-slate-600">Partner Actions</span>
        </div>
      </div>
    </div>
  );
};

export default TeamCalendarView;
