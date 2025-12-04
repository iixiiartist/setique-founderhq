import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  ListTodo,
  Briefcase,
  FileText,
  Users,
  Trophy,
  Moon,
  Clock,
  Save,
  X,
  Monitor,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../lib/services/notificationPreferencesService';
import { desktopNotificationService } from '../../lib/services/desktopNotificationService';
import { showSuccess, showError } from '../../lib/utils/toast';

// ============================================
// TYPES
// ============================================

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

// ============================================
// TOGGLE COMPONENT
// ============================================

const SettingToggle: React.FC<SettingToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1">
      <label className="font-medium text-sm">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-black' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  
  // Desktop notification state
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Load preferences and desktop notification state
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user || !isOpen) return;

      setLoading(true);
      
      // Load notification preferences
      const { preferences: prefs, error } = await getNotificationPreferences(
        user.id,
        workspace?.id
      );

      if (error) {
        showError('Failed to load notification settings');
      } else {
        setPreferences(prefs);
      }
      
      // Load desktop notification state
      if (workspace?.id) {
        await desktopNotificationService.initialize(user.id, workspace.id);
        setDesktopEnabled(desktopNotificationService.isEnabled());
        setDesktopPermission(desktopNotificationService.getPermission());
      }
      
      setLoading(false);
    };

    loadPreferences();
  }, [user, workspace, isOpen]);

  // Handle desktop notification toggle
  const handleDesktopToggle = async (enabled: boolean) => {
    if (enabled && desktopPermission !== 'granted') {
      setRequestingPermission(true);
      const permission = await desktopNotificationService.requestPermission();
      setDesktopPermission(permission);
      setRequestingPermission(false);
      
      if (permission !== 'granted') {
        showError('Desktop notifications were denied. You can enable them in your browser settings.');
        return;
      }
    }
    
    const success = await desktopNotificationService.setEnabled(enabled);
    if (success) {
      setDesktopEnabled(enabled);
    } else {
      showError('Failed to update desktop notification settings');
    }
  };

  // Save preferences
  const handleSave = async () => {
    if (!user || !preferences) return;

    setSaving(true);
    const { error } = await updateNotificationPreferences(
      user.id,
      {
        inAppEnabled: preferences.inAppEnabled,
        emailEnabled: preferences.emailEnabled,
        emailFrequency: preferences.emailFrequency,
        emailDigestTime: preferences.emailDigestTime,
        emailDigestDay: preferences.emailDigestDay,
        notifyMentions: preferences.notifyMentions,
        notifyComments: preferences.notifyComments,
        notifyTaskAssignments: preferences.notifyTaskAssignments,
        notifyTaskUpdates: preferences.notifyTaskUpdates,
        notifyTaskDueSoon: preferences.notifyTaskDueSoon,
        notifyTaskOverdue: preferences.notifyTaskOverdue,
        notifyDealUpdates: preferences.notifyDealUpdates,
        notifyDealWon: preferences.notifyDealWon,
        notifyDealLost: preferences.notifyDealLost,
        notifyDocumentShares: preferences.notifyDocumentShares,
        notifyTeamUpdates: preferences.notifyTeamUpdates,
        notifyAchievements: preferences.notifyAchievements,
        notifyAgentUpdates: (preferences as any).notifyAgentUpdates ?? true,
        notifyMarketBriefs: (preferences as any).notifyMarketBriefs ?? true,
        notifySyncUpdates: (preferences as any).notifySyncUpdates ?? false,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
      },
      workspace?.id
    );

    if (error) {
      showError('Failed to save notification settings');
    } else {
      showSuccess('Notification settings saved');
      onClose();
    }
    setSaving(false);
  };

  // Update local preference
  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences((prev) =>
      prev ? { ...prev, [key]: value } : null
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[85vh] bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <h2 className="text-xl font-bold">Notification Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:text-black rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="relative w-8 h-8 inline-block">
                <span className="absolute inset-0 border-2 border-gray-400 animate-spin" style={{ animationDuration: '1.2s' }} />
                <span className="absolute inset-0.5 border border-gray-300 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
              </span>
            </div>
          ) : preferences ? (
            <div className="space-y-6">
              {/* Global Settings */}
              <section>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Channels
                </h3>
                <div className="rounded-xl border border-gray-200 p-4 space-y-1">
                  <SettingToggle
                    label="In-App Notifications"
                    description="Show notifications within the app"
                    checked={preferences.inAppEnabled}
                    onChange={(v) => updatePreference('inAppEnabled', v)}
                  />
                  
                  {/* Desktop Notifications */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <label className="font-medium text-sm">Desktop Notifications</label>
                        {desktopPermission === 'denied' && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Blocked</span>
                        )}
                        {desktopPermission === 'default' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Not Set</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Get browser notifications even when the app isn't focused
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDesktopToggle(!desktopEnabled)}
                      disabled={requestingPermission || desktopPermission === 'denied'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        requestingPermission || desktopPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${desktopEnabled && desktopPermission === 'granted' ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          desktopEnabled && desktopPermission === 'granted' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {desktopPermission === 'denied' && (
                    <p className="text-xs text-red-600 pl-0 mt-1">
                      Desktop notifications are blocked. Enable them in your browser settings.
                    </p>
                  )}
                  
                  <SettingToggle
                    label="Email Notifications"
                    description="Receive notifications via email"
                    checked={preferences.emailEnabled}
                    onChange={(v) => updatePreference('emailEnabled', v)}
                  />
                  
                  {preferences.emailEnabled && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-300">
                      <label className="block text-sm font-medium mb-2">Email Frequency</label>
                      <select
                        value={preferences.emailFrequency}
                        onChange={(e) => updatePreference('emailFrequency', e.target.value as NotificationPreferences['emailFrequency'])}
                        className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="instant">Instant (as they happen)</option>
                        <option value="daily">Daily digest</option>
                        <option value="weekly">Weekly digest</option>
                        <option value="never">Never</option>
                      </select>
                      
                      {(preferences.emailFrequency === 'daily' || preferences.emailFrequency === 'weekly') && (
                        <div className="mt-3 flex gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Time</label>
                            <input
                              type="time"
                              value={preferences.emailDigestTime}
                              onChange={(e) => updatePreference('emailDigestTime', e.target.value)}
                              className="p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          {preferences.emailFrequency === 'weekly' && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Day</label>
                              <select
                                value={preferences.emailDigestDay}
                                onChange={(e) => updatePreference('emailDigestDay', parseInt(e.target.value))}
                                className="p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                                <option value="0">Sunday</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Quiet Hours */}
              <section>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Moon className="w-5 h-5" />
                  Quiet Hours
                </h3>
                <div className="rounded-xl border border-gray-200 p-4">
                  <SettingToggle
                    label="Enable Quiet Hours"
                    description="Pause in-app notifications during specific times"
                    checked={preferences.quietHoursEnabled}
                    onChange={(v) => updatePreference('quietHoursEnabled', v)}
                  />
                  
                  {preferences.quietHoursEnabled && (
                    <div className="mt-3 flex gap-4 pl-4 border-l-2 border-gray-300">
                      <div>
                        <label className="block text-sm font-medium mb-1">From</label>
                        <input
                          type="time"
                          value={preferences.quietHoursStart}
                          onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                          className="p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">To</label>
                        <input
                          type="time"
                          value={preferences.quietHoursEnd}
                          onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                          className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Notification Types */}
              <section>
                <h3 className="text-lg font-bold mb-3">Notification Types</h3>
                
                {/* Mentions & Comments */}
                <div className="rounded-xl border border-gray-200 p-4 mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-blue-600">
                    <MessageSquare className="w-4 h-4" />
                    Mentions & Comments
                  </h4>
                  <div className="space-y-1">
                    <SettingToggle
                      label="@Mentions"
                      description="When someone mentions you"
                      checked={preferences.notifyMentions}
                      onChange={(v) => updatePreference('notifyMentions', v)}
                    />
                    <SettingToggle
                      label="Comments"
                      description="New comments on your items"
                      checked={preferences.notifyComments}
                      onChange={(v) => updatePreference('notifyComments', v)}
                    />
                  </div>
                </div>

                {/* Tasks */}
                <div className="rounded-xl border border-gray-200 p-4 mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-purple-600">
                    <ListTodo className="w-4 h-4" />
                    Tasks
                  </h4>
                  <div className="space-y-1">
                    <SettingToggle
                      label="Task Assignments"
                      description="When a task is assigned to you"
                      checked={preferences.notifyTaskAssignments}
                      onChange={(v) => updatePreference('notifyTaskAssignments', v)}
                    />
                    <SettingToggle
                      label="Task Updates"
                      description="Changes to your tasks"
                      checked={preferences.notifyTaskUpdates}
                      onChange={(v) => updatePreference('notifyTaskUpdates', v)}
                    />
                    <SettingToggle
                      label="Due Soon Reminders"
                      description="Tasks due within 24 hours"
                      checked={preferences.notifyTaskDueSoon}
                      onChange={(v) => updatePreference('notifyTaskDueSoon', v)}
                    />
                    <SettingToggle
                      label="Overdue Alerts"
                      description="Tasks past their due date"
                      checked={preferences.notifyTaskOverdue}
                      onChange={(v) => updatePreference('notifyTaskOverdue', v)}
                    />
                  </div>
                </div>

                {/* Deals */}
                <div className="rounded-xl border border-gray-200 p-4 mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-green-600">
                    <Briefcase className="w-4 h-4" />
                    Deals & CRM
                  </h4>
                  <div className="space-y-1">
                    <SettingToggle
                      label="Deal Updates"
                      description="Stage changes and updates"
                      checked={preferences.notifyDealUpdates}
                      onChange={(v) => updatePreference('notifyDealUpdates', v)}
                    />
                    <SettingToggle
                      label="Deal Won"
                      description="Celebrate closed deals"
                      checked={preferences.notifyDealWon}
                      onChange={(v) => updatePreference('notifyDealWon', v)}
                    />
                    <SettingToggle
                      label="Deal Lost"
                      description="Lost deal notifications"
                      checked={preferences.notifyDealLost}
                      onChange={(v) => updatePreference('notifyDealLost', v)}
                    />
                  </div>
                </div>

                {/* Documents */}
                <div className="rounded-xl border border-gray-200 p-4 mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-indigo-600">
                    <FileText className="w-4 h-4" />
                    Documents
                  </h4>
                  <div className="space-y-1">
                    <SettingToggle
                      label="Document Shares"
                      description="When documents are shared with you"
                      checked={preferences.notifyDocumentShares}
                      onChange={(v) => updatePreference('notifyDocumentShares', v)}
                    />
                  </div>
                </div>

                {/* Team */}
                <div className="rounded-xl border border-gray-200 p-4 mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-teal-600">
                    <Users className="w-4 h-4" />
                    Team
                  </h4>
                  <div className="space-y-1">
                    <SettingToggle
                      label="Team Updates"
                      description="New members, role changes"
                      checked={preferences.notifyTeamUpdates}
                      onChange={(v) => updatePreference('notifyTeamUpdates', v)}
                    />
                  </div>
                </div>

                {/* Achievements */}
                <div className="rounded-xl border border-gray-200 p-4 mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-amber-600">
                    <Trophy className="w-4 h-4" />
                    Achievements
                  </h4>
                  <div className="space-y-1">
                    <SettingToggle
                      label="Achievement Unlocks"
                      description="New badges and milestones"
                      checked={preferences.notifyAchievements}
                      onChange={(v) => updatePreference('notifyAchievements', v)}
                    />
                  </div>
                </div>

                {/* AI Agents & Background Jobs */}
                <div className="rounded-xl border border-gray-200 p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-cyan-600">
                    <Bot className="w-4 h-4" />
                    AI Agents & Sync
                  </h4>
                  <div className="space-y-1">
                    <SettingToggle
                      label="Research Agent Reports"
                      description="When AI research jobs complete or fail"
                      checked={(preferences as any).notifyAgentUpdates ?? true}
                      onChange={(v) => updatePreference('notifyAgentUpdates' as any, v)}
                    />
                    <SettingToggle
                      label="Market Briefs"
                      description="When new market briefs are generated"
                      checked={(preferences as any).notifyMarketBriefs ?? true}
                      onChange={(v) => updatePreference('notifyMarketBriefs' as any, v)}
                    />
                    <SettingToggle
                      label="Sync Notifications"
                      description="Background sync status updates"
                      checked={(preferences as any).notifySyncUpdates ?? false}
                      onChange={(v) => updatePreference('notifySyncUpdates' as any, v)}
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Unable to load notification settings</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !preferences}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="relative w-4 h-4 inline-block">
                <span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} />
                <span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
              </span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationSettings;
