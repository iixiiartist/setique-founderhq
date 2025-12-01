import React, { useState } from 'react';
import { z } from 'zod';
import { Priority, TaskCollectionName, CrmCollectionName, BaseCrmItem, WorkspaceMember, Subtask } from '../../types';
import { SubtaskManager } from '../shared/SubtaskManager';
import { Form } from '../forms/Form';
import { FormField } from '../forms/FormField';
import { SelectField } from '../forms/SelectField';
import { Button } from '../ui/Button';

// Zod schemas for each event type
const taskSchema = z.object({
    type: z.literal('task'),
    title: z.string().min(1, 'Task title is required').max(200),
    description: z.string().max(1000).optional(),
    category: z.enum(['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks']),
    priority: z.enum(['Low', 'Medium', 'High']),
    dueDate: z.string().min(1, 'Date is required'),
    dueTime: z.string().optional(),
    assignedTo: z.string().optional(),
});

const meetingSchema = z.object({
    type: z.literal('meeting'),
    crmCollection: z.enum(['investors', 'customers', 'partners']),
    crmItemId: z.string().min(1, 'Please select a CRM item'),
    contactId: z.string().optional(),
    meetingTitle: z.string().min(1, 'Meeting title is required').max(200),
    attendees: z.string().min(1, 'Attendees are required').max(500),
    meetingSummary: z.string().max(2000).optional(),
    dueDate: z.string().min(1, 'Date is required'),
    dueTime: z.string().optional(),
});

const crmActionSchema = z.object({
    type: z.literal('crm-action'),
    crmCollection: z.enum(['investors', 'customers', 'partners']),
    crmItemId: z.string().min(1, 'Please select a CRM item'),
    nextAction: z.string().min(1, 'Next action is required').max(1000),
    dueDate: z.string().min(1, 'Date is required'),
    dueTime: z.string().optional(),
});

// Discriminated union of all event types
const calendarEventSchema = z.discriminatedUnion('type', [
    taskSchema,
    meetingSchema,
    crmActionSchema,
]);

type CalendarEventData = z.infer<typeof calendarEventSchema>;

interface CalendarEventFormProps {
    eventType: 'task' | 'meeting' | 'crm-action';
    initialDate?: string;
    initialTime?: string;
    workspaceMembers?: WorkspaceMember[];
    crmItems?: { investors: BaseCrmItem[]; customers: BaseCrmItem[]; partners: BaseCrmItem[] };
    onSubmit: (data: CalendarEventFormData) => Promise<void>;
    onCancel: () => void;
    planType?: string;
    onCreateCrmItem?: (collection: CrmCollectionName, company: string) => Promise<string>;
    onCreateContact?: (collection: CrmCollectionName, itemId: string, name: string, email: string) => Promise<string>;
}

export interface CalendarEventFormData {
    type: 'task' | 'meeting' | 'crm-action';
    title?: string;
    description?: string;
    category?: TaskCollectionName;
    priority?: Priority;
    assignedTo?: string;
    subtasks?: Subtask[];
    crmCollection?: CrmCollectionName;
    crmItemId?: string;
    contactId?: string;
    meetingTitle?: string;
    attendees?: string;
    meetingSummary?: string;
    nextAction?: string;
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
    // Non-form state (subtasks, quick-add UI, CRM collection tracking)
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [showQuickAddCrm, setShowQuickAddCrm] = useState(false);
    const [quickAddCrmName, setQuickAddCrmName] = useState('');
    const [showQuickAddContact, setShowQuickAddContact] = useState(false);
    const [quickAddContactName, setQuickAddContactName] = useState('');
    const [quickAddContactEmail, setQuickAddContactEmail] = useState('');
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [isQuickAdding, setIsQuickAdding] = useState(false);
    
    // Track CRM collection for meeting/crm-action forms (outside schema)
    const [crmCollection, setCrmCollection] = useState<CrmCollectionName>('investors');
    const [crmItemId, setCrmItemId] = useState('');

    const isTeamPlan = planType?.startsWith('team');
    const canAssignTasks = isTeamPlan && workspaceMembers.length > 1;

    // Get contacts for selected CRM item
    const selectedCrmItem = crmItems?.[crmCollection]?.find(item => item.id === crmItemId);
    const availableContacts = selectedCrmItem?.contacts || [];

    // Prepare default values based on event type
    const getDefaultValues = (): any => {
        const base = {
            type: eventType,
            dueDate: initialDate,
            dueTime: initialTime,
        };

        if (eventType === 'task') {
            return {
                ...base,
                title: '',
                description: '',
                category: 'productsServicesTasks' as TaskCollectionName,
                priority: 'Medium' as Priority,
                assignedTo: '',
            };
        } else if (eventType === 'meeting') {
            return {
                ...base,
                crmCollection: 'investors' as CrmCollectionName,
                crmItemId: '',
                contactId: '',
                meetingTitle: '',
                attendees: '',
                meetingSummary: '',
            };
        } else {
            return {
                ...base,
                crmCollection: 'investors' as CrmCollectionName,
                crmItemId: '',
                nextAction: '',
            };
        }
    };

