// components/huddle/HuddleTab.tsx
// Main Huddle tab component - Slack-style team chat with AI integration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Settings, MessageSquare, User, Lock, Hash, Sparkles, X, HandMetal, Menu, ChevronDown } from 'lucide-react';
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
  useRealtimeMessages,
  useTypingIndicators,
  useUpdateRoomSettings,
  useArchiveRoom,
} from '../../hooks/useHuddle';
import { taskKeys } from '../../hooks/useTaskQueries';
import type { HuddleRoom, HuddleMessage, HuddleLinkedEntities, LinkedEntity, HuddleAttachment, HuddleRoomSettings } from '../../types/huddle';
import type { Task, AppActions, NoteableCollectionName } from '../../types';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../lib/services/database';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { showSuccess, showError } from '../../lib/utils/toast';

const HUDDLE_UPLOAD_BUCKET = 'huddle-uploads';

// File upload constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain', 'text/csv', 'text/markdown',
  // Archives
  'application/zip', 'application/x-zip-compressed',
];

// Sub-components
import RoomList from './RoomList';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import AIInvokeSheet from './AIInvokeSheet';
import CreateRoomModal, { CreateRoomData } from './CreateRoomModal';
import RoomSettingsModal from './RoomSettingsModal';

interface HuddleTabProps {
  isMainMenuOpen?: boolean;
}

