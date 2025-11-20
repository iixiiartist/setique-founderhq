/**
 * Task Creation Modal
 * Context-aware task creation with auto-linking
 */

import React, { useState } from 'react';
import { AppActions, WorkspaceMember, TaskCollectionName, Priority, AnyCrmItem, Contact, Subtask, ProductService, MarketingItem, Deal } from '../../types';
import Modal from '../shared/Modal';
import { SubtaskManager } from '../shared/SubtaskManager';

interface TaskCreationModalProps {
    onClose: () => void;
    actions: AppActions;
    workspaceMembers: WorkspaceMember[];
    crmItems: AnyCrmItem[];
    contacts?: Contact[];
    products?: ProductService[];
    campaigns?: MarketingItem[];
    deals?: Deal[];
}

export function TaskCreationModal({
    onClose,
    actions,
    workspaceMembers,
    crmItems,
    contacts = [],
    products = [],
    campaigns = [],
    deals = []
}: TaskCreationModalProps) {
    const [text, setText] = useState('');
    const [category, setCategory] = useState<TaskCollectionName>('productsServicesTasks');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [crmItemId, setCrmItemId] = useState('');
    const [contactId, setContactId] = useState('');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [dealId, setDealId] = useState('');
    const [campaignId, setCampaignId] = useState('');
    const [productId, setProductId] = useState('');
    
    // Filter CRM items by type based on selected category
    const filteredCrmItems = crmItems.filter(item => {
        if (category === 'investorTasks') return item.type === 'investor';
        if (category === 'customerTasks') return item.type === 'customer';
        if (category === 'partnerTasks') return item.type === 'partner';
        return true;
    });
    
    // Get contacts for selected CRM item
    const availableContacts = crmItemId 
        ? crmItems.find(item => item.id === crmItemId)?.contacts || []
        : contacts;

    const handleSubmit = async () => {
        if (!text.trim()) return;

        await actions.createTask(
            category,
            text.trim(),
            priority,
            crmItemId || undefined,
            contactId || undefined,
            dueDate || undefined,
            assignedTo || undefined,
            dueTime || undefined,
            subtasks.length > 0 ? subtasks : undefined
        );

        onClose();
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Create New Task"
        >
            <div className="space-y-4 p-4" data-testid="task-creation-modal">
                <div>
                    <label className="block font-mono text-sm font-bold mb-1">Task Description *</label>
                    <textarea
                        data-testid="task-description-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="What needs to be done?"
                        className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block font-mono text-sm font-bold mb-1">Module *</label>
                    <select
                        data-testid="task-module-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as TaskCollectionName)}
                        className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="productsServicesTasks">📦 Products & Services</option>
                        <option value="investorTasks">💰 Investors</option>
                        <option value="customerTasks">🎯 Customers</option>
                        <option value="partnerTasks">🤝 Partners</option>
                        <option value="marketingTasks">📢 Marketing</option>
                        <option value="financialTasks">💵 Financials</option>
                    </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block font-mono text-sm font-bold mb-1">Priority</label>
                        <select
                            data-testid="task-priority-select"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as Priority)}
                            className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="High">🔴 High</option>
                            <option value="Medium">🟡 Medium</option>
                            <option value="Low">🟢 Low</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-mono text-sm font-bold mb-1">Due Date</label>
                        <input
                            data-testid="task-due-date-input"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block font-mono text-sm font-bold mb-1">Due Time</label>
                        <input
                            data-testid="task-due-time-input"
                            type="time"
                            value={dueTime}
                            onChange={(e) => setDueTime(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block font-mono text-sm font-bold mb-1">Assign To</label>
                    <select
                        data-testid="task-assignee-select"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Unassigned</option>
                        {workspaceMembers.map(member => (
                            <option key={member.userId} value={member.userId}>
                                {member.fullName} {member.role && `(${member.role})`}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block font-mono text-sm font-bold mb-1">Link to Account (Optional)</label>
                    <select
                        data-testid="task-crm-select"
                        value={crmItemId}
                        onChange={(e) => {
                            setCrmItemId(e.target.value);
                            setContactId(''); // Reset contact when account changes
                        }}
                        className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">No linked account</option>
                        {filteredCrmItems.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.company} ({item.type})
                            </option>
                        ))}
                    </select>
                </div>

                {availableContacts.length > 0 && (
                    <div>
                        <label className="block font-mono text-sm font-bold mb-1">Link to Contact (Optional)</label>
                        <select
                            data-testid="task-contact-select"
                            value={contactId}
                            onChange={(e) => setContactId(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">No linked contact</option>
                            {availableContacts.map(contact => (
                                <option key={contact.id} value={contact.id}>
                                    {contact.name} {contact.email && `(${contact.email})`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Deal linking for financial tasks */}
                {category === 'financialTasks' && deals.length > 0 && (
                    <div>
                        <label className="block font-mono text-sm font-bold mb-1">Link to Deal (Optional)</label>
                        <select
                            data-testid="task-deal-select"
                            value={dealId}
                            onChange={(e) => setDealId(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">No linked deal</option>
                            {deals.map(deal => (
                                <option key={deal.id} value={deal.id}>
                                    {deal.title} - ${typeof deal.value === 'number' ? deal.value.toLocaleString() : '0'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Campaign linking for marketing tasks */}
                {category === 'marketingTasks' && campaigns.length > 0 && (
                    <div>
                        <label className="block font-mono text-sm font-bold mb-1">Link to Campaign (Optional)</label>
                        <select
                            data-testid="task-campaign-select"
                            value={campaignId}
                            onChange={(e) => setCampaignId(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">No linked campaign</option>
                            {campaigns.map(campaign => (
                                <option key={campaign.id} value={campaign.id}>
                                    {campaign.title} ({campaign.status})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Product linking for product/service tasks */}
                {category === 'productsServicesTasks' && products.length > 0 && (
                    <div>
                        <label className="block font-mono text-sm font-bold mb-1">Link to Product/Service (Optional)</label>
                        <select
                            data-testid="task-product-select"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">No linked product</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name} ({product.type})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Subtasks Section */}
                <div className="border-t-2 border-black pt-4 mt-2">
                    <label className="block font-mono text-sm font-bold mb-2">📋 Subtasks (Optional)</label>
                    <SubtaskManager 
                        subtasks={subtasks}
                        onSubtasksChange={setSubtasks}
                    />
                </div>

                <div className="flex gap-3 pt-4 border-t-2 border-black mt-2">
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim()}
                        data-testid="task-create-button"
                        className="flex-1 px-4 py-2 bg-black text-white border-2 border-black rounded-none font-mono font-semibold shadow-neo-btn hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Task
                    </button>
                    <button
                        onClick={onClose}
                        data-testid="task-cancel-button"
                        className="flex-1 px-4 py-2 bg-white text-black border-2 border-black rounded-none font-mono font-semibold shadow-neo-btn hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