    const handleQuickAddCrm = async () => {
        if (!quickAddCrmName.trim() || !onCreateCrmItem) return;

        try {
            setIsQuickAdding(true);
            setGlobalError(null);
            const newItemId = await onCreateCrmItem(crmCollection, quickAddCrmName.trim());
            setCrmItemId(newItemId);
            setShowQuickAddCrm(false);
            setQuickAddCrmName('');
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Failed to create CRM item');
        } finally {
            setIsQuickAdding(false);
        }
    };

    const handleQuickAddContact = async () => {
        if (!quickAddContactName.trim() || !crmItemId || !onCreateContact) return;

        try {
            setIsQuickAdding(true);
            setGlobalError(null);
            await onCreateContact(
                crmCollection,
                crmItemId,
                quickAddContactName.trim(),
                quickAddContactEmail.trim()
            );
            // Update the form field
            setShowQuickAddContact(false);
            setQuickAddContactName('');
            setQuickAddContactEmail('');
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Failed to create contact');
        } finally {
            setIsQuickAdding(false);
        }
    };

    const handleFormSubmit = async (data: CalendarEventData) => {
        try {
            setGlobalError(null);
            
            // Transform form data to match CalendarEventFormData interface
            const formData: CalendarEventFormData = {
                type: data.type,
                dueDate: data.dueDate,
                dueTime: data.dueTime || undefined,
            };

            if (data.type === 'task') {
                formData.title = data.title;
                formData.description = data.description || undefined;
                formData.category = data.category;
                formData.priority = data.priority;
                formData.assignedTo = data.assignedTo || undefined;
                formData.subtasks = subtasks;
            } else if (data.type === 'meeting') {
                formData.crmCollection = data.crmCollection;
                formData.crmItemId = data.crmItemId;
                formData.contactId = data.contactId || undefined;
                formData.meetingTitle = data.meetingTitle;
                formData.attendees = data.attendees;
                formData.meetingSummary = data.meetingSummary || undefined;
            } else if (data.type === 'crm-action') {
                formData.crmCollection = data.crmCollection;
                formData.crmItemId = data.crmItemId;
                formData.nextAction = data.nextAction;
            }

            await onSubmit(formData);
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Failed to create event');
            throw err; // Re-throw so form knows submission failed
        }
    };

