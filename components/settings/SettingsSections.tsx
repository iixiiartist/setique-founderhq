import React from 'react';
import { showError } from '../../lib/utils/toast';

interface SubscriptionSectionProps {
    planType: string;
    stripeCustomerId: string | undefined;
    onUpgradeClick: () => void;
    onManageSubscription: () => Promise<void>;
}

export function SubscriptionSection({ 
    planType, 
    stripeCustomerId, 
    onUpgradeClick,
    onManageSubscription 
}: SubscriptionSectionProps) {
    const subscriptionDescription = (() => {
        switch (planType) {
            case 'team-pro':
                return 'Team Pro unlocks unlimited Copilot access, automations, storage, and seat management for your entire workspace.';
            default:
                return 'Free plan includes 25 Copilot requests per month (resets monthly) plus unlimited documents and storage. Upgrade for unlimited AI throughput and automations.';
        }
    })();

    const formattedPlanName = planType.split('-').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-bold text-black mb-2">
                    Current Plan: {formattedPlanName}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    {subscriptionDescription}
                </p>
                <div className="flex flex-wrap gap-3">
                    {planType !== 'team-pro' && (
                        <button
                            onClick={onUpgradeClick}
                            className="font-mono bg-blue-600 border border-gray-300 text-white cursor-pointer py-2 px-6 rounded-md font-semibold transition-colors hover:bg-blue-700"
                        >
                            Upgrade Plan
                        </button>
                    )}
                    {stripeCustomerId && (
                        <button
                            onClick={onManageSubscription}
                            className="font-mono bg-gray-800 border border-gray-300 text-white cursor-pointer py-2 px-6 rounded-md font-semibold transition-colors hover:bg-gray-900"
                        >
                            Manage Subscription
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

interface NotificationsSectionProps {
    desktopNotifications: boolean;
    notificationPermission: NotificationPermission;
    onSettingChange: (key: string, value: boolean) => void;
    onRequestPermission: () => Promise<void>;
}

export function NotificationsSection({ 
    desktopNotifications, 
    notificationPermission,
    onSettingChange,
    onRequestPermission 
}: NotificationsSectionProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked && notificationPermission !== 'granted') {
            onRequestPermission();
        } else {
            onSettingChange('desktopNotifications', e.target.checked);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="desktop-notifications"
                        type="checkbox"
                        checked={desktopNotifications && notificationPermission === 'granted'}
                        onChange={handleChange}
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
                            <span className="block font-bold text-red-600 mt-1">
                                Permission denied. You must enable notifications in your browser settings.
                            </span>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

interface DangerZoneSectionProps {
    userEmail: string | undefined;
    isDeleting: boolean;
    onDeleteAccount: () => void;
}

export function DangerZoneSection({ userEmail, isDeleting, onDeleteAccount }: DangerZoneSectionProps) {
    return (
        <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-bold text-red-800 mb-2">Delete Account</h3>
                <p className="text-sm text-gray-700 mb-2">
                    Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <p className="text-xs text-gray-600 mb-4">
                    Email: <span className="font-mono font-semibold">{userEmail}</span>
                </p>
                <button
                    onClick={onDeleteAccount}
                    disabled={isDeleting}
                    className="font-mono bg-red-700 border border-red-800 text-white cursor-pointer py-2 px-4 rounded-md font-semibold transition-colors hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                </button>
            </div>
        </div>
    );
}
