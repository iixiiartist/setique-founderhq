import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarketingItem, AppActions, Task, Priority, Document, BusinessProfile, WorkspaceMember, DashboardData, ProductService } from '../types';
import Modal from './shared/Modal';
import NotesManager from './shared/NotesManager';
import { Tab } from '../constants';
import TaskManagement from './shared/TaskManagement';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { CampaignAnalyticsModule, AttributionModule } from './marketing';

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
    workspaceMembers?: WorkspaceMember[];
    data?: DashboardData;
    productsServices?: ProductService[];
}> = React.memo(({ items, tasks, actions, documents, businessProfile, workspaceId, onUpgradeNeeded, workspaceMembers = [], data, productsServices = [] }) => {
    const { workspace } = useWorkspace();
    const [currentView, setCurrentView] = useState<'calendar' | 'analytics' | 'attribution'>('calendar');
    const [form, setForm] = useState<Omit<MarketingItem, 'id'|'createdAt'|'notes'>>({
        title: '', type: 'Blog Post', status: 'Planned', dueDate: '', productServiceIds: []
    });
    const [editingItem, setEditingItem] = useState<MarketingItem | null>(null);
    const [editForm, setEditForm] = useState<Omit<MarketingItem, 'id'|'createdAt'|'notes'>>({ title: '', type: 'Blog Post', status: 'Planned', dueDate: '', dueTime: '', productServiceIds: [] });
    const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (editingItem) {
            setEditForm({
                title: editingItem.title,
                type: editingItem.type,
                status: editingItem.status,
                dueDate: editingItem.dueDate || '',
                dueTime: editingItem.dueTime || '',
                productServiceIds: editingItem.productServiceIds || []
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
        setForm({ title: '', type: 'Blog Post', status: 'Planned', dueDate: '', productServiceIds: [] });
    };

    const handleUpdate = () => {
        if (editingItem) {
            // Ensure all fields including dueDate and dueTime are passed
            actions.updateMarketingItem(editingItem.id, {
                title: editForm.title,
                type: editForm.type,
                status: editForm.status,
                dueDate: editForm.dueDate || null,
                dueTime: editForm.dueTime || null,
                productServiceIds: editForm.productServiceIds
            });
        }
        setEditingItem(null);
    };

    const openEditModal = (item: MarketingItem, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingItem(item);
        modalTriggerRef.current = triggerRef.current;
    };

    return (
        <div className="space-y-6">
            {/* View Selector */}
            <div className="bg-white p-4 border-2 border-black shadow-neo">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setCurrentView('calendar')}
                        className={`px-4 py-2 border-2 border-black font-mono font-semibold transition-all ${
                            currentView === 'calendar'
                                ? 'bg-black text-white shadow-neo-btn'
                                : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                    >
                        Content Calendar
                    </button>
                    <button
                        onClick={() => setCurrentView('analytics')}
                        className={`px-4 py-2 border-2 border-black font-mono font-semibold transition-all ${
                            currentView === 'analytics'
                                ? 'bg-black text-white shadow-neo-btn'
                                : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                    >
                        Campaign Analytics
                    </button>
                    <button
                        onClick={() => setCurrentView('attribution')}
                        className={`px-4 py-2 border-2 border-black font-mono font-semibold transition-all ${
                            currentView === 'attribution'
                                ? 'bg-black text-white shadow-neo-btn'
                                : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                    >
                        Attribution
                    </button>
                </div>
            </div>

            {/* Render based on selected view */}
            {currentView === 'analytics' && data && (
                <CampaignAnalyticsModule
                    data={data}
                    actions={actions}
                    workspaceId={workspaceId}
                />
            )}

            {currentView === 'attribution' && data && (
                <AttributionModule
                    data={data}
                    actions={actions}
                    workspaceId={workspaceId}
                />
            )}

            {currentView === 'calendar' && (
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
                            
                            {/* Product/Service Multi-Select */}
                            {productsServices.length > 0 && (
                                <div className="p-4 bg-orange-50 border-2 border-orange-400">
                                    <h4 className="font-semibold text-orange-900 mb-2">Promoted Products/Services (Optional)</h4>
                                    <p className="text-xs text-gray-600 mb-3">Select products/services this campaign will promote</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {productsServices
                                            .filter(p => p.status === 'active')
                                            .map(product => (
                                                <label key={product.id} className="flex items-start gap-2 p-2 border border-orange-300 bg-white hover:bg-orange-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(form.productServiceIds || []).includes(product.id)}
                                                        onChange={(e) => {
                                                            const currentIds = form.productServiceIds || [];
                                                            const newIds = e.target.checked
                                                                ? [...currentIds, product.id]
                                                                : currentIds.filter(id => id !== product.id);
                                                            setForm(p => ({ ...p, productServiceIds: newIds }));
                                                        }}
                                                        className="mt-1"
                                                    />
                                                    <div className="flex-grow">
                                                        <div className="font-semibold text-sm">{product.name}</div>
                                                        <div className="text-xs text-gray-600">
                                                            {product.category} - {product.type === 'product' ? 'Product' : 'Service'}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-mono font-semibold text-orange-700">
                                                        ${product.basePrice.toFixed(2)}
                                                    </div>
                                                </label>
                                            ))}
                                    </div>
                                    {(form.productServiceIds || []).length > 0 && (
                                        <div className="mt-2 text-xs font-semibold text-orange-900">
                                            {form.productServiceIds!.length} product{form.productServiceIds!.length !== 1 ? 's' : ''} selected
                                        </div>
                                    )}
                                </div>
                            )}
                            
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
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <label htmlFor={`edit-mkt-duedate-${editingItem.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Due Date</label>
                                <input id={`edit-mkt-duedate-${editingItem.id}`} type="date" value={editForm.dueDate || ''} onChange={e => setEditForm(p=>({...p, dueDate: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
                            </div>
                            <div>
                                <label htmlFor={`edit-mkt-duetime-${editingItem.id}`} className="block font-mono text-sm font-semibold text-black mb-1">Due Time</label>
                                <input id={`edit-mkt-duetime-${editingItem.id}`} type="time" value={editForm.dueTime || ''} onChange={e => setEditForm(p=>({...p, dueTime: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
                            </div>
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
