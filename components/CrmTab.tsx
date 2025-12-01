import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnyCrmItem, Task, AppActions, CrmCollectionName, TaskCollectionName, Contact, Document, BusinessProfile, WorkspaceMember, Deal, ProductService } from '../types';
import AccountDetailView from './shared/AccountDetailView';
import ContactDetailView from './shared/ContactDetailView';
import { ContactManager } from './shared/ContactManager';
import { AccountManager } from './shared/AccountManager';
import { FollowUpsManager } from './shared/FollowUpsManager';
import { DealsModule, CrmQuickAccessSidebar, CrmViewTabs, CrmViewType } from './crm';
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
    const [activeView, setActiveView] = useState<CrmViewType>('accounts');
    const [showDeletedToast, setShowDeletedToast] = useState(false);
    const isUpdatingRef = useRef(false);

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
                    <CrmViewTabs activeView={activeView} onViewChange={setActiveView} />
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

                {/* Quick Access Sidebar */}
                <CrmQuickAccessSidebar
                    crmItems={crmItems}
                    userId={userId}
                    onSelectAccount={setSelectedItem}
                    onSelectContact={(contact, parentItem) => {
                        setSelectedItem(parentItem);
                        setSelectedContact(contact);
                    }}
                />
            </div>
        </>
    );
}

const CrmTab = React.memo(CrmTabComponent);

export default CrmTab;
