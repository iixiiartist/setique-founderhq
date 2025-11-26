import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CrmItem, AnyCrmItem, Task, AppActions, Contact, Document, BusinessProfile, WorkspaceMember, Deal, ProductService, CrmType, Meeting } from '../types';
import AccountDetailView from './shared/AccountDetailView';
import ContactDetailView from './shared/ContactDetailView';
import { ContactManager } from './shared/ContactManager';
import { AccountManager } from './shared/AccountManager';
import { PaginatedAccountManager } from './shared/PaginatedAccountManager';
import { FollowUpsManager } from './shared/FollowUpsManager';
import { DealsModule } from './crm';
import { logger } from '../lib/logger';
import { featureFlags } from '../lib/featureFlags';

interface AccountsTabProps {
    crmItems: CrmItem[];
    crmTasks: Task[];
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

function AccountsTab({
    crmItems = [],
    crmTasks = [],
    actions,
    documents = [],
    businessProfile,
    workspaceId,
    onUpgradeNeeded,
    workspaceMembers = [],
    userId,
    deals = [],
    productsServices = []
}: AccountsTabProps) {
    const [selectedItem, setSelectedItem] = useState<CrmItem | null>(null);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [activeView, setActiveView] = useState<'accounts' | 'contacts' | 'followups' | 'deals'>('accounts');
    const [typeFilter, setTypeFilter] = useState<CrmType | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeletedToast, setShowDeletedToast] = useState(false);
    const isUpdatingRef = useRef(false);

    // Check if paginated CRM is enabled
    const isPaginatedCrmEnabled = featureFlags.isEnabled('ui.paginated-crm');

    // O(1) lookup maps for deleted entity detection
    const crmItemsById = useMemo(() => {
        const map = new Map<string, CrmItem>();
        crmItems.forEach(item => map.set(item.id, item));
        return map;
    }, [crmItems]);

    const contactsById = useMemo(() => {
        const map = new Map<string, { contact: Contact; parentItem: CrmItem }>();
        crmItems.forEach(item => {
            (item.contacts || []).forEach(contact => {
                map.set(contact.id, { contact, parentItem: item });
            });
        });
        return map;
    }, [crmItems]);

