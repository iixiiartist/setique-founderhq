import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { fetchOrCreateAutomationPreferences } from '../../lib/services/automationService';

interface AutomationPreferences {
    workspace_id: string;
    auto_create_revenue_enabled: boolean;
    auto_create_tasks_enabled: boolean;
    auto_invoice_enabled: boolean;
    auto_notifications_enabled: boolean;
    inventory_reorder_threshold: number;
    contract_renewal_lead_time_days: number;
    deal_follow_up_days: number;
    notification_preferences: {
        deal_closed: boolean;
        revenue_created: boolean;
        inventory_low: boolean;
        contract_expiring: boolean;
        automation_failed: boolean;
    };
    automation_enabled: boolean;
    max_automations_per_hour: number;
}

interface AutomationSettingsProps {
    workspaceId: string;
}

export function AutomationSettings({ workspaceId }: AutomationSettingsProps) {
    const [preferences, setPreferences] = useState<AutomationPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    async function loadPreferences() {
        try {
            setIsLoading(true);
            const data = await fetchOrCreateAutomationPreferences(workspaceId);

            if (!data) {
                throw new Error('Preferences unavailable');
            }

            setPreferences(data);
            setHasChanges(false);
        } catch (error) {
            logger.error('Error loading preferences:', error);
            setSaveMessage({ type: 'error', text: 'Failed to load preferences' });
        } finally {
            setIsLoading(false);
        }
    }

    // Load preferences on mount
    useEffect(() => {
        loadPreferences();
    }, [workspaceId]);

    async function savePreferences() {
        if (!preferences) return;

        try {
            setIsSaving(true);
            setSaveMessage(null);

            const { error } = await supabase
                .from('automation_preferences')
                .update({
                    auto_create_revenue_enabled: preferences.auto_create_revenue_enabled,
                    auto_create_tasks_enabled: preferences.auto_create_tasks_enabled,
                    auto_invoice_enabled: preferences.auto_invoice_enabled,
                    auto_notifications_enabled: preferences.auto_notifications_enabled,
                    inventory_reorder_threshold: preferences.inventory_reorder_threshold,
                    contract_renewal_lead_time_days: preferences.contract_renewal_lead_time_days,
                    deal_follow_up_days: preferences.deal_follow_up_days,
                    notification_preferences: preferences.notification_preferences,
                    automation_enabled: preferences.automation_enabled,
                    max_automations_per_hour: preferences.max_automations_per_hour,
                })
                .eq('workspace_id', workspaceId);

            if (error) {
                logger.error('Failed to save automation preferences:', error);
                throw error;
            }

            setHasChanges(false);
            setSaveMessage({ type: 'success', text: 'Preferences saved successfully!' });
            
            // Clear success message after 3 seconds
            setTimeout(() => setSaveMessage(null), 3000);

            logger.info('Automation preferences updated', { workspaceId });
        } catch (error) {
            logger.error('Error saving preferences:', error);
            setSaveMessage({ type: 'error', text: 'Failed to save preferences' });
        } finally {
            setIsSaving(false);
        }
    }

    function updatePreference<K extends keyof AutomationPreferences>(
        key: K,
        value: AutomationPreferences[K]
    ) {
        if (!preferences) return;
        setPreferences({ ...preferences, [key]: value });
        setHasChanges(true);
    }

    function updateNotificationPreference(key: string, value: boolean) {
        if (!preferences) return;
        setPreferences({
            ...preferences,
            notification_preferences: {
                ...preferences.notification_preferences,
                [key]: value,
            },
        });
        setHasChanges(true);
    }

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent"></div>
                <p className="mt-4 font-mono text-sm text-gray-600">Loading automation settings...</p>
            </div>
        );
    }

    if (!preferences) {
        return (
            <div className="p-8 text-center">
                <p className="font-mono text-red-600">Failed to load automation preferences.</p>
                <button
                    onClick={loadPreferences}
                    className="mt-4 px-4 py-2 bg-black text-white font-mono font-semibold border-2 border-black"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Save Message */}
            {saveMessage && (
                <div
                    className={`p-4 border-2 border-black font-mono text-sm ${
                        saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}
                >
                    {saveMessage.text}
                </div>
            )}

            {/* Global Toggle */}
            <fieldset className="border-2 border-black p-6 bg-yellow-50">
                <legend className="text-lg font-mono font-bold px-2 text-black">🔌 Global Automation Control</legend>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.automation_enabled}
                                onChange={(e) => updatePreference('automation_enabled', e.target.checked)}
                                className="w-5 h-5 border-2 border-black"
                            />
                            <div>
                                <span className="font-mono font-bold text-black">Enable All Automations</span>
                                <p className="text-sm text-gray-700 mt-1">
                                    Master switch for all automation features. When disabled, no automations will run.
                                </p>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block font-mono font-bold text-black mb-2">
                            Max Automations Per Hour
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="1000"
                            value={preferences.max_automations_per_hour}
                            onChange={(e) => updatePreference('max_automations_per_hour', parseInt(e.target.value) || 100)}
                            className="w-32 border-2 border-black px-3 py-2 font-mono"
                            disabled={!preferences.automation_enabled}
                        />
                        <p className="text-sm text-gray-600 mt-1">
                            Rate limit for total automation executions per hour (1-1000)
                        </p>
                    </div>
                </div>
            </fieldset>

            {/* Feature Toggles */}
            <fieldset className="border-2 border-black p-6">
                <legend className="text-lg font-mono font-bold px-2 text-black">⚙️ Automation Features</legend>
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.auto_create_revenue_enabled}
                            onChange={(e) => updatePreference('auto_create_revenue_enabled', e.target.checked)}
                            disabled={!preferences.automation_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Auto-Create Revenue</span>
                            <p className="text-sm text-gray-600">Automatically create revenue records when deals close</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.auto_create_tasks_enabled}
                            onChange={(e) => updatePreference('auto_create_tasks_enabled', e.target.checked)}
                            disabled={!preferences.automation_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Auto-Create Tasks</span>
                            <p className="text-sm text-gray-600">Automatically create follow-up tasks based on triggers</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.auto_invoice_enabled}
                            onChange={(e) => updatePreference('auto_invoice_enabled', e.target.checked)}
                            disabled={!preferences.automation_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Auto-Invoice Generation</span>
                            <p className="text-sm text-gray-600">Automatically generate invoices for completed deals</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.auto_notifications_enabled}
                            onChange={(e) => updatePreference('auto_notifications_enabled', e.target.checked)}
                            disabled={!preferences.automation_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Auto-Notifications</span>
                            <p className="text-sm text-gray-600">Send automated notifications for important events</p>
                        </div>
                    </label>
                </div>
            </fieldset>

            {/* Thresholds & Timings */}
            <fieldset className="border-2 border-black p-6">
                <legend className="text-lg font-mono font-bold px-2 text-black">⏱️ Thresholds & Timings</legend>
                <div className="space-y-4">
                    <div>
                        <label className="block font-mono font-semibold mb-2">
                            Inventory Reorder Threshold
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="1000"
                                value={preferences.inventory_reorder_threshold}
                                onChange={(e) => updatePreference('inventory_reorder_threshold', parseInt(e.target.value) || 10)}
                                disabled={!preferences.automation_enabled}
                                className="w-32 border-2 border-black px-3 py-2 font-mono"
                            />
                            <span className="text-sm text-gray-600">units</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            Trigger low inventory alert when quantity falls below this number
                        </p>
                    </div>

                    <div>
                        <label className="block font-mono font-semibold mb-2">
                            Contract Renewal Lead Time
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={preferences.contract_renewal_lead_time_days}
                                onChange={(e) => updatePreference('contract_renewal_lead_time_days', parseInt(e.target.value) || 30)}
                                disabled={!preferences.automation_enabled}
                                className="w-32 border-2 border-black px-3 py-2 font-mono"
                            />
                            <span className="text-sm text-gray-600">days</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            Send renewal reminders this many days before contract expiration
                        </p>
                    </div>

                    <div>
                        <label className="block font-mono font-semibold mb-2">
                            Deal Follow-Up Time
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="90"
                                value={preferences.deal_follow_up_days}
                                onChange={(e) => updatePreference('deal_follow_up_days', parseInt(e.target.value) || 7)}
                                disabled={!preferences.automation_enabled}
                                className="w-32 border-2 border-black px-3 py-2 font-mono"
                            />
                            <span className="text-sm text-gray-600">days</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            Auto-create follow-up tasks this many days after deal activity
                        </p>
                    </div>
                </div>
            </fieldset>

            {/* Notification Preferences */}
            <fieldset className="border-2 border-black p-6">
                <legend className="text-lg font-mono font-bold px-2 text-black">🔔 Notification Preferences</legend>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Choose which automated notifications you want to receive
                    </p>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.notification_preferences.deal_closed}
                            onChange={(e) => updateNotificationPreference('deal_closed', e.target.checked)}
                            disabled={!preferences.automation_enabled || !preferences.auto_notifications_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Deal Closed</span>
                            <p className="text-sm text-gray-600">Notify when a deal is marked as closed/won</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.notification_preferences.revenue_created}
                            onChange={(e) => updateNotificationPreference('revenue_created', e.target.checked)}
                            disabled={!preferences.automation_enabled || !preferences.auto_notifications_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Revenue Created</span>
                            <p className="text-sm text-gray-600">Notify when revenue is automatically created</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.notification_preferences.inventory_low}
                            onChange={(e) => updateNotificationPreference('inventory_low', e.target.checked)}
                            disabled={!preferences.automation_enabled || !preferences.auto_notifications_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Low Inventory</span>
                            <p className="text-sm text-gray-600">Notify when inventory falls below threshold</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.notification_preferences.contract_expiring}
                            onChange={(e) => updateNotificationPreference('contract_expiring', e.target.checked)}
                            disabled={!preferences.automation_enabled || !preferences.auto_notifications_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Contract Expiring</span>
                            <p className="text-sm text-gray-600">Notify when contracts are approaching renewal date</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.notification_preferences.automation_failed}
                            onChange={(e) => updateNotificationPreference('automation_failed', e.target.checked)}
                            disabled={!preferences.automation_enabled || !preferences.auto_notifications_enabled}
                            className="w-5 h-5 border-2 border-black"
                        />
                        <div>
                            <span className="font-mono font-semibold">Automation Failed</span>
                            <p className="text-sm text-gray-600">Notify when an automation fails to execute (Recommended)</p>
                        </div>
                    </label>
                </div>
            </fieldset>

            {/* Save Button */}
            <div className="flex items-center gap-4 pt-4">
                <button
                    onClick={savePreferences}
                    disabled={!hasChanges || isSaving}
                    className={`font-mono border-2 border-black py-3 px-8 font-bold shadow-neo-btn transition-all ${
                        hasChanges && !isSaving
                            ? 'bg-green-600 text-white hover:bg-green-700 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none cursor-pointer'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
                </button>

                {hasChanges && (
                    <button
                        onClick={loadPreferences}
                        disabled={isSaving}
                        className="font-mono bg-white border-2 border-black text-black py-3 px-6 font-semibold hover:bg-gray-100"
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* Info Footer */}
            <div className="bg-blue-50 border-2 border-blue-300 p-4">
                <p className="text-sm font-mono text-blue-900">
                    💡 <strong>Tip:</strong> Changes take effect immediately. All automation rules will respect these preferences.
                </p>
            </div>
        </div>
    );
}
