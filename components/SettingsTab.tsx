import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SettingsData, AppActions, QuickLink, BusinessProfile } from '../types';
import { SubscriptionBanner } from './SubscriptionBanner';
import { PricingPage } from './PricingPage';
import { InviteTeamMemberModal } from './shared/InviteTeamMemberModal';
import { ProfileSettings } from './shared/ProfileSettings';
import { AutomationSettings } from './settings/AutomationSettings';
import { IntegrationsSettings } from './settings/IntegrationsSettings';
import { ApiKeysSettings } from './settings/ApiKeysSettings';
import { ApiBalanceSettings } from './settings/ApiBalanceSettings';
import { WebhooksSettings } from './settings/WebhooksSettings';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AuthService } from '../lib/services/auth';
import { DatabaseService } from '../lib/services/database';
import { stripeEdgeFunctions } from '../src/services/stripeEdgeFunctions';

// ============================================
// SETTINGS NAVIGATION TYPES
// ============================================

type SettingsSection = 
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

// Quick Link Editor component with local state and manual save button
interface QuickLinkEditorProps {
    link: QuickLink;
    onUpdate: (link: QuickLink) => void;
    onDelete: () => void;
}

const QuickLinkEditor: React.FC<QuickLinkEditorProps> = ({ link, onUpdate, onDelete }) => {
    const [text, setText] = useState(link.text);
    const [href, setHref] = useState(link.href);
    const [hasChanges, setHasChanges] = useState(false);

    // Update local state when prop changes (e.g., when adding new link)
    useEffect(() => {
        setText(link.text);
        setHref(link.href);
        setHasChanges(false);
    }, [link.id]); // Only update when link ID changes (new link)

    // Check if there are unsaved changes
    useEffect(() => {
        setHasChanges(text !== link.text || href !== link.href);
    }, [text, href, link.text, link.href]);

    const handleSave = () => {
        if (hasChanges) {
            onUpdate({ ...link, text, href });
            setHasChanges(false);
        }
    };

    return (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="text-2xl shrink-0">
                🌐
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                    type="text"
                    value={text || ''}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Link Text"
                    className="border border-gray-300 rounded px-2 py-1 font-mono text-sm focus:ring-2 focus:ring-black focus:outline-none"
                />
                <input
                    type="url"
                    value={href || ''}
                    onChange={(e) => setHref(e.target.value)}
                    placeholder="https://example.com"
                    className="border border-gray-300 rounded px-2 py-1 font-mono text-sm focus:ring-2 focus:ring-black focus:outline-none"
                />
            </div>
            {hasChanges && (
                <button
                    onClick={handleSave}
                    className="bg-green-600 text-white px-3 py-1 text-sm font-mono font-semibold border border-green-700 rounded hover:bg-green-700"
                    title="Save changes"
                >
                    Save
                </button>
            )}
            <button
                onClick={onDelete}
                className="text-xl font-bold hover:text-red-500 px-2"
                title="Delete link"
            >
                ×
            </button>
        </div>
    );
};

const AI_CONTEXT_REQUIRED_FIELDS: Array<{ key: keyof BusinessProfile; label: string }> = [
    { key: 'companyName', label: 'Company name' },
    { key: 'industry', label: 'Industry' },
    { key: 'targetCustomerProfile', label: 'Ideal customer profile' },
    { key: 'marketPositioning', label: 'Market positioning' },
    { key: 'monetizationModel', label: 'Monetization model' },
    { key: 'competitiveAdvantages', label: 'Competitive advantages' },
    { key: 'keyDifferentiators', label: 'Key differentiators' },
];

interface SettingsTabProps {
    settings: SettingsData;
    onUpdateSettings: (updates: Partial<SettingsData>) => void;
    actions: AppActions;
    workspaceId?: string;
}

