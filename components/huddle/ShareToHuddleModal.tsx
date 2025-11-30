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
  
  const { data: rooms = [], isLoading: roomsLoading } = useHuddleRooms(workspaceId);
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
    }
  }, [isOpen, payload]);

  // Generate default message based on payload type
  const getDefaultMessage = (p: ShareToHuddlePayload): string => {
    const emoji = getTypeEmoji(p.type);
    let msg = `${emoji} **${p.title}**`;
    
    if (p.description) {
      msg += `\n\n${p.description}`;
    }
    
    // Add type-specific details
    if (p.type === 'calendar_event' && p.preview?.snippet) {
      msg += `\n\n?? ${p.preview.snippet}`;
    }
    
    return msg;
  };

  // Get emoji for type
  const getTypeEmoji = (type: string): string => {
    switch (type) {
      case 'task': return '??';
      case 'contact': return '??';
      case 'deal': return '??';
      case 'document': return '??';
      case 'form': return '??';
      case 'file': return '??';
      case 'calendar_event': return '??';
      default: return '??';
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
      default: return 'Item';
    }
  };

  // Handle send
  const handleSend = async () => {
    if (!selectedRoomId || !payload) return;
    
    setSending(true);
    
    try {
      // Build linked entities
      const linked_entities: HuddleLinkedEntities = {};
      const key = payload.type === 'calendar_event' ? 'tasks' : `${payload.type}s` as keyof HuddleLinkedEntities;
      
      if (payload.type !== 'calendar_event') {
        linked_entities[key] = [payload.id];
      }
      
      // Send the message
      await sendMessage.mutateAsync({
        room_id: selectedRoomId,
        body: message,
        body_format: 'markdown',
        linked_entities: Object.keys(linked_entities).length > 0 ? linked_entities : undefined,
      });
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to share to Huddle:', error);
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border-2 border-black"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b-2 border-black bg-gradient-to-r from-purple-500 to-indigo-600">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Share</span>
              Share to Huddle
            </h2>
            <p className="text-purple-100 text-sm mt-1">
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
            {/* Channel selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select channel *
              </label>
              {roomsLoading ? (
                <div className="text-center py-4 text-gray-400">Loading channels...</div>
              ) : channels.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No channels available. Create a channel first.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto">
                  {channels.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
                        selectedRoomId === room.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-gray-500">
                        {room.is_private ? '??' : '#'}
                      </span>
                      <span className="font-medium text-gray-900">{room.name}</span>
                      {selectedRoomId === room.id && (
                        <span className="ml-auto text-purple-600">?</span>
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
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none resize-none"
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
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
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-gray-200 bg-gray-50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedRoomId || sending || channels.length === 0}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <span>Share</span>
                  Share to Huddle
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShareToHuddleModal;
