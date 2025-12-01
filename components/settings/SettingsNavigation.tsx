import React, { useMemo, useCallback } from 'react';

export type SettingsSection = 
    | 'profile'
    | 'business'
    | 'team'
    | 'subscription'
    | 'notifications'
    | 'quick-links'
    | 'automation'
    | 'integrations'
    | 'api-keys'
    | 'api-balance'
    | 'webhooks'
    | 'danger';

interface NavItem {
    id: SettingsSection;
    label: string;
    icon: string;
    requiresTeamPlan?: boolean;
    description: string;
}

const NAV_ITEMS: NavItem[] = [
    { id: 'profile', label: 'Profile', icon: '👤', description: 'Your personal information' },
    { id: 'business', label: 'Business Profile', icon: '🏢', description: 'Company & AI context' },
    { id: 'team', label: 'Team', icon: '👥', description: 'Manage members', requiresTeamPlan: true },
    { id: 'subscription', label: 'Subscription', icon: '💳', description: 'Plan & billing' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', description: 'Alert preferences' },
    { id: 'quick-links', label: 'Quick Links', icon: '🔗', description: 'Dashboard shortcuts' },
    { id: 'automation', label: 'Automation', icon: '⚙️', description: 'Auto-create settings' },
    { id: 'integrations', label: 'Integrations', icon: '🔌', description: 'Connected apps' },
    { id: 'api-keys', label: 'API Keys', icon: '🔑', description: 'Developer access', requiresTeamPlan: true },
    { id: 'api-balance', label: 'API Balance', icon: '💰', description: 'Usage & billing', requiresTeamPlan: true },
    { id: 'webhooks', label: 'Webhooks', icon: '📡', description: 'Event notifications', requiresTeamPlan: true },
    { id: 'danger', label: 'Danger Zone', icon: '⚠️', description: 'Delete account' },
];

interface SettingsNavigationProps {
    activeSection: SettingsSection;
    onSectionChange: (section: SettingsSection) => void;
    isTeamPlan: boolean;
    isMobileNavOpen: boolean;
    onMobileNavToggle: () => void;
}

export function SettingsNavigation({
    activeSection,
    onSectionChange,
    isTeamPlan,
    isMobileNavOpen,
    onMobileNavToggle
}: SettingsNavigationProps) {
    // Filter nav items based on plan
    const filteredNavItems = useMemo(() => {
        return NAV_ITEMS.filter(item => {
            if (item.requiresTeamPlan && !isTeamPlan) return false;
            return true;
        });
    }, [isTeamPlan]);

    // Group nav items for better organization
    const navGroups = useMemo(() => [
        {
            label: 'Account',
            items: filteredNavItems.filter(i => ['profile', 'business', 'team', 'subscription'].includes(i.id))
        },
        {
            label: 'Preferences',
            items: filteredNavItems.filter(i => ['notifications', 'quick-links'].includes(i.id))
        },
        {
            label: 'Developer',
            items: filteredNavItems.filter(i => ['automation', 'integrations', 'api-keys', 'api-balance', 'webhooks'].includes(i.id))
        },
        {
            label: 'Account Management',
            items: filteredNavItems.filter(i => i.id === 'danger')
        }
    ].filter(g => g.items.length > 0), [filteredNavItems]);

    const handleNavClick = useCallback((section: SettingsSection) => {
        onSectionChange(section);
    }, [onSectionChange]);

    const currentItem = filteredNavItems.find(i => i.id === activeSection);

    return (
        <>
            {/* Mobile Navigation Toggle */}
            <div className="lg:hidden">
                <button
                    onClick={onMobileNavToggle}
                    className="w-full flex items-center justify-between min-h-[52px] p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm font-mono"
                >
                    <span className="font-semibold text-black text-sm sm:text-base">
                        {currentItem?.icon} {currentItem?.label}
                    </span>
                    <svg
                        className={`w-5 h-5 transition-transform ${isMobileNavOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                {/* Mobile Navigation Menu */}
                {isMobileNavOpen && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        {navGroups.map((group, idx) => (
                            <div key={group.label}>
                                {idx > 0 && <div className="border-t border-gray-200" />}
                                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider font-mono">
                                        {group.label}
                                    </span>
                                </div>
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavClick(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 min-h-[52px] text-left transition-colors font-mono ${
                                            activeSection === item.id
                                                ? 'bg-black text-white'
                                                : 'bg-white text-black hover:bg-gray-50'
                                        } ${item.id === 'danger' && activeSection !== item.id ? 'text-red-700 hover:bg-red-50' : ''}`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-sm">{item.label}</div>
                                            <div className={`text-xs truncate ${activeSection === item.id ? 'text-gray-300' : 'text-gray-500'}`}>{item.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop Sidebar Navigation */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-black">
                        <h2 className="text-lg font-bold text-yellow-400 font-mono">⚙️ Settings</h2>
                        <p className="text-xs text-gray-300 font-mono mt-0.5">Workspace configuration</p>
                    </div>
                    
                    {/* Navigation */}
                    <nav className="py-2">
                        {navGroups.map((group, idx) => (
                            <div key={group.label} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                                <div className="px-4 py-2 bg-gray-50">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">
                                        {group.label}
                                    </span>
                                </div>
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavClick(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors font-mono text-sm ${
                                            activeSection === item.id
                                                ? 'bg-black text-white'
                                                : 'bg-white text-black hover:bg-gray-50'
                                        } ${item.id === 'danger' && activeSection !== item.id ? 'text-red-700 hover:bg-red-50' : ''}`}
                                    >
                                        <span className="text-base">{item.icon}</span>
                                        <span className="font-semibold truncate">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </nav>
                </div>
            </aside>
        </>
    );
}

// Export the nav items for use in parent component
export { NAV_ITEMS };
export type { NavItem };
