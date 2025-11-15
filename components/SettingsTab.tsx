import React, { useState, useEffect } from 'react';
import { SettingsData, AppActions, QuickLink } from '../types';
import { SubscriptionBanner } from './SubscriptionBanner';
import { PricingPage } from './PricingPage';
import { InviteTeamMemberModal } from './shared/InviteTeamMemberModal';
import { ProfileSettings } from './shared/ProfileSettings';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AuthService } from '../lib/services/auth';
import { DatabaseService } from '../lib/services/database';

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
        <div className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-black">
            <div className="text-2xl shrink-0">
                🌐
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                    type="text"
                    value={text || ''}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Link Text"
                    className="border-2 border-black px-2 py-1 font-mono text-sm"
                />
                <input
                    type="url"
                    value={href || ''}
                    onChange={(e) => setHref(e.target.value)}
                    placeholder="https://example.com"
                    className="border-2 border-black px-2 py-1 font-mono text-sm"
                />
            </div>
            {hasChanges && (
                <button
                    onClick={handleSave}
                    className="bg-green-600 text-white px-3 py-1 text-sm font-mono font-semibold border-2 border-black hover:bg-green-700"
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

interface SettingsTabProps {
    settings: SettingsData;
    onUpdateSettings: (updates: Partial<SettingsData>) => void;
    actions: AppActions;
    workspaceId?: string;
}

function SettingsTab({ settings, onUpdateSettings, actions, workspaceId }: SettingsTabProps) {
    const [localSettings, setLocalSettings] = useState<SettingsData>(settings);
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
    const { user } = useAuth();
    const { workspace, workspaceMembers, isLoadingMembers, refreshMembers } = useWorkspace();

    // Get plan type from workspace (already mapped to camelCase by WorkspaceContext)
    const workspacePlanType = workspace?.planType || 'free';
    const isTeamPlan = workspacePlanType.startsWith('team');

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
            console.log('Auto-triggering checkout for plan:', checkoutPlan);
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

            console.log('Removing member:', {
                workspaceId: workspace.id,
                userId: member.userId,
                memberEmail,
                currentUserId: user?.id,
                workspaceOwnerId
            });

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

    return (
        <div className="max-w-3xl mx-auto">
            {/* Subscription Banner */}
            {!isLoadingUsage && (
                <SubscriptionBanner
                    planType={workspacePlanType as any}
                    aiRequestsUsed={usageData.aiRequestsUsed}
                    storageUsed={usageData.storageUsed}
                    fileCountUsed={usageData.fileCountUsed}
                    seatCount={usageData.seatCount}
                    usedSeats={usageData.usedSeats}
                    onUpgrade={() => setShowPricingPage(true)}
                />
            )}

            {/* Profile Settings Section */}
            <div className="mb-8">
                <ProfileSettings onSave={refreshMembers} />
            </div>

            <div className="bg-white p-6 border-2 border-black shadow-neo">
                <h2 className="text-2xl font-semibold text-black mb-6">Workspace Settings</h2>

                <div className="space-y-8">
                    {/* Business Profile Section - Only show for workspace owners */}
                    {workspace && workspace.ownerId === user?.id && (
                        <fieldset className="border-2 border-dashed border-black p-4">
                            <legend className="text-lg font-mono font-semibold px-2">Business Profile</legend>
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Your business profile helps AI personalize responses and recommendations. 
                                    As the workspace owner, you can update your business information here.
                                </p>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('openBusinessProfile'))}
                                    className="font-mono bg-black text-white border-2 border-black px-4 py-2 rounded-none font-semibold shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                                >
                                    Edit Business Profile
                                </button>
                            </div>
                        </fieldset>
                    )}

                    {/* Team Management Section - Only show for team plans */}
                    {isTeamPlan && (
                        <fieldset className="border-2 border-dashed border-black p-4">
                            <legend className="text-lg font-mono font-semibold px-2">Team Management</legend>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-black mb-2">Workspace: {workspace?.name || 'My Workspace'}</h3>
                                    <p className="text-sm text-gray-600 mb-4">
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
                                                const isOwner = member.role === 'owner';
                                                // Fallback: if no profile, show user_id with warning
                                                const displayName = member.fullName || member.email || `User (${member.userId.substring(0, 8)}...)`;
                                                const displayEmail = member.email || 'No email found';
                                                
                                                return (
                                                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-200">
                                                        <div className="flex-1">
                                                            <p className="font-mono text-sm font-semibold">
                                                                {displayName}
                                                                {isCurrentUser && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                                                                {!member.fullName && !member.email && <span className="ml-2 text-xs text-orange-600">(Profile missing)</span>}
                                                            </p>
                                                            <p className="text-xs text-gray-600">{displayEmail}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 text-xs font-bold border-2 border-black bg-white">
                                                                {member.role.toUpperCase()}
                                                            </span>
                                                            {!isCurrentUser && workspace?.ownerId === user?.id && (
                                                                <button
                                                                    onClick={() => handleRemoveMember(member.id, member.email, member.role)}
                                                                    className="px-3 py-1 text-xs font-bold border-2 border-black bg-red-500 text-white hover:bg-red-600 transition-colors"
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

                                {/* Pending Invitations */}
                                {pendingInvitations.length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-black mb-3">Pending Invitations ({pendingInvitations.length})</h4>
                                        {isLoadingInvitations ? (
                                            <p className="text-sm text-gray-600">Loading invitations...</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {pendingInvitations.map((invitation: any) => (
                                                    <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-50 border-2 border-yellow-300">
                                                        <div className="flex-1">
                                                            <p className="font-mono text-sm font-semibold">{invitation.email}</p>
                                                            <p className="text-xs text-gray-600">
                                                                Invited {new Date(invitation.created_at).toLocaleDateString()} • 
                                                                Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-1 text-xs font-bold border-2 border-black bg-white">
                                                                {invitation.role.toUpperCase()}
                                                            </span>
                                                            <button
                                                                onClick={() => handleRevokeInvitation(invitation.id)}
                                                                className="px-3 py-1 text-xs font-bold border-2 border-black bg-red-500 text-white hover:bg-red-600"
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

                                <div className="pt-4">
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="font-mono bg-green-600 border-2 border-black text-white cursor-pointer py-2 px-6 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-green-700 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                                    >
                                        + Invite Team Member
                                    </button>
                                </div>
                            </div>
                        </fieldset>
                    )}

                    {/* Subscription Section */}
                    <fieldset className="border-2 border-dashed border-black p-4">
                        <legend className="text-lg font-mono font-semibold px-2">Subscription</legend>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-black mb-2">
                                    Current Plan: {workspacePlanType.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    {workspacePlanType === 'team-pro' 
                                        ? 'You have unlimited access to all features.' 
                                        : 'Upgrade to unlock more AI requests, storage, and premium features.'}
                                </p>
                                {workspacePlanType !== 'team-pro' && workspacePlanType !== 'power-individual' && (
                                    <button
                                        onClick={() => setShowPricingPage(true)}
                                        className="font-mono bg-blue-600 border-2 border-black text-white cursor-pointer py-2 px-6 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-blue-700 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                                    >
                                        Upgrade Plan
                                    </button>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border-2 border-dashed border-black p-4">
                        <legend className="text-lg font-mono font-semibold px-2">Notifications</legend>
                        <div className="space-y-4">
                            {/* Desktop Notifications */}
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
                                        className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-2 border-black rounded-none accent-blue-500"
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
                    </fieldset>

                    <fieldset className="border-2 border-dashed border-black p-4">
                        <legend className="text-lg font-mono font-semibold px-2">Quick Links</legend>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Add custom quick links to your dashboard for easy access to your frequently used tools.
                            </p>
                            {(!settings.quickLinks || settings.quickLinks.length === 0) ? (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 bg-gray-50">
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
                                        className="font-mono bg-blue-600 border-2 border-black text-white py-2 px-4 font-semibold shadow-neo-btn hover:bg-blue-700"
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
                                        className="w-full font-mono bg-white border-2 border-black text-black py-2 px-4 font-semibold hover:bg-gray-100"
                                    >
                                        + Add Another Link
                                    </button>
                                </div>
                            )}
                        </div>
                    </fieldset>

                    <fieldset className="border-2 border-dashed border-red-600 p-4 bg-red-50">
                        <legend className="text-lg font-mono font-semibold px-2 text-red-800">Danger Zone</legend>
                        <div className="space-y-4">
                            <div>
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
                                    className="font-mono bg-red-700 border-2 border-black text-white cursor-pointer py-2 px-4 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                                </button>
                            </div>
                        </div>
                    </fieldset>
                </div>
            </div>

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