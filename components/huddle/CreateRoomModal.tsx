// components/huddle/CreateRoomModal.tsx
// Modal for creating new channels or starting DMs

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateRoomData) => void;
  mode: 'channel' | 'dm';
  workspaceId: string;
  isLoading?: boolean;
}

export interface CreateRoomData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  memberIds?: string[];
  aiAllowed?: boolean;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  users: {
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  mode,
  workspaceId,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Load workspace members
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select(`
            id,
            user_id,
            users:user_id (
              name,
              email,
              avatar_url
            )
          `)
          .eq('workspace_id', workspaceId);

        if (error) throw error;
        setMembers(data as unknown as WorkspaceMember[]);
      } catch (err) {
        console.error('Failed to load workspace members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [isOpen, workspaceId]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setIsPrivate(false);
      setAiAllowed(true);
      setSelectedMembers([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter members by search
  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.users.name?.toLowerCase().includes(query) ||
      m.users.email.toLowerCase().includes(query)
    );
  });

  // Toggle member selection
  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'channel' && !name.trim()) return;
    if (mode === 'dm' && selectedMembers.length === 0) return;

    onCreate({
      name: mode === 'channel' ? name.trim() : undefined,
      description: mode === 'channel' ? description.trim() : undefined,
      isPrivate,
      memberIds: selectedMembers,
      aiAllowed,
    });
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
          <div className="px-6 py-4 border-b-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'channel' ? 'Create Channel' : 'New Message'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'channel'
                ? 'Channels are where your team communicates'
                : 'Start a direct message with team members'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Channel name (for channels only) */}
              {mode === 'channel' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Channel name *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        #
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        placeholder="e.g. marketing-team"
                        className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
                        maxLength={80}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Lowercase letters, numbers, and dashes only
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What's this channel about?"
                      rows={2}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none resize-none"
                      maxLength={250}
                    />
                  </div>

                  {/* Privacy toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{isPrivate ? '🔒' : '🌐'}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {isPrivate ? 'Private' : 'Public'} channel
                        </div>
                        <div className="text-xs text-gray-500">
                          {isPrivate
                            ? 'Only invited members can see'
                            : 'Anyone in workspace can join'}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </>
              )}

              {/* Member selection */}
              {(mode === 'dm' || isPrivate) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {mode === 'dm' ? 'To:' : 'Invite members:'}
                  </label>
                  
                  {/* Search */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none mb-2"
                  />

                  {/* Selected members */}
                  {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedMembers.map(userId => {
                        const member = members.find(m => m.user_id === userId);
                        if (!member) return null;
                        return (
                          <span
                            key={userId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                          >
                            {member.users.name || member.users.email}
                            <button
                              type="button"
                              onClick={() => toggleMember(userId)}
                              className="hover:text-purple-900"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Member list */}
                  <div className="border-2 border-gray-200 rounded-xl max-h-[200px] overflow-y-auto">
                    {loadingMembers ? (
                      <div className="p-4 text-center text-gray-400">
                        Loading members...
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        No members found
                      </div>
                    ) : (
                      filteredMembers.map(member => (
                        <button
                          key={member.user_id}
                          type="button"
                          onClick={() => toggleMember(member.user_id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                            selectedMembers.includes(member.user_id) ? 'bg-purple-50' : ''
                          }`}
                        >
                          {member.users.avatar_url ? (
                            <img
                              src={member.users.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">
                              {(member.users.name || member.users.email)[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-gray-900">
                              {member.users.name || 'Unnamed'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.users.email}
                            </div>
                          </div>
                          {selectedMembers.includes(member.user_id) && (
                            <span className="text-purple-600">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* AI toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🤖</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Enable AI
                    </div>
                    <div className="text-xs text-gray-500">
                      Allow AI assistant in this {mode === 'channel' ? 'channel' : 'conversation'}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiAllowed}
                    onChange={(e) => setAiAllowed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t-2 border-gray-200 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isLoading ||
                  (mode === 'channel' && !name.trim()) ||
                  (mode === 'dm' && selectedMembers.length === 0)
                }
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating...' : mode === 'channel' ? 'Create Channel' : 'Start Chat'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateRoomModal;