export const HuddleTab: React.FC<HuddleTabProps> = ({ isMainMenuOpen = false }) => {
  const { user } = useAuth();
  const { workspace, workspaceMembers } = useWorkspace();
  const workspaceId = workspace?.id;
  const queryClient = useQueryClient();
  
  // State
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [showAISheet, setShowAISheet] = useState(false);
  const [aiThreadRootId, setAiThreadRootId] = useState<string | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [threadMessage, setThreadMessage] = useState<HuddleMessage | null>(null);
  
  // Mobile state
  const [showMobileRoomList, setShowMobileRoomList] = useState(false);
  
  // Close mobile room list when main menu opens
  useEffect(() => {
    if (isMainMenuOpen) {
      setShowMobileRoomList(false);
    }
  }, [isMainMenuOpen]);
  
  // Linked entity modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const threadContainerRef = useRef<HTMLDivElement>(null);
  const prevThreadMessageId = useRef<string | null>(null);
  const shouldAutoScrollThread = useRef(true);
  const shouldAutoScrollMain = useRef(true);
  const prevMessageCount = useRef(0);
  const isScrollingProgrammatically = useRef(false);
  const userScrolledUp = useRef(false);
  const userScrolledUpThread = useRef(false);

  // Queries
  const { data: rooms = [], isLoading: roomsLoading } = useHuddleRooms(workspaceId);
  const { data: unreadCounts = {} } = useUnreadCounts(workspaceId);
  const { data: messages = [], isLoading: messagesLoading } = useHuddleMessages(
    activeRoomId || undefined
  );
  const { data: threadMessages = [], isLoading: threadMessagesLoading } = useHuddleMessages(
    activeRoomId || undefined,
    threadMessage?.id
  );
  useRealtimeMessages(activeRoomId || undefined, !!activeRoomId);
  const { typingUsers, setTyping } = useTypingIndicators(
    activeRoomId || undefined,
    user?.id,
    (user?.user_metadata as any)?.full_name || user?.email || 'You'
  );
  
  // Mutations
  const sendMessageMutation = useSendMessage();
  const markRead = useMarkAsRead();
  const addReactionMutation = useAddReaction();
  const createRoom = useCreateRoom();
  const getOrCreateDM = useGetOrCreateDM();
  const updateRoomSettings = useUpdateRoomSettings();
  const archiveRoom = useArchiveRoom();
  const { invoke: invokeAI, isStreaming: isAILoading, streamContent: aiResponse, reset: resetAI, toolCalls: aiToolCalls, error: aiError } = useInvokeAI();

  // Derived
  const typedUnreadCounts = unreadCounts as Record<string, number>;
  const activeRoom = rooms.find(r => r.id === activeRoomId) || null;
  const threadReplies = threadMessage
    ? threadMessages.filter(m => m.id !== threadMessage.id)
    : [];

  // Auto-select first room if none selected
  useEffect(() => {
    if (!activeRoomId && rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  // Mark room as read when opened or messages change
  useEffect(() => {
    if (activeRoomId && (typedUnreadCounts[activeRoomId] ?? 0) > 0) {
      markRead.mutate(activeRoomId);
    }
  }, [activeRoomId, typedUnreadCounts, markRead, messages.length]);

  // Scroll thread replies - only on initial open or when user is at bottom
  useEffect(() => {
    // If thread just opened (different thread message), reset scroll state and scroll to bottom
    if (threadMessage?.id !== prevThreadMessageId.current) {
      prevThreadMessageId.current = threadMessage?.id || null;
      userScrolledUpThread.current = false; // Reset scroll state for new thread
      shouldAutoScrollThread.current = true;
    }
    
    // Only auto-scroll if user hasn't scrolled up
    if (shouldAutoScrollThread.current && !userScrolledUpThread.current && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadReplies.length, threadMessage?.id]); // Use .length to avoid new array reference issues

  // Handle room selection
  const handleSelectRoom = (room: HuddleRoom) => {
    setActiveRoomId(room.id);
    setThreadMessage(null);
    setShowMobileRoomList(false); // Close mobile room list on selection
    // Reset scroll tracking for new room
    userScrolledUp.current = false;
    prevMessageCount.current = 0;
  };

  const uploadAttachments = useCallback(async (files: File[]): Promise<HuddleAttachment[]> => {
    if (!workspaceId || files.length === 0) return [];

    // Validate files before upload
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }
      if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }
      validFiles.push(file);
    }
    
    if (errors.length > 0) {
      showError(errors.join('\n'));
    }
    
    if (validFiles.length === 0) return [];

    const uploads = await Promise.all(validFiles.map(async (file) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `${workspaceId}/${id}-${file.name}`;

      const { data, error } = await supabase.storage
        .from(HUDDLE_UPLOAD_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from(HUDDLE_UPLOAD_BUCKET)
        .getPublicUrl(data.path);

      return {
        id,
        type: 'upload' as const,
        name: file.name,
        mime: file.type,
        size: file.size,
        url: publicUrlData.publicUrl,
      };
    }));

    return uploads;
  }, [workspaceId]);

  // Handle send message
  const handleSendMessage = useCallback(async (
    content: string, 
    attachments?: File[], 
    linkedEntities?: LinkedEntity[]
  ) => {
    if (!activeRoomId || (!content.trim() && (!attachments || attachments.length === 0))) return;
    
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
      let uploadedAttachments: HuddleAttachment[] | undefined;
      if (attachments?.length) {
        uploadedAttachments = await uploadAttachments(attachments);
      }

      const body = content.trim() || 'Shared attachments';

      // Re-enable auto-scroll when user sends a message (they want to see their message)
      userScrolledUp.current = false;

      await sendMessageMutation.mutateAsync({
        room_id: activeRoomId,
        body,
        body_format: 'markdown',
        linked_entities,
        attachments: uploadedAttachments,
      });
      markRead.mutate(activeRoomId);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [activeRoomId, sendMessageMutation, uploadAttachments, markRead]);

  // Handle AI invoke
  const handleAIInvoke = useCallback(async (
    prompt: string, 
    context: { type: string; enabled: boolean }[], 
    useWebSearch: boolean,
    threadRootId?: string
  ) => {
    if (!activeRoomId) return;
    
    // Build context types
    const contextTypes = context
      .filter(c => c.enabled)
      .map(c => c.type) as ('tasks' | 'contacts' | 'deals' | 'documents' | 'forms' | 'pipeline')[];
    
    // Call AI invoke through the hook
    await invokeAI({
      room_id: activeRoomId,
      thread_root_id: threadRootId,
      prompt,
      user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      context_options: {
        include_recent_messages: true,
        include_thread: !!threadRootId,
        include_workspace_data: contextTypes.length > 0,
        workspace_data_types: contextTypes,
        include_web_research: useWebSearch,
        web_research_query: useWebSearch ? prompt : undefined,
      },
      tool_options: {
        allow_task_creation: true,
        allow_contact_creation: true,
        allow_account_creation: true,
        allow_deal_creation: true,
        allow_expense_creation: true,
        allow_revenue_creation: true,
        allow_note_creation: true,
        allow_calendar_event_creation: true,
        allow_marketing_campaign_creation: true,
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
        settings: { ai_allowed: data.aiAllowed ?? true, auto_summarize: false, ai_can_write: true, retention_days: null },
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

  // Handle linked entity click (e.g., shared task)
  const handleLinkedEntityClick = useCallback(async (entityType: string, entityId: string) => {
    // Handle both singular and plural entity type names (e.g., 'task' or 'tasks')
    const normalizedType = entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
    
    if (normalizedType === 'task') {
      setLoadingEntity(true);
      try {
        const { data, error } = await DatabaseService.getTaskById(entityId);
        if (error || !data) {
          console.error('Failed to load task:', error);
          // Could add a toast notification here
          return;
        }
        // Transform database task to app Task format
        const task: Task = {
          id: data.id,
          text: data.text,
          status: data.status,
          priority: data.priority,
          category: data.category,
          createdAt: new Date(data.created_at).getTime(),
          completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
          dueDate: data.due_date || undefined,
          dueTime: data.due_time || undefined,
          notes: data.notes || [],
          subtasks: data.subtasks || [],
          crmItemId: data.crm_item_id || undefined,
          contactId: data.contact_id || undefined,
          userId: data.user_id,
          assignedTo: data.assigned_to || undefined,
        };
        setSelectedTask(task);
      } catch (error) {
        console.error('Error loading linked task:', error);
      } finally {
        setLoadingEntity(false);
      }
    }
    // Could add handlers for other entity types (contact, deal, etc.)
  }, []);

  const handleSendThreadMessage = useCallback(async (
    content: string,
    attachments?: File[],
    linkedEntities?: LinkedEntity[]
  ) => {
    if (!activeRoomId || !threadMessage) return;
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

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
      let uploadedAttachments: HuddleAttachment[] | undefined;
      if (attachments?.length) {
        uploadedAttachments = await uploadAttachments(attachments);
      }

      const body = content.trim() || 'Shared attachments';

      await sendMessageMutation.mutateAsync({
        room_id: activeRoomId,
        thread_root_id: threadMessage.id,
        body,
        body_format: 'markdown',
        linked_entities,
        attachments: uploadedAttachments,
      });
      markRead.mutate(activeRoomId);
    } catch (error) {
      console.error('Failed to send thread message:', error);
    }
  }, [activeRoomId, threadMessage, uploadAttachments, sendMessageMutation, markRead]);

  // Handle update room settings
  const handleUpdateSettings = useCallback(async (settings: Partial<HuddleRoomSettings>) => {
    if (!activeRoomId) return;
    await updateRoomSettings.mutateAsync({ roomId: activeRoomId, settings });
  }, [activeRoomId, updateRoomSettings]);

  // Handle archive room
  const handleArchiveRoom = useCallback(async () => {
    if (!activeRoomId) return;
    await archiveRoom.mutateAsync(activeRoomId);
    setActiveRoomId(null);
    setShowRoomSettings(false);
  }, [activeRoomId, archiveRoom]);

  // Calculate total unread
  const totalUnread = Object.values(typedUnreadCounts).reduce((sum, count) => sum + count, 0);

  // Helper to get DM display name
  const getDMName = (room: HuddleRoom): string => {
    if (room.name) return room.name;
    
    const members = room.members || [];
    const otherMembers = members.filter(m => m.user_id !== user?.id);
    
    if (otherMembers.length === 0) return 'Direct Message';
    if (otherMembers.length === 1) {
      return otherMembers[0].user?.full_name || 'Unknown';
    }
    
    return otherMembers.slice(0, 2).map(m => m.user?.full_name || 'Unknown').join(', ') +
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
    <div className="flex h-full bg-white relative">
      {/* Mobile backdrop for room list */}
      {showMobileRoomList && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setShowMobileRoomList(false)}
        />
      )}

      {/* Left sidebar - Room list (desktop: fixed sidebar, mobile: slide-in overlay) */}
      <div className={`
        w-64 border-r-2 border-black flex flex-col bg-gray-50
        fixed sm:relative inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-out
        ${showMobileRoomList ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
      `}>
        <div className="p-3 sm:p-4 border-b-2 border-black bg-white">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <MessageSquare size={18} className="text-purple-600 sm:w-5 sm:h-5" />
              Huddle
            </h2>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
              {/* Mobile close button */}
              <button
                onClick={() => setShowMobileRoomList(false)}
                className="p-1.5 hover:bg-gray-100 rounded sm:hidden"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowCreateChannel(true)}
            className="w-full px-3 py-2 bg-purple-600 text-white font-semibold border-2 border-black shadow-[2px_2px_0_0_black] sm:shadow-[4px_4px_0_0_black] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_black] sm:hover:shadow-[2px_2px_0_0_black] transition-all text-sm"
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
            <div className="h-12 sm:h-14 px-2 sm:px-4 border-b-2 border-black flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile menu button */}
                <button
                  onClick={() => setShowMobileRoomList(true)}
                  className="p-1.5 hover:bg-gray-100 rounded sm:hidden flex-shrink-0"
                >
                  <Menu size={20} className="text-gray-600" />
                </button>
                <span className="text-gray-500 hidden sm:block">
                  {activeRoom.type === 'dm' ? <User size={20} /> : activeRoom.is_private ? <Lock size={20} /> : <Hash size={20} />}
                </span>
                <h3 className="font-bold truncate text-sm sm:text-base">
                  {activeRoom.type === 'dm' ? getDMName(activeRoom) : activeRoom.name}
                </h3>
                {activeRoom.description && (
                  <span className="text-gray-500 text-sm truncate hidden md:block">
                    — {activeRoom.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {activeRoom.settings?.ai_allowed !== false ? (
                  <button
                    onClick={() => setShowAISheet(true)}
                    className="p-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm border-2 border-black shadow-[2px_2px_0_0_black] sm:shadow-[4px_4px_0_0_black] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_black] sm:hover:shadow-[2px_2px_0_0_black] transition-all flex items-center gap-1"
                    title="Ask AI"
                  >
                    <Sparkles size={16} />
                    <span className="hidden sm:inline">Ask AI</span>
                  </button>
                ) : (
                  <div 
                    className="p-1.5 sm:px-3 sm:py-1.5 bg-gray-100 text-gray-400 font-medium text-sm border-2 border-gray-300 flex items-center gap-1 cursor-not-allowed"
                    title="AI is disabled in this room. Enable it in room settings."
                  >
                    <Sparkles size={16} />
                    <span className="hidden sm:inline">AI Disabled</span>
                  </div>
                )}
                <button
                  onClick={() => setShowRoomSettings(true)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Room settings"
                >
                  <Settings size={18} className="text-gray-600 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Messages timeline */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center px-4">
                    <MessageSquare size={40} className="mx-auto mb-2 text-gray-300 sm:w-12 sm:h-12" />
                    <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="py-2 sm:py-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      currentUserId={user?.id || ''}
                      onReact={(emoji) => handleReaction(message.id, emoji)}
                      onReply={() => setThreadMessage(message)}
                      onLinkedEntityClick={handleLinkedEntityClick}
                    />
                  ))}
                  {typingUsers.length > 0 && (
                    <div className="px-4 text-xs text-gray-500">
                      {typingUsers.map(u => u.name).join(', ')} typing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message composer */}
            <MessageComposer
              onSend={handleSendMessage}
              onAIInvoke={() => {
                setAiThreadRootId(null);
                setShowAISheet(true);
              }}
              onTyping={() => setTyping(true)}
              placeholder={`Message ${activeRoom.type === 'dm' ? getDMName(activeRoom) : '#' + activeRoom.name}...`}
              aiEnabled={activeRoom.settings?.ai_allowed !== false}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 px-4">
            <div className="text-center">
              {/* Mobile menu button in empty state */}
              <button
                onClick={() => setShowMobileRoomList(true)}
                className="mb-4 p-2 bg-gray-100 rounded-lg sm:hidden"
              >
                <Menu size={24} className="text-gray-600" />
              </button>
              <HandMetal size={48} className="mx-auto mb-3 text-gray-300 sm:w-16 sm:h-16" />
              <p className="font-medium text-lg sm:text-xl mb-2">Welcome to Huddle</p>
              <p className="text-gray-400 mb-4 text-sm sm:text-base">Select a channel or start a conversation</p>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="px-4 py-2 bg-purple-600 text-white font-semibold border-2 border-black shadow-[2px_2px_0_0_black] sm:shadow-[4px_4px_0_0_black] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_black] sm:hover:shadow-[2px_2px_0_0_black] transition-all text-sm sm:text-base"
              >
                Create Channel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thread drawer - Desktop: fixed sidebar, Mobile: bottom sheet */}
      {threadMessage && (
        <>
          {/* Mobile backdrop for thread */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setThreadMessage(null)}
          />
          <div className={`
            flex flex-col bg-white
            fixed sm:relative z-50
            inset-x-0 bottom-0 sm:inset-auto
            max-h-[80vh] sm:max-h-none sm:h-auto
            w-full sm:w-96
            rounded-t-2xl sm:rounded-none
            border-t-2 sm:border-t-0 sm:border-l-2 border-black
            shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none
          `}>
            {/* Drag handle for mobile */}
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="h-12 sm:h-14 px-3 sm:px-4 border-b-2 border-black flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base">Thread</h3>
              <button
                onClick={() => setThreadMessage(null)}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div 
              ref={threadContainerRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0"
              style={{ maxHeight: 'calc(80vh - 140px)' }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
                shouldAutoScrollThread.current = atBottom;
                userScrolledUpThread.current = !atBottom;
              }}
            >
              <MessageBubble
                message={threadMessage}
                currentUserId={user?.id || ''}
                onReact={(emoji) => handleReaction(threadMessage.id, emoji)}
                onReply={() => {}}
                isThreadView
                onLinkedEntityClick={handleLinkedEntityClick}
              />
              <div className="border-t pt-3">
                {threadMessagesLoading ? (
                  <div className="text-center text-gray-400">Loading replies...</div>
                ) : threadReplies.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm">No replies yet.</div>
              ) : (
                threadReplies.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    currentUserId={user?.id || ''}
                    onReact={(emoji) => handleReaction(msg.id, emoji)}
                    onReply={() => {}}
                    isThreadView
                    onLinkedEntityClick={handleLinkedEntityClick}
                  />
                ))
              )}
              <div ref={threadEndRef} />
              </div>
            </div>
            <div className="border-t">
              <MessageComposer
                onSend={(content, attachments, linkedEntities) => {
                  // Re-enable auto-scroll when user sends a message
                  shouldAutoScrollThread.current = true;
                  userScrolledUpThread.current = false;
                  handleSendThreadMessage(content, attachments, linkedEntities);
                }}
                onAIInvoke={() => {
                  setAiThreadRootId(threadMessage.id);
                  setShowAISheet(true);
                }}
                onTyping={() => setTyping(true)}
                placeholder={`Reply to thread in ${activeRoom?.name || ''}`}
                aiEnabled={activeRoom?.settings?.ai_allowed !== false}
              />
            </div>
          </div>
        </>
      )}

      {/* AI Invoke Sheet */}
      <AIInvokeSheet
        isOpen={showAISheet}
        onClose={() => {
          setShowAISheet(false);
          setAiThreadRootId(null);
          resetAI();
        }}
        onInvoke={handleAIInvoke}
        isLoading={isAILoading}
        streamingResponse={aiResponse}
        roomName={activeRoom?.name}
        threadRootId={aiThreadRootId}
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

      {/* Room Settings Modal */}
      {activeRoom && (
        <RoomSettingsModal
          isOpen={showRoomSettings}
          onClose={() => setShowRoomSettings(false)}
          room={activeRoom}
          onUpdateSettings={handleUpdateSettings}
          onArchive={handleArchiveRoom}
          currentUserId={user?.id}
        />
      )}

      {/* Loading overlay for linked entities */}
      {loadingEntity && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTask(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedTask(null);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <TaskDetailPanel
              task={selectedTask}
              actions={{
                // Task actions that persist to database and sync with Tasks tab
                updateTask: async (taskId, updates) => {
                  console.log('[HuddleTab] updateTask called:', { taskId, updates });
                  try {
                    const dbUpdates = {
                      text: updates.text,
                      status: updates.status,
                      priority: updates.priority,
                      due_date: updates.dueDate,
                      due_time: updates.dueTime,
                      assigned_to: updates.assignedTo,
                      category: updates.category,
                      subtasks: updates.subtasks,
                    };
                    console.log('[HuddleTab] Sending to DatabaseService:', dbUpdates);
                    const { data, error } = await DatabaseService.updateTask(taskId, dbUpdates);
                    console.log('[HuddleTab] DatabaseService response:', { data, error });
                    if (error) throw error;
                    // Invalidate task queries so Tasks tab gets updated
                    queryClient.invalidateQueries({ queryKey: taskKeys.all });
                    // Show success notification and close modal
                    showSuccess('Task updated successfully');
                    setSelectedTask(null);
                    return { success: true, message: 'Task updated' };
                  } catch (error) {
                    console.error('[HuddleTab] Error updating task:', error);
                    showError('Failed to update task');
                    return { success: false, message: 'Failed to update task' };
                  }
                },
                addNote: async (collection, itemId, noteText) => {
                  try {
                    const newNote = { text: noteText, timestamp: Date.now() };
                    const currentNotes = selectedTask?.notes || [];
                    await DatabaseService.updateTask(itemId, { notes: [...currentNotes, newNote] });
                    setSelectedTask(prev => prev ? { ...prev, notes: [...(prev.notes || []), newNote] } : null);
                    queryClient.invalidateQueries({ queryKey: taskKeys.all });
                    showSuccess('Note added');
                    return { success: true, message: 'Note added' };
                  } catch (error) {
                    showError('Failed to add note');
                    return { success: false, message: 'Failed to add note' };
                  }
                },
                updateNote: async (collection, itemId, noteTimestamp, newText) => {
                  try {
                    const currentNotes = selectedTask?.notes || [];
                    const updatedNotes = currentNotes.map(n => 
                      n.timestamp === noteTimestamp ? { ...n, text: newText } : n
                    );
                    await DatabaseService.updateTask(itemId, { notes: updatedNotes });
                    setSelectedTask(prev => prev ? { ...prev, notes: updatedNotes } : null);
                    queryClient.invalidateQueries({ queryKey: taskKeys.all });
                    showSuccess('Note updated');
                    return { success: true, message: 'Note updated' };
                  } catch (error) {
                    showError('Failed to update note');
                    return { success: false, message: 'Failed to update note' };
                  }
                },
                deleteNote: async (collection, itemId, noteTimestamp) => {
                  try {
                    const currentNotes = selectedTask?.notes || [];
                    const filteredNotes = currentNotes.filter(n => n.timestamp !== noteTimestamp);
                    await DatabaseService.updateTask(itemId, { notes: filteredNotes });
                    setSelectedTask(prev => prev ? { ...prev, notes: filteredNotes } : null);
                    queryClient.invalidateQueries({ queryKey: taskKeys.all });
                    showSuccess('Note deleted');
                    return { success: true, message: 'Note deleted' };
                  } catch (error) {
                    showError('Failed to delete note');
                    return { success: false, message: 'Failed to delete note' };
                  }
                },
              } as AppActions}
              onClose={() => setSelectedTask(null)}
              onNavigateToEntity={(entityType, entityId) => {
                // Close and potentially navigate to the entity in its dedicated tab
                setSelectedTask(null);
              }}
              workspaceMembers={workspaceMembers}
              linkedEntityName={null}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HuddleTab;
