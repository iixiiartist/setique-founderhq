import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BaseCrmItem, Investor, Customer, Partner, Task, AppActions, Priority, CrmCollectionName, TaskCollectionName, AnyCrmItem, TabType, Contact, Document, BusinessProfile, WorkspaceMember } from '../types';
import ModuleAssistant from './shared/ModuleAssistant';
import { Tab } from '../constants';
import AccountDetailView from './shared/AccountDetailView';
import ContactDetailView from './shared/ContactDetailView';
import TaskManagement from './shared/TaskManagement';
import { AssignmentDropdown } from './shared/AssignmentDropdown';


const CrmItemCard: React.FC<{ item: AnyCrmItem, onView: (item: AnyCrmItem) => void }> = ({ item, onView }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = item.nextActionDate && item.nextActionDate < todayStr;
    const lastNote = item.notes.length > 0 ? [...item.notes].sort((a,b) => b.timestamp - a.timestamp)[0] : null;

    const valueDisplay = () => {
        if ('checkSize' in item && item.checkSize != null) return <span className="font-bold text-lg text-black">${(item as Investor).checkSize.toLocaleString()}</span>;
        if ('dealValue' in item && item.dealValue != null) return <span className="font-bold text-lg text-black">${(item as Customer).dealValue.toLocaleString()}</span>;
        if ('opportunity' in item) return <span className="font-bold text-lg text-black truncate" title={(item as Partner).opportunity}>{(item as Partner).opportunity || 'N/A'}</span>;
        return null;
    };

    return (
         <li className={`flex items-start justify-between p-4 bg-white border-2 shadow-neo transition-colors ${isOverdue ? 'border-red-500' : 'border-black'}`}>
            <div className="flex-grow overflow-hidden pr-4">
                <div className="flex items-center justify-between">
                    <span className="font-semibold truncate pr-2 text-lg">{item.company}</span>
                    {valueDisplay()}
                </div>
                <p className="text-sm text-gray-700">{(item.contacts && item.contacts[0]?.name) || 'No contacts'}</p>
                 <div className="flex items-center gap-2 mt-2">
                    <span className={`priority-badge priority-${item.priority.toLowerCase()}`}>{item.priority}</span>
                    <span className="text-sm text-gray-600">|</span>
                    <span className="text-sm text-gray-600">Status: {item.status}</span>
                    {item.assignedToName && (
                        <>
                            <span className="text-sm text-gray-600">|</span>
                            <span className="text-sm font-mono text-blue-600">→ {item.assignedToName}</span>
                        </>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t border-black">
                    <span className="text-sm text-gray-600 block">Last Contact: {lastNote ? new Date(lastNote.timestamp).toLocaleDateString() : 'N/A'}</span>
                    <p className="text-sm font-medium text-black truncate">
                        Next: {item.nextAction || 'None'} 
                        {item.nextActionDate && ` (${new Date(item.nextActionDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC' })})`}
                        {isOverdue && <span className="ml-2 font-mono text-xs font-bold text-red-600">OVERDUE</span>}
                    </p>
                </div>
                <p className="text-sm mt-1 italic opacity-80 block truncate" title={lastNote?.text}>{lastNote ? lastNote.text : 'No notes yet'}</p>
            </div>
             <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => onView(item)} className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all whitespace-nowrap">View Account</button>
            </div>
        </li>
    );
};


const AddCrmForm: React.FC<{ title: string, collection: CrmCollectionName, actions: AppActions}> = ({ title, collection, actions }) => {
    const [form, setForm] = useState<Partial<AnyCrmItem>>({ company: '', nextAction: '', nextActionDate: '' });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.company || form.company.trim() === '') return;
        actions.createCrmItem(collection, form);
        setForm({ company: '', nextAction: '', nextActionDate: '' });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor={`crm-company-${collection}`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Company Name
                </label>
                <input id={`crm-company-${collection}`} value={form.company || ''} onChange={(e) => setForm(p => ({...p, company: e.target.value}))} placeholder="e.g., Acme Corp" required className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" />
            </div>
             <div>
                <label htmlFor={`crm-nextAction-${collection}`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Next Action
                </label>
                <input id={`crm-nextAction-${collection}`} value={form.nextAction || ''} onChange={(e) => setForm(p => ({...p, nextAction: e.target.value}))} placeholder="e.g., Send follow-up" className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" />
            </div>
            <div>
                <label htmlFor={`crm-nextActionDate-${collection}`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Next Action Date
                </label>
                <input id={`crm-nextActionDate-${collection}`} type="date" value={form.nextActionDate || ''} onChange={(e) => setForm(p => ({...p, nextActionDate: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn">Add {title}</button>
        </form>
    )
};

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
    userId
}) => {
    const [selectedItem, setSelectedItem] = useState<AnyCrmItem | null>(null);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [filterAssignment, setFilterAssignment] = useState<string>('all');
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

    const filteredCrmItems = useMemo(() => {
        if (filterAssignment === 'my' && userId) {
            return crmItems.filter(item => item.assignedTo === userId);
        } else if (filterAssignment === 'unassigned') {
            return crmItems.filter(item => !item.assignedTo);
        }
        return crmItems; // 'all'
    }, [crmItems, filterAssignment, userId]);

    // Wrap updateCrmItem to set updating flag
    const wrappedActions = useMemo(() => ({
        ...actions,
        updateCrmItem: (collection: CrmCollectionName, itemId: string, updates: Partial<AnyCrmItem>) => {
            isUpdatingRef.current = true;
            return actions.updateCrmItem(collection, itemId, updates);
        }
    }), [actions]);

    const generalTasks = useMemo(() => tasks.filter(t => !t.crmItemId), [tasks]);

    const { expertTitle, expertDescription, currentTab } = useMemo(() => {
        const tabIdMapping: Record<string, TabType> = {
            'Investor': Tab.Investors,
            'Customer': Tab.Customers,
            'Partner': Tab.Partners,
        };
        const tab = tabIdMapping[title] || Tab.Dashboard;

        switch (title) {
            case 'Investor':
                return { 
                    expertTitle: 'Fundraising AI',
                    expertDescription: 'an expert fundraising and investor relations assistant. Your goal is to help research investors, draft outreach emails, prepare for meetings, and manage the fundraising pipeline for Setique.',
                    currentTab: tab,
                };
            case 'Customer':
                return {
                    expertTitle: 'Sales AI',
                    expertDescription: 'an expert sales and business development assistant for B2B tech. Your customers are "Builders" (companies and developers who buy AI data). Your goal is to help with lead generation, sales pipeline management, and closing deals with these Builders.',
                    currentTab: tab,
                };
            case 'Partner':
                return {
                    expertTitle: 'Partnerships AI',
                    expertDescription: 'an expert partnerships and strategic alliances assistant. Your goal is to identify potential partners (e.g., data annotation companies, MLOps platforms), manage relationships, and structure deals that benefit Setique.',
                    currentTab: tab,
                };
            default:
                return {
                    expertTitle: 'CRM AI',
                    expertDescription: 'a helpful CRM assistant.',
                    currentTab: tab,
                };
        }
    }, [title]);
    
    // Build business context from profile (handle snake_case from database)
    const profile = businessProfile as any;
    const companyName = profile?.company_name || profile?.companyName || 'your company';
    const industry = profile?.industry || 'Not specified';
    const businessModel = profile?.business_model || profile?.businessModel || 'Not specified';
    const description = profile?.description || 'Not specified';
    const targetMarket = profile?.target_market || profile?.targetMarket || 'Not specified';
    const primaryGoal = profile?.primary_goal || profile?.primaryGoal || 'Not specified';
    const keyChallenges = profile?.key_challenges || profile?.keyChallenges || 'Not specified';
    
    const businessContext = businessProfile ? `
**Business Context: ${companyName}**
- **Company:** ${companyName}
- **Industry:** ${industry}
- **Business Model:** ${businessModel}
- **Description:** ${description}
- **Target Market:** ${targetMarket}
- **Primary Goal:** ${primaryGoal}
- **Key Challenges:** ${keyChallenges}
` : `**Business Context:** Not yet configured.`;

    // Workspace team context for collaboration
    const teamContext = workspaceMembers.length > 0 ? `
**Team Members (${workspaceMembers.length}):**
${workspaceMembers.map(m => `- ${m.fullName} (${m.email}) - Role: ${m.role}`).join('\n')}

**Collaboration Notes:**
- When creating tasks, you can assign them to specific team members by their email address
- CRM data (${title}s) is shared across the workspace for collaborative relationship management
- Use team member names when discussing deal ownership, follow-up assignments, or meeting scheduling
- Consider team member expertise when suggesting who should handle specific relationships
` : `**Team:** Working solo (no additional team members in workspace).`;
    
    const systemPrompt = `You are ${expertDescription}

${businessContext}

${teamContext}

**New Feature: Meeting Notes**
You can now manage meeting notes for contacts. This includes creating new meeting summaries, updating existing ones, and reviewing past conversations. Each meeting has a title, attendees, and a summary. Use the \`createMeeting\`, \`updateMeeting\`, and \`deleteMeeting\` functions for this.

**Reporting Guidelines:**
When asked for a report, analyze the provided CRM data.
- Summarize the pipeline by status (e.g., count of items in 'Lead', 'Qualified', 'Won').
- If this is the Customer CRM, calculate the total deal value of all items with status 'Won'.
- List any companies with a 'nextActionDate' that is in the past.
- Conclude with a brief, actionable suggestion for pipeline management.

**File Handling:**
- When a user attaches a file, their message is a multi-part message. One part is text, and another part is \`inlineData\` containing the file's base64 encoded content (\`data\`) and its \`mimeType\`. The user's text will also be prefixed with \`[File Attached: filename.ext]\`.
- When the user asks to save the file (e.g., "save this", "add it to the library"), this request refers to the file attached in their **most recent message**.
- To save the file, you MUST call the \`uploadDocument\` function.
- For the \`uploadDocument\` parameters:
    - \`name\`: Extract the filename from the \`[File Attached: ...]\` prefix.
    - \`mimeType\`: Use the \`mimeType\` from the \`inlineData\` part of the user's message.
    - \`content\`: Use the \`data\` field from the \`inlineData\` part. This is the base64 content.
    - \`module\`: Set this to '${currentTab}'.
- Do NOT ask for this information. You have everything you need from the user's multi-part message. Do NOT use content from previous files in the conversation history when saving.

**File Analysis Instructions:**
- **Finding File IDs:** When a user asks about a file by its name (e.g., "What is in 'investor_deck.pdf'?"), you MUST look up its ID in the \`Current File Library Context\` provided to you. Use that ID to call the \`getFileContent\` function. Do NOT ask the user for the file ID if the file name is in your context.
- **Critical Two-Step Process:**
    1.  **Call the Tool:** Once you have the file ID, call the \`getFileContent\` function.
    2.  **Analyze and Respond:** After the system returns the file's content, you MUST use that information to answer the user's original question. Do NOT just say "I've completed the action." Your job is not finished until you have provided a summary or answer based on the file's content.

**Example Interaction:**
User: "Did Acme Corp send us their MSA?"
You (Assistant): "Yes, I see a file named 'Acme_Corp_MSA.pdf'."
User: "Great, what are the payment terms?"
You (Assistant): *[Internal Action: Finds the ID for 'Acme_Corp_MSA.pdf' in the context, then calls getFileContent(fileId: 'doc-12345')]*
System: *[Internal Action: Returns file content to the model]*
You (Assistant): "The payment terms in the Acme Corp MSA are Net 30."

**Response Accuracy:**
- Do not make up or hallucinate information. All responses must be based on real-world information and the data provided.
- If you do not have an answer to a question, explicitly state that you don't know the answer at this time.

Use the provided dashboard context to answer questions and call functions to complete tasks.
Today's date is ${new Date().toISOString().split('T')[0]}.

Current ${title} CRM Context:
Items: ${JSON.stringify(crmItems, null, 2)}
Tasks: ${JSON.stringify(tasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;
    
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white p-6 border-2 border-black shadow-neo h-fit">
                        <h2 className="text-xl font-semibold text-black mb-4">Add {title}</h2>
                        <AddCrmForm title={title} collection={crmCollection} actions={actions} />
                    </div>
                    <div className="md:col-span-1 bg-white p-6 border-2 border-black shadow-neo">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-black">{title} Pipeline</h2>
                            {workspaceMembers.length > 0 && (
                                <select 
                                    value={filterAssignment} 
                                    onChange={(e) => setFilterAssignment(e.target.value)}
                                    className="text-sm bg-white border-2 border-black text-black p-1 rounded-none font-mono cursor-pointer shadow-neo-sm"
                                >
                                    <option value="all">All</option>
                                    <option value="my">My {title}s</option>
                                    <option value="unassigned">Unassigned</option>
                                </select>
                            )}
                        </div>
                        <ul className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {filteredCrmItems.length > 0 ? (
                                filteredCrmItems.map(item => <CrmItemCard key={item.id} item={item} onView={setSelectedItem} />)
                            ) : (
                                <p className="text-gray-500 italic">No {filterAssignment === 'my' ? 'assigned' : filterAssignment === 'unassigned' ? 'unassigned' : ''} {title.toLowerCase()} items{filterAssignment !== 'all' ? ' found' : ' yet'}.</p>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Quick Access Sections */}
                {workspaceMembers.length > 0 && userId && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* My Accounts */}
                        <div className="bg-blue-50 p-4 border-2 border-black shadow-neo">
                            <h3 className="text-sm font-mono font-bold text-black mb-2 flex items-center gap-2">
                                <span>📋</span> MY ACCOUNTS
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {crmItems.filter(item => item.assignedTo === userId).length > 0 ? (
                                    crmItems
                                        .filter(item => item.assignedTo === userId)
                                        .slice(0, 5)
                                        .map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedItem(item)}
                                                className="w-full text-left p-2 bg-white border border-black hover:bg-blue-100 transition-colors text-sm"
                                            >
                                                <div className="font-semibold truncate">{item.company}</div>
                                                <div className="text-xs text-gray-600">{item.status}</div>
                                            </button>
                                        ))
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No accounts assigned to you</p>
                                )}
                            </div>
                        </div>

                        {/* My Contacts */}
                        <div className="bg-green-50 p-4 border-2 border-black shadow-neo">
                            <h3 className="text-sm font-mono font-bold text-black mb-2 flex items-center gap-2">
                                <span>👤</span> MY CONTACTS
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
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
                                                className="w-full text-left p-2 bg-white border border-black hover:bg-green-100 transition-colors text-sm"
                                            >
                                                <div className="font-semibold truncate">{contact.name}</div>
                                                <div className="text-xs text-gray-600">{contact.companyName}</div>
                                            </button>
                                        ))
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No contacts assigned to you</p>
                                )}
                            </div>
                        </div>

                        {/* My Meetings */}
                        <div className="bg-yellow-50 p-4 border-2 border-black shadow-neo">
                            <h3 className="text-sm font-mono font-bold text-black mb-2 flex items-center gap-2">
                                <span>📅</span> RECENT MEETINGS
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
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
                                                className="w-full text-left p-2 bg-white border border-black hover:bg-yellow-100 transition-colors text-sm"
                                            >
                                                <div className="font-semibold truncate">{meeting.title}</div>
                                                <div className="text-xs text-gray-600">{meeting.contactName} - {new Date(meeting.timestamp).toLocaleDateString()}</div>
                                            </button>
                                        ))
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No meetings logged yet</p>
                                )}
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
             <div className="lg:col-span-1">
                <ModuleAssistant 
                    title={expertTitle} 
                    systemPrompt={systemPrompt} 
                    actions={actions} 
                    currentTab={currentTab}
                    workspaceId={workspaceId}
                    onUpgradeNeeded={onUpgradeNeeded}
                />
            </div>
        </div>
    );
});

export default CrmTab;
