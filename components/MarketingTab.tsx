import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarketingItem, AppActions, Task, Priority, Document, BusinessProfile, WorkspaceMember, ProductService, AnyCrmItem, DashboardData } from '../types';
import Modal from './shared/Modal';
import NotesManager from './shared/NotesManager';
import { Tab } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { CampaignAnalyticsModule, AttributionModule } from './marketing';
import CampaignFormModal from './marketing/CampaignFormModal';

const MarketingItemCard: React.FC<{
    item: MarketingItem;
    actions: AppActions;
    onEdit: (item: MarketingItem, triggerRef: React.RefObject<HTMLButtonElement>) => void;
    productsServices?: ProductService[];
}> = ({ item, actions, onEdit, productsServices = [] }) => {
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const lastNote = useMemo(() => {
        if (!item.notes?.length) {
            return null;
        }

        return item.notes.reduce((latest, current) => {
            if (!latest || current.timestamp > latest.timestamp) {
                return current;
            }
            return latest;
        }, item.notes[0]);
    }, [item.notes]);

    const isOverdue = useMemo(() => {
        if (!item.dueDate) {
            return false;
        }

        const parsedDueDate = Date.parse(`${item.dueDate}T23:59:59Z`);
        if (Number.isNaN(parsedDueDate)) {
            return false;
        }

        const isComplete = item.status === 'Published' || item.status === 'Cancelled' || item.status === 'Completed';
        return !isComplete && parsedDueDate < Date.now();
    }, [item.dueDate, item.status]);

    const linkedProducts = useMemo(() => {
        if (!item.productServiceIds?.length || productsServices.length === 0) {
            return [] as ProductService[];
        }

        const productLookup = new Map(productsServices.map(product => [product.id, product] as const));
        return item.productServiceIds
            .map(productId => productLookup.get(productId))
            .filter(Boolean) as ProductService[];
    }, [item.productServiceIds, productsServices]);

    const budgetUtilization = useMemo(() => {
        if (!item.campaignBudget || item.campaignBudget <= 0) {
            return 0;
        }

        return ((item.actualSpend || 0) / item.campaignBudget) * 100;
    }, [item.actualSpend, item.campaignBudget]);

    return (
        <li className={`p-4 bg-white border rounded-lg shadow-sm ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow overflow-hidden">
                        <h4 className="font-semibold text-lg text-gray-900 truncate">{item.title}</h4>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs">
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">{item.type}</span>
                            {item.channels && item.channels.length > 0 && (
                                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
                                    {item.channels.length} channel{item.channels.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            {linkedProducts.length > 0 && (
                                <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-md text-orange-700">
                                    {linkedProducts.length} product{linkedProducts.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                        <select
                            value={item.status}
                            onChange={(e) => actions.updateMarketingItem(item.id, { status: e.target.value as MarketingItem['status'] })}
                            className="text-xs font-medium bg-white border border-gray-200 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Status for ${item.title}`}
                        >
                            <option>Planned</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Published</option>
                            <option>Cancelled</option>
                        </select>
                        <div className="flex gap-1">
                            <button 
                                ref={editButtonRef} 
                                onClick={() => onEdit(item, editButtonRef)} 
                                className="bg-white border border-gray-200 text-gray-700 cursor-pointer text-xs py-1.5 px-3 rounded-md font-medium transition-colors hover:bg-gray-50"
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirm(`Delete campaign "${item.title}"?`)) {
                                        actions.deleteItem('marketing', item.id);
                                    }
                                }} 
                                className="text-lg font-bold text-gray-400 hover:text-red-500 transition-colors px-2" 
                                aria-label={`Delete marketing item: ${item.title}`}
                            >
                                &times;
                            </button>
                        </div>
                    </div>
                </div>

                {/* Campaign Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-gray-100">
                    {item.dueDate && (
                        <div>
                            <div className="text-gray-500 uppercase">Launch Date</div>
                            <div className="font-medium text-gray-900">
                                {new Date(`${item.dueDate}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                                {isOverdue && <span className="ml-1 text-xs font-medium text-red-600">⚠</span>}
                            </div>
                        </div>
                    )}
                    {item.campaignBudget && item.campaignBudget > 0 && (
                        <div>
                            <div className="text-gray-500 uppercase">Budget</div>
                            <div className="font-medium text-gray-900">${item.campaignBudget.toLocaleString()}</div>
                            {budgetUtilization > 0 && (
                                <div className={`text-xs ${budgetUtilization > 100 ? 'text-red-600' : 'text-green-600'}`}>
                                    {budgetUtilization.toFixed(0)}% used
                                </div>
                            )}
                        </div>
                    )}
                    {item.targetRevenue && item.targetRevenue > 0 && (
                        <div>
                            <div className="text-gray-500 uppercase">Revenue Goal</div>
                            <div className="font-medium text-green-600">${item.targetRevenue.toLocaleString()}</div>
                        </div>
                    )}
                    {item.targetAudience && (
                        <div>
                            <div className="text-gray-500 uppercase">Audience</div>
                            <div className="font-medium text-gray-900 truncate" title={item.targetAudience}>{item.targetAudience}</div>
                        </div>
                    )}
                </div>

                {/* Campaign Performance KPIs */}
                {item.kpis && (item.kpis.impressions > 0 || item.kpis.clicks > 0 || item.kpis.conversions > 0) && (
                    <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 uppercase mb-1">Performance Metrics</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {item.kpis.impressions > 0 && (
                                <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg">
                                    <div className="text-gray-600">Impressions</div>
                                    <div className="font-semibold text-blue-700">{item.kpis.impressions.toLocaleString()}</div>
                                </div>
                            )}
                            {item.kpis.clicks > 0 && (
                                <div className="bg-green-50 border border-green-100 p-2 rounded-lg">
                                    <div className="text-gray-600">Clicks</div>
                                    <div className="font-semibold text-green-700">{item.kpis.clicks.toLocaleString()}</div>
                                    {item.kpis.impressions > 0 && (
                                        <div className="text-xs text-gray-500">
                                            CTR: {((item.kpis.clicks / item.kpis.impressions) * 100).toFixed(2)}%
                                        </div>
                                    )}
                                </div>
                            )}
                            {item.kpis.engagements > 0 && (
                                <div className="bg-purple-50 border border-purple-100 p-2 rounded-lg">
                                    <div className="text-gray-600">Engagements</div>
                                    <div className="font-semibold text-purple-700">{item.kpis.engagements.toLocaleString()}</div>
                                </div>
                            )}
                            {item.kpis.conversions > 0 && (
                                <div className="bg-orange-50 border border-orange-100 p-2 rounded-lg">
                                    <div className="text-gray-600">Conversions</div>
                                    <div className="font-semibold text-orange-700">{item.kpis.conversions.toLocaleString()}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                        {item.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-xs">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Last Note */}
                {lastNote && (
                    <p className="text-sm pt-2 border-t border-gray-300 italic opacity-80 truncate" title={lastNote.text}>
                        <span className="font-bold not-italic text-gray-600">Note:</span> {lastNote.text}
                    </p>
                )}
            </div>
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
    crmItems?: AnyCrmItem[];
    productsServices?: ProductService[];
    data: DashboardData;
}> = React.memo(({ items, tasks, actions, documents, businessProfile, workspaceId, onUpgradeNeeded, workspaceMembers = [], crmItems = [], productsServices = [], data }) => {
    const { workspace } = useWorkspace();
    const [currentView, setCurrentView] = useState<'calendar' | 'analytics' | 'attribution'>('calendar');
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MarketingItem | null>(null);
    const modalTriggerRef = useRef<HTMLButtonElement | null>(null);
    const newCampaignButtonRef = useRef<HTMLButtonElement>(null);

    const effectiveWorkspaceId = useMemo(() => workspaceId ?? workspace?.id ?? '', [workspaceId, workspace?.id]);

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            const dueA = a.dueDate ? Date.parse(`${a.dueDate}T00:00:00Z`) : Number.POSITIVE_INFINITY;
            const dueB = b.dueDate ? Date.parse(`${b.dueDate}T00:00:00Z`) : Number.POSITIVE_INFINITY;

            if (!Number.isNaN(dueA) && !Number.isNaN(dueB) && dueA !== dueB) {
                return dueA - dueB;
            }

            if (Number.isNaN(dueA) && !Number.isNaN(dueB)) {
                return 1;
            }

            if (!Number.isNaN(dueA) && Number.isNaN(dueB)) {
                return -1;
            }

            return b.createdAt - a.createdAt;
        });
    }, [items]);

    const handleSaveCampaign = async (campaignData: Partial<MarketingItem>) => {
        console.log('[MarketingTab] handleSaveCampaign called with:', campaignData);
        let result;
        if (editingItem) {
            // Update existing campaign
            console.log('[MarketingTab] Updating existing campaign:', editingItem.id);
            result = await actions.updateMarketingItem(editingItem.id, campaignData);
        } else {
            // Create new campaign
            console.log('[MarketingTab] Creating new campaign');
            result = await actions.createMarketingItem(campaignData as Omit<MarketingItem, 'id' | 'createdAt' | 'notes'>);
        }
        
        console.log('[MarketingTab] Operation result:', result);
        
        // Only close modal if operation succeeded
        if (result.success) {
            setShowCampaignModal(false);
            setEditingItem(null);
        } else {
            // Throw error so modal's catch block handles it (keeps modal open, resets isSubmitting)
            throw new Error(result.message || 'Failed to save campaign');
        }
    };

    const openEditModal = (item: MarketingItem, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingItem(item);
        modalTriggerRef.current = triggerRef.current;
        setShowCampaignModal(true);
    };
    
    const handleNewCampaign = () => {
        setEditingItem(null);
        setShowCampaignModal(true);
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
                    workspaceId={effectiveWorkspaceId}
                />
            )}

            {currentView === 'attribution' && data && (
                <AttributionModule
                    data={data}
                    actions={actions}
                    workspaceId={effectiveWorkspaceId}
                />
            )}

            {currentView === 'calendar' && (
        <div className="space-y-8">
            {/* Campaign List with Create Button */}
            <div className="bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-black">Marketing Campaigns</h2>
                    <button
                        ref={newCampaignButtonRef}
                        onClick={handleNewCampaign}
                        className="font-mono font-semibold bg-black text-white py-3 px-6 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                        + New Campaign
                    </button>
                </div>
                
                {sortedItems.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 mb-4">No campaigns yet. Create your first marketing campaign!</p>
                        <button
                            onClick={handleNewCampaign}
                            className="font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn"
                        >
                            Create Campaign
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {sortedItems.map(item => (
                            <MarketingItemCard
                                key={item.id}
                                item={item}
                                actions={actions} 
                                onEdit={openEditModal}
                                productsServices={productsServices}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
            )}

            <CampaignFormModal
                isOpen={showCampaignModal}
                onClose={() => {
                    setShowCampaignModal(false);
                    setEditingItem(null);
                }}
                onSave={handleSaveCampaign}
                editingCampaign={editingItem}
                productsServices={productsServices}
                workspaceMembers={workspaceMembers}
                crmItems={crmItems}
                triggerRef={modalTriggerRef}
            />
        </div>
    );
});

MarketingTab.displayName = 'MarketingTab';

export default MarketingTab;
