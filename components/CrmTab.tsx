import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnyCrmItem, Task, AppActions, CrmCollectionName, TaskCollectionName, Contact, Document, BusinessProfile, WorkspaceMember, Deal, ProductService, Meeting } from '../types';
import AccountDetailView from './shared/AccountDetailView';
import ContactDetailView from './shared/ContactDetailView';
import TaskManagement from './shared/TaskManagement';
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
    crmItems, 
    tasks, 
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
            isUpdatingRef.current = true;
            try {
                const result = await actions.createCrmItem(collection, item);
                // Reset flag BEFORE returning so effect can process new data
                isUpdatingRef.current = false;
                return result;
            } catch (error) {
                isUpdatingRef.current = false;
                throw error;
            }
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
                <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 border-2 border-black shadow-neo animate-slide-in">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <span className="font-semibold">Item was deleted</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                {/* View Navigation Tabs */}
                <div className="bg-white border-2 border-black shadow-neo">
                    <div className="flex border-b-2 border-black">
                        <button
                            onClick={() => setActiveView('accounts')}
                            className={`flex-1 font-mono font-bold py-3 px-4 transition-all ${
                                activeView === 'accounts'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-gray-100'
                            }`}
                        >
                            📊 Account Management
                        </button>
                        <button
                            onClick={() => setActiveView('contacts')}
                            className={`flex-1 font-mono font-bold py-3 px-4 border-l-2 border-r-2 border-black transition-all ${
                                activeView === 'contacts'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-gray-100'
                            }`}
                        >
                            👥 Contact Management
                        </button>
                        <button
                            onClick={() => setActiveView('followups')}
                            className={`flex-1 font-mono font-bold py-3 px-4 transition-all ${
                                activeView === 'followups'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-gray-100'
                            }`}
                        >
                            📋 Follow Ups
                        </button>
                        <button
                            onClick={() => setActiveView('deals')}
                            className={`flex-1 font-mono font-bold py-3 px-4 border-l-2 border-black transition-all ${
                                activeView === 'deals'
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-gray-100'
                            }`}
                        >
                            💼 Deal Pipeline
                        </button>
                    </div>
                    <div className="p-6">
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

                {/* Quick Access Sections */}
                {userId && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
                            <span>⚡</span> Quick Access
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* My Accounts */}
                            <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                                <h3 className="text-sm font-mono font-bold text-black mb-3 flex items-center gap-2 pb-2 border-b-2 border-black">
                                    <span>📋</span> MY ACCOUNTS
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {assignedAccounts.length > 0 ? (
                                        assignedAccounts
                                            .slice(0, 5)
                                            .map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSelectedItem(item)}
                                                    className="w-full text-left p-3 bg-blue-50 border-2 border-black hover:bg-blue-100 hover:shadow-neo-sm transition-all text-sm group"
                                                >
                                                    <div className="font-semibold truncate group-hover:text-blue-600">{item.company}</div>
                                                    <div className="text-xs text-gray-600 mt-1">{item.status}</div>
                                                </button>
                                            ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic text-center py-4">No accounts assigned to you</p>
                                    )}
                                </div>
                            </div>

                            {/* My Contacts */}
                            <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                                <h3 className="text-sm font-mono font-bold text-black mb-3 flex items-center gap-2 pb-2 border-b-2 border-black">
                                    <span>👤</span> MY CONTACTS
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {assignedContacts.length > 0 ? (
                                        assignedContacts
                                            .slice(0, 5)
                                            .map(({ contact, parentItem }) => (
                                                <button
                                                    key={contact.id}
                                                    onClick={() => {
                                                        // Set both states atomically to avoid setTimeout hack
                                                        setSelectedItem(parentItem);
                                                        setSelectedContact(contact);
                                                    }}
                                                    className="w-full text-left p-3 bg-green-50 border-2 border-black hover:bg-green-100 hover:shadow-neo-sm transition-all text-sm group"
                                                >
                                                    <div className="font-semibold truncate group-hover:text-green-600">{contact.name}</div>
                                                    <div className="text-xs text-gray-600 mt-1">{parentItem.company}</div>
                                                </button>
                                            ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic text-center py-4">No contacts assigned to you</p>
                                    )}
                                </div>
                            </div>

                            {/* My Meetings */}
                            <div className="bg-white p-4 border-2 border-black shadow-neo-sm">
                                <h3 className="text-sm font-mono font-bold text-black mb-3 flex items-center gap-2 pb-2 border-b-2 border-black">
                                    <span>📅</span> RECENT MEETINGS
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {recentMeetings.length > 0 ? (
                                        recentMeetings.map(meeting => (
                                                <button
                                                    key={meeting.id}
                                                    onClick={() => {
                                                        // Set both states atomically to avoid setTimeout hack
                                                        setSelectedItem(meeting.parentItem);
                                                        setSelectedContact(meeting.parentContact);
                                                    }}
                                                    className="w-full text-left p-3 bg-yellow-50 border-2 border-black hover:bg-yellow-100 hover:shadow-neo-sm transition-all text-sm group"
                                                >
                                                    <div className="font-semibold truncate group-hover:text-yellow-700">{meeting.title}</div>
                                                    <div className="text-xs text-gray-600 mt-1">{meeting.contactName} - {new Date(meeting.timestamp).toLocaleDateString()}</div>
                                                </button>
                                            ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic text-center py-4">No meetings logged yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <TaskManagement
                    tasks={generalTasks}
                    actions={actions}
                    taskCollectionName={taskCollection}
                    tag={tag}
                    title={`${title} Tasks`}
                    placeholder="e.g., 'Draft outreach templates'"
                />
            </div>
        </div>
        </>
    );
}

const CrmTab = React.memo(CrmTabComponent);

export default CrmTab;
