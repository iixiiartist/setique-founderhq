import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { AppActions, CrmCollectionName, TaskCollectionName, AnyCrmItem, Contact, Subtask } from '../../types';
import { SubtaskManager } from './SubtaskManager';
import { Form } from '../forms/Form';
import { FormField } from '../forms/FormField';
import { SelectField } from '../forms/SelectField';
import { Button } from '../ui/Button';

// Zod schemas for inline forms
const taskFormSchema = z.object({
    text: z.string().min(1, 'Task description is required').max(500),
    category: z.enum(['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'] as const),
    priority: z.enum(['Low', 'Medium', 'High'] as const),
    dueDate: z.string().optional(),
    dueTime: z.string().optional(),
});

const crmFormSchema = z.object({
    company: z.string().min(1, 'Company name is required').max(200),
    collection: z.enum(['investors', 'customers', 'partners'] as const),
    nextAction: z.string().max(500).optional(),
    nextActionDate: z.string().optional(),
    nextActionTime: z.string().optional(),
});

const contactFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email('Invalid email address'),
    phone: z.string().max(50).optional(),
    title: z.string().max(200).optional(),
    linkedin: z.union([z.string().url('Enter a valid URL'), z.literal('')]).optional(),
    linkedCrmId: z.string().optional(),
    newAccountName: z.string().max(200).optional(),
    crmType: z.enum(['investors', 'customers', 'partners'] as const),
});

const eventFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    date: z.string().min(1, 'Date is required'),
    time: z.string().default('10:00'),
    duration: z.string().default('60'),
    description: z.string().max(1000).optional(),
    type: z.enum(['meeting', 'call', 'event'] as const),
});

const expenseFormSchema = z.object({
    amount: z.number().min(0, 'Amount must be positive'),
    category: z.string().min(1, 'Category is required'),
    description: z.string().min(1, 'Description is required').max(500),
    date: z.string().min(1, 'Date is required'),
});

type TaskFormData = z.infer<typeof taskFormSchema>;
type CrmFormData = z.infer<typeof crmFormSchema>;
type ContactFormData = z.infer<typeof contactFormSchema>;
type EventFormData = z.infer<typeof eventFormSchema>;
type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface InlineFormModalProps {
    formType: 'task' | 'crm' | 'contact' | 'event' | 'expense' | 'document';
    formData?: any;
    actions: AppActions;
    onClose: () => void;
    onSuccess?: (message: string) => void;
    crmItems?: AnyCrmItem[];
    currentTab?: string;
    workspaceId?: string;
}

