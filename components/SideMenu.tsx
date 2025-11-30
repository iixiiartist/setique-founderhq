import React, { useRef } from 'react';
import { NAV_ITEMS, TabType, Tab } from '../constants';
import { PlanType } from '../types';
import { usePrefetchTabs } from '../hooks/usePrefetchTabs';
import { featureFlags } from '../lib/featureFlags';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: TabType;
    onSwitchTab: (tab: TabType) => void;
    workspacePlan?: PlanType;
    isAdmin?: boolean;
    workspaceId?: string;
    userId?: string;
}

const SideMenu: React.FC<SideMenuProps> = ({ 
    isOpen, 
    onClose, 
    activeTab, 
    onSwitchTab, 
    workspacePlan, 
    isAdmin,
    workspaceId,
    userId
}) => {
    const { prefetchTabWithDelay } = usePrefetchTabs({ 
        workspaceId, 
        userId, 
        enabled: isOpen // Only prefetch when menu is open
    });
    
    // Track hover timeouts to clean up on unmount
    const hoverTimeoutRef = useRef<(() => void) | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const activeClass = "text-blue-500 border-black bg-gray-100";
    const inactiveClass = "text-gray-600 border-transparent";
    
    // Filter out Documents tab for free users, Admin tab for non-admins,
    // and conditionally show/hide Accounts or legacy CRM tabs based on feature flag
    const isUnifiedAccountsEnabled = featureFlags.isEnabled('ui.unified-accounts');
    const filteredNavItems = NAV_ITEMS.filter(item => {
        if (item.id === Tab.Documents && workspacePlan === 'free') {
            return false;
        }
        if (item.id === Tab.Admin && !isAdmin) {
            return false;
        }
        // If unified accounts is enabled, hide the old 3 CRM tabs
        if (isUnifiedAccountsEnabled && ([Tab.Investors, Tab.Customers, Tab.Partners] as TabType[]).includes(item.id)) {
            return false;
        }
        // If unified accounts is disabled, hide the new Accounts tab
        if (!isUnifiedAccountsEnabled && item.id === Tab.Accounts) {
            return false;
        }
        return true;
    });

    // Keyboard navigation for tabs
    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentIndex = filteredNavItems.findIndex(item => item.id === activeTab);
            
            switch (e.key) {
                case 'ArrowDown':
                case 'j': // Vim-style navigation
                    e.preventDefault();
                    const nextIndex = (currentIndex + 1) % filteredNavItems.length;
                    onSwitchTab(filteredNavItems[nextIndex].id);
                    break;
                
                case 'ArrowUp':
                case 'k': // Vim-style navigation
                    e.preventDefault();
                    const prevIndex = (currentIndex - 1 + filteredNavItems.length) % filteredNavItems.length;
                    onSwitchTab(filteredNavItems[prevIndex].id);
                    break;
                
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
                
                case 'Enter':
                case ' ': // Space key
                    // Tab is already active, just close menu
                    if (e.target === menuRef.current) {
                        e.preventDefault();
                        onClose();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeTab, filteredNavItems, onSwitchTab, onClose]);
    
    return (
        <>
            {/* Backdrop overlay - only shows when menu is open */}
            <div 
                className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Menu content - slides in from left */}
            <div 
                ref={menuRef}
                id="menu-content" 
                className={`fixed top-0 left-0 w-[85vw] max-w-[320px] sm:max-w-sm h-full bg-white border-r-2 border-black shadow-xl z-50 transition-transform duration-300 ease-in-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 shrink-0">
                    <h2 className="text-xl sm:text-2xl font-bold">Menu</h2>
                    <button 
                        onClick={onClose} 
                        className="text-2xl sm:text-3xl hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" 
                        aria-label="Close menu"
                    >
                        &times;
                    </button>
                </div>
                
                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 sm:p-4" role="navigation" aria-label="Main navigation">
                    <div className="space-y-1">
                        {filteredNavItems.map(item => (
                            <a 
                                key={item.id} 
                                href="#" 
                                className={`flex items-center p-3 sm:p-3.5 text-base sm:text-lg font-mono font-semibold rounded-lg border-2 transition-all min-h-[48px] ${activeTab === item.id ? activeClass : inactiveClass} hover:bg-gray-100 hover:text-black active:bg-gray-200`}
                                data-testid={`nav-link-${item.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onSwitchTab(item.id);
                                }}
                                onMouseEnter={() => {
                                    // Cleanup any existing timeout
                                    if (hoverTimeoutRef.current) {
                                        hoverTimeoutRef.current();
                                    }
                                    // Start prefetching with 200ms delay
                                    hoverTimeoutRef.current = prefetchTabWithDelay(item.id);
                                }}
                                onMouseLeave={() => {
                                    // Cleanup timeout if user moves away before 200ms
                                    if (hoverTimeoutRef.current) {
                                        hoverTimeoutRef.current();
                                        hoverTimeoutRef.current = null;
                                    }
                                }}
                                aria-label={`Navigate to ${item.label}`}
                                aria-current={activeTab === item.id ? 'page' : undefined}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                </nav>
                
                {/* Footer */}
                <div className="p-4 border-t-2 border-dashed border-black shrink-0">
                    {userId && (
                        <div className="text-xs sm:text-sm text-gray-500 font-mono truncate" title={userId}>
                            User ID: {userId.substring(0, 8)}...
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SideMenu;