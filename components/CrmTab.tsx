import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnyCrmItem, Task, AppActions, CrmCollectionName, TaskCollectionName, Contact, Document, BusinessProfile, WorkspaceMember, Deal, ProductService, Meeting } from '../types';
import AccountDetailView from './shared/AccountDetailView';
import ContactDetailView from './shared/ContactDetailView';
import { ContactManager } from './shared/ContactManager';
import { AccountManager } from './shared/AccountManager';
import { FollowUpsManager } from './shared/FollowUpsManager';
import { DealsModule } from './crm';
import { logger } from '../lib/logger';

interface CrmTabProps {
    title: string;
    crmItems: AnyCrmItem[];
    tasks: Task[];
    actions: AppActions;
    documents: Document[];
    businessProfile?: BusinessProfile | null;
    workspaceId?: string;
    onUpgradeNeeded?: () => void;
    workspaceMembers?: WorkspaceMember[];
    userId?: string;
    deals?: Deal[];
    productsServices?: ProductService[];
}

function CrmTabComponent({
    title, 
    crmItems = [], 
    tasks = [], 
    actions, 
    documents = [], 
    businessProfile,
    workspaceId,
    onUpgradeNeeded,
    workspaceMembers = [],
    userId,
    deals = [],
    productsServices = []
}: CrmTabProps) {
    const [selectedItem, setSelectedItem] = useState<AnyCrmItem | null>(null);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [activeView, setActiveView] = useState<'accounts' | 'contacts' | 'followups' | 'deals'>('accounts');
    const [showDeletedToast, setShowDeletedToast] = useState(false);
    const [showQuickAccess, setShowQuickAccess] = useState(false);
    const isUpdatingRef = useRef(false);

    interface ContactWithParent {
        contact: Contact;
        parentItem: AnyCrmItem;
    }

    interface MeetingWithContext extends Meeting {
        contactName: string;
        companyName: string;
        parentItem: AnyCrmItem;
        parentContact: Contact;
    }

    const { crmCollection, taskCollection, tag } = useMemo(() => {
        const lowerTitle = title.toLowerCase();
        return {
            crmCollection: (lowerTitle + 's') as CrmCollectionName,
            taskCollection: (lowerTitle + 'Tasks') as TaskCollectionName,
            tag: title,
        };
    }, [title]);

    // O(1) lookup maps for deleted entity detection
    const crmItemsById = useMemo(() => {
        const map = new Map<string, AnyCrmItem>();
        crmItems.forEach(item => map.set(item.id, item));
        return map;
    }, [crmItems]);

    const contactsById = useMemo(() => {
        const map = new Map<string, { contact: Contact; parentItem: AnyCrmItem }>();
        crmItems.forEach(item => {
            (item.contacts || []).forEach(contact => {
                map.set(contact.id, { contact, parentItem: item });
            });
        });
        return map;
    }, [crmItems]);

    useEffect(() => {
        if (selectedItem && !isUpdatingRef.current) {
            const updatedItem = crmItemsById.get(selectedItem.id);
            if (updatedItem) {
                // Sync to latest version
                setSelectedItem(updatedItem);
                if (selectedContact) {
                    const contactData = contactsById.get(selectedContact.id);
                    if (contactData && contactData.parentItem.id === updatedItem.id) {
                        setSelectedContact(contactData.contact);
                    } else {
                        // Contact was deleted or moved
                        setSelectedContact(null);
                        setShowDeletedToast(true);
                        setTimeout(() => setShowDeletedToast(false), 3000);
                    }
                }
            } else {
                // Item was deleted
                setSelectedItem(null);
                setSelectedContact(null);
                setShowDeletedToast(true);
                setTimeout(() => setShowDeletedToast(false), 3000);
            }
        }
        // Reset updating flag after sync
        if (isUpdatingRef.current) {
            isUpdatingRef.current = false;
        }
    }, [crmItems, selectedItem, selectedContact, crmItemsById, contactsById]);

    const handleAssignCompany = useCallback(async (companyId: string, assignedUserId: string | null, assignedUserName: string | null) => {
        if (!workspaceId || !userId) {
            logger.warn('[CrmTab] Cannot assign: missing workspaceId or userId', { workspaceId, userId });
            return;
        }
        
        const previousItem = crmItemsById.get(companyId);
        if (!previousItem) {
            logger.warn('[CrmTab] Company not found for assignment', { companyId });
            return;
        }

        const rollback = {
            assignedTo: previousItem.assignedTo,
            assignedToName: previousItem.assignedToName
        };
        
        isUpdatingRef.current = true;
        
        try {
            await actions.updateCrmItem(crmCollection, companyId, { 
                assignedTo: assignedUserId, 
                assignedToName: assignedUserName 
            });
            logger.info('[CrmTab] Company assignment updated', { companyId, assignedUserId });
        } catch (error) {
            logger.error('[CrmTab] Failed to assign company', error);
            // Rollback optimistic update would happen here if we had optimistic state
            throw error;
        } finally {
            isUpdatingRef.current = false;
        }
    }, [workspaceId, userId, crmCollection, crmItemsById, actions]);

    const handleAssignContact = useCallback(async (contactId: string, assignedUserId: string | null, assignedUserName: string | null) => {
        if (!workspaceId || !userId) {
            logger.warn('[CrmTab] Cannot assign contact: missing workspaceId or userId', { workspaceId, userId });
            return;
        }

        const contactData = contactsById.get(contactId);
        if (!contactData) {
            logger.warn('[CrmTab] Contact not found for assignment', { contactId });
            return;
        }

        const { parentItem } = contactData;
        isUpdatingRef.current = true;

        try {
            await actions.updateContact(crmCollection, parentItem.id, contactId, {
                assignedTo: assignedUserId,
                assignedToName: assignedUserName || null
            } as any);
            logger.info('[CrmTab] Contact assignment updated', { contactId, assignedUserId });
        } catch (error) {
            logger.error('[CrmTab] Failed to assign contact', error);
            throw error;
        } finally {
            isUpdatingRef.current = false;
        }
    }, [workspaceId, userId, crmCollection, contactsById, actions]);



    // Wrap all mutation methods for consistent instrumentation
    const wrappedActions = useMemo(() => ({
        ...actions,
        updateCrmItem: (collection: CrmCollectionName, itemId: string, updates: Partial<AnyCrmItem>) => {
            isUpdatingRef.current = true;
            return actions.updateCrmItem(collection, itemId, updates).finally(() => {
                isUpdatingRef.current = false;
            });
        },
        deleteItem: (collection: CrmCollectionName, itemId: string) => {
            isUpdatingRef.current = true;
            return actions.deleteItem(collection, itemId).finally(() => {
                isUpdatingRef.current = false;
            });
        },
        createCrmItem: async (collection: CrmCollectionName, item: Partial<AnyCrmItem>) => {
            // Don't use isUpdatingRef for creates - we want the UI to update immediately
            return actions.createCrmItem(collection, item);
        },
        updateContact: (collection: CrmCollectionName, itemId: string, contactId: string, updates: Partial<Contact>) => {
            isUpdatingRef.current = true;
            return actions.updateContact(collection, itemId, contactId, updates).finally(() => {
                isUpdatingRef.current = false;
            });
        }
    }), [actions]);

    const generalTasks = useMemo(() => tasks.filter(t => !t.crmItemId), [tasks]);

    const assignedAccounts = useMemo(() => {
        if (!userId) return [];
        const statusPriority: Record<string, number> = {
            'overdue': 0,
            'hot': 1,
            'warm': 2,
            'active': 3,
            'cold': 4,
            'inactive': 5
        };
        return crmItems
            .filter(item => item.assignedTo === userId)
            .sort((a, b) => {
                const aPriority = statusPriority[a.status?.toLowerCase() || ''] ?? 99;
                const bPriority = statusPriority[b.status?.toLowerCase() || ''] ?? 99;
                return aPriority - bPriority;
            });
    }, [crmItems, userId]);

    const assignedContacts = useMemo<ContactWithParent[]>(() => {
        if (!userId) return [];
        return crmItems
            .flatMap(item =>
                (item.contacts || [])
                    .filter(contact => contact.assignedTo === userId)
                    .map(contact => ({ contact, parentItem: item }))
            )
            .sort((a, b) => {
                // Sort by number of meetings (more active contacts first), then alphabetically
                const aMeetings = a.contact.meetings?.length || 0;
                const bMeetings = b.contact.meetings?.length || 0;
                if (aMeetings !== bMeetings) return bMeetings - aMeetings;
                return a.contact.name.localeCompare(b.contact.name);
            });
    }, [crmItems, userId]);

    const recentMeetings = useMemo<MeetingWithContext[]>(() => {
        if (!userId) return [];
        return crmItems
            .flatMap(item =>
                (item.contacts || []).flatMap(contact =>
                    (contact.meetings || []).map(meeting => ({
                        ...meeting,
                        contactName: contact.name,
                        companyName: item.company,
                        parentItem: item,
                        parentContact: contact
                    }))
                )
            )
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);
    }, [crmItems, userId]);

    // Memoize workspaceMembers mapping to prevent child re-renders
    const mappedWorkspaceMembers = useMemo(() => 
        workspaceMembers.map(m => ({
            id: m.userId,
            name: m.fullName || m.email || 'Unknown'
        })), 
    [workspaceMembers]);
    
    if (selectedContact && selectedItem) {
        return (
            <ContactDetailView
                contact={selectedContact}
                parentItem={selectedItem}
                tasks={tasks}
                actions={actions}
                onBack={() => setSelectedContact(null)}
                crmCollection={crmCollection}
                taskCollection={taskCollection}
                workspaceMembers={workspaceMembers}
                onAssignContact={(userId, userName, contactId) => handleAssignContact(contactId, userId, userName)}
            />
        );
    }

    if (selectedItem) {
        return (
            <AccountDetailView
                item={selectedItem}
                tasks={tasks}
                actions={wrappedActions}
                onBack={() => setSelectedItem(null)}
                onViewContact={setSelectedContact}
                title={title}
                crmCollection={crmCollection}
                taskCollection={taskCollection}
                workspaceMembers={workspaceMembers}
                onAssignCompany={(assignedUserId, assignedUserName) => 
                    handleAssignCompany(selectedItem.id, assignedUserId, assignedUserName)
                }
            />
        );
    }

    const getCrmType = (): 'investors' | 'customers' | 'partners' => {
        const lowerTitle = title.toLowerCase();
        // Map singular to plural (title is "Investor", "Customer", "Partner")
        const mapping: Record<string, 'investors' | 'customers' | 'partners'> = {
            'investor': 'investors',
            'customer': 'customers',
            'partner': 'partners'
        };
        return mapping[lowerTitle] || (lowerTitle + 's') as 'investors' | 'customers' | 'partners';
    };

    return (
        <>
            {/* Deleted entity toast notification */}
            {showDeletedToast && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-3">
                    <span className="text-lg">🗑️</span>
                    <span className="font-medium">Item was deleted</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                {/* View Navigation Tabs */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveView('accounts')}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                                activeView === 'accounts'
                                    ? 'text-black'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <span>📊</span>
                            <span className="hidden xs:inline sm:inline">Accounts</span>
                            {activeView === 'accounts' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveView('contacts')}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                                activeView === 'contacts'
                                    ? 'text-black'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <span>👥</span>
                            <span className="hidden xs:inline sm:inline">Contacts</span>
                            {activeView === 'contacts' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveView('followups')}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                                activeView === 'followups'
                                    ? 'text-black'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <span>📋</span>
                            <span className="hidden xs:inline sm:inline">Follow Ups</span>
                            {activeView === 'followups' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveView('deals')}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                                activeView === 'deals'
                                    ? 'text-black'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <span>💼</span>
                            <span className="hidden xs:inline sm:inline">Deals</span>
                            {activeView === 'deals' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                            )}
                        </button>
                    </div>
                    <div className="p-3 sm:p-5">
                        {activeView === 'accounts' && (
                            <AccountManager
                                crmItems={crmItems}
                                actions={actions}
                                crmCollection={crmCollection}
                                crmType={getCrmType()}
                                workspaceId={workspaceId}
                                onViewAccount={setSelectedItem}
                            />
                        )}
                        {activeView === 'contacts' && (
                            <ContactManager
                                contacts={crmItems.flatMap(item => item.contacts || [])}
                                crmItems={crmItems}
                                actions={actions}
                                crmType={crmCollection}
                                workspaceId={workspaceId}
                                onViewContact={(contact, parentItem) => {
                                    setSelectedItem(parentItem);
                                    setSelectedContact(contact);
                                }}
                            />
                        )}
                        {activeView === 'followups' && (
                            <FollowUpsManager
                                allCrmItems={crmItems}
                                userId={userId}
                            />
                        )}
                        {activeView === 'deals' && (
                            <DealsModule
                                deals={deals}
                                crmItems={crmItems}
                                productsServices={productsServices}
                                actions={actions}
                                workspaceId={workspaceId || ''}
                                userId={userId}
                                workspaceMembers={mappedWorkspaceMembers}
                            />
                        )}
                    </div>
                </div>

                </div>

                {/* Quick Access Sidebar - Collapsible on mobile */}
                {userId && (
                    <div className="space-y-4">
                        {/* Mobile toggle header */}
                        <button 
                            onClick={() => setShowQuickAccess(!showQuickAccess)}
                            className="w-full lg:hidden flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                        >
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <span>⚡</span> Quick Access
                            </h2>
                            <ChevronDown 
                                size={18} 
                                className={`text-gray-500 transition-transform ${showQuickAccess ? 'rotate-180' : ''}`} 
                            />
                        </button>
                        
                        {/* Desktop always visible header */}
                        <h2 className="hidden lg:flex text-sm font-semibold text-gray-500 uppercase tracking-wide items-center gap-2">
                            <span>⚡</span> Quick Access
                        </h2>
                        
                        {/* Content - always visible on desktop, toggled on mobile */}
                        <div className={`space-y-4 ${showQuickAccess ? 'block' : 'hidden lg:block'}`}>
                            {/* My Accounts */}
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <span>📋</span> My Accounts
                                        {assignedAccounts.length > 0 && (
                                            <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                                {assignedAccounts.length}
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                                    {assignedAccounts.length > 0 ? (
                                        assignedAccounts.slice(0, 5).map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedItem(item)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group min-h-[52px]"
                                            >
                                                <div className="font-medium text-sm text-gray-900 truncate group-hover:text-black">
                                                    {item.company}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                                    <span className={`inline-block w-2 h-2 rounded-full ${
                                                        item.status === 'Active' ? 'bg-green-500' :
                                                        item.status === 'Hot' ? 'bg-red-500' :
                                                        item.status === 'Warm' ? 'bg-orange-500' :
                                                        'bg-gray-400'
                                                    }`} />
                                                    {item.status}
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center">
                                            <p className="text-sm text-gray-400">No accounts assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* My Contacts */}
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <span>👤</span> My Contacts
                                        {assignedContacts.length > 0 && (
                                            <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                                {assignedContacts.length}
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                                    {assignedContacts.length > 0 ? (
                                        assignedContacts.slice(0, 5).map(({ contact, parentItem }) => (
                                            <button
                                                key={contact.id}
                                                onClick={() => {
                                                    setSelectedItem(parentItem);
                                                    setSelectedContact(contact);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group min-h-[52px]"
                                            >
                                                <div className="font-medium text-sm text-gray-900 truncate group-hover:text-black">
                                                    {contact.name}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                    {parentItem.company}
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center">
                                            <p className="text-sm text-gray-400">No contacts assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Meetings */}
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <span>📅</span> Recent Meetings
                                        {recentMeetings.length > 0 && (
                                            <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                                {recentMeetings.length}
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                                    {recentMeetings.length > 0 ? (
                                        recentMeetings.map(meeting => (
                                            <button
                                                key={meeting.id}
                                                onClick={() => {
                                                    setSelectedItem(meeting.parentItem);
                                                    setSelectedContact(meeting.parentContact);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group min-h-[52px]"
                                            >
                                                <div className="font-medium text-sm text-gray-900 truncate group-hover:text-black">
                                                    {meeting.title}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                    <span className="truncate">{meeting.contactName}</span>
                                                    <span>•</span>
                                                    <span>{new Date(meeting.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center">
                                            <p className="text-sm text-gray-400">No meetings logged</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

const CrmTab = React.memo(CrmTabComponent);

export default CrmTab;
