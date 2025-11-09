import React, { useState } from 'react';
import { Priority, TaskCollectionName, CrmCollectionName, BaseCrmItem, Contact, WorkspaceMember } from '../../types';

interface CalendarEventFormProps {
    eventType: 'task' | 'meeting' | 'crm-action';
    initialDate?: string;
    initialTime?: string;
    workspaceMembers?: WorkspaceMember[];
    crmItems?: { investors: BaseCrmItem[]; customers: BaseCrmItem[]; partners: BaseCrmItem[] };
    onSubmit: (data: CalendarEventFormData) => Promise<void>;
    onCancel: () => void;
    planType?: string;
}

export interface CalendarEventFormData {
    type: 'task' | 'meeting' | 'crm-action';
    // Task fields
    title?: string;
    description?: string;
    category?: TaskCollectionName;
    priority?: Priority;
    assignedTo?: string;
    // Meeting fields
    crmCollection?: CrmCollectionName;
    crmItemId?: string;
    contactId?: string;
    attendees?: string;
    meetingSummary?: string;
    // CRM action fields
    nextAction?: string;
    // Shared fields
    dueDate: string;
    dueTime?: string;
}

const CalendarEventForm: React.FC<CalendarEventFormProps> = ({
    eventType,
    initialDate = '',
    initialTime = '',
    workspaceMembers = [],
    crmItems,
    onSubmit,
    onCancel,
    planType = 'free'
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Shared fields
    const [dueDate, setDueDate] = useState(initialDate);
    const [dueTime, setDueTime] = useState(initialTime);

    // Task fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<TaskCollectionName>('platformTasks');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [assignedTo, setAssignedTo] = useState('');

    // Meeting fields
    const [crmCollection, setCrmCollection] = useState<CrmCollectionName>('investors');
    const [crmItemId, setCrmItemId] = useState('');
    const [contactId, setContactId] = useState('');
    const [attendees, setAttendees] = useState('');
    const [meetingSummary, setMeetingSummary] = useState('');

    // CRM action fields
    const [nextAction, setNextAction] = useState('');
    const [crmActionCollection, setCrmActionCollection] = useState<CrmCollectionName>('investors');
    const [crmActionItemId, setCrmActionItemId] = useState('');

    const isTeamPlan = planType?.startsWith('team');
    const canAssignTasks = isTeamPlan && workspaceMembers.length > 1;

    const validateForm = (): string | null => {
        if (!dueDate) {
            return 'Please select a date';
        }

        if (eventType === 'task') {
            if (!title.trim()) {
                return 'Please enter a task title';
            }
            if (!category) {
                return 'Please select a task category';
            }
        }

        if (eventType === 'meeting') {
            if (!crmItemId) {
                return 'Please select a CRM item for the meeting';
            }
            if (!attendees.trim()) {
                return 'Please enter meeting attendees';
            }
        }

        if (eventType === 'crm-action') {
            if (!crmActionItemId) {
                return 'Please select a CRM item for the action';
            }
            if (!nextAction.trim()) {
                return 'Please enter the next action';
            }
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const formData: CalendarEventFormData = {
                type: eventType,
                dueDate,
                dueTime: dueTime || undefined,
            };

            if (eventType === 'task') {
                formData.title = title;
                formData.description = description || undefined;
                formData.category = category;
                formData.priority = priority;
                formData.assignedTo = assignedTo || undefined;
            } else if (eventType === 'meeting') {
                formData.crmCollection = crmCollection;
                formData.crmItemId = crmItemId;
                formData.contactId = contactId || undefined;
                formData.attendees = attendees;
                formData.meetingSummary = meetingSummary || undefined;
            } else if (eventType === 'crm-action') {
                formData.crmCollection = crmActionCollection;
                formData.crmItemId = crmActionItemId;
                formData.nextAction = nextAction;
            }

            await onSubmit(formData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-sm">
                    {error}
                </div>
            )}

            {/* Date and Time (Required for all types) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="event-date" className="block font-mono text-sm font-semibold text-black mb-1">
                        Date <span className="text-red-600">*</span>
                    </label>
                    <input
                        id="event-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="event-time" className="block font-mono text-sm font-semibold text-black mb-1">
                        Time
                    </label>
                    <input
                        id="event-time"
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Task-specific fields */}
            {eventType === 'task' && (
                <>
                    <div>
                        <label htmlFor="task-title" className="block font-mono text-sm font-semibold text-black mb-1">
                            Task Title <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title..."
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="task-description" className="block font-mono text-sm font-semibold text-black mb-1">
                            Description
                        </label>
                        <textarea
                            id="task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details..."
                            rows={3}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="task-category" className="block font-mono text-sm font-semibold text-black mb-1">
                            Category <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="task-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as TaskCollectionName)}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="platformTasks">Platform</option>
                            <option value="investorTasks">Investor</option>
                            <option value="customerTasks">Customer</option>
                            <option value="partnerTasks">Partner</option>
                            <option value="marketingTasks">Marketing</option>
                            <option value="financialTasks">Financial</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="task-priority" className="block font-mono text-sm font-semibold text-black mb-1">
                            Priority
                        </label>
                        <select
                            id="task-priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as Priority)}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>

                    {canAssignTasks && (
                        <div>
                            <label htmlFor="task-assignee" className="block font-mono text-sm font-semibold text-black mb-1">
                                Assign To
                            </label>
                            <select
                                id="task-assignee"
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Unassigned</option>
                                {workspaceMembers.map(member => (
                                    <option key={member.userId} value={member.userId}>
                                        {member.fullName || member.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!canAssignTasks && workspaceMembers.length > 1 && (
                        <div className="p-3 bg-yellow-50 border-2 border-yellow-300 text-sm">
                            <p className="font-mono text-yellow-900">
                                💡 Upgrade to a Team plan to assign tasks to team members
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Meeting-specific fields */}
            {eventType === 'meeting' && crmItems && (
                <>
                    <div>
                        <label htmlFor="meeting-collection" className="block font-mono text-sm font-semibold text-black mb-1">
                            CRM Type <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="meeting-collection"
                            value={crmCollection}
                            onChange={(e) => {
                                setCrmCollection(e.target.value as CrmCollectionName);
                                setCrmItemId(''); // Reset item when collection changes
                                setContactId('');
                            }}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="investors">Investor</option>
                            <option value="customers">Customer</option>
                            <option value="partners">Partner</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="meeting-crm-item" className="block font-mono text-sm font-semibold text-black mb-1">
                            Select {crmCollection.slice(0, -1).charAt(0).toUpperCase() + crmCollection.slice(1, -1)} <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="meeting-crm-item"
                            value={crmItemId}
                            onChange={(e) => setCrmItemId(e.target.value)}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">-- Select --</option>
                            {crmItems[crmCollection]?.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.company || 'Unnamed'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="meeting-attendees" className="block font-mono text-sm font-semibold text-black mb-1">
                            Attendees <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="meeting-attendees"
                            type="text"
                            value={attendees}
                            onChange={(e) => setAttendees(e.target.value)}
                            placeholder="e.g., John Smith, Jane Doe"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="meeting-summary" className="block font-mono text-sm font-semibold text-black mb-1">
                            Meeting Notes
                        </label>
                        <textarea
                            id="meeting-summary"
                            value={meetingSummary}
                            onChange={(e) => setMeetingSummary(e.target.value)}
                            placeholder="Meeting agenda or notes..."
                            rows={3}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </>
            )}

            {/* CRM Action-specific fields */}
            {eventType === 'crm-action' && crmItems && (
                <>
                    <div>
                        <label htmlFor="crm-action-collection" className="block font-mono text-sm font-semibold text-black mb-1">
                            CRM Type <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="crm-action-collection"
                            value={crmActionCollection}
                            onChange={(e) => {
                                setCrmActionCollection(e.target.value as CrmCollectionName);
                                setCrmActionItemId(''); // Reset item when collection changes
                            }}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="investors">Investor</option>
                            <option value="customers">Customer</option>
                            <option value="partners">Partner</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="crm-action-item" className="block font-mono text-sm font-semibold text-black mb-1">
                            Select {crmActionCollection.slice(0, -1).charAt(0).toUpperCase() + crmActionCollection.slice(1, -1)} <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="crm-action-item"
                            value={crmActionItemId}
                            onChange={(e) => setCrmActionItemId(e.target.value)}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">-- Select --</option>
                            {crmItems[crmActionCollection]?.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.company || 'Unnamed'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="next-action" className="block font-mono text-sm font-semibold text-black mb-1">
                            Next Action <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            id="next-action"
                            value={nextAction}
                            onChange={(e) => setNextAction(e.target.value)}
                            placeholder="Describe the follow-up action..."
                            rows={3}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="flex-1 font-mono font-semibold bg-gray-200 text-black py-2 px-4 rounded-none border-2 border-black shadow-neo-btn hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 font-mono font-semibold bg-blue-600 text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Creating...' : 'Create Event'}
                </button>
            </div>
        </form>
    );
};

export default CalendarEventForm;
