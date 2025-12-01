import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SettingsData, AppActions } from '../types';
import { SubscriptionBanner } from './SubscriptionBanner';
import { PricingPage } from './PricingPage';
import { InviteTeamMemberModal } from './shared/InviteTeamMemberModal';
import { ProfileSettings } from './shared/ProfileSettings';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AuthService } from '../lib/services/auth';
import { DatabaseService } from '../lib/services/database';
import { stripeEdgeFunctions } from '../src/services/stripeEdgeFunctions';
import { showSuccess, showError } from '../lib/utils/toast';

// Import extracted components
import {
    SettingsNavigation,
    SettingsSection,
    NAV_ITEMS,
    BusinessProfileSection,
    TeamSection,
    QuickLinksSection,
    SubscriptionSection,
    NotificationsSection,
    DangerZoneSection,
    AutomationSettings,
    IntegrationsSettings,
    ApiKeysSettings,
    ApiBalanceSettings,
    WebhooksSettings
} from './settings';

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

    // Confirm dialog states
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'info';
        confirmLabel?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'danger',
    });

    // Get plan type from workspace
    const workspacePlanType = workspace?.planType || 'free';
    const isTeamPlan = workspacePlanType === 'team-pro';

    const openBusinessProfileModal = () => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('openBusinessProfile'));
    };

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
            sessionStorage.removeItem('checkout_plan');
            setTimeout(() => setShowPricingPage(true), 500);
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
        if (workspace?.id) {
            const { data: invites } = await DatabaseService.getWorkspaceInvitations(workspace.id);
            setPendingInvitations((invites || []).filter((inv: any) => inv.status === 'pending'));
            await refreshMembers();
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Revoke Invitation',
            message: 'Are you sure you want to revoke this invitation?',
            variant: 'warning',
            confirmLabel: 'Revoke',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    await DatabaseService.revokeWorkspaceInvitation(invitationId);
                    setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
                    showSuccess('Invitation revoked successfully');
                } catch (error) {
                    console.error('Error revoking invitation:', error);
                    showError('Failed to revoke invitation. Please try again.');
                }
            },
        });
    };

    const handleRemoveMember = async (memberId: string, memberEmail: string, memberRole: string) => {
        const workspaceOwnerId = workspace?.ownerId;
        const isCurrentUserOwner = user?.id === workspaceOwnerId;
        
        if (!isCurrentUserOwner) {
            showError('Only the workspace owner can remove members.');
            return;
        }

        if (memberEmail === user?.email) {
            showError('You cannot remove yourself from the workspace. Please transfer ownership first or delete the workspace.');
            return;
        }

        if (memberRole === 'owner') {
            showError('The workspace owner cannot be removed. Please transfer ownership first.');
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: 'Remove Team Member',
            message: `Are you sure you want to remove ${memberEmail} from this workspace? They will lose access to all workspace data immediately.`,
            variant: 'danger',
            confirmLabel: 'Remove',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    if (!workspace?.id) return;
                    
                    const member = workspaceMembers.find(m => m.id === memberId);
                    if (!member) {
                        showError('Member not found.');
                        return;
                    }

                    const result = await DatabaseService.removeWorkspaceMember(workspace.id, member.userId);
                    
                    if (result.error) {
                        console.error('Database error removing member:', result.error);
                        throw result.error;
                    }
                    
                    await refreshMembers();
                    showSuccess(`${memberEmail} has been removed from the workspace.`);
                } catch (error: any) {
                    console.error('Error removing member:', error);
                    const errorMessage = error?.message || error?.toString() || 'Unknown error';
                    showError(`Failed to remove member: ${errorMessage}`);
                }
            },
        });
    };

    const handlePermissionRequest = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            showError('Notifications are not supported in this browser.');
            return;
        }
        
        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                handleSettingChange('desktopNotifications', true);
                showSuccess('Notification permission granted');
            } else {
                handleSettingChange('desktopNotifications', false);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            showError('Failed to request notification permission.');
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

        if (confirmation !== 'DELETE') return;

        setIsDeleting(true);
        
        try {
            const { error } = await AuthService.deleteAccount();
            
            if (error) {
                console.error('Error deleting account:', error);
                showError('Failed to delete account. Please try again or contact support.');
                setIsDeleting(false);
                return;
            }

            showSuccess('Your account has been deleted successfully.');
            window.location.reload();
        } catch (error) {
            console.error('Error deleting account:', error);
            showError('Failed to delete account. Please try again or contact support.');
            setIsDeleting(false);
        }
    };

    const handleManageSubscription = async () => {
        try {
            const { url } = await stripeEdgeFunctions.createPortalSession({
                customerId: workspace!.stripeCustomerId!,
                returnUrl: window.location.href,
            });
            window.location.href = url;
        } catch (error) {
            console.error('Failed to open customer portal:', error);
            showError('Failed to open customer portal. Please try again.');
        }
    };

    // Filter nav items based on plan
    const filteredNavItems = useMemo(() => {
        return NAV_ITEMS.filter(item => {
            if (item.requiresTeamPlan && !isTeamPlan) return false;
            return true;
        });
    }, [isTeamPlan]);

    const currentNavItem = filteredNavItems.find(i => i.id === activeSection);

    return (
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
            {/* Navigation */}
            <SettingsNavigation
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                isTeamPlan={isTeamPlan}
                isMobileNavOpen={isMobileNavOpen}
                onMobileNavToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
            />

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
                            <span className="text-2xl">{currentNavItem?.icon}</span>
                            <div>
                                <h1 className="text-xl font-bold text-yellow-400 font-mono">
                                    {currentNavItem?.label}
                                </h1>
                                <p className="text-sm text-gray-300 font-mono">
                                    {currentNavItem?.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section Body */}
                    <div className="p-6">
                        {activeSection === 'profile' && (
                            <ProfileSettings onSave={refreshMembers} />
                        )}

                        {activeSection === 'business' && (
                            <BusinessProfileSection
                                businessProfile={businessProfile}
                                isOwner={workspace?.ownerId === user?.id}
                                onEditProfile={openBusinessProfileModal}
                            />
                        )}

                        {activeSection === 'team' && isTeamPlan && (
                            <TeamSection
                                workspaceName={workspace?.name || 'My Workspace'}
                                planType={workspacePlanType}
                                members={workspaceMembers}
                                pendingInvitations={pendingInvitations}
                                currentUserEmail={user?.email}
                                currentUserId={user?.id}
                                workspaceOwnerId={workspace?.ownerId}
                                isLoadingMembers={isLoadingMembers}
                                isLoadingInvitations={isLoadingInvitations}
                                onInviteClick={() => setShowInviteModal(true)}
                                onRemoveMember={handleRemoveMember}
                                onRevokeInvitation={handleRevokeInvitation}
                            />
                        )}

                        {activeSection === 'subscription' && (
                            <SubscriptionSection
                                planType={workspacePlanType}
                                stripeCustomerId={workspace?.stripeCustomerId}
                                onUpgradeClick={() => setShowPricingPage(true)}
                                onManageSubscription={handleManageSubscription}
                            />
                        )}

                        {activeSection === 'notifications' && (
                            <NotificationsSection
                                desktopNotifications={localSettings.desktopNotifications}
                                notificationPermission={notificationPermission}
                                onSettingChange={handleSettingChange}
                                onRequestPermission={handlePermissionRequest}
                            />
                        )}

                        {activeSection === 'quick-links' && (
                            <QuickLinksSection
                                quickLinks={settings.quickLinks}
                                onUpdateSettings={onUpdateSettings}
                            />
                        )}

                        {activeSection === 'automation' && workspace?.id && (
                            <AutomationSettings workspaceId={workspace.id} />
                        )}

                        {activeSection === 'integrations' && workspace?.id && (
                            <IntegrationsSettings />
                        )}

                        {activeSection === 'api-keys' && workspace?.id && isTeamPlan && (
                            <ApiKeysSettings workspaceId={workspace.id} />
                        )}

                        {activeSection === 'api-balance' && workspace?.id && isTeamPlan && (
                            <ApiBalanceSettings workspaceId={workspace.id} />
                        )}

                        {activeSection === 'webhooks' && workspace?.id && isTeamPlan && (
                            <WebhooksSettings workspaceId={workspace.id} />
                        )}

                        {activeSection === 'danger' && (
                            <DangerZoneSection
                                userEmail={user?.email}
                                isDeleting={isDeleting}
                                onDeleteAccount={handleDeleteAccount}
                            />
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

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                confirmLabel={confirmDialog.confirmLabel}
            />
        </div>
    );
}

export default SettingsTab;
