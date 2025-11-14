import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnyCrmItem, Task, AppActions, CrmCollectionName, TaskCollectionName, Contact, Document, BusinessProfile, WorkspaceMember, Deal } from '../types';
import AccountDetailView from './shared/AccountDetailView';
import ContactDetailView from './shared/ContactDetailView';
import TaskManagement from './shared/TaskManagement';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ContactManager } from './shared/ContactManager';
import { AccountManager } from './shared/AccountManager';
import { FollowUpsManager } from './shared/FollowUpsManager';
import { DealsModule } from './crm';

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
}

const CrmTab: React.FC<CrmTabProps> = React.memo(({ 
    title, 
    crmItems, 
    tasks, 
    actions, 
    documents, 
    businessProfile,
    workspaceId,
    onUpgradeNeeded,
    workspaceMembers = [],
    userId,
    deals = []
}) => {
    const { workspace } = useWorkspace();
    const [selectedItem, setSelectedItem] = useState<AnyCrmItem | null>(null);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [activeView, setActiveView] = useState<'accounts' | 'contacts' | 'followups' | 'deals'>('accounts');
    const isUpdatingRef = useRef(false);

    const { crmCollection, taskCollection, tag } = useMemo(() => {
        const lowerTitle = title.toLowerCase();
        return {
            crmCollection: (lowerTitle + 's') as CrmCollectionName,
            taskCollection: (lowerTitle + 'Tasks') as TaskCollectionName,
            tag: title,
        };
    }, [title]);

    const documentsMetadata = useMemo(() => documents.map(({ id, name, mimeType, module, uploadedAt }) => ({ id, name, mimeType, module, uploadedAt })), [documents]);

    useEffect(() => {
        if (selectedItem && !isUpdatingRef.current) {
            const updatedItem = crmItems.find(item => item.id === selectedItem.id);
            if (updatedItem) {
                setSelectedItem(updatedItem);
                if (selectedContact) {
                    const updatedContact = (updatedItem.contacts || []).find(c => c.id === selectedContact.id);
                    setSelectedContact(updatedContact || null);
                }
            }
            // Don't set to null here - let the component handle deletion explicitly
            // The item might temporarily not be found during updates
        }
        // Reset updating flag after sync
        if (isUpdatingRef.current) {
            isUpdatingRef.current = false;
        }
    }, [crmItems, selectedItem, selectedContact]);

    const handleAssignCompany = async (companyId: string, assignedUserId: string | null, assignedUserName: string | null) => {
        if (!workspaceId || !userId) {
            console.warn('[CrmTab] Cannot assign: missing workspaceId or userId', { workspaceId, userId });
            return;
        }
        
        console.log('[CrmTab] Assigning company:', { companyId, assignedUserId, assignedUserName, collection: crmCollection });
        
        isUpdatingRef.current = true;
        
        // Update in database
        await actions.updateCrmItem(crmCollection, companyId, { 
            assignedTo: assignedUserId, 
            assignedToName: assignedUserName 
        });
        
        console.log('[CrmTab] Assignment update completed');
        
        // Log activity (optional - could be done in reducer)
        // TODO: Add activity logging when activityService is available
    };

    const handleAssignContact = async (contactId: string, assignedUserId: string | null, assignedUserName: string | null) => {
        if (!workspaceId || !userId) {
            console.warn('[CrmTab] Cannot assign contact: missing workspaceId or userId', { workspaceId, userId });
            return;
        }

        try {
            console.log('[CrmTab] Assigning contact:', { contactId, assignedUserId, assignedUserName });
            isUpdatingRef.current = true;
            // Update contact via actions (assumes actions.updateContact(collection, crmItemId, contactId, updates))
            // We need crmItemId - attempt to find it from crmItems
            const contactOwner = crmItems.find(item => item.contacts?.some(c => c.id === contactId));
            const crmItemId = contactOwner ? contactOwner.id : undefined;
            if (!crmItemId) {
                console.warn('[CrmTab] Could not find parent CRM item for contact', { contactId });
                return;
            }

            await actions.updateContact(crmCollection, crmItemId, contactId, {
                assignedTo: assignedUserId,
                assignedToName: assignedUserName || null
            } as any);

            console.log('[CrmTab] Contact assignment update completed');
        } catch (err) {
            console.error('[CrmTab] Error assigning contact', err);
        } finally {
            isUpdatingRef.current = false;
        }
    };



    // Wrap updateCrmItem to set updating flag
    const wrappedActions = useMemo(() => ({
        ...actions,
        updateCrmItem: (collection: CrmCollectionName, itemId: string, updates: Partial<AnyCrmItem>) => {
            isUpdatingRef.current = true;
            return actions.updateCrmItem(collection, itemId, updates);
        }
    }), [actions]);

    const generalTasks = useMemo(() => tasks.filter(t => !t.crmItemId), [tasks]);
    
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
        )
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
                                actions={actions}
                                workspaceId={workspaceId || ''}
                                userId={userId}
                                workspaceMembers={workspaceMembers.map(m => ({
                                    id: m.userId,
                                    name: m.fullName || m.email || 'Unknown'
                                }))}
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
                                    {crmItems.filter(item => item.assignedTo === userId).length > 0 ? (
                                        crmItems
                                            .filter(item => item.assignedTo === userId)
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
                                    {crmItems.flatMap(item => 
                                        (item.contacts || [])
                                            .filter(contact => contact.assignedTo === userId)
                                            .map(contact => ({ ...contact, companyName: item.company, companyId: item.id }))
                                    ).length > 0 ? (
                                        crmItems
                                            .flatMap(item => 
                                                (item.contacts || [])
                                                    .filter(contact => contact.assignedTo === userId)
                                                    .map(contact => ({ ...contact, companyName: item.company, companyId: item.id, parentItem: item }))
                                            )
                                            .slice(0, 5)
                                            .map(contact => (
                                                <button
                                                    key={contact.id}
                                                    onClick={() => {
                                                        setSelectedItem(contact.parentItem);
                                                        setTimeout(() => setSelectedContact(contact), 100);
                                                    }}
                                                    className="w-full text-left p-3 bg-green-50 border-2 border-black hover:bg-green-100 hover:shadow-neo-sm transition-all text-sm group"
                                                >
                                                    <div className="font-semibold truncate group-hover:text-green-600">{contact.name}</div>
                                                    <div className="text-xs text-gray-600 mt-1">{contact.companyName}</div>
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
                                    {crmItems
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
                                        .slice(0, 5).length > 0 ? (
                                        crmItems
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
                                            .slice(0, 5)
                                            .map(meeting => (
                                                <button
                                                    key={meeting.id}
                                                    onClick={() => {
                                                        setSelectedItem(meeting.parentItem);
                                                        setTimeout(() => setSelectedContact(meeting.parentContact), 100);
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
    );
});

export default CrmTab;