    return (
        <Form
            schema={calendarEventSchema}
            defaultValues={getDefaultValues()}
            onSubmit={handleFormSubmit}
        >
            {({ formState }) => {
                return (
                    <div className="space-y-4">
                        {/* Global Error */}
                        {globalError && (
                            <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-sm">
                                {globalError}
                            </div>
                        )}

                        {/* Date and Time (Required for all types) */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                name="dueDate"
                                label="Date"
                                type="date"
                                required
                            />
                            <FormField
                                name="dueTime"
                                label="Time"
                                type="time"
                            />
                        </div>

                        {/* Task-specific fields */}
                        {eventType === 'task' && (
                            <>
                                <FormField
                                    name="title"
                                    label="Task Title"
                                    placeholder="Enter task title..."
                                    required
                                />

                                <FormField
                                    name="description"
                                    label="Description"
                                    type="text"
                                    placeholder="Add details..."
                                    helpText="Optional task description"
                                />

                                <SelectField
                                    name="category"
                                    label="Category"
                                    required
                                    options={[
                                        { value: 'productsServicesTasks', label: 'Products & Services' },
                                        { value: 'investorTasks', label: 'Investor' },
                                        { value: 'customerTasks', label: 'Customer' },
                                        { value: 'partnerTasks', label: 'Partner' },
                                        { value: 'marketingTasks', label: 'Marketing' },
                                        { value: 'financialTasks', label: 'Financial' },
                                    ]}
                                />

                                <SelectField
                                    name="priority"
                                    label="Priority"
                                    options={[
                                        { value: 'Low', label: 'Low' },
                                        { value: 'Medium', label: 'Medium' },
                                        { value: 'High', label: 'High' },
                                    ]}
                                />

                                {canAssignTasks && (
                                    <SelectField
                                        name="assignedTo"
                                        label="Assign To"
                                        options={[
                                            { value: '', label: 'Unassigned' },
                                            ...workspaceMembers.map(member => ({
                                                value: member.userId,
                                                label: member.fullName || member.email || 'Unknown'
                                            }))
                                        ]}
                                    />
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
                                <SelectField
                                    name="crmCollection"
                                    label="CRM Type"
                                    required
                                    onChange={(value) => {
                                        const typedValue = (value || 'investors') as CrmCollectionName;
                                        setCrmCollection(typedValue);
                                        setCrmItemId('');
                                    }}
                                    options={[
                                        { value: 'investors', label: 'Investor' },
                                        { value: 'customers', label: 'Customer' },
                                        { value: 'partners', label: 'Partner' },
                                    ]}
                                />

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="font-mono text-sm font-semibold text-black">
                                            Select {crmCollection.slice(0, -1).charAt(0).toUpperCase() + crmCollection.slice(1, -1)} <span className="text-red-600">*</span>
                                        </label>
                                        {onCreateCrmItem && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowQuickAddCrm(!showQuickAddCrm)}
                                            >
                                                {showQuickAddCrm ? '✕ Cancel' : '+ New'}
                                            </Button>
                                        )}
                                    </div>

                                    {showQuickAddCrm ? (
                                        <div className="space-y-2 p-3 rounded-lg border border-blue-200 bg-blue-50">
                                            <input
                                                type="text"
                                                value={quickAddCrmName}
                                                onChange={(e) => setQuickAddCrmName(e.target.value)}
                                                placeholder="Company name..."
                                                className="w-full bg-white rounded-lg border border-gray-200 text-black p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                autoFocus
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleQuickAddCrm}
                                                disabled={!quickAddCrmName.trim() || isQuickAdding}
                                                className="w-full"
                                            >
                                                {isQuickAdding ? 'Creating...' : 'Create & Select'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <SelectField
                                            name="crmItemId"
                                            label=""
                                            required
                                            onChange={(value) => setCrmItemId(value)}
                                            options={[
                                                { value: '', label: '-- Select --' },
                                                ...(crmItems[crmCollection]?.map(item => ({
                                                    value: item.id,
                                                    label: item.company || 'Unnamed'
                                                })) || [])
                                            ]}
                                        />
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="font-mono text-sm font-semibold text-black">
                                            Contact <span className="text-red-600">*</span>
                                        </label>
                                        {onCreateContact && crmItemId && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowQuickAddContact(!showQuickAddContact)}
                                            >
                                                {showQuickAddContact ? '✕ Cancel' : '+ New Contact'}
                                            </Button>
                                        )}
                                    </div>

                                    {showQuickAddContact ? (
                                        <div className="space-y-2 p-3 rounded-lg border border-blue-200 bg-blue-50">
                                            <input
                                                type="text"
                                                value={quickAddContactName}
                                                onChange={(e) => setQuickAddContactName(e.target.value)}
                                                placeholder="Contact name..."
                                                className="w-full bg-white rounded-lg border border-gray-200 text-black p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                autoFocus
                                            />
                                            <input
                                                type="email"
                                                value={quickAddContactEmail}
                                                onChange={(e) => setQuickAddContactEmail(e.target.value)}
                                                placeholder="Email (optional)..."
                                                className="w-full bg-white rounded-lg border border-gray-200 text-black p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleQuickAddContact}
                                                disabled={!quickAddContactName.trim() || isQuickAdding}
                                                className="w-full"
                                            >
                                                {isQuickAdding ? 'Creating...' : 'Create & Select'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <SelectField
                                                name="contactId"
                                                label=""
                                                disabled={!crmItemId}
                                                options={[
                                                    { value: '', label: '-- Select Contact --' },
                                                    ...availableContacts.map(contact => ({
                                                        value: contact.id!,
                                                        label: contact.name
                                                    }))
                                                ]}
                                            />
                                            {crmItemId && availableContacts.length === 0 && !showQuickAddContact && (
                                                <p className="text-xs text-gray-600 mt-1">
                                                    No contacts found. Click "+ New Contact" above to add one.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <FormField
                                    name="meetingTitle"
                                    label="Meeting Title"
                                    placeholder="e.g., Q4 Planning Session"
                                    required
                                />

                                <FormField
                                    name="attendees"
                                    label="Attendees"
                                    placeholder="e.g., John Smith, Jane Doe"
                                    required
                                />

                                <FormField
                                    name="meetingSummary"
                                    label="Meeting Notes"
                                    type="text"
                                    placeholder="Meeting agenda or notes..."
                                />
                            </>
                        )}

                        {/* CRM Action-specific fields */}
                        {eventType === 'crm-action' && crmItems && (
                            <>
                                <SelectField
                                    name="crmCollection"
                                    label="CRM Type"
                                    required
                                    options={[
                                        { value: 'investors', label: 'Investor' },
                                        { value: 'customers', label: 'Customer' },
                                        { value: 'partners', label: 'Partner' },
                                    ]}
                                    onChange={(value) => {
                                        const typedValue = (value || 'investors') as CrmCollectionName;
                                        setCrmCollection(typedValue);
                                        setCrmItemId('');
                                    }}
                                />

                                <SelectField
                                    name="crmItemId"
                                    label={`Select ${crmCollection.slice(0, -1).charAt(0).toUpperCase() + crmCollection.slice(1, -1)}`}
                                    required
                                    onChange={(value) => setCrmItemId(value)}
                                    options={[
                                        { value: '', label: '-- Select --' },
                                        ...(crmItems[crmCollection]?.map(item => ({
                                            value: item.id,
                                            label: item.company || 'Unnamed'
                                        })) || [])
                                    ]}
                                />

                                <FormField
                                    name="nextAction"
                                    label="Next Action"
                                    type="text"
                                    placeholder="Describe the follow-up action..."
                                    required
                                />
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onCancel}
                                disabled={formState.isSubmitting || isQuickAdding}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={formState.isSubmitting}
                                disabled={isQuickAdding}
                                className="flex-1"
                            >
                                Create Event
                            </Button>
                        </div>
                    </div>
                );
            }}
        </Form>
    );
};

export default CalendarEventForm;
