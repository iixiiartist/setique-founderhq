import React from 'react';
import { BaseCrmItem, Priority, WorkspaceMember } from '../../types';
import Modal from '../shared/Modal';
import CalendarEventForm, { CalendarEventFormData } from './CalendarEventForm';

type EventType = 'task' | 'meeting' | 'crm-action';

interface NewEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
    eventType: EventType;
    onEventTypeChange: (type: EventType) => void;
    initialDate: string;
    initialTime: string;
    workspaceMembers: WorkspaceMember[];
    crmItems?: {
        investors: BaseCrmItem[];
        customers: BaseCrmItem[];
        partners: BaseCrmItem[];
    };
    planType?: string;
    onSubmit: (formData: CalendarEventFormData) => Promise<void>;
    onCreateCrmItem: (collection: 'investors' | 'customers' | 'partners', company: string) => Promise<string>;
    onCreateContact: (collection: 'investors' | 'customers' | 'partners', itemId: string, name: string, email?: string) => Promise<string>;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
    isOpen,
    onClose,
    triggerRef,
    eventType,
    onEventTypeChange,
    initialDate,
    initialTime,
    workspaceMembers,
    crmItems,
    planType,
    onSubmit,
    onCreateCrmItem,
    onCreateContact
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Event" triggerRef={triggerRef}>
            <div className="space-y-4">
                {/* Event Type Selection */}
                <div>
                    <label className="block font-mono text-sm font-semibold text-black mb-2">Event Type</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onEventTypeChange('task')}
                            className={`flex-1 py-2 px-4 font-mono font-semibold border-2 border-black ${eventType === 'task' ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                            Task
                        </button>
                        <button
                            type="button"
                            onClick={() => onEventTypeChange('meeting')}
                            className={`flex-1 py-2 px-4 font-mono font-semibold border-2 border-black ${eventType === 'meeting' ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                            Meeting
                        </button>
                        <button
                            type="button"
                            onClick={() => onEventTypeChange('crm-action')}
                            className={`flex-1 py-2 px-4 font-mono font-semibold border-2 border-black ${eventType === 'crm-action' ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                            CRM Action
                        </button>
                    </div>
                </div>

                {/* Calendar Event Form */}
                <CalendarEventForm
                    eventType={eventType}
                    initialDate={initialDate}
                    initialTime={initialTime}
                    workspaceMembers={workspaceMembers}
                    crmItems={crmItems}
                    onSubmit={onSubmit}
                    onCancel={onClose}
                    planType={planType}
                    onCreateCrmItem={onCreateCrmItem}
                    onCreateContact={onCreateContact}
                />
            </div>
        </Modal>
    );
};
