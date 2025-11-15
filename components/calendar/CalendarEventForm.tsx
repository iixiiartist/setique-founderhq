import React, { useState } from 'react';
import { Priority, TaskCollectionName, CrmCollectionName, BaseCrmItem, Contact, WorkspaceMember, Subtask } from '../../types';
import { SubtaskManager } from '../shared/SubtaskManager';

interface CalendarEventFormProps {
    eventType: 'task' | 'meeting' | 'crm-action';
    initialDate?: string;
    initialTime?: string;
    workspaceMembers?: WorkspaceMember[];
    crmItems?: { investors: BaseCrmItem[]; customers: BaseCrmItem[]; partners: BaseCrmItem[] };
    onSubmit: (data: CalendarEventFormData) => Promise<void>;
    onCancel: () => void;
    planType?: string;
    onCreateCrmItem?: (collection: CrmCollectionName, company: string) => Promise<string>; // Returns new item ID
    onCreateContact?: (collection: CrmCollectionName, itemId: string, name: string, email: string) => Promise<string>; // Returns new contact ID
}

export interface CalendarEventFormData {
    type: 'task' | 'meeting' | 'crm-action';
    // Task fields
    title?: string;
    description?: string;
    category?: TaskCollectionName;
    priority?: Priority;
    assignedTo?: string;
    subtasks?: Subtask[];
    // Meeting fields
    crmCollection?: CrmCollectionName;
    crmItemId?: string;
    contactId?: string;
    meetingTitle?: string;
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
    planType = 'free',
    onCreateCrmItem,
    onCreateContact
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Shared fields
    const [dueDate, setDueDate] = useState(initialDate);
    const [dueTime, setDueTime] = useState(initialTime);

    // Task fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<TaskCollectionName>('productsServicesTasks');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [assignedTo, setAssignedTo] = useState('');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);

    // Meeting fields
    const [crmCollection, setCrmCollection] = useState<CrmCollectionName>('investors');
    const [crmItemId, setCrmItemId] = useState('');
    const [contactId, setContactId] = useState('');
    const [meetingTitle, setMeetingTitle] = useState('');
    const [attendees, setAttendees] = useState('');
    const [meetingSummary, setMeetingSummary] = useState('');

    // CRM action fields
    const [nextAction, setNextAction] = useState('');
    const [crmActionCollection, setCrmActionCollection] = useState<CrmCollectionName>('investors');
    const [crmActionItemId, setCrmActionItemId] = useState('');

    // Quick-add states
    const [showQuickAddCrm, setShowQuickAddCrm] = useState(false);
    const [quickAddCrmName, setQuickAddCrmName] = useState('');
    const [showQuickAddContact, setShowQuickAddContact] = useState(false);
    const [quickAddContactName, setQuickAddContactName] = useState('');
    const [quickAddContactEmail, setQuickAddContactEmail] = useState('');

    const isTeamPlan = planType?.startsWith('team');
    const canAssignTasks = isTeamPlan && workspaceMembers.length > 1;

