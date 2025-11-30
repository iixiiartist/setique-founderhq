// components/huddle/HuddleTab.tsx
// Main Huddle tab component - Slack-style team chat with AI integration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { 
  useHuddleRooms, 
  useHuddleMessages, 
  useSendMessage,
  useUnreadCounts,
  useMarkAsRead,
  useAddReaction,
  useCreateRoom,
  useGetOrCreateDM,
  useInvokeAI,
} from '../../hooks/useHuddle';
import type { HuddleRoom, HuddleMessage, HuddleLinkedEntities, LinkedEntity } from '../../types/huddle';

// Sub-components
import RoomList from './RoomList';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import AIInvokeSheet from './AIInvokeSheet';
import CreateRoomModal, { CreateRoomData } from './CreateRoomModal';

export const HuddleTab: React.FC = () => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  
  // State
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [showAISheet, setShowAISheet] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);
  const [threadMessage, setThreadMessage] = useState<HuddleMessage | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: rooms = [], isLoading: roomsLoading } = useHuddleRooms(workspaceId);
  const { data: unreadCounts = {} } = useUnreadCounts(workspaceId);
  
  // Type cast unread counts
  const typedUnreadCounts = unreadCounts as Record<string, number>;
  
  // Get messages for active room - useHuddleMessages takes roomId and optional threadRootId
  const { data: messages = [], isLoading: messagesLoading } = useHuddleMessages(
    activeRoomId || undefined
  );
  
  // Mutations
  const sendMessageMutation = useSendMessage();
  const markRead = useMarkAsRead();
  const addReactionMutation = useAddReaction();
  const createRoom = useCreateRoom();
  const getOrCreateDM = useGetOrCreateDM();
  
  // AI invoke hook
  const { invoke: invokeAI, isStreaming: isAILoading, streamContent: aiResponse, reset: resetAI } = useInvokeAI();

  // Get active room
  const activeRoom = rooms.find(r => r.id === activeRoomId) || null;

  // Auto-select first room if none selected
  useEffect(() => {
    if (!activeRoomId && rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  // Mark room as read when opened
  useEffect(() => {
    if (activeRoomId && typedUnreadCounts[activeRoomId] > 0) {
      markRead.mutate(activeRoomId);
    }
  }, [activeRoomId, typedUnreadCounts, markRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle room selection
  const handleSelectRoom = (room: HuddleRoom) => {
    setActiveRoomId(room.id);
    setThreadMessage(null);
  };

  // Handle send message
  const handleSendMessage = useCallback(async (
    content: string, 
    attachments?: File[], 
    linkedEntities?: LinkedEntity[]
  ) => {
    if (!activeRoomId || !content.trim()) return;
    
    // Convert LinkedEntity[] to HuddleLinkedEntities
    let linked_entities: HuddleLinkedEntities | undefined;
    if (linkedEntities && linkedEntities.length > 0) {
      linked_entities = {};
      linkedEntities.forEach(entity => {
        const key = entity.entity_type + 's' as keyof HuddleLinkedEntities;
        if (!linked_entities![key]) {
          linked_entities![key] = [];
        }
        linked_entities![key]!.push(entity.entity_id);
      });
    }
    
    try {
      await sendMessageMutation.mutateAsync({
        room_id: activeRoomId,
        body: content.trim(),
        body_format: 'markdown',
        linked_entities,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [activeRoomId, sendMessageMutation]);

  // Handle AI invoke
  const handleAIInvoke = useCallback(async (
    prompt: string, 
    context: { type: string; enabled: boolean }[], 
    useWebSearch: boolean
  ) => {
    if (!activeRoomId) return;
    
    // Build context types
    const contextTypes = context
      .filter(c => c.enabled)
      .map(c => c.type) as ('tasks' | 'contacts' | 'deals' | 'documents' | 'forms' | 'pipeline')[];
    
    // Call AI invoke through the hook
    await invokeAI({
      room_id: activeRoomId,
      prompt,
      context_options: {
        include_recent_messages: true,
        include_workspace_data: contextTypes.length > 0,
        workspace_data_types: contextTypes,
        include_web_research: useWebSearch,
      },
      tool_options: {
        allow_web_search: useWebSearch,
      },
    });
  }, [activeRoomId, invokeAI]);

  // Handle create channel
  const handleCreateChannel = useCallback(async (data: CreateRoomData) => {
    if (!workspaceId) return;
    
    try {
      const result = await createRoom.mutateAsync({
        workspace_id: workspaceId,
        type: 'channel',
        name: data.name || 'new-channel',
        description: data.description,
        is_private: data.isPrivate || false,
        member_ids: data.memberIds,
        settings: { ai_allowed: data.aiAllowed ?? true, auto_summarize: false, ai_can_write: false, retention_days: null },
      });
      
      if (result) {
        setActiveRoomId(result.id);
        setShowCreateChannel(false);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  }, [workspaceId, createRoom]);

  // Handle create DM
  const handleCreateDM = useCallback(async (data: CreateRoomData) => {
    if (!workspaceId || !data.memberIds?.length) return;
    
    try {
      const result = await getOrCreateDM.mutateAsync({
        workspaceId,
        userIds: data.memberIds,
      });
      
      if (result) {
        setActiveRoomId(result.room_id);
        setShowCreateDM(false);
      }
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  }, [workspaceId, getOrCreateDM]);

  // Handle reaction
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await addReactionMutation.mutateAsync({ messageId, emoji });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [addReactionMutation]);

  // Calculate total unread
  const totalUnread = Object.values(typedUnreadCounts).reduce((sum, count) => sum + count, 0);

  // Helper to get DM display name
  const getDMName = (room: HuddleRoom): string => {
    if (room.name) return room.name;
    
    const members = room.members || [];
    const otherMembers = members.filter(m => m.user_id !== user?.id);
    
    if (otherMembers.length === 0) return 'Direct Message';
    if (otherMembers.length === 1) {
      return otherMembers[0].user?.name || 'Unknown';
    }
    
    return otherMembers.slice(0, 2).map(m => m.user?.name || 'Unknown').join(', ') +
      (otherMembers.length > 2 ? ` +${otherMembers.length - 2}` : '');
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please select a workspace to use Huddle</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* Left sidebar - Room list */}
      <div className="w-64 border-r-2 border-black flex flex-col bg-gray-50">
        <div className="p-4 border-b-2 border-black bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">💬 Huddle</h2>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCreateChannel(true)}
            className="w-full px-3 py-2 bg-purple-600 text-white font-semibold border-2 border-black shadow-[4px_4px_0_0_black] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_black] transition-all text-sm"
          >
            + New Channel
          </button>
        </div>
        
        <RoomList
          rooms={rooms}
          activeRoomId={activeRoomId}
          unreadCounts={unreadCounts}
          onSelectRoom={handleSelectRoom}
          onNewDM={() => setShowCreateDM(true)}
          isLoading={roomsLoading}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            {/* Room header */}
            <div className="h-14 px-4 border-b-2 border-black flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">
                  {activeRoom.type === 'dm' ? '👤' : activeRoom.is_private ? '🔒' : '#'}
                </span>
                <h3 className="font-bold truncate">
                  {activeRoom.type === 'dm' ? getDMName(activeRoom) : activeRoom.name}
                </h3>
                {activeRoom.description && (
                  <span className="text-gray-500 text-sm truncate hidden md:block">
                    — {activeRoom.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeRoom.settings?.ai_allowed !== false && (
                  <button
                    onClick={() => setShowAISheet(true)}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm border-2 border-black shadow-[4px_4px_0_0_black] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_black] transition-all flex items-center gap-1"
                    title="Ask AI"
                  >
                    🤖 Ask AI
                  </button>
                )}
                <button
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Room settings"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* Messages timeline */}
            <div className="flex-1 overflow-y-auto">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <span className="text-4xl mb-2 block">💬</span>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      currentUserId={user?.id || ''}
                      onReact={(emoji) => handleReaction(message.id, emoji)}
                      onReply={() => setThreadMessage(message)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message composer */}
            <MessageComposer
              onSend={handleSendMessage}
              onAIInvoke={() => setShowAISheet(true)}
              placeholder={`Message ${activeRoom.type === 'dm' ? getDMName(activeRoom) : '#' + activeRoom.name}...`}
              aiEnabled={activeRoom.settings?.ai_allowed !== false}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <span className="text-6xl mb-4 block">💬</span>
              <p className="font-medium text-xl mb-2">Welcome to Huddle</p>
              <p className="text-gray-400 mb-4">Select a channel or start a conversation</p>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="px-4 py-2 bg-purple-600 text-white font-semibold border-2 border-black shadow-[4px_4px_0_0_black] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_black] transition-all"
              >
                Create Channel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thread drawer (placeholder for future implementation) */}
      {threadMessage && (
        <div className="w-80 border-l-2 border-black flex flex-col bg-white">
          <div className="h-14 px-4 border-b-2 border-black flex items-center justify-between">
            <h3 className="font-bold">Thread</h3>
            <button
              onClick={() => setThreadMessage(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <MessageBubble
              message={threadMessage}
              currentUserId={user?.id || ''}
              onReact={(emoji) => handleReaction(threadMessage.id, emoji)}
              onReply={() => {}}
              isThreadView
            />
            <div className="mt-4 pt-4 border-t text-center text-gray-400 text-sm">
              Thread replies coming soon
            </div>
          </div>
        </div>
      )}

      {/* AI Invoke Sheet */}
      <AIInvokeSheet
        isOpen={showAISheet}
        onClose={() => {
          setShowAISheet(false);
          resetAI();
        }}
        onInvoke={handleAIInvoke}
        isLoading={isAILoading}
        streamingResponse={aiResponse}
        roomName={activeRoom?.name}
      />

      {/* Create Channel Modal */}
      <CreateRoomModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreate={handleCreateChannel}
        mode="channel"
        workspaceId={workspaceId}
      />

      {/* Create DM Modal */}
      <CreateRoomModal
        isOpen={showCreateDM}
        onClose={() => setShowCreateDM(false)}
        onCreate={handleCreateDM}
        mode="dm"
        workspaceId={workspaceId}
      />
    </div>
  );
};

export default HuddleTab;