    // Filter items by type and search
    const filteredItems = useMemo(() => {
        let items = crmItems;
        
        // Type filter
        if (typeFilter !== 'all') {
            items = items.filter(item => item.type === typeFilter);
        }
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            items = items.filter(item => 
                item.company.toLowerCase().includes(query) ||
                item.status.toLowerCase().includes(query) ||
                (item.contacts || []).some(c => 
                    c.name.toLowerCase().includes(query) ||
                    c.email.toLowerCase().includes(query)
                )
            );
        }
        
        return items;
    }, [crmItems, typeFilter, searchQuery]);

    // Filter tasks by type
    const filteredTasks = useMemo(() => {
        if (typeFilter === 'all') return crmTasks;
        return crmTasks.filter(t => t.crmType === typeFilter);
    }, [crmTasks, typeFilter]);

    // Sync selected item/contact when data changes
    useEffect(() => {
        if (selectedItem && !isUpdatingRef.current) {
            const updatedItem = crmItemsById.get(selectedItem.id);
            if (updatedItem) {
                setSelectedItem(updatedItem);
                if (selectedContact) {
                    const contactData = contactsById.get(selectedContact.id);
                    if (contactData && contactData.parentItem.id === updatedItem.id) {
                        setSelectedContact(contactData.contact);
                    } else {
                        setSelectedContact(null);
                        setShowDeletedToast(true);
                        setTimeout(() => setShowDeletedToast(false), 3000);
                    }
                }
            } else {
                setSelectedItem(null);
                setSelectedContact(null);
                setShowDeletedToast(true);
                setTimeout(() => setShowDeletedToast(false), 3000);
            }
        }
        if (isUpdatingRef.current) {
            isUpdatingRef.current = false;
        }
    }, [crmItems, selectedItem, selectedContact, crmItemsById, contactsById]);

    const handleAssignCompany = useCallback(async (companyId: string, assignedUserId: string | null, assignedUserName: string | null) => {
        if (!workspaceId || !userId) {
            logger.warn('[AccountsTab] Cannot assign: missing workspaceId or userId');
            return;
        }
        
        const item = crmItemsById.get(companyId);
        if (!item) {
            logger.warn('[AccountsTab] Company not found for assignment', { companyId });
            return;
        }

        isUpdatingRef.current = true;
        
        try {
            // Map unified type to collection for backwards-compatible action
            const collection = item.type === 'investor' ? 'investors' : item.type === 'customer' ? 'customers' : 'partners';
            await actions.updateCrmItem(collection, companyId, { 
                assignedTo: assignedUserId, 
                assignedToName: assignedUserName 
            });
            logger.info('[AccountsTab] Company assignment updated', { companyId, assignedUserId });
        } catch (error) {
            logger.error('[AccountsTab] Failed to assign company', error);
            throw error;
        } finally {
            isUpdatingRef.current = false;
        }
    }, [workspaceId, userId, crmItemsById, actions]);

    const handleAssignContact = useCallback(async (contactId: string, assignedUserId: string | null, assignedUserName: string | null) => {
        if (!workspaceId || !userId) {
            logger.warn('[AccountsTab] Cannot assign contact: missing workspaceId or userId');
            return;
        }
        
        const contactData = contactsById.get(contactId);
        if (!contactData) {
            logger.warn('[AccountsTab] Contact not found for assignment', { contactId });
            return;
        }

        isUpdatingRef.current = true;
        
        try {
            const collection = contactData.parentItem.type === 'investor' ? 'investors' : 
                              contactData.parentItem.type === 'customer' ? 'customers' : 'partners';
            await actions.updateContact(collection, contactData.parentItem.id, contactId, {
                assignedTo: assignedUserId,
                assignedToName: assignedUserName
            });
            logger.info('[AccountsTab] Contact assignment updated', { contactId, assignedUserId });
        } catch (error) {
            logger.error('[AccountsTab] Failed to assign contact', error);
            throw error;
        } finally {
            isUpdatingRef.current = false;
        }
    }, [workspaceId, userId, contactsById, actions]);

    // Count items by type
    const typeCounts = useMemo(() => ({
        all: crmItems.length,
        investor: crmItems.filter(i => i.type === 'investor').length,
        customer: crmItems.filter(i => i.type === 'customer').length,
        partner: crmItems.filter(i => i.type === 'partner').length
    }), [crmItems]);

    // Wrap actions to map unified type to collection
    const wrappedActions = useMemo(() => ({
        ...actions,
        updateCrmItem: (collection: any, itemId: string, updates: any) => {
            // Collection is derived from item type
            const item = crmItemsById.get(itemId);
            const mappedCollection = item?.type === 'investor' ? 'investors' : 
                                   item?.type === 'customer' ? 'customers' : 'partners';
            return actions.updateCrmItem(mappedCollection as any, itemId, updates);
        },
        deleteItem: (collection: any, itemId: string) => {
            const item = crmItemsById.get(itemId);
            const mappedCollection = item?.type === 'investor' ? 'investors' : 
                                   item?.type === 'customer' ? 'customers' : 'partners';
            return actions.deleteItem(mappedCollection as any, itemId);
        },
        createCrmItem: async (collection: any, item: any) => {
            // Determine collection from typeFilter or data
            const mappedCollection = collection;
            return actions.createCrmItem(mappedCollection, item);
        },
        updateContact: (collection: any, itemId: string, contactId: string, updates: any) => {
            const item = crmItemsById.get(itemId);
            const mappedCollection = item?.type === 'investor' ? 'investors' : 
                                   item?.type === 'customer' ? 'customers' : 'partners';
            return actions.updateContact(mappedCollection as any, itemId, contactId, updates);
        }
    }), [actions, crmItemsById]);

    return (
        <div className="h-full flex flex-col">
            {/* Deleted Item Toast */}
            {showDeletedToast && (
                <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border border-red-700">
                    ⚠️ Item was deleted or moved
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Type Filters */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setTypeFilter('all')}
                        className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                            typeFilter === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                        All ({typeCounts.all})
                    </button>
                    <button
                        onClick={() => setTypeFilter('investor')}
                        className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                            typeFilter === 'investor'
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                        💰 Investors ({typeCounts.investor})
                    </button>
                    <button
                        onClick={() => setTypeFilter('customer')}
                        className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                            typeFilter === 'customer'
                                ? 'bg-purple-500 text-white'
                                : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                        🛒 Customers ({typeCounts.customer})
                    </button>
                    <button
                        onClick={() => setTypeFilter('partner')}
                        className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                            typeFilter === 'partner'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                        🤝 Partners ({typeCounts.partner})
                    </button>
                </div>

                {/* Search */}
                <input
                    type="search"
                    placeholder="Search accounts, contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            {/* View Switcher */}
            <div className="flex gap-2 mb-6 px-4">
                <button
                    onClick={() => setActiveView('accounts')}
                    className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                        activeView === 'accounts'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                    }`}
                >
                    📋 Accounts
                </button>
                <button
                    onClick={() => setActiveView('contacts')}
                    className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                        activeView === 'contacts'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                    }`}
                >
                    👤 Contacts
                </button>
                <button
                    onClick={() => setActiveView('followups')}
                    className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                        activeView === 'followups'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                    }`}
                >
                    📅 Follow-ups
                </button>
                <button
                    onClick={() => setActiveView('deals')}
                    className={`font-mono px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                        activeView === 'deals'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                    }`}
                >
                    💰 Deals
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto px-4 pb-4">
                {selectedContact && selectedItem ? (
                    <ContactDetailView
                        contact={selectedContact}
                        parentItem={selectedItem as AnyCrmItem}
                        tasks={filteredTasks.filter(t => t.contactId === selectedContact.id)}
                        actions={wrappedActions}
                        onBack={() => {
                            setSelectedContact(null);
                            setSelectedItem(null);
                        }}
                        crmCollection={selectedItem.type === 'investor' ? 'investors' : selectedItem.type === 'customer' ? 'customers' : 'partners'}
                        taskCollection={selectedItem.type === 'investor' ? 'investorTasks' : selectedItem.type === 'customer' ? 'customerTasks' : 'partnerTasks'}
                        workspaceMembers={workspaceMembers}
                        onAssignContact={handleAssignContact}
                    />
                ) : selectedItem ? (
                    <AccountDetailView
                        item={selectedItem as AnyCrmItem}
                        tasks={filteredTasks.filter(t => t.crmItemId === selectedItem.id)}
                        actions={wrappedActions}
                        onBack={() => setSelectedItem(null)}
                        onViewContact={(contact) => setSelectedContact(contact)}
                        title={selectedItem.type === 'investor' ? 'Investor' : selectedItem.type === 'customer' ? 'Customer' : 'Partner'}
                        crmCollection={selectedItem.type === 'investor' ? 'investors' : selectedItem.type === 'customer' ? 'customers' : 'partners'}
                        taskCollection={selectedItem.type === 'investor' ? 'investorTasks' : selectedItem.type === 'customer' ? 'customerTasks' : 'partnerTasks'}
                        workspaceMembers={workspaceMembers}
                        onAssignCompany={(userId, userName) => handleAssignCompany(selectedItem.id, userId, userName)}
                    />
                ) : activeView === 'accounts' ? (
                    isPaginatedCrmEnabled && workspaceId ? (
                        <PaginatedAccountManager
                            workspaceId={workspaceId}
                            typeFilter={typeFilter}
                            actions={wrappedActions}
                            crmCollection={typeFilter === 'all' ? 'investors' : typeFilter === 'investor' ? 'investors' : typeFilter === 'customer' ? 'customers' : 'partners'}
                            crmType={typeFilter === 'all' ? 'accounts' : typeFilter === 'investor' ? 'investors' : typeFilter === 'customer' ? 'customers' : 'partners'}
                            onViewAccount={setSelectedItem}
                        />
                    ) : (
                        <AccountManager
                            crmItems={filteredItems as AnyCrmItem[]}
                            onViewAccount={setSelectedItem}
                            workspaceId={workspaceId}
                            actions={wrappedActions}
                            crmCollection={typeFilter === 'all' ? 'investors' : typeFilter === 'investor' ? 'investors' : typeFilter === 'customer' ? 'customers' : 'partners'}
                            crmType={typeFilter === 'all' ? 'accounts' : typeFilter === 'investor' ? 'investors' : typeFilter === 'customer' ? 'customers' : 'partners'}
                        />
                    )
                ) : activeView === 'contacts' ? (
                    <ContactManager
                        contacts={filteredItems.flatMap(item => 
                            (item.contacts || []).map(c => ({ ...c, parentType: item.type }))
                        )}
                        crmItems={filteredItems as AnyCrmItem[]}
                        actions={wrappedActions}
                        crmType={typeFilter === 'all' ? 'investors' : typeFilter === 'investor' ? 'investors' : typeFilter === 'customer' ? 'customers' : 'partners'}
                        workspaceId={workspaceId}
                        onViewContact={(contact) => {
                            const parentItem = crmItems.find(item => item.id === contact.crmItemId);
                            if (parentItem) {
                                setSelectedItem(parentItem);
                                setSelectedContact(contact);
                            }
                        }}
                    />
                ) : activeView === 'followups' ? (
                    <FollowUpsManager
                        allCrmItems={filteredItems as AnyCrmItem[]}
                        userId={userId}
                    />
                ) : (
                    <DealsModule
                        deals={deals}
                        crmItems={filteredItems as AnyCrmItem[]}
                        actions={actions}
                        workspaceId={workspaceId}
                        productsServices={productsServices}
                    />
                )}
            </div>
        </div>
    );
}

export default AccountsTab;
