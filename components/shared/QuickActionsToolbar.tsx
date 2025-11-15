import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AppActions, TabType } from '../../types';

interface QuickActionsToolbarProps {
    actions: AppActions;
    currentTab: TabType;
    workspaceId?: string;
    onActionComplete?: (message: string) => void;
    onOpenForm?: (formType: 'task' | 'crm' | 'contact' | 'event' | 'expense' | 'document', data?: any) => void;
}

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    action: () => void;
    category: 'task' | 'crm' | 'event' | 'financial' | 'search' | 'document';
}

export const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({
    actions,
    currentTab,
    workspaceId,
    onActionComplete,
    onOpenForm
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isExpanded]);

    // Task quick actions
    const handleAddTask = async (category: 'productsServicesTasks' | 'investorTasks' | 'customerTasks' | 'partnerTasks' | 'marketingTasks' | 'financialTasks') => {
        if (onOpenForm) {
            onOpenForm('task', { category });
            setIsExpanded(false);
        } else {
            const text = window.prompt(`New task:`, '');
            if (!text?.trim()) return;

            const result = await actions.createTask(category, text.trim(), 'Medium');
            onActionComplete?.(result.message);
        }
    };

    // CRM quick actions
    const handleAddCrmItem = async (collection: 'investors' | 'customers' | 'partners') => {
        if (onOpenForm) {
            onOpenForm('crm', { collection });
            setIsExpanded(false);
        } else {
            const company = window.prompt(`New ${collection.slice(0, -1)} company:`, '');
            if (!company?.trim()) return;

            const result = await actions.createCrmItem(collection, { company: company.trim() });
            onActionComplete?.(result.message);
        }
    };

    // Contact quick actions
    const handleAddContact = async () => {
        if (onOpenForm) {
            onOpenForm('contact');
            setIsExpanded(false);
            return;
        }
        const name = window.prompt('Contact name:', '');
        if (!name?.trim()) return;

        const email = window.prompt('Contact email:', '');
        if (!email?.trim()) return;

        const typeInput = window.prompt('Contact type (investors/customers/partners):', 'customers');
        const collection = ['investors', 'customers', 'partners'].includes(typeInput || '') ? typeInput as 'investors' | 'customers' | 'partners' : 'customers';

        // Need to get CRM item ID - for now, show message
        alert('Please select a company first, then add contacts from their detail page');
    };

    // Meeting quick action
    const handleAddMeeting = async () => {
        if (onOpenForm) {
            onOpenForm('event', { type: 'meeting' });
            setIsExpanded(false);
            return;
        }
        
        const title = window.prompt('Meeting title:', '');
        if (!title?.trim()) return;

        const dateStr = window.prompt('Meeting date (YYYY-MM-DD):', '');
        if (!dateStr?.trim()) return;

        const timeStr = window.prompt('Meeting time (HH:MM):', '10:00');
        
        // Need company and contact ID - for now, create as task
        const result = await actions.createTask('productsServicesTasks', `Meeting: ${title.trim()}`, 'Medium', undefined, undefined, dateStr.trim(), undefined, timeStr || '10:00');
        onActionComplete?.(result.message);
    };

    // Follow-up quick action
    const handleAddFollowUp = async () => {
        if (onOpenForm) {
            onOpenForm('task', { category: 'productsServicesTasks', priority: 'High' });
            setIsExpanded(false);
            return;
        }
        
        const text = window.prompt('Follow-up task:', '');
        if (!text?.trim()) return;

        const dateStr = window.prompt('Follow-up date (YYYY-MM-DD):', '');
        if (!dateStr?.trim()) return;

        const result = await actions.createTask('productsServicesTasks', text.trim(), 'High', undefined, undefined, dateStr.trim());
        onActionComplete?.(result.message);
    };

    // Expense quick action
    const handleLogExpense = async () => {
        if (onOpenForm) {
            onOpenForm('expense');
            setIsExpanded(false);
            return;
        }
        
        const description = window.prompt('Expense description:', '');
        if (!description?.trim()) return;

        const amountStr = window.prompt('Amount ($):', '');
        if (!amountStr?.trim()) return;

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert('Invalid amount');
            return;
        }

        const result = await actions.createExpense({
            amount: amount,
            category: 'Other',
            description: description.trim(),
            date: new Date().toISOString().split('T')[0]
        });
        onActionComplete?.(result.message);
    };

    // Document upload quick action
    const handleUploadDocument = () => {
        if (onOpenForm) {
            onOpenForm('document');
            setIsExpanded(false);
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        input.onchange = async (e: any) => {
            const file = e.target?.files?.[0];
            if (!file) return;

            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target?.result as string;
                    
                    const result = await actions.uploadDocument(
                        file.name,
                        file.type || 'application/octet-stream',
                        base64,
                        currentTab
                    );
                    onActionComplete?.(result.message);
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error uploading document:', error);
                alert('Failed to upload document');
            }
        };
        input.click();
    };

    const quickActions: QuickAction[] = [
        // Task actions by tab type
        { id: 'task-platform', label: 'Products & Services Task', icon: '📦', action: () => handleAddTask('productsServicesTasks'), category: 'task' },
        { id: 'task-investor', label: 'Investor Task', icon: '💰', action: () => handleAddTask('investorTasks'), category: 'task' },
        { id: 'task-customer', label: 'Customer Task', icon: '🎯', action: () => handleAddTask('customerTasks'), category: 'task' },
        { id: 'task-partner', label: 'Partner Task', icon: '🤝', action: () => handleAddTask('partnerTasks'), category: 'task' },
        { id: 'task-marketing', label: 'Marketing Task', icon: '📢', action: () => handleAddTask('marketingTasks'), category: 'task' },
        { id: 'task-financial', label: 'Financial Task', icon: '💵', action: () => handleAddTask('financialTasks'), category: 'task' },
        
        // CRM actions
        { id: 'crm-investor', label: 'New Investor', icon: '💼', action: () => handleAddCrmItem('investors'), category: 'crm' },
        { id: 'crm-customer', label: 'New Customer', icon: '👤', action: () => handleAddCrmItem('customers'), category: 'crm' },
        { id: 'crm-partner', label: 'New Partner', icon: '🤝', action: () => handleAddCrmItem('partners'), category: 'crm' },
        { id: 'contact', label: 'New Contact', icon: '📇', action: handleAddContact, category: 'crm' },
        
        // Event actions
        { id: 'meeting', label: 'Schedule Meeting', icon: '📅', action: handleAddMeeting, category: 'event' },
        { id: 'followup', label: 'Add Follow-up', icon: '🔔', action: handleAddFollowUp, category: 'event' },
        
        // Financial actions
        { id: 'expense', label: 'Log Expense', icon: '💸', action: handleLogExpense, category: 'financial' },
        
        // Document actions
        { id: 'upload', label: 'Upload Doc', icon: '📤', action: handleUploadDocument, category: 'document' },
        
        // Note: Search is now integrated into the main menu
    ];

    // Filter actions based on current tab for smart suggestions
    const suggestedActions = quickActions.filter(action => {
        if (currentTab === 'investor-crm') return ['task-investor', 'crm-investor', 'contact', 'meeting', 'followup'].includes(action.id);
        if (currentTab === 'customer-crm') return ['task-customer', 'crm-customer', 'contact', 'meeting', 'followup'].includes(action.id);
        if (currentTab === 'partnerships') return ['task-partner', 'crm-partner', 'contact', 'meeting', 'followup'].includes(action.id);
        if (currentTab === 'marketing') return ['task-marketing', 'meeting', 'upload'].includes(action.id);
        if (currentTab === 'financials') return ['task-financial', 'expense', 'upload'].includes(action.id);
        if (currentTab === 'calendar') return ['meeting', 'followup', 'task-platform'].includes(action.id);
        return false;
    });

    const otherActions = quickActions.filter(a => !suggestedActions.some(s => s.id === a.id));

    return (
        <>
            {/* Compact Button - fits inline with other buttons */}
            <button
                ref={buttonRef}
                onClick={() => setIsExpanded(!isExpanded)}
                className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-yellow-100 flex items-center gap-2 shrink-0"
                title="Quick Actions"
                aria-label="Quick Actions Menu"
            >
                <span>☰</span>
                <span className="hidden sm:inline">Actions</span>
                <span className="text-xs text-gray-600">({suggestedActions.length})</span>
            </button>

            {/* Combined Menu - Actions & Search Modal */}
            {isExpanded && ReactDOM.createPortal(
                <div 
                    className="fixed inset-0 flex items-center justify-center p-4" 
                    style={{ zIndex: 100000, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsExpanded(false);
                        }
                    }}
                >
                    <div 
                        ref={dropdownRef}
                        className="bg-white border-4 border-black shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto relative"
                        style={{ zIndex: 100001 }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 border-b-4 border-black flex items-center justify-between sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-white font-mono">Quick Actions</h2>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4">
                        {/* Quick Actions */}
                        {suggestedActions.length > 0 && (
                            <div className="mb-4">
                                <div className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">⭐ Suggested for {currentTab}</div>
                                <div className="space-y-2">
                                    {suggestedActions.map((action) => (
                                        <button
                                            key={action.id}
                                            onClick={() => {
                                                action.action();
                                                setIsExpanded(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-yellow-50 border-2 border-black text-sm flex items-center gap-3 shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                                        >
                                            <span className="text-xl">{action.icon}</span>
                                            <span className="font-semibold">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Other Actions */}
                        {otherActions.length > 0 && (
                            <div>
                                <div className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide border-t-2 border-gray-300 pt-4">📋 All Actions</div>
                                <div className="space-y-2">
                                    {otherActions.map((action) => (
                                        <button
                                            key={action.id}
                                            onClick={() => {
                                                action.action();
                                                setIsExpanded(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-100 border-2 border-black text-sm flex items-center gap-3 shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                                        >
                                            <span className="text-xl">{action.icon}</span>
                                            <span className="font-semibold">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
