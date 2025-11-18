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
                className={`fixed inset-0 bg-gray-200 z-40 transition-opacity ${isOpen ? 'opacity-10 visible' : 'opacity-0 invisible pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Menu content - slides in from left */}
            <div 
                ref={menuRef}
                id="menu-content" 
                className={`fixed top-0 left-0 w-4/5 max-w-sm sm:max-w-md lg:max-w-lg h-full bg-white border-r-2 border-black shadow-neo-lg z-50 transition-transform duration-300 ease-in-out p-4 sm:p-6 flex flex-col overflow-y-auto custom-scrollbar ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold">Menu</h2>
                    <button onClick={onClose} className="text-3xl hover:text-gray-600 transition-colors" aria-label="Close menu">&times;</button>
                </div>
                
                {/* Keyboard shortcuts hint */}
                <div className="bg-gray-50 border-2 border-black p-3 mb-4 text-xs font-mono">
                    <div className="font-bold mb-2">⌨️ Keyboard Shortcuts:</div>
                    <div className="space-y-1 text-gray-600">
                        <div><kbd className="px-1 bg-white border border-gray-300">↑</kbd> / <kbd className="px-1 bg-white border border-gray-300">k</kbd> - Previous tab</div>
                        <div><kbd className="px-1 bg-white border border-gray-300">↓</kbd> / <kbd className="px-1 bg-white border border-gray-300">j</kbd> - Next tab</div>
                        <div><kbd className="px-1 bg-white border border-gray-300">Esc</kbd> - Close menu</div>
                    </div>
                </div>
                <nav className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2" role="navigation" aria-label="Main navigation">
                    {filteredNavItems.map(item => (
                        <a 
                            key={item.id} 
                            href="#" 
                            className={`block p-3 text-lg font-mono font-semibold rounded-none border-2 transition-all my-2 ${activeTab === item.id ? activeClass : inactiveClass} hover:bg-gray-100 hover:text-black`}
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
                </nav>
                <div className="mt-auto pt-4 border-t-2 border-dashed border-black">
                    {userId && (
                        <div className="text-sm text-gray-500 font-mono truncate" title={userId}>
                            User ID: {userId.substring(0, 8)}...
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SideMenu;