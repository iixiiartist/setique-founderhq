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
    const isPaidPlan = planType === 'team-pro';
    
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
        <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                            Current Plan: {formattedPlanName}
                        </h3>
                        {isPaidPlan && (
                            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                Active
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                    {subscriptionDescription}
                </p>
                
                <div className="flex flex-wrap gap-3">
                    {!isPaidPlan && (
                        <button
                            onClick={onUpgradeClick}
                            className="bg-slate-900 border border-slate-900 text-white cursor-pointer py-2 px-6 rounded-xl font-medium transition-colors hover:bg-slate-800"
                        >
                            Upgrade to Team Pro
                        </button>
                    )}
                    
                    {isPaidPlan && (
                        <button
                            onClick={onUpgradeClick}
                            className="bg-white border border-slate-200 text-slate-700 cursor-pointer py-2 px-6 rounded-xl font-medium transition-colors hover:bg-slate-50"
                        >
                            View Other Plans
                        </button>
                    )}
                </div>
            </div>

            {/* Billing Management Card - Show for paid plans */}
            {isPaidPlan && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h4 className="font-semibold text-slate-900 mb-2">Billing & Payment</h4>
                    <p className="text-sm text-slate-600 mb-4">
                        {stripeCustomerId 
                            ? 'Manage your payment method, view invoices, update billing details, or cancel your subscription.'
                            : 'Your plan was activated manually. Contact support to manage billing or make changes to your subscription.'}
                    </p>
                    {stripeCustomerId ? (
                        <button
                            onClick={onManageSubscription}
                            className="bg-slate-900 border border-slate-900 text-white cursor-pointer py-2 px-6 rounded-xl font-medium transition-colors hover:bg-slate-800"
                        >
                            Manage Billing
                        </button>
                    ) : (
                        <a
                            href="mailto:support@setique.com?subject=Billing%20Inquiry"
                            className="inline-block bg-slate-900 border border-slate-900 text-white py-2 px-6 rounded-xl font-medium transition-colors hover:bg-slate-800"
                        >
                            Contact Support
                        </a>
                    )}
                </div>
            )}

            {/* Help Section */}
            <div className="text-sm text-gray-500">
                <p>
                    Need help with your subscription?{' '}
                    <a 
                        href="mailto:support@setique.com" 
                        className="text-blue-600 hover:underline"
                    >
                        Contact support
                    </a>
                </p>
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
                        className="focus:ring-slate-500 h-5 w-5 text-slate-900 border border-slate-300 rounded accent-slate-900"
                        aria-describedby="desktop-notifications-description"
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="desktop-notifications" className="font-medium text-slate-900">
                        Desktop Notifications
                    </label>
                    <p id="desktop-notifications-description" className="text-slate-600">
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <h3 className="font-semibold text-red-800 mb-2">Delete Account</h3>
                <p className="text-sm text-slate-700 mb-2">
                    Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <p className="text-xs text-slate-600 mb-4">
                    Email: <span className="font-medium">{userEmail}</span>
                </p>
                <button
                    onClick={onDeleteAccount}
                    disabled={isDeleting}
                    className="bg-red-600 border border-red-700 text-white cursor-pointer py-2 px-4 rounded-xl font-medium transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                </button>
            </div>
        </div>
    );
}