function SettingsTab({ settings, onUpdateSettings, actions, workspaceId }: SettingsTabProps) {
    const [localSettings, setLocalSettings] = useState<SettingsData>(settings);
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
    const [notificationPermission, setNotificationPermission] = useState(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );
    const [showPricingPage, setShowPricingPage] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
    const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
    const [usageData, setUsageData] = useState({
        aiRequestsUsed: 0,
        storageUsed: 0,
        fileCountUsed: 0,
        seatCount: 1,
        usedSeats: 1
    });
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const { user } = useAuth();
    const { workspace, businessProfile, workspaceMembers, isLoadingMembers, refreshMembers } = useWorkspace();

    // Get plan type from workspace (already mapped to camelCase by WorkspaceContext)
    const workspacePlanType = workspace?.planType || 'free';
    const isTeamPlan = workspacePlanType === 'team-pro';
    const subscriptionDescription = useMemo(() => {
        switch (workspacePlanType) {
            case 'team-pro':
                return 'Team Pro unlocks unlimited Copilot access, automations, storage, and seat management for your entire workspace.';
            default:
                return 'Free plan includes 25 Copilot requests per month (resets monthly) plus unlimited documents and storage. Upgrade for unlimited AI throughput and automations.';
        }
    }, [workspacePlanType]);
    
    // Debug logging

    const openBusinessProfileModal = () => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('openBusinessProfile'));
    };

    const aiContextSummary = useMemo(() => {
        if (!businessProfile) {
            return null;
        }

        const completedFields = AI_CONTEXT_REQUIRED_FIELDS.filter(({ key }) => {
            const value = businessProfile[key];
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            if (typeof value === 'string') {
                return value.trim().length > 0;
            }
            return value !== undefined && value !== null;
        });

        const completedKeys = new Set(completedFields.map(field => field.key));
        const missing = AI_CONTEXT_REQUIRED_FIELDS.filter(field => !completedKeys.has(field.key));

        const highlights = [
            { label: 'Ideal Customer', value: businessProfile.targetCustomerProfile },
            { label: 'Positioning', value: businessProfile.marketPositioning },
            { label: 'Monetization', value: businessProfile.monetizationModel },
            { label: 'Top Differentiators', value: (businessProfile.keyDifferentiators || []).slice(0, 3).join(', ') },
            { label: 'Competitive Edge', value: (businessProfile.competitiveAdvantages || []).slice(0, 3).join(', ') },
        ].filter(item => item.value && item.value.toString().trim().length > 0);

        const percent = Math.round((completedFields.length / AI_CONTEXT_REQUIRED_FIELDS.length) * 100);
        const lastUpdated = businessProfile.updatedAt
            ? new Date(businessProfile.updatedAt).toLocaleDateString()
            : 'Not yet saved';

        return {
            percent,
            completed: completedFields.length,
            total: AI_CONTEXT_REQUIRED_FIELDS.length,
            missing,
            highlights,
            lastUpdated,
        };
    }, [businessProfile]);

    // Fetch real usage data
    useEffect(() => {
        const loadUsageData = async () => {
            if (!workspace?.id) {
                setIsLoadingUsage(false);
                return;
            }

            try {
                setIsLoadingUsage(true);
                const { data, error } = await DatabaseService.getSubscriptionUsage(workspace.id);
                
                if (error) {
                    console.error('Error loading usage data:', error);
                } else if (data) {
                    setUsageData({
                        aiRequestsUsed: data.aiRequestsUsed,
                        storageUsed: data.storageUsed,
                        fileCountUsed: data.fileCountUsed,
                        seatCount: data.seatCount,
                        usedSeats: data.usedSeats
                    });
                }
            } catch (error) {
                console.error('Error loading usage data:', error);
            } finally {
                setIsLoadingUsage(false);
            }
        };

        loadUsageData();
    }, [workspace?.id]);

    // Check for pending checkout and auto-trigger
    useEffect(() => {
        const checkoutPlan = sessionStorage.getItem('checkout_plan');
        if (checkoutPlan && workspace?.id) {
            // Clear the checkout plan
            sessionStorage.removeItem('checkout_plan');
            
            // Auto-open the pricing modal
            setTimeout(() => {
                setShowPricingPage(true);
            }, 500);
        }
    }, [workspace?.id]);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    useEffect(() => {
        const loadInvitations = async () => {
            if (!workspace?.id || !isTeamPlan) return;
            
            setIsLoadingInvitations(true);
            try {
                const { data: invites } = await DatabaseService.getWorkspaceInvitations(workspace.id);
                setPendingInvitations((invites || []).filter((inv: any) => inv.status === 'pending'));
            } catch (error) {
                console.error('Error loading invitations:', error);
            } finally {
                setIsLoadingInvitations(false);
            }
        };

        loadInvitations();
    }, [workspace?.id, isTeamPlan]);

    const handleInviteSent = async () => {
        // Reload invitations after sending a new one
        if (workspace?.id) {
            const { data: invites } = await DatabaseService.getWorkspaceInvitations(workspace.id);
            setPendingInvitations((invites || []).filter((inv: any) => inv.status === 'pending'));
            // Also refresh members in case they accepted immediately
            await refreshMembers();
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        if (!confirm('Are you sure you want to revoke this invitation?')) return;

        try {
            await DatabaseService.revokeWorkspaceInvitation(invitationId);
            setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } catch (error) {
            console.error('Error revoking invitation:', error);
            alert('Failed to revoke invitation. Please try again.');
        }
    };

    const handleRemoveMember = async (memberId: string, memberEmail: string, memberRole: string) => {
        // Check if current user is the workspace owner
        const workspaceOwnerId = workspace?.ownerId;
        const isCurrentUserOwner = user?.id === workspaceOwnerId;
        
        if (!isCurrentUserOwner) {
            alert('Only the workspace owner can remove members.');
            return;
        }

        // Prevent removing yourself
        if (memberEmail === user?.email) {
            alert('You cannot remove yourself from the workspace. Please transfer ownership first or delete the workspace.');
            return;
        }

        // Prevent removing the workspace owner
        if (memberRole === 'owner') {
            alert('The workspace owner cannot be removed. Please transfer ownership first.');
            return;
        }

        if (!confirm(`Are you sure you want to remove ${memberEmail} from this workspace?\n\nThey will lose access to all workspace data immediately.`)) {
            return;
        }

        try {
            if (!workspace?.id) return;
            
            const member = workspaceMembers.find(m => m.id === memberId);
            if (!member) {
                alert('Member not found.');
                return;
            }


            const result = await DatabaseService.removeWorkspaceMember(workspace.id, member.userId);
            
            if (result.error) {
                console.error('Database error removing member:', result.error);
                throw result.error;
            }
            
            await refreshMembers(); // Refresh cached members
            alert(`✅ ${memberEmail} has been removed from the workspace.`);
        } catch (error: any) {
            console.error('Error removing member:', error);
            const errorMessage = error?.message || error?.toString() || 'Unknown error';
            alert(`Failed to remove member: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
        }
    };

    const handlePermissionRequest = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            alert('Notifications are not supported in this browser.');
            return;
        }
        
        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                handleSettingChange('desktopNotifications', true);
            } else {
                handleSettingChange('desktopNotifications', false);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            alert('Failed to request notification permission.');
        }
    };
    
    const handleSettingChange = (key: keyof SettingsData, value: any) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        onUpdateSettings({ [key]: value });
    };

    const handleDeleteAccount = async () => {
        const confirmation = window.prompt(
            `⚠️ DELETE ACCOUNT - THIS ACTION CANNOT BE UNDONE\n\n` +
            `This will permanently delete:\n` +
            `• Your profile and settings\n` +
            `• All workspaces you own\n` +
            `• All tasks, notes, contacts, and documents\n` +
            `• All achievements and progress\n` +
            `• Your subscription data\n\n` +
            `Type "DELETE" to confirm:`
        );

        if (confirmation !== 'DELETE') {
            return;
        }

        setIsDeleting(true);
        
        try {
            const { error } = await AuthService.deleteAccount();
            
            if (error) {
                console.error('Error deleting account:', error);
                alert('Failed to delete account. Please try again or contact support.');
                setIsDeleting(false);
                return;
            }

            // Account deleted successfully, user will be signed out automatically
            alert('Your account has been deleted successfully.');
            window.location.reload();
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Failed to delete account. Please try again or contact support.');
            setIsDeleting(false);
        }
    };

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
        setActiveSection(section);
        setIsMobileNavOpen(false);
    }, []);

    return (
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
            {/* Mobile Navigation Toggle */}
            <div className="lg:hidden">
                <button
                    onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                    className="w-full flex items-center justify-between min-h-[52px] p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm font-mono"
                >
                    <span className="font-semibold text-black text-sm sm:text-base">
                        {filteredNavItems.find(i => i.id === activeSection)?.icon}{' '}
                        {filteredNavItems.find(i => i.id === activeSection)?.label}
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

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                {/* Subscription Banner - Always visible at top */}
                {!isLoadingUsage && (
                    <div className="mb-6">
                        <SubscriptionBanner
                            planType={workspacePlanType as any}
                            aiRequestsUsed={usageData.aiRequestsUsed}
                            storageUsed={usageData.storageUsed}
                            fileCountUsed={usageData.fileCountUsed}
                            seatCount={usageData.seatCount}
                            usedSeats={usageData.usedSeats}
                            onUpgrade={() => setShowPricingPage(true)}
                        />
                    </div>
                )}

                {/* Section Content */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    {/* Section Header */}
                    <div className="p-4 bg-black rounded-t-lg">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">
                                {filteredNavItems.find(i => i.id === activeSection)?.icon}
                            </span>
                            <div>
                                <h1 className="text-xl font-bold text-yellow-400 font-mono">
                                    {filteredNavItems.find(i => i.id === activeSection)?.label}
                                </h1>
                                <p className="text-sm text-gray-300 font-mono">
                                    {filteredNavItems.find(i => i.id === activeSection)?.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section Body */}
                    <div className="p-6">
                        {/* Profile Section */}
                        {activeSection === 'profile' && (
                            <ProfileSettings onSave={refreshMembers} />
                        )}

                        {/* Business Profile Section */}
                        {activeSection === 'business' && (
                            <div className="space-y-6">
                                <p className="text-sm text-gray-600">
                                    Keep one source of truth for your ICP, positioning, pricing, and operating metrics. Copilot, notifications, and calendar deadlines all pull from the same autosaving profile.
                                </p>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        {businessProfile && aiContextSummary ? (
                                            <>
                                                <div>
                                                    <div className="flex items-center justify-between text-sm font-mono mb-1">
                                                        <span>{aiContextSummary.completed} of {aiContextSummary.total} key fields complete</span>
                                                        <span>{aiContextSummary.percent}%</span>
                                                    </div>
                                                    <div className="h-3 border border-gray-300 rounded-full bg-gray-100">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full"
                                                            style={{ width: `${aiContextSummary.percent}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono mt-1">Last updated {aiContextSummary.lastUpdated}</p>
                                                </div>

                                                {aiContextSummary.highlights.length > 0 && (
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {aiContextSummary.highlights.map(({ label, value }) => (
                                                            <div key={label} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                                                                <div className="text-xs uppercase text-gray-500 font-mono">{label}</div>
                                                                <div className="text-sm font-semibold font-mono text-black mt-1 whitespace-pre-wrap">
                                                                    {value}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {aiContextSummary.missing.length > 0 && (
                                                    <div>
                                                        <div className="text-xs uppercase text-gray-500 font-mono mb-1">Suggested next fields</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {aiContextSummary.missing.map(field => (
                                                                <span key={field.key} className="text-xs font-mono border border-gray-300 rounded px-2 py-1 bg-yellow-50">
                                                                    {field.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-md p-4 bg-gray-50">
                                                <p className="text-sm font-mono text-gray-600">
                                                    You haven't saved a full AI context yet. Share your ICP, positioning, and pricing so Copilot can tailor answers.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-mono font-semibold text-sm uppercase tracking-wide">Business Profile Snapshot</h3>
                                            {businessProfile?.isComplete ? (
                                                <span className="text-xs font-bold text-green-600">Complete</span>
                                            ) : (
                                                <span className="text-xs font-bold text-yellow-600">Draft</span>
                                            )}
                                        </div>
                                        <dl className="grid grid-cols-1 gap-3">
                                            <div>
                                                <dt className="text-xs uppercase text-gray-500 font-mono">Company</dt>
                                                <dd className="text-sm font-semibold text-black">{businessProfile?.companyName || 'Not set'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs uppercase text-gray-500 font-mono">Industry</dt>
                                                <dd className="text-sm font-semibold text-black">{businessProfile?.industry || 'Not set'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs uppercase text-gray-500 font-mono">Team Size</dt>
                                                <dd className="text-sm font-semibold text-black">{businessProfile?.teamSize || businessProfile?.companySize || 'Not set'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs uppercase text-gray-500 font-mono">Growth Stage</dt>
                                                <dd className="text-sm font-semibold text-black">{businessProfile?.growthStage || 'Not set'}</dd>
                                            </div>
                                        </dl>
                                        <p className="text-xs text-gray-600 font-mono">
                                            All changes autosave immediately and update Copilot context.
                                        </p>
                                    </div>
                                </div>

                                {workspace?.ownerId === user?.id ? (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={openBusinessProfileModal}
                                            className="font-mono bg-black text-white border border-gray-300 px-4 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors"
                                        >
                                            Edit Business Profile & AI Context
                                        </button>
                                        <span className="text-xs text-gray-500 font-mono">Need to finish later? Close the modal—your draft stays synced.</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 font-mono">
                                        Only workspace owners can edit the shared business profile.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Team Section */}
                        {activeSection === 'team' && isTeamPlan && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-bold text-black mb-2">Workspace: {workspace?.name || 'My Workspace'}</h3>
                                    <p className="text-sm text-gray-600">
                                        Plan: <span className="font-mono font-semibold">{workspacePlanType}</span>
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-black mb-3">Team Members ({workspaceMembers.length})</h4>
                                    {isLoadingMembers ? (
                                        <p className="text-sm text-gray-600">Loading team members...</p>
                                    ) : workspaceMembers.length > 0 ? (
                                        <div className="space-y-2">
                                            {workspaceMembers.map((member: any) => {
                                                const isCurrentUser = member.email === user?.email;
                                                const displayName = member.fullName || member.email || `User (${member.userId.substring(0, 8)}...)`;
                                                const displayEmail = member.email || 'No email found';
                                                
                                                return (
                                                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                                                        <div className="flex-1">
                                                            <p className="font-mono text-sm font-semibold">
                                                                {displayName}
                                                                {isCurrentUser && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                                                                {!member.fullName && !member.email && <span className="ml-2 text-xs text-orange-600">(Profile missing)</span>}
                                                            </p>
                                                            <p className="text-xs text-gray-600">{displayEmail}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 text-xs font-bold border border-gray-300 bg-white rounded">
                                                                {member.role.toUpperCase()}
                                                            </span>
                                                            {!isCurrentUser && workspace?.ownerId === user?.id && (
                                                                <button
                                                                    onClick={() => handleRemoveMember(member.id, member.email, member.role)}
                                                                    className="px-3 py-1 text-xs font-bold border border-gray-300 bg-red-500 text-white hover:bg-red-600 transition-colors rounded"
                                                                    title={`Remove ${member.email}`}
                                                                    disabled={member.role === 'owner'}
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600">You are the only member of this workspace.</p>
                                    )}
                                </div>

                                {pendingInvitations.length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-black mb-3">Pending Invitations ({pendingInvitations.length})</h4>
                                        {isLoadingInvitations ? (
                                            <p className="text-sm text-gray-600">Loading invitations...</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {pendingInvitations.map((invitation: any) => (
                                                    <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                                                        <div className="flex-1">
                                                            <p className="font-mono text-sm font-semibold">{invitation.email}</p>
                                                            <p className="text-xs text-gray-600">
                                                                Invited {new Date(invitation.created_at).toLocaleDateString()} • 
                                                                Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-1 text-xs font-bold border border-gray-300 bg-white rounded">
                                                                {invitation.role.toUpperCase()}
                                                            </span>
                                                            <button
                                                                onClick={() => handleRevokeInvitation(invitation.id)}
                                                                className="px-3 py-1 text-xs font-bold border border-gray-300 bg-red-500 text-white hover:bg-red-600 rounded"
                                                                title="Revoke invitation"
                                                            >
                                                                Revoke
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="font-mono bg-green-600 border border-gray-300 text-white cursor-pointer py-2 px-6 rounded-md font-semibold transition-colors hover:bg-green-700"
                                        data-testid="open-invite-team-modal"
                                    >
                                        + Invite Team Member
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Subscription Section */}
                        {activeSection === 'subscription' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-black mb-2">
                                        Current Plan: {workspacePlanType.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        {subscriptionDescription}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        {workspacePlanType !== 'team-pro' && (
                                            <button
                                                onClick={() => setShowPricingPage(true)}
                                                className="font-mono bg-blue-600 border border-gray-300 text-white cursor-pointer py-2 px-6 rounded-md font-semibold transition-colors hover:bg-blue-700"
                                            >
                                                Upgrade Plan
                                            </button>
                                        )}
                                        {workspace?.stripeCustomerId && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const { url } = await stripeEdgeFunctions.createPortalSession({
                                                            customerId: workspace.stripeCustomerId!,
                                                            returnUrl: window.location.href,
                                                        });
                                                        window.location.href = url;
                                                    } catch (error) {
                                                        console.error('Failed to open customer portal:', error);
                                                        alert('Failed to open customer portal. Please try again.');
                                                    }
                                                }}
                                                className="font-mono bg-gray-800 border border-gray-300 text-white cursor-pointer py-2 px-6 rounded-md font-semibold transition-colors hover:bg-gray-900"
                                            >
                                                Manage Subscription
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications Section */}
                        {activeSection === 'notifications' && (
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="desktop-notifications"
                                            type="checkbox"
                                            checked={localSettings.desktopNotifications && notificationPermission === 'granted'}
                                            onChange={(e) => {
                                                if (e.target.checked && notificationPermission !== 'granted') {
                                                    handlePermissionRequest();
                                                } else {
                                                    handleSettingChange('desktopNotifications', e.target.checked);
                                                }
                                            }}
                                            className="focus:ring-blue-500 h-5 w-5 text-blue-600 border border-gray-300 rounded accent-blue-500"
                                            aria-describedby="desktop-notifications-description"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="desktop-notifications" className="font-bold text-black">
                                            Desktop Notifications
                                        </label>
                                        <p id="desktop-notifications-description" className="text-gray-600">
                                            Receive a native desktop notification for any CRM next actions that become overdue.
                                            {notificationPermission === 'denied' && (
                                                <span className="block font-bold text-red-600 mt-1">Permission denied. You must enable notifications in your browser settings.</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick Links Section */}
                        {activeSection === 'quick-links' && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Add custom quick links to your dashboard for easy access to your frequently used tools.
                                </p>
                                {(!settings.quickLinks || settings.quickLinks.length === 0) ? (
                                    <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                                        <p className="text-gray-500 mb-4">No quick links added yet</p>
                                        <button
                                            onClick={() => {
                                                const newLink = {
                                                    id: Date.now().toString(),
                                                    text: 'New Link',
                                                    href: 'https://example.com',
                                                    iconChar: 'L',
                                                    iconBg: 'bg-blue-100',
                                                    iconColor: 'text-black'
                                                };
                                                onUpdateSettings({
                                                    quickLinks: [newLink]
                                                });
                                            }}
                                            className="font-mono bg-blue-600 border border-gray-300 text-white py-2 px-4 font-semibold rounded-md hover:bg-blue-700"
                                        >
                                            + Add First Quick Link
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {settings.quickLinks.map((link, index) => (
                                            <QuickLinkEditor
                                                key={link.id}
                                                link={link}
                                                onUpdate={(updatedLink) => {
                                                    const newLinks = [...settings.quickLinks!];
                                                    newLinks[index] = updatedLink;
                                                    onUpdateSettings({ quickLinks: newLinks });
                                                }}
                                                onDelete={() => {
                                                    const newLinks = settings.quickLinks!.filter((_, i) => i !== index);
                                                    onUpdateSettings({ quickLinks: newLinks });
                                                }}
                                            />
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newLink = {
                                                    id: Date.now().toString(),
                                                    text: 'New Link',
                                                    href: 'https://example.com',
                                                    iconChar: 'L',
                                                    iconBg: 'bg-blue-100',
                                                    iconColor: 'text-black'
                                                };
                                                onUpdateSettings({
                                                    quickLinks: [...(settings.quickLinks || []), newLink]
                                                });
                                            }}
                                            className="w-full font-mono bg-white border border-gray-300 text-black py-2 px-4 font-semibold hover:bg-gray-100 rounded-md"
                                        >
                                            + Add Another Link
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Automation Section */}
                        {activeSection === 'automation' && workspace?.id && (
                            <AutomationSettings workspaceId={workspace.id} />
                        )}

                        {/* Integrations Section */}
                        {activeSection === 'integrations' && workspace?.id && (
                            <IntegrationsSettings />
                        )}

                        {/* API Keys Section */}
                        {activeSection === 'api-keys' && workspace?.id && isTeamPlan && (
                            <ApiKeysSettings workspaceId={workspace.id} />
                        )}

                        {/* API Balance Section */}
                        {activeSection === 'api-balance' && workspace?.id && isTeamPlan && (
                            <ApiBalanceSettings workspaceId={workspace.id} />
                        )}

                        {/* Webhooks Section */}
                        {activeSection === 'webhooks' && workspace?.id && isTeamPlan && (
                            <WebhooksSettings workspaceId={workspace.id} />
                        )}

                        {/* Danger Zone Section */}
                        {activeSection === 'danger' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <h3 className="font-bold text-red-800 mb-2">Delete Account</h3>
                                    <p className="text-sm text-gray-700 mb-2">
                                        Permanently delete your account and all associated data. This action cannot be undone.
                                    </p>
                                    <p className="text-xs text-gray-600 mb-4">
                                        Email: <span className="font-mono font-semibold">{user?.email}</span>
                                    </p>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting}
                                        className="font-mono bg-red-700 border border-red-800 text-white cursor-pointer py-2 px-4 rounded-md font-semibold transition-colors hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete My Account'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Pricing Page Modal */}
            {showPricingPage && (
                <PricingPage
                    currentPlan={workspacePlanType as any}
                    workspaceId={workspace?.id}
                    onClose={() => setShowPricingPage(false)}
                />
            )}

            {/* Invite Team Member Modal */}
            {showInviteModal && workspace?.id && (
                <InviteTeamMemberModal
                    workspaceId={workspace.id}
                    workspaceName={workspace.name || 'My Workspace'}
                    onClose={() => setShowInviteModal(false)}
                    onInviteSent={handleInviteSent}
                />
            )}
        </div>
    );
}

export default SettingsTab;