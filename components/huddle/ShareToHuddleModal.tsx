// components/huddle/ShareToHuddleModal.tsx
// Modal for sharing items from other tabs to Huddle channels

import React, { useState, useEffect } from 'react';
import { useHuddleRooms, useSendMessage } from '../../hooks/useHuddle';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { HuddleRoom, ShareToHuddlePayload, HuddleLinkedEntities } from '../../types/huddle';

interface ShareToHuddleModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: ShareToHuddlePayload | null;
  onSuccess?: () => void;
}

export const ShareToHuddleModal: React.FC<ShareToHuddleModalProps> = ({
  isOpen,
  onClose,
  payload,
  onSuccess,
}) => {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [askAI, setAskAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { data: rooms = [], isLoading: roomsLoading, error: roomsError } = useHuddleRooms(workspaceId);
  const sendMessage = useSendMessage();

  // Filter to only channels (not DMs) for sharing
  const channels = rooms.filter(r => r.type === 'channel');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && payload) {
      setMessage(getDefaultMessage(payload));
      setAskAI(payload.askAi || false);
      setAiPrompt(payload.aiPrompt || '');
      setSelectedRoomId(null);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, payload]);

  // Auto-select first channel if only one available
  useEffect(() => {
    if (isOpen && channels.length === 1 && !selectedRoomId) {
      setSelectedRoomId(channels[0].id);
    }
  }, [isOpen, channels, selectedRoomId]);

  // Generate default message based on payload type
  const getDefaultMessage = (p: ShareToHuddlePayload): string => {
    const emoji = getTypeEmoji(p.type);
    let msg = `${emoji} **${p.title}**`;
    
    if (p.description) {
      msg += `\n\n${p.description}`;
    }
    
    // Add type-specific details
    if (p.type === 'calendar_event' && p.preview?.snippet) {
      msg += `\n\n📅 ${p.preview.snippet}`;
    }
    
    return msg;
  };

  // Get emoji for type
  const getTypeEmoji = (type: string): string => {
    switch (type) {
      case 'task': return '✅';
      case 'contact': return '👤';
      case 'deal': return '💰';
      case 'document': return '📄';
      case 'form': return '📝';
      case 'file': return '📁';
      case 'calendar_event': return '📅';
      case 'account': return '🏢';
      case 'expense': return '💸';
      case 'revenue': return '💵';
      case 'marketing_campaign': return '📢';
      default: return '📌';
    }
  };

  // Get type label
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'task': return 'Task';
      case 'contact': return 'Contact';
      case 'deal': return 'Deal';
      case 'document': return 'Document';
      case 'form': return 'Form';
      case 'file': return 'File';
      case 'calendar_event': return 'Calendar Event';
      case 'account': return 'Account';
      case 'expense': return 'Expense';
      case 'revenue': return 'Revenue';
      case 'marketing_campaign': return 'Campaign';
      default: return 'Item';
    }
  };

  // Handle send
  const handleSend = async () => {
    // Validation
    if (!selectedRoomId) {
      setError('Please select a channel');
      return;
    }
    if (!payload) {
      setError('No item to share');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }
    
    setError(null);
    setSending(true);
    
    try {
      // Build linked entities based on the payload type
      const linked_entities: HuddleLinkedEntities = {};
      
      // Map payload type to the correct linked entity key
      const typeToKeyMap: Record<string, keyof HuddleLinkedEntities> = {
        'task': 'tasks',
        'contact': 'contacts',
        'deal': 'deals',
        'document': 'documents',
        'form': 'forms',
        'file': 'files',
        'account': 'accounts',
        'expense': 'expenses',
        'revenue': 'revenue',
        'calendar_event': 'calendar_events',
        'marketing_campaign': 'marketing_campaigns',
      };
      
      const key = typeToKeyMap[payload.type];
      if (key) {
        linked_entities[key] = [payload.id];
      }
      
      // Send the message
      await sendMessage.mutateAsync({
        room_id: selectedRoomId,
        body: message.trim(),
        body_format: 'markdown',
        linked_entities: Object.keys(linked_entities).length > 0 ? linked_entities : undefined,
      });
      
      setSuccess(true);
      onSuccess?.();
      
      // Close modal after brief success feedback
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to share to Huddle:', err);
      setError(err?.message || 'Failed to share. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !payload) return null;

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-900 to-slate-800">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              Share to Huddle
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Share this {getTypeLabel(payload.type).toLowerCase()} with your team
            </p>
          </div>

          {/* Preview */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getTypeEmoji(payload.type)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{payload.title}</h3>
                {payload.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">{payload.description}</p>
                )}
                {payload.preview?.snippet && (
                  <p className="text-xs text-gray-400 mt-1">{payload.preview.snippet}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
                <span>✓</span> Shared successfully!
              </div>
            )}

            {/* Channel selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select channel *
              </label>
              {roomsLoading ? (
                <div className="text-center py-4 text-gray-400 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-slate-500 rounded-full animate-spin" />
                  Loading channels...
                </div>
              ) : roomsError ? (
                <div className="text-center py-4 text-red-500">
                  Failed to load channels. Please try again.
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No channels available. Create a channel in Huddle first.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto">
                  {channels.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setError(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                        selectedRoomId === room.id
                          ? 'border-slate-400 bg-slate-50 ring-2 ring-slate-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white'
                      }`}
                    >
                      <span className={selectedRoomId === room.id ? 'text-slate-700' : 'text-gray-500'}>
                        {room.is_private ? '🔒' : '#'}
                      </span>
                      <span className={`font-medium ${selectedRoomId === room.id ? 'text-slate-900' : 'text-gray-900'}`}>
                        {room.name}
                      </span>
                      {selectedRoomId === room.id && (
                        <span className="ml-auto text-slate-700 font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message to share with this item..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none resize-none transition-all"
              />
            </div>

            {/* Ask AI toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-lg">AI</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Ask AI about this
                  </div>
                  <div className="text-xs text-gray-500">
                    Get AI insights after sharing
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={askAI}
                  onChange={(e) => setAskAI(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            {/* AI prompt (if enabled) */}
            {askAI && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like AI to help with?
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Summarize this task and suggest next steps..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none resize-none transition-all"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-all shadow-sm hover:shadow-md font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || success || channels.length === 0 || roomsLoading}
              className={`flex-1 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md font-medium flex items-center justify-center gap-2 ${
                success
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed'
              }`}
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sharing...
                </>
              ) : success ? (
                <>
                  <span>✓</span>
                  Shared!
                </>
              ) : (
                'Share to Huddle'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShareToHuddleModal;
