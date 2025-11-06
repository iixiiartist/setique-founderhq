import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarketingItem, AppActions, Task, Priority, Document, BusinessProfile } from '../types';
import Modal from './shared/Modal';
import NotesManager from './shared/NotesManager';
import ModuleAssistant from './shared/ModuleAssistant';
import { Tab } from '../constants';
import TaskManagement from './shared/TaskManagement';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AssignmentDropdown } from './shared/AssignmentDropdown';

const MarketingItemCard: React.FC<{ item: MarketingItem; actions: AppActions; onEdit: (item: MarketingItem, triggerRef: React.RefObject<HTMLButtonElement>) => void; }> = ({ item, actions, onEdit }) => {
    const lastNote = item.notes?.length > 0 ? [...item.notes].sort((a,b) => b.timestamp - a.timestamp)[0] : null;
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const isOverdue = item.status !== 'Published' && item.status !== 'Cancelled' && item.status !== 'Completed' && item.dueDate && item.dueDate < new Date().toISOString().split('T')[0];

    return (
        <li className={`p-3 bg-white border-2 shadow-neo ${isOverdue ? 'border-red-500' : 'border-black'}`}>
            <div className="flex items-center justify-between">
                <div className="flex-grow overflow-hidden">
                    <p className="font-semibold truncate">{item.title}</p>
                    <p className="text-sm text-gray-600">Type: {item.type}</p>
                    {item.dueDate && (
                        <p className="text-sm text-gray-600 mt-1">
                            Due: {new Date(item.dueDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC' })}
                            {isOverdue && <span className="ml-2 font-mono text-xs font-bold text-red-600">OVERDUE</span>}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                    <select
                        value={item.status}
                        onChange={(e) => actions.updateMarketingItem(item.id, { status: e.target.value as MarketingItem['status'] })}
                        className="font-mono text-sm font-semibold bg-white border-2 border-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Status for ${item.title}`}
                    >
                        <option>Planned</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                        <option>Published</option>
                        <option>Cancelled</option>
                    </select>
                    <div className="flex gap-2">
                        <button ref={editButtonRef} onClick={() => onEdit(item, editButtonRef)} className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all">Edit</button>
                        <button onClick={() => actions.deleteItem('marketing', item.id)} className="text-xl font-bold hover:text-red-500 transition-colors" aria-label={`Delete marketing item: ${item.title}`}>&times;</button>
                    </div>
                </div>
            </div>
            {lastNote && (
                <p className="text-sm mt-2 pt-2 border-t border-gray-300 italic opacity-80 block truncate" title={lastNote.text}>
                    <span className="font-bold not-italic text-gray-600">Note:</span> {lastNote.text}
                </p>
            )}
        </li>
    );
};

const MarketingTab: React.FC<{ 
    items: MarketingItem[]; 
    tasks: Task[]; 
    actions: AppActions; 
    documents: Document[]; 
    businessProfile?: BusinessProfile | null;
    workspaceId?: string;
    onUpgradeNeeded?: () => void;
}> = React.memo(({ items, tasks, actions, documents, businessProfile, workspaceId, onUpgradeNeeded }) => {
    const { workspace } = useWorkspace();
    const [form, setForm] = useState<Omit<MarketingItem, 'id'|'createdAt'|'notes'>>({
        title: '', type: 'Blog Post', status: 'Planned', dueDate: ''
    });
    const [editingItem, setEditingItem] = useState<MarketingItem | null>(null);
    const [editForm, setEditForm] = useState<Omit<MarketingItem, 'id'|'createdAt'|'notes'>>({ title: '', type: 'Blog Post', status: 'Planned' });
    const modalTriggerRef = useRef<HTMLButtonElement | null>(null);
    
    const documentsMetadata = useMemo(() => documents.map(({ id, name, mimeType, module, uploadedAt }) => ({ id, name, mimeType, module, uploadedAt })), [documents]);

    // Build business context from profile (handle snake_case from database)
    const profile = businessProfile as any;
    const companyName = profile?.company_name || profile?.companyName || 'your company';
    const industry = profile?.industry || 'Not specified';
    const businessModel = profile?.business_model || profile?.businessModel || 'Not specified';
    const description = profile?.description || 'Not specified';
    const targetMarket = profile?.target_market || profile?.targetMarket || 'Not specified';
    const primaryGoal = profile?.primary_goal || profile?.primaryGoal || 'Not specified';
    
    const businessContext = businessProfile ? `
**Business Context: ${companyName}**
- **Company:** ${companyName}
- **Industry:** ${industry}
- **Business Model:** ${businessModel}
- **Description:** ${description}
- **Target Market:** ${targetMarket}
- **Primary Goal:** ${primaryGoal}
` : `**Business Context:** Not yet configured.`;

    const systemPrompt = `You are an expert marketing and growth hacking assistant for ${companyName}.

${businessContext}

**Reporting Guidelines:**
When asked for a report, analyze the provided marketing data.
- Summarize the number of content items by status (Planned, In Progress, Published, etc.).
- Break down the content by type (Blog Post, Newsletter, etc.).
- Highlight how many items are currently 'In Progress'.
- Conclude with a suggestion on what type of content to prioritize next based on the current pipeline.

**File Handling:**
- When a user attaches a file, their message is a multi-part message. One part is text, and another part is \`inlineData\` containing the file's base64 encoded content (\`data\`) and its \`mimeType\`. The user's text will also be prefixed with \`[File Attached: filename.ext]\`.
- When the user asks to save the file (e.g., "save this", "add it to the library"), this request refers to the file attached in their **most recent message**.
- To save the file, you MUST call the \`uploadDocument\` function.
- For the \`uploadDocument\` parameters:
    - \`name\`: Extract the filename from the \`[File Attached: ...]\` prefix.
    - \`mimeType\`: Use the \`mimeType\` from the \`inlineData\` part of the user's message.
    - \`content\`: Use the \`data\` field from the \`inlineData\` part. This is the base64 content.
    - \`module\`: Set this to '${Tab.Marketing}'.
- Do NOT ask for this information. You have everything you need from the user's multi-part message. Do NOT use content from previous files in the conversation history when saving.

**File Analysis Instructions:**
- **Finding File IDs:** When a user asks about a file by its name (e.g., "What is in 'blog_draft.md'?"), you MUST look up its ID in the \`Current File Library Context\` provided to you. Use that ID to call the \`getFileContent\` function. Do NOT ask the user for the file ID if the file name is in your context.
- **Critical Two-Step Process:**
    1.  **Call the Tool:** Once you have the file ID, call the \`getFileContent\` function.
    2.  **Analyze and Respond:** After the system returns the file's content, you MUST use that information to answer the user's original question. Do NOT just say "I've completed the action." Your job is not finished until you have provided a summary or answer based on the file's content.

**Example Interaction:**
User: "Do we have the final copy for the newsletter?"
You (Assistant): "Yes, I see a file named 'october_newsletter_final.txt'."
User: "Can you summarize it for me?"
You (Assistant): *[Internal Action: Finds the ID for 'october_newsletter_final.txt' in the context, then calls getFileContent(fileId: 'doc-12345')]*
System: *[Internal Action: Returns file content to the model]*
You (Assistant): "The newsletter focuses on the launch of our new Bounty feature and includes a spotlight on a top Pro Curator. The call-to-action is to sign up for the waitlist."

**Response Accuracy:**
- Do not make up or hallucinate information. All responses must be based on real-world information and the data provided.
- If you do not have an answer to a question, explicitly state that you don't know the answer at this time.

Your goal is to help with content strategy, SEO, social media campaigns, and copywriting to grow ${companyName} and reach their target market.
Use the provided dashboard context to answer questions and call functions to complete tasks.
Today's date is ${new Date().toISOString().split('T')[0]}.

Current Marketing Context:
Campaigns: ${JSON.stringify(items, null, 2)}
Tasks: ${JSON.stringify(tasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;

    useEffect(() => {
        if (editingItem) {
            setEditForm({
                title: editingItem.title,
                type: editingItem.type,
                status: editingItem.status,
                dueDate: editingItem.dueDate || ''
            });
        }
    }, [editingItem]);

    useEffect(() => {
        if (editingItem) {
            const updatedItem = items.find(i => i.id === editingItem.id);
            setEditingItem(updatedItem || null);
        }
    }, [items]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.title.trim() === '') return;
        actions.createMarketingItem(form);
        setForm({ title: '', type: 'Blog Post', status: 'Planned', dueDate: '' });
    };

    const handleUpdate = () => {
        if (editingItem) {
            actions.updateMarketingItem(editingItem.id, editForm);
        }
        setEditingItem(null);
    };

    const openEditModal = (item: MarketingItem, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingItem(item);
        modalTriggerRef.current = triggerRef.current;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 border-2 border-black shadow-neo h-fit">
                        <h2 className="text-xl font-semibold text-black mb-4">Add Content / Campaign</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="mkt-title" className="block font-mono text-sm font-semibold text-black mb-1">Title</label>
                                <input id="mkt-title" value={form.title || ''} onChange={e => setForm(p=>({...p, title: e.target.value}))} placeholder="e.g., Q3 Product Launch" required className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="mkt-type" className="block font-mono text-sm font-semibold text-black mb-1">Type</label>
                                    <select id="mkt-type" value={form.type || 'Blog Post'} onChange={e => setForm(p=>({...p, type: e.target.value as MarketingItem['type']}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none h-full">
                                        <option>Blog Post</option><option>Newsletter</option><option>Social Campaign</option><option>Webinar</option><option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="mkt-status" className="block font-mono text-sm font-semibold text-black mb-1">Status</label>
                                    <select id="mkt-status" value={form.status || 'Planned'} onChange={e => setForm(p=>({...p, status: e.target.value as MarketingItem['status']}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none h-full">
                                        <option>Planned</option><option>In Progress</option><option>Completed</option><option>Published</option><option>Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="mkt-duedate" className="block font-mono text-sm font-semibold text-black mb-1">Due Date</label>
                                    <input id="mkt-duedate" type="date" value={form.dueDate || ''} onChange={e => setForm(p=>({...p, dueDate: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none h-full"/>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="font-mono font-semibold bg-black text-white py-2 px-6 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn">Add Item</button>
                            </div>
                        </form>
                    </div>
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                            <h2 className="text-xl font-semibold text-black">Content Calendar</h2>
                        </div>
                        <ul className="max-h-[80vh] overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {items.map(item => <MarketingItemCard key={item.id} item={item} actions={actions} onEdit={openEditModal} />)}
                        </ul>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                     <TaskManagement
                        tasks={tasks}
                        actions={actions}
                        taskCollectionName="marketingTasks"
                        tag="Marketing"
                        title="Marketing Tasks"
                        placeholder="e.g., 'Draft next newsletter'"
                    />
                </div>
            </div>
            {workspace?.planType !== 'free' && (
                <div className="lg:col-span-1">
                    <ModuleAssistant 
                        title="Marketing AI" 
                        systemPrompt={systemPrompt} 
                        actions={actions} 
                        currentTab={Tab.Marketing}
                        workspaceId={workspaceId}
                        onUpgradeNeeded={onUpgradeNeeded}
                    />
                </div>
            )}

            <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Marketing Item" triggerRef={modalTriggerRef}>
                {editingItem && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor={`edit-mkt-title-${editingItem.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Title</label>
                            <input id={`edit-mkt-title-${editingItem.id}`} value={editForm.title || ''} onChange={e => setEditForm(p=>({...p, title: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={`edit-mkt-type-${editingItem.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Type</label>
                                <select id={`edit-mkt-type-${editingItem.id}`} value={editForm.type || 'Blog Post'} onChange={e => setEditForm(p=>({...p, type: e.target.value as MarketingItem['type']}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none">
                                    <option>Blog Post</option><option>Newsletter</option><option>Social Campaign</option><option>Webinar</option><option>Other</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor={`edit-mkt-status-${editingItem.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Status</label>
                                <select id={`edit-mkt-status-${editingItem.id}`} value={editForm.status || 'Planned'} onChange={e => setEditForm(p=>({...p, status: e.target.value as MarketingItem['status']}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none">
                                    <option>Planned</option><option>In Progress</option><option>Completed</option><option>Published</option><option>Cancelled</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor={`edit-mkt-duedate-${editingItem.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Due Date</label>
                            <input id={`edit-mkt-duedate-${editingItem.id}`} type="date" value={editForm.dueDate || ''} onChange={e => setEditForm(p=>({...p, dueDate: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
                        </div>
                        <NotesManager 
                            notes={editingItem.notes} 
                            itemId={editingItem.id} 
                            collection="marketing" 
                            addNoteAction={actions.addNote}
                            updateNoteAction={actions.updateNote}
                            deleteNoteAction={actions.deleteNote}
                        />
                         <div className="flex gap-2 mt-4">
                            <button onClick={handleUpdate} className="font-mono w-full bg-black border-2 border-black text-white cursor-pointer text-sm py-2 px-3 rounded-none font-semibold shadow-neo-btn transition-all">Save Changes</button>
                            <button onClick={() => setEditingItem(null)} className="font-mono w-full bg-gray-200 border-2 border-black text-black cursor-pointer text-sm py-2 px-3 rounded-none font-semibold shadow-neo-btn transition-all">Cancel</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
});

export default MarketingTab;
