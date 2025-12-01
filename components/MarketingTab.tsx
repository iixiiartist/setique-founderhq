import React, { useState, useRef, useMemo } from 'react';
import { MarketingItem, AppActions, Task, Document, BusinessProfile, WorkspaceMember, ProductService, AnyCrmItem, DashboardData } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { CampaignAnalyticsModule, AttributionModule, MarketingItemCard, MarketingViewSelector, MarketingViewType } from './marketing';
import CampaignFormModal from './marketing/CampaignFormModal';

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
    const [currentView, setCurrentView] = useState<MarketingViewType>('calendar');
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
            <MarketingViewSelector
                activeView={currentView}
                onViewChange={setCurrentView}
            />

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
        <div className="space-y-6 sm:space-y-8">
            {/* Campaign List with Create Button */}
            <div className="bg-white p-4 sm:p-6 border-2 border-black shadow-neo">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-black">Marketing Campaigns</h2>
                    <button
                        ref={newCampaignButtonRef}
                        onClick={handleNewCampaign}
                        className="font-mono font-semibold bg-black text-white min-h-[44px] sm:min-h-0 py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
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