export const InlineFormModal: React.FC<InlineFormModalProps> = ({
    formType,
    formData = {},
    actions,
    onClose,
    onSuccess,
    crmItems = [],
    currentTab,
    workspaceId
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Task subtasks state (still needed by SubtaskManager)
    const [taskSubtasks, setTaskSubtasks] = useState<Subtask[]>([]);

    // Document form state
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    // Typed form submission handlers
    const handleTaskSubmit = async (data: TaskFormData) => {
        const result = await actions.createTask(
            data.category,
            data.text.trim(),
            data.priority,
            undefined,
            undefined,
            data.dueDate || undefined,
            undefined,
            data.dueTime || undefined,
            taskSubtasks
        );
        if (result.success) {
            onSuccess?.(result.message);
            onClose();
        } else {
            setError(result.message);
        }
    };

    const handleCrmSubmit = async (data: CrmFormData) => {
        const result = await actions.createCrmItem(data.collection, {
            company: data.company.trim(),
            nextAction: data.nextAction?.trim() || undefined,
            nextActionDate: data.nextActionDate || undefined,
            nextActionTime: data.nextActionTime || undefined
        });
        if (result.success) {
            onSuccess?.(result.message);
            onClose();
        } else {
            setError(result.message);
        }
    };

    const handleContactSubmit = async (data: ContactFormData) => {
        let crmItemId = data.linkedCrmId;

        // Create new CRM account if specified
        if (!crmItemId && data.newAccountName?.trim()) {
            const crmResult = await actions.createCrmItem(data.crmType, {
                company: data.newAccountName.trim()
            });
            
            if (crmResult.success && crmResult.itemId) {
                crmItemId = crmResult.itemId;
            }
        }

        if (!crmItemId) {
            setError('Please select or create a CRM account for this contact');
            return;
        }

        const result = await actions.createContact(
            data.crmType,
            crmItemId,
            {
                name: data.name.trim(),
                email: data.email.trim(),
                phone: data.phone?.trim() || undefined,
                title: data.title?.trim() || undefined,
                linkedin: data.linkedin?.trim() || '',
                assignedTo: undefined,
                assignedToName: undefined,
                createdByName: undefined,
                tags: []
            }
        );

        if (result.success) {
            onSuccess?.(result.message);
            onClose();
        } else {
            setError(result.message);
        }
    };

    const handleEventSubmit = async (data: EventFormData) => {
        const icon = data.type === 'meeting' ? '🤝' : data.type === 'call' ? '📞' : '📅';
        const result = await actions.createTask(
            'productsServicesTasks',
            `${icon} ${data.title.trim()}`,
            'High',
            undefined,
            undefined,
            data.date,
            undefined,
            data.time || undefined
        );
        if (result.success) {
            onSuccess?.(result.message);
            onClose();
        } else {
            setError(result.message);
        }
    };

    const handleExpenseSubmit = async (data: ExpenseFormData) => {
        const result = await actions.createExpense({
            date: data.date,
            amount: data.amount,
            description: data.description.trim(),
            category: data.category as any,
            vendor: '',
            paymentMethod: undefined
        });
        if (result.success) {
            onSuccess?.(result.message);
            onClose();
        } else {
            setError(result.message);
        }
    };
    const handleDocumentUpload = async () => {
        if (!documentFile) {
            setError('Please select a file to upload');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const reader = new FileReader();
            const fileReadPromise = new Promise<string>((resolve, reject) => {
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = reject;
            });

            reader.readAsDataURL(documentFile);
            const base64 = await fileReadPromise;

            const result = await actions.uploadDocument(
                documentFile.name,
                documentFile.type || 'application/octet-stream',
                base64,
                currentTab as any
            );

            if (result.success) {
                onSuccess?.(result.message);
                onClose();
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Document upload error:', err);
            setError('Failed to upload document. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderForm = () => {
        switch (formType) {
            case 'task':
                return (
                    <Form
                        schema={taskFormSchema}
                        defaultValues={{
                            text: '',
                            category: formData.category || 'productsServicesTasks',
                            priority: formData.priority || 'Medium',
                            dueDate: '',
                            dueTime: '',
                        }}
                        onSubmit={handleTaskSubmit}
                    >
                        {() => (
                            <div className="space-y-4">
                                <FormField
                                    name="text"
                                    label="Task Description *"
                                    type="textarea"
                                    placeholder="e.g., Follow up with client about proposal"
                                    required
                                    rows={3}
                                    autoFocus
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <SelectField
                                        name="category"
                                        label="Category"
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
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        name="dueDate"
                                        label="Due Date"
                                        type="date"
                                    />

                                    <FormField
                                        name="dueTime"
                                        label="Due Time"
                                        type="time"
                                    />
                                </div>
                                
                                {/* Subtasks section */}
                                <div className="border-t-2 border-gray-200 pt-3 mt-3">
                                    <label className="block font-mono text-sm font-semibold text-black mb-2">
                                        Subtasks (Optional)
                                    </label>
                                    <SubtaskManager 
                                        subtasks={taskSubtasks}
                                        onSubtasksChange={setTaskSubtasks}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200">
                                    <Button type="submit" variant="success" className="flex-1">
                                        ✓ Create
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                );

            case 'crm':
                return (
                    <Form
                        schema={crmFormSchema}
                        defaultValues={{
                            collection: formData.collection || 'customers',
                            company: '',
                            nextAction: '',
                            nextActionDate: '',
                            nextActionTime: '',
                        }}
                        onSubmit={handleCrmSubmit}
                    >
                        {() => (
                            <div className="space-y-4">
                                <SelectField
                                    name="collection"
                                    label="Type"
                                    options={[
                                        { value: 'investors', label: 'Investor' },
                                        { value: 'customers', label: 'Customer' },
                                        { value: 'partners', label: 'Partner' },
                                    ]}
                                />

                                <FormField
                                    name="company"
                                    label="Company Name *"
                                    type="text"
                                    placeholder="e.g., Acme Corp"
                                    required
                                    autoFocus
                                />

                                <FormField
                                    name="nextAction"
                                    label="Next Action"
                                    type="text"
                                    placeholder="e.g., Send follow-up email"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        name="nextActionDate"
                                        label="Next Action Date"
                                        type="date"
                                    />

                                    <FormField
                                        name="nextActionTime"
                                        label="Time"
                                        type="time"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200">
                                    <Button type="submit" variant="success" className="flex-1">
                                        ✓ Create
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                );

            case 'contact':
                return (
                    <Form
                        schema={contactFormSchema}
                        defaultValues={{
                            crmType: 'customers',
                            name: '',
                            title: '',
                            email: '',
                            phone: '',
                            linkedin: '',
                            linkedCrmId: '',
                            newAccountName: '',
                        }}
                        onSubmit={handleContactSubmit}
                    >
                        {({ watch }) => {
                            const linkedCrmId = watch('linkedCrmId');
                            const crmType = watch('crmType');
                            
                            return (
                                <div className="space-y-4">
                                    <SelectField
                                        name="crmType"
                                        label="Account Type"
                                        options={[
                                            { value: 'investors', label: 'Investor' },
                                            { value: 'customers', label: 'Customer' },
                                            { value: 'partners', label: 'Partner' },
                                        ]}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            name="name"
                                            label="Contact Name *"
                                            type="text"
                                            placeholder="e.g., John Smith"
                                            required
                                            autoFocus
                                        />

                                        <FormField
                                            name="title"
                                            label="Job Title"
                                            type="text"
                                            placeholder="e.g., CEO"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            name="email"
                                            label="Email *"
                                            type="email"
                                            placeholder="john@example.com"
                                            required
                                        />

                                        <FormField
                                            name="phone"
                                            label="Phone"
                                            type="tel"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>

                                    <FormField
                                        name="linkedin"
                                        label="LinkedIn Profile"
                                        type="url"
                                        placeholder="https://linkedin.com/in/username"
                                    />

                                    <div className="border-t-2 border-gray-300 pt-4">
                                        <label className="block font-mono text-sm font-semibold text-black mb-2">
                                            Link to Account
                                        </label>
                                        <SelectField
                                            name="linkedCrmId"
                                            label=""
                                            options={[
                                                { value: '', label: '-- Select existing or create new --' },
                                                ...crmItems
                                                    .filter(item => {
                                                        // Filter by CRM type
                                                        if (crmType === 'investors') return 'checkSize' in item;
                                                        if (crmType === 'customers') return 'dealValue' in item;
                                                        if (crmType === 'partners') return 'opportunity' in item;
                                                        return false;
                                                    })
                                                    .map(item => ({ value: item.id, label: item.company }))
                                            ]}
                                        />

                                        {!linkedCrmId && (
                                            <div className="mt-2">
                                                <label className="block font-mono text-xs text-gray-600 mb-1">
                                                    Or create new account:
                                                </label>
                                                <FormField
                                                    name="newAccountName"
                                                    label=""
                                                    type="text"
                                                    placeholder="New Company Name"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200">
                                        <Button type="submit" variant="success" className="flex-1">
                                            ✓ Create
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            );
                        }}
                    </Form>
                );

            case 'event':
                return (
                    <Form
                        schema={eventFormSchema}
                        defaultValues={{
                            type: formData.type || 'meeting',
                            title: '',
                            date: '',
                            time: '10:00',
                            duration: '60',
                            description: '',
                        }}
                        onSubmit={handleEventSubmit}
                    >
                        {() => (
                            <div className="space-y-4">
                                <SelectField
                                    name="type"
                                    label="Event Type"
                                    options={[
                                        { value: 'meeting', label: 'Meeting' },
                                        { value: 'call', label: 'Phone Call' },
                                        { value: 'event', label: 'Event' },
                                    ]}
                                />

                                <FormField
                                    name="title"
                                    label="Title *"
                                    type="text"
                                    placeholder="e.g., Client Meeting"
                                    required
                                    autoFocus
                                />

                                <div className="grid grid-cols-3 gap-3">
                                    <FormField
                                        name="date"
                                        label="Date *"
                                        type="date"
                                        required
                                    />

                                    <FormField
                                        name="time"
                                        label="Time"
                                        type="time"
                                    />

                                    <FormField
                                        name="duration"
                                        label="Duration (min)"
                                        type="number"
                                        placeholder="60"
                                    />
                                </div>

                                <FormField
                                    name="description"
                                    label="Description"
                                    type="textarea"
                                    placeholder="Additional details..."
                                    rows={3}
                                />

                                {/* Actions */}
                                <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200">
                                    <Button type="submit" variant="success" className="flex-1">
                                        ✓ Create
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                );

            case 'expense':
                return (
                    <Form
                        schema={expenseFormSchema}
                        defaultValues={{
                            amount: 0,
                            category: 'Other',
                            date: new Date().toISOString().split('T')[0],
                            description: '',
                        }}
                        onSubmit={handleExpenseSubmit}
                    >
                        {() => (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        name="amount"
                                        label="Amount ($) *"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        required
                                        autoFocus
                                    />

                                    <SelectField
                                        name="category"
                                        label="Category"
                                        options={[
                                            { value: 'Software', label: 'Software' },
                                            { value: 'Marketing', label: 'Marketing' },
                                            { value: 'Travel', label: 'Travel' },
                                            { value: 'Equipment', label: 'Equipment' },
                                            { value: 'Office', label: 'Office' },
                                            { value: 'Other', label: 'Other' },
                                        ]}
                                    />
                                </div>

                                <FormField
                                    name="date"
                                    label="Date"
                                    type="date"
                                />

                                <FormField
                                    name="description"
                                    label="Description *"
                                    type="textarea"
                                    placeholder="e.g., Figma subscription, Lunch meeting with client"
                                    required
                                    rows={3}
                                />

                                {/* Actions */}
                                <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200">
                                    <Button type="submit" variant="success" className="flex-1">
                                        ✓ Create
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                );

            case 'document':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Select File *
                            </label>
                            <input
                                type="file"
                                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                accept="*/*"
                            />
                            {documentFile && (
                                <p className="mt-2 text-sm text-gray-600">
                                    Selected: {documentFile.name} ({(documentFile.size / 1024).toFixed(2)} KB)
                                </p>
                            )}
                        </div>

                        <div className="bg-blue-50 border-2 border-blue-300 p-3">
                            <p className="text-xs text-gray-700">
                                <strong>Note:</strong> Files will be uploaded to the {currentTab || 'current'} module.
                                Supported formats: PDF, Word, Excel, Images, etc.
                            </p>
                        </div>
                    </div>
                );

            default:
                return <p>Unknown form type</p>;
        }
    };

    const getFormTitle = () => {
        switch (formType) {
            case 'task': return '➕ New Task';
            case 'crm': return '🏢 New Account';
            case 'contact': return '👤 New Contact';
            case 'event': return '📅 New Event';
            case 'expense': return '💰 Log Expense';
            case 'document': return '📄 Upload Document';
            default: return 'New Item';
        }
    };

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center p-4" 
            style={{ zIndex: 100000, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div 
                className="bg-white border-4 border-black shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                style={{ zIndex: 100001 }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 border-b-4 border-black">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white font-mono">
                            {getFormTitle()}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 text-2xl font-bold"
                            disabled={isSubmitting}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-sm">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {renderForm()}

                    {/* Actions for document upload (non-Form component) */}
                    {formType === 'document' && (
                        <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200">
                            <button
                                type="button"
                                onClick={handleDocumentUpload}
                                disabled={isSubmitting}
                                className="flex-1 font-mono font-semibold bg-green-500 text-white py-3 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? '⏳ Uploading...' : '✓ Upload'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 font-mono font-semibold bg-white text-black py-3 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-gray-100 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