    // Get contacts for selected CRM item
    const selectedCrmItem = crmItems?.[crmCollection]?.find(item => item.id === crmItemId);
    const availableContacts = selectedCrmItem?.contacts || [];

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
            if (!contactId) {
                return 'Please select a contact for the meeting';
            }
            if (!meetingTitle.trim()) {
                return 'Please enter a meeting title';
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

    const handleQuickAddCrm = async () => {
        if (!quickAddCrmName.trim() || !onCreateCrmItem) {
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            const newItemId = await onCreateCrmItem(crmCollection, quickAddCrmName.trim());
            setCrmItemId(newItemId);
            setShowQuickAddCrm(false);
            setQuickAddCrmName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create CRM item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickAddContact = async () => {
        if (!quickAddContactName.trim() || !crmItemId || !onCreateContact) {
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            const newContactId = await onCreateContact(
                crmCollection,
                crmItemId,
                quickAddContactName.trim(),
                quickAddContactEmail.trim()
            );
            setContactId(newContactId);
            setShowQuickAddContact(false);
            setQuickAddContactName('');
            setQuickAddContactEmail('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create contact');
        } finally {
            setIsSubmitting(false);
        }
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
                formData.subtasks = subtasks;
            } else if (eventType === 'meeting') {
                formData.crmCollection = crmCollection;
                formData.crmItemId = crmItemId;
                formData.contactId = contactId || undefined;
                formData.meetingTitle = meetingTitle;
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
                            <option value="productsServicesTasks">Products & Services</option>
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
                    
                    {/* Subtasks section */}
                    <div className="border-t-2 border-gray-200 pt-3 mt-3">
                        <label className="block font-mono text-sm font-semibold text-black mb-2">
                            Subtasks (Optional)
                        </label>
                        <SubtaskManager 
                            subtasks={subtasks}
                            onSubtasksChange={setSubtasks}
                        />
                    </div>
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
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="meeting-crm-item" className="font-mono text-sm font-semibold text-black">
                                Select {crmCollection.slice(0, -1).charAt(0).toUpperCase() + crmCollection.slice(1, -1)} <span className="text-red-600">*</span>
                            </label>
                            {onCreateCrmItem && (
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAddCrm(!showQuickAddCrm)}
                                    className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-800"
                                >
                                    {showQuickAddCrm ? '✕ Cancel' : '+ New'}
                                </button>
                            )}
                        </div>
                        
                        {showQuickAddCrm ? (
                            <div className="space-y-2 p-3 border-2 border-blue-300 bg-blue-50">
                                <input
                                    type="text"
                                    value={quickAddCrmName}
                                    onChange={(e) => setQuickAddCrmName(e.target.value)}
                                    placeholder={`Company name...`}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={handleQuickAddCrm}
                                    disabled={!quickAddCrmName.trim() || isSubmitting}
                                    className="w-full py-2 px-4 font-mono font-semibold bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create & Select'}
                                </button>
                            </div>
                        ) : (
                            <select
                                id="meeting-crm-item"
                                value={crmItemId}
                                onChange={(e) => {
                                    setCrmItemId(e.target.value);
                                    setContactId(''); // Reset contact when CRM item changes
                                }}
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
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="meeting-contact" className="font-mono text-sm font-semibold text-black">
                                Contact <span className="text-red-600">*</span>
                            </label>
                            {onCreateContact && crmItemId && (
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAddContact(!showQuickAddContact)}
                                    className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-800"
                                >
                                    {showQuickAddContact ? '✕ Cancel' : '+ New Contact'}
                                </button>
                            )}
                        </div>
                        
                        {showQuickAddContact ? (
                            <div className="space-y-2 p-3 border-2 border-blue-300 bg-blue-50">
                                <input
                                    type="text"
                                    value={quickAddContactName}
                                    onChange={(e) => setQuickAddContactName(e.target.value)}
                                    placeholder="Contact name..."
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                <input
                                    type="email"
                                    value={quickAddContactEmail}
                                    onChange={(e) => setQuickAddContactEmail(e.target.value)}
                                    placeholder="Email (optional)..."
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleQuickAddContact}
                                    disabled={!quickAddContactName.trim() || isSubmitting}
                                    className="w-full py-2 px-4 font-mono font-semibold bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create & Select'}
                                </button>
                            </div>
                        ) : (
                            <>
                                <select
                                    id="meeting-contact"
                                    value={contactId}
                                    onChange={(e) => setContactId(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    disabled={!crmItemId}
                                >
                                    <option value="">-- Select Contact --</option>
                                    {availableContacts.map(contact => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.name}
                                        </option>
                                    ))}
                                </select>
                                {crmItemId && availableContacts.length === 0 && !showQuickAddContact && (
                                    <p className="text-xs text-gray-600 mt-1">
                                        No contacts found. Click "+ New Contact" above to add one.
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <div>
                        <label htmlFor="meeting-title" className="block font-mono text-sm font-semibold text-black mb-1">
                            Meeting Title <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="meeting-title"
                            type="text"
                            value={meetingTitle}
                            onChange={(e) => setMeetingTitle(e.target.value)}
                            placeholder="e.g., Q4 Planning Session"
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
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
