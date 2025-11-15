import React, { useState, useEffect } from 'react';
import { AppActions, CrmCollectionName, TaskCollectionName, AnyCrmItem, Contact, Subtask } from '../../types';
import { SubtaskManager } from './SubtaskManager';

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

    // Task form state
    const [taskText, setTaskText] = useState('');
    const [taskCategory, setTaskCategory] = useState<TaskCollectionName>(formData.category || 'productsServicesTasks');
    const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>(formData.priority || 'Medium');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskDueTime, setTaskDueTime] = useState('');
    const [taskSubtasks, setTaskSubtasks] = useState<Subtask[]>([]);

    // CRM form state
    const [crmCompany, setCrmCompany] = useState('');
    const [crmCollection, setCrmCollection] = useState<CrmCollectionName>(formData.collection || 'customers');
    const [crmNextAction, setCrmNextAction] = useState('');
    const [crmNextActionDate, setCrmNextActionDate] = useState('');
    const [crmNextActionTime, setCrmNextActionTime] = useState('');

    // Contact form state
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactTitle, setContactTitle] = useState('');
    const [contactLinkedCrmId, setContactLinkedCrmId] = useState('');
    const [contactNewAccountName, setContactNewAccountName] = useState('');
    const [contactCrmType, setContactCrmType] = useState<CrmCollectionName>('customers');

    // Event form state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('10:00');
    const [eventDuration, setEventDuration] = useState('60');
    const [eventDescription, setEventDescription] = useState('');
    const [eventType, setEventType] = useState<'meeting' | 'call' | 'event'>(formData.type || 'meeting');

    // Expense form state
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('Other');
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

    // Document form state
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            let result: { success: boolean; message: string };

            switch (formType) {
                case 'task':
                    if (!taskText.trim()) {
                        setError('Task description is required');
                        setIsSubmitting(false);
                        return;
                    }
                    result = await actions.createTask(
                        taskCategory,
                        taskText.trim(),
                        taskPriority,
                        undefined,
                        undefined,
                        taskDueDate || undefined,
                        undefined,
                        taskDueTime || undefined,
                        taskSubtasks
                    );
                    break;

                case 'crm':
                    if (!crmCompany.trim()) {
                        setError('Company name is required');
                        setIsSubmitting(false);
                        return;
                    }
                    result = await actions.createCrmItem(crmCollection, {
                        company: crmCompany.trim(),
                        nextAction: crmNextAction.trim() || undefined,
                        nextActionDate: crmNextActionDate || undefined,
                        nextActionTime: crmNextActionTime || undefined
                    });
                    break;

                case 'contact':
                    if (!contactName.trim() || !contactEmail.trim()) {
                        setError('Name and email are required');
                        setIsSubmitting(false);
                        return;
                    }

                    let crmItemId = contactLinkedCrmId;

                    // Create new CRM account if specified
                    if (!crmItemId && contactNewAccountName.trim()) {
                        const crmResult = await actions.createCrmItem(contactCrmType, {
                            company: contactNewAccountName.trim()
                        });
                        
                        if (crmResult.success && crmResult.itemId) {
                            crmItemId = crmResult.itemId;
                        }
                    }

                    if (!crmItemId) {
                        setError('Please select or create a CRM account for this contact');
                        setIsSubmitting(false);
                        return;
                    }

                    result = await actions.createContact(
                        contactCrmType,
                        crmItemId,
                        {
                            name: contactName.trim(),
                            email: contactEmail.trim(),
                            phone: contactPhone.trim(),
                            title: contactTitle.trim(),
                            linkedin: ''
                        }
                    );
                    break;

                case 'event':
                    if (!eventTitle.trim() || !eventDate) {
                        setError('Event title and date are required');
                        setIsSubmitting(false);
                        return;
                    }
                    // Create as a task for now (calendar events need more integration)
                    result = await actions.createTask(
                        'productsServicesTasks',
                        `${eventType === 'meeting' ? '🤝' : eventType === 'call' ? '📞' : '📅'} ${eventTitle.trim()}`,
                        'High',
                        undefined,
                        undefined,
                        eventDate,
                        undefined,
                        eventTime
                    );
                    break;

                case 'expense':
                    const amount = parseFloat(expenseAmount);
                    if (!expenseAmount.trim() || isNaN(amount) || amount <= 0) {
                        setError('Valid amount is required');
                        setIsSubmitting(false);
                        return;
                    }
                    if (!expenseDescription.trim()) {
                        setError('Description is required');
                        setIsSubmitting(false);
                        return;
                    }
                    result = await actions.createExpense({
                        amount: amount,
                        category: expenseCategory as any,
                        description: expenseDescription.trim(),
                        date: expenseDate
                    });
                    break;

                case 'document':
                    if (!documentFile) {
                        setError('Please select a file to upload');
                        setIsSubmitting(false);
                        return;
                    }

                    const reader = new FileReader();
                    const fileReadPromise = new Promise<string>((resolve, reject) => {
                        reader.onload = (event) => resolve(event.target?.result as string);
                        reader.onerror = reject;
                    });
                    
                    reader.readAsDataURL(documentFile);
                    const base64 = await fileReadPromise;

                    result = await actions.uploadDocument(
                        documentFile.name,
                        documentFile.type || 'application/octet-stream',
                        base64,
                        currentTab as any
                    );
                    break;

                default:
                    setError('Unknown form type');
                    setIsSubmitting(false);
                    return;
            }

            if (result.success) {
                onSuccess?.(result.message);
                onClose();
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Form submission error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderForm = () => {
        switch (formType) {
            case 'task':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Task Description *
                            </label>
                            <textarea
                                value={taskText}
                                onChange={(e) => setTaskText(e.target.value)}
                                placeholder="e.g., Follow up with client about proposal"
                                required
                                rows={3}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Category
                                </label>
                                <select
                                    value={taskCategory}
                                    onChange={(e) => setTaskCategory(e.target.value as TaskCollectionName)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
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
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Priority
                                </label>
                                <select
                                    value={taskPriority}
                                    onChange={(e) => setTaskPriority(e.target.value as any)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={taskDueDate}
                                    onChange={(e) => setTaskDueDate(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Due Time
                                </label>
                                <input
                                    type="time"
                                    value={taskDueTime}
                                    onChange={(e) => setTaskDueTime(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
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
                    </div>
                );

            case 'crm':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Type
                            </label>
                            <select
                                value={crmCollection}
                                onChange={(e) => setCrmCollection(e.target.value as CrmCollectionName)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            >
                                <option value="investors">Investor</option>
                                <option value="customers">Customer</option>
                                <option value="partners">Partner</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Company Name *
                            </label>
                            <input
                                type="text"
                                value={crmCompany}
                                onChange={(e) => setCrmCompany(e.target.value)}
                                placeholder="e.g., Acme Corp"
                                required
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Next Action
                            </label>
                            <input
                                type="text"
                                value={crmNextAction}
                                onChange={(e) => setCrmNextAction(e.target.value)}
                                placeholder="e.g., Send follow-up email"
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Next Action Date
                                </label>
                                <input
                                    type="date"
                                    value={crmNextActionDate}
                                    onChange={(e) => setCrmNextActionDate(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Time
                                </label>
                                <input
                                    type="time"
                                    value={crmNextActionTime}
                                    onChange={(e) => setCrmNextActionTime(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'contact':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Account Type
                            </label>
                            <select
                                value={contactCrmType}
                                onChange={(e) => setContactCrmType(e.target.value as CrmCollectionName)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            >
                                <option value="investors">Investor</option>
                                <option value="customers">Customer</option>
                                <option value="partners">Partner</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Contact Name *
                                </label>
                                <input
                                    type="text"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    placeholder="e.g., John Smith"
                                    required
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Job Title
                                </label>
                                <input
                                    type="text"
                                    value={contactTitle}
                                    onChange={(e) => setContactTitle(e.target.value)}
                                    placeholder="e.g., CEO"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    required
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder="(555) 123-4567"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="border-t-2 border-gray-300 pt-4">
                            <label className="block font-mono text-sm font-semibold text-black mb-2">
                                Link to Account
                            </label>
                            <select
                                value={contactLinkedCrmId}
                                onChange={(e) => setContactLinkedCrmId(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 mb-2"
                            >
                                <option value="">-- Select existing or create new --</option>
                                {crmItems
                                    .filter(item => {
                                        // Filter by CRM type
                                        if (contactCrmType === 'investors') return 'checkSize' in item;
                                        if (contactCrmType === 'customers') return 'dealValue' in item;
                                        if (contactCrmType === 'partners') return 'opportunity' in item;
                                        return false;
                                    })
                                    .map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.company}
                                        </option>
                                    ))}
                            </select>

                            {!contactLinkedCrmId && (
                                <div>
                                    <label className="block font-mono text-xs text-gray-600 mb-1">
                                        Or create new account:
                                    </label>
                                    <input
                                        type="text"
                                        value={contactNewAccountName}
                                        onChange={(e) => setContactNewAccountName(e.target.value)}
                                        placeholder="New Company Name"
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'event':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Event Type
                            </label>
                            <select
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value as any)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            >
                                <option value="meeting">Meeting</option>
                                <option value="call">Phone Call</option>
                                <option value="event">Event</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={eventTitle}
                                onChange={(e) => setEventTitle(e.target.value)}
                                placeholder="e.g., Client Meeting"
                                required
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    required
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Time
                                </label>
                                <input
                                    type="time"
                                    value={eventTime}
                                    onChange={(e) => setEventTime(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Duration (min)
                                </label>
                                <input
                                    type="number"
                                    value={eventDuration}
                                    onChange={(e) => setEventDuration(e.target.value)}
                                    placeholder="60"
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Description
                            </label>
                            <textarea
                                value={eventDescription}
                                onChange={(e) => setEventDescription(e.target.value)}
                                placeholder="Additional details..."
                                rows={3}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                );

            case 'expense':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Amount ($) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block font-mono text-sm font-semibold text-black mb-1">
                                    Category
                                </label>
                                <select
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="Software">Software</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Travel">Travel</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Office">Office</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">
                                Description *
                            </label>
                            <textarea
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                                placeholder="e.g., Figma subscription, Lunch meeting with client"
                                required
                                rows={3}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
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
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-sm">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {renderForm()}

                    {/* Actions */}
                    <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 font-mono font-semibold bg-green-500 text-white py-3 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '⏳ Creating...' : '✓ Create'}
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
                </form>
            </div>
        </div>
    );
};
