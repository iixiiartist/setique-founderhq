// components/huddle/RoomSettingsModal.tsx
// Modal for room settings including delete/archive functionality

import React, { useState } from 'react';
import { X, Trash2, Settings, Users, Bot, Archive, AlertTriangle, Sparkles, ClipboardList } from 'lucide-react';
import type { HuddleRoom, HuddleRoomSettings } from '../../types/huddle';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: HuddleRoom;
  onUpdateSettings: (settings: Partial<HuddleRoomSettings>) => Promise<void>;
  onArchive: () => Promise<void>;
  isLoading?: boolean;
  currentUserId?: string;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  room,
  onUpdateSettings,
  onArchive,
  isLoading = false,
  currentUserId,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(room.settings?.ai_allowed ?? true);
  const [aiCanWrite, setAiCanWrite] = useState(room.settings?.ai_can_write ?? true);
  const [autoSummarize, setAutoSummarize] = useState(room.settings?.auto_summarize ?? false);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = room.created_by === currentUserId;
  const isAdmin = room.members?.some(m => m.user_id === currentUserId && m.role === 'admin');
  const canManage = isOwner || isAdmin;

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        ai_allowed: aiAllowed,
        ai_can_write: aiCanWrite,
        auto_summarize: autoSummarize,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setIsSaving(true);
    try {
      await onArchive();
      onClose();
    } catch (error) {
      console.error('Failed to archive room:', error);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings size={24} className="text-gray-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {room.type === 'channel' ? 'Channel Settings' : 'Conversation Settings'}
                </h2>
                <p className="text-sm text-gray-500">
                  {room.type === 'channel' ? `#${room.name}` : 'Direct Message'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Room Info */}
            {room.type === 'channel' && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span>📝</span> About
                </h3>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-600">
                    {room.description || 'No description set'}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {room.members?.length || 0} members
                    </span>
                    <span>
                      {room.is_private ? '🔒 Private' : '🌐 Public'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Bot size={16} />
                AI Settings
              </h3>
              
              {/* AI Allowed Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Enable AI Assistant
                    </div>
                    <div className="text-xs text-gray-500">
                      Allow AI to be invoked in this {room.type === 'channel' ? 'channel' : 'conversation'}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiAllowed}
                    onChange={(e) => setAiAllowed(e.target.checked)}
                    disabled={!canManage}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 peer-disabled:opacity-50"></div>
                </label>
              </div>

              {/* AI Can Write Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      AI Write Actions
                    </div>
                    <div className="text-xs text-gray-500">
                      Allow AI to create tasks, contacts, expenses, etc.
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiCanWrite}
                    onChange={(e) => setAiCanWrite(e.target.checked)}
                    disabled={!canManage || !aiAllowed}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 peer-disabled:opacity-50"></div>
                </label>
              </div>

              {/* Auto Summarize Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Auto-summarize
                    </div>
                    <div className="text-xs text-gray-500">
                      Automatically generate daily summaries
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSummarize}
                    onChange={(e) => setAutoSummarize(e.target.checked)}
                    disabled={!canManage || !aiAllowed}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 peer-disabled:opacity-50"></div>
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            {canManage && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Danger Zone
                </h3>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Archive size={18} />
                    Archive {room.type === 'channel' ? 'Channel' : 'Conversation'}
                  </button>
                ) : (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Trash2 size={20} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          Are you sure you want to archive this {room.type === 'channel' ? 'channel' : 'conversation'}?
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          This will hide it from everyone. Messages will be preserved but the room will no longer be accessible.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleArchive}
                        disabled={isSaving}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 transition-colors text-sm font-semibold"
                      >
                        {isSaving ? 'Archiving...' : 'Yes, Archive'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!canManage && (
              <p className="text-xs text-gray-400 text-center">
                Only admins can modify these settings
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-all shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving || !canManage}
              className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomSettingsModal;
