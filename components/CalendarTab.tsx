import React, { useState, useRef } from 'react';
import { CalendarEvent, BaseCrmItem, Priority, Workspace, WorkspaceMember } from '../types';
import { AppActions } from '../types';
import Modal from './shared/Modal';
import TeamCalendarView from './team/TeamCalendarView';
import { useRealTimeClock } from '../hooks/useRealTimeClock';
import {
    CalendarHeader,
    ViewMode,
    CalendarMode,
    EventDetailModalContent,
    MonthView,
    WeekView,
    DayView,
    NewEventModal,
    CalendarEventFormData
} from './calendar';

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

function CalendarTab({ 
    events, 
    actions,
    workspace,
    workspaceMembers = [],
    crmItems
}: CalendarTabProps) {
    const { date: realTimeNow, isoDate: todayIso } = useRealTimeClock();
    const [currentDate, setCurrentDate] = useState(realTimeNow);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [calendarMode, setCalendarMode] = useState<CalendarMode>('personal');
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
    
    const handleToday = () => setCurrentDate(new Date(realTimeNow));
    
    const openEventModal = (event: CalendarEvent, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setSelectedEvent(event);
        modalTriggerRef.current = triggerRef.current;
    };
    
    const handleOpenNewEventModal = () => {
        setNewEventDate(currentDate.toISOString().split('T')[0]);
        setNewEventTime('');
        setShowNewEventModal(true);
    };

    const handleEventFormSubmit = async (formData: CalendarEventFormData) => {
        try {
            if (formData.type === 'task') {
                await actions.createTask(
                    formData.category!,
                    formData.title!,
                    formData.priority!,
                    undefined, // crmItemId
                    undefined, // contactId
                    formData.dueDate,
                    formData.assignedTo,
                    formData.dueTime,
                    formData.subtasks
                );
            } else if (formData.type === 'meeting' && formData.crmItemId && formData.contactId) {
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
                await actions.updateCrmItem(
                    formData.crmCollection!,
                    formData.crmItemId,
                    {
                        nextAction: formData.nextAction!,
                        nextActionDate: formData.dueDate
                    }
                );
            }
            
            setShowNewEventModal(false);
        } catch (error) {
            console.error('[CalendarTab] Failed to create event:', error);
            throw error;
        }
    };

    const handleCreateCrmItem = async (collection: 'investors' | 'customers' | 'partners', company: string) => {
        const result = await actions.createCrmItem(collection, {
            company,
            status: 'Lead',
            priority: 'Medium' as Priority
        });
        if (!result.success || !result.itemId) {
            throw new Error(result.message || 'Failed to create item');
        }
        return result.itemId;
    };

    const handleCreateContact = async (
        collection: 'investors' | 'customers' | 'partners', 
        itemId: string, 
        name: string, 
        email?: string
    ) => {
        const result = await actions.createContact(collection, itemId, {
            name,
            email: email || '',
            phone: undefined,
            linkedin: undefined
        });
        if (!result.success || !result.contactId) {
            throw new Error(result.message || 'Failed to create contact');
        }
        return result.contactId;
    };

    const viewProps = {
        events,
        currentDate,
        todayIso,
        realTimeNow,
        onEventClick: openEventModal
    };

    return (
        <div className="bg-white p-3 sm:p-6 border-2 border-black shadow-neo">
            <CalendarHeader 
                currentDate={currentDate}
                viewMode={viewMode}
                calendarMode={calendarMode}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onViewChange={setViewMode}
                onCalendarModeChange={setCalendarMode}
                onNewEvent={handleOpenNewEventModal}
            />
            
            {calendarMode === 'team' ? (
                <TeamCalendarView 
                    onEventClick={(event: any) => openEventModal(event, { current: null })}
                />
            ) : (
                <>
                    {viewMode === 'month' && <MonthView {...viewProps} />}
                    {viewMode === 'week' && <WeekView {...viewProps} />}
                    {viewMode === 'day' && <DayView {...viewProps} />}
                </>
            )}

            {/* Event Detail Modal */}
            <Modal 
                isOpen={!!selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
                title="Event Details" 
                triggerRef={modalTriggerRef}
            >
                {selectedEvent && (
                    <EventDetailModalContent 
                        event={selectedEvent} 
                        actions={actions}
                        onClose={() => setSelectedEvent(null)}
                        workspace={workspace}
                    />
                )}
            </Modal>

            {/* New Event Modal */}
            <NewEventModal
                isOpen={showNewEventModal}
                onClose={() => setShowNewEventModal(false)}
                triggerRef={newEventModalTriggerRef}
                eventType={newEventType}
                onEventTypeChange={setNewEventType}
                initialDate={newEventDate}
                initialTime={newEventTime}
                workspaceMembers={workspaceMembers}
                crmItems={crmItems}
                planType={workspace?.planType}
                onSubmit={handleEventFormSubmit}
                onCreateCrmItem={handleCreateCrmItem}
                onCreateContact={handleCreateContact}
            />
        </div>
    );
}

export default CalendarTab;
